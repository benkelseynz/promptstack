const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const path = require('path');
const fs = require('fs');

const { authenticate } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { getUserById, getUserByEmail, updateUser } = require('../services/userStorage');
const { sendEmail } = require('../services/email');

// Load pricing config
const pricingPath = path.join(__dirname, '../../config/pricing.json');
const pricingConfig = JSON.parse(fs.readFileSync(pricingPath, 'utf8'));

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
});

// Map tier IDs to Stripe price IDs (set in environment variables)
const PRICE_IDS = {
  professional: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID,
};

// Create checkout session for subscription
router.post('/create-checkout-session', authenticate, async (req, res, next) => {
  try {
    const { tier } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;

    // Validate tier
    if (!tier || !['professional', 'enterprise'].includes(tier)) {
      throw new AppError('Invalid subscription tier', 400);
    }

    const priceId = PRICE_IDS[tier];
    if (!priceId) {
      throw new AppError('Stripe price ID not configured for this tier', 500);
    }

    // Get tier details from pricing config (tiers is an array, find by id)
    const tierConfig = pricingConfig.tiers.find(t => t.id === tier);
    if (!tierConfig) {
      throw new AppError('Tier configuration not found', 500);
    }

    // Check if user already has a Stripe customer ID
    const user = await getUserById(userId);
    let customerId = user.stripeCustomerId;

    // Create or retrieve Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          userId: userId,
        },
      });
      customerId = customer.id;

      // Save customer ID to user record
      await updateUser(userId, { stripeCustomerId: customerId });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/dashboard/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard/upgrade?cancelled=true`,
      metadata: {
        userId: userId,
        tier: tier,
      },
      subscription_data: {
        metadata: {
          userId: userId,
          tier: tier,
        },
      },
      // Branding customization
      custom_text: {
        submit: {
          message: `Subscribe to PromptStack ${tierConfig.name} - ${pricingConfig.currency} $${tierConfig.price}/month`,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    });

    res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    if (error.type === 'StripeCardError') {
      return next(new AppError(error.message, 400));
    }
    next(error);
  }
});

// Get subscription status
router.get('/subscription', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await getUserById(userId);

    if (!user.stripeCustomerId) {
      return res.json({
        hasSubscription: false,
        tier: user.tier || 'free',
      });
    }

    // Get active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return res.json({
        hasSubscription: false,
        tier: user.tier || 'free',
      });
    }

    const subscription = subscriptions.data[0];

    res.json({
      hasSubscription: true,
      tier: user.tier,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    next(error);
  }
});

// Create customer portal session (for managing subscription)
router.post('/create-portal-session', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await getUserById(userId);

    if (!user.stripeCustomerId) {
      throw new AppError('No subscription found', 400);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/dashboard/settings`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Portal session error:', error);
    next(error);
  }
});

// Verify checkout session and update user tier (fallback for when webhooks can't be received)
router.post('/verify-session', authenticate, async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;

    if (!sessionId) {
      throw new AppError('Session ID required', 400);
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    // Verify the session belongs to this user
    if (session.metadata?.userId !== userId) {
      throw new AppError('Session does not belong to this user', 403);
    }

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      throw new AppError('Payment not completed', 400);
    }

    const tier = session.metadata?.tier;
    if (!tier) {
      throw new AppError('Tier not found in session', 400);
    }

    // Get current user
    const user = await getUserById(userId);

    // Check if already upgraded (prevent duplicate processing)
    if (user.tier === tier) {
      return res.json({
        success: true,
        message: 'Already upgraded',
        tier: user.tier,
      });
    }

    // Update user tier
    await updateUser(userId, {
      tier: tier,
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription?.id || session.subscription,
      subscriptionStartDate: new Date().toISOString(),
    });

    // Send confirmation email
    const updatedUser = await getUserById(userId);
    await sendSubscriptionConfirmationEmail(updatedUser, tier);

    console.log(`User ${userId} upgraded to ${tier} via session verification`);

    res.json({
      success: true,
      message: 'Subscription activated',
      tier: tier,
    });
  } catch (error) {
    console.error('Session verification error:', error);
    next(error);
  }
});

// Webhook handler for Stripe events
// Note: express.raw() middleware is applied at app level in index.js
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutComplete(session);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionCancelled(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Handle successful checkout
async function handleCheckoutComplete(session) {
  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier;

  if (!userId || !tier) {
    console.error('Missing metadata in checkout session:', session.id);
    return;
  }

  const user = await getUserById(userId);
  if (!user) {
    console.error('User not found:', userId);
    return;
  }

  // Update user tier
  await updateUser(userId, {
    tier: tier,
    stripeSubscriptionId: session.subscription,
    subscriptionStartDate: new Date().toISOString(),
  });

  // Send confirmation email
  await sendSubscriptionConfirmationEmail(user, tier);

  console.log(`User ${userId} upgraded to ${tier}`);
}

// Handle subscription updates
async function handleSubscriptionUpdate(subscription) {
  const userId = subscription.metadata?.userId;
  const tier = subscription.metadata?.tier;

  if (!userId) {
    // Try to find user by customer ID
    const customerId = subscription.customer;
    // Note: You'd need to implement getUserByStripeCustomerId
    console.log('Subscription updated for customer:', customerId);
    return;
  }

  const user = await getUserById(userId);
  if (!user) return;

  // Update subscription status
  if (subscription.status === 'active') {
    await updateUser(userId, {
      tier: tier || user.tier,
      subscriptionStatus: 'active',
    });
  } else if (subscription.status === 'past_due') {
    await updateUser(userId, {
      subscriptionStatus: 'past_due',
    });
  }
}

// Handle subscription cancellation
async function handleSubscriptionCancelled(subscription) {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.log('Subscription cancelled for customer:', subscription.customer);
    return;
  }

  const user = await getUserById(userId);
  if (!user) return;

  // Downgrade to free tier
  await updateUser(userId, {
    tier: 'free',
    subscriptionStatus: 'cancelled',
    subscriptionEndDate: new Date().toISOString(),
  });

  // Send cancellation email
  await sendSubscriptionCancellationEmail(user);

  console.log(`User ${userId} subscription cancelled, downgraded to free`);
}

// Handle successful payment (recurring)
async function handlePaymentSucceeded(invoice) {
  if (invoice.billing_reason === 'subscription_cycle') {
    const customerId = invoice.customer;
    console.log('Recurring payment succeeded for customer:', customerId);
    // Payment succeeded, subscription continues
  }
}

// Handle failed payment
async function handlePaymentFailed(invoice) {
  const customerId = invoice.customer;
  console.log('Payment failed for customer:', customerId);
  // Could send a payment failed notification email here
}

// Send subscription confirmation email
async function sendSubscriptionConfirmationEmail(user, tier) {
  const tierConfig = pricingConfig.tiers.find(t => t.id === tier);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; background: #7c3aed; padding: 12px; border-radius: 12px;">
          <span style="color: white; font-size: 24px;">✨</span>
        </div>
        <h1 style="color: #111827; margin-top: 16px;">Welcome to PromptStack ${tierConfig.name}!</h1>
      </div>

      <p>Hi ${user.name || 'there'},</p>

      <p>Thank you for subscribing to <strong>PromptStack ${tierConfig.name}</strong>! Your payment has been confirmed and all premium features are now unlocked.</p>

      <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h3 style="margin-top: 0; color: #111827;">Your Subscription Details</h3>
        <ul style="margin: 0; padding-left: 20px;">
          <li><strong>Plan:</strong> ${tierConfig.name}</li>
          <li><strong>Price:</strong> ${pricingConfig.currency} $${tierConfig.price}/month</li>
          <li><strong>Billing:</strong> Monthly, starting today</li>
        </ul>
      </div>

      <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 12px; padding: 24px; margin: 24px 0; color: white;">
        <h3 style="margin-top: 0;">What's Now Unlocked</h3>
        <ul style="margin: 0; padding-left: 20px;">
          ${tierConfig.features.map(f => `<li>${f}</li>`).join('\n          ')}
        </ul>
      </div>

      <p>You can manage your subscription anytime from your <a href="${process.env.FRONTEND_URL}/dashboard/settings" style="color: #7c3aed;">account settings</a>.</p>

      <p>If you have any questions, just reply to this email – we're here to help!</p>

      <p>Happy prompting! 🚀<br>
      <strong>The PromptStack Team</strong></p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

      <p style="font-size: 12px; color: #9ca3af; text-align: center;">
        You're receiving this email because you subscribed to PromptStack ${tierConfig.name}.<br>
        © ${new Date().getFullYear()} PromptStack. All rights reserved.
      </p>
    </body>
    </html>
  `;

  try {
    await sendEmail(
      user.email,
      `Welcome to PromptStack ${tierConfig.name}! 🎉`,
      html
    );
  } catch (error) {
    console.error('Failed to send confirmation email:', error);
  }
}

// Send subscription cancellation email
async function sendSubscriptionCancellationEmail(user) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; background: #7c3aed; padding: 12px; border-radius: 12px;">
          <span style="color: white; font-size: 24px;">✨</span>
        </div>
        <h1 style="color: #111827; margin-top: 16px;">Subscription Cancelled</h1>
      </div>

      <p>Hi ${user.name || 'there'},</p>

      <p>Your PromptStack subscription has been cancelled. Your account has been downgraded to the free tier.</p>

      <p>You can still access all free prompts and features. If you'd like to resubscribe at any time, visit your <a href="${process.env.FRONTEND_URL}/dashboard/upgrade" style="color: #7c3aed;">upgrade page</a>.</p>

      <p>We'd love to hear your feedback – if there's anything we could have done better, please reply to this email.</p>

      <p>Thank you for being a PromptStack member!<br>
      <strong>The PromptStack Team</strong></p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

      <p style="font-size: 12px; color: #9ca3af; text-align: center;">
        © ${new Date().getFullYear()} PromptStack. All rights reserved.
      </p>
    </body>
    </html>
  `;

  try {
    await sendEmail(
      user.email,
      'Your PromptStack Subscription Has Been Cancelled',
      html
    );
  } catch (error) {
    console.error('Failed to send cancellation email:', error);
  }
}

module.exports = router;
