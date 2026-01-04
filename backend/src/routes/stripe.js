const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const path = require('path');
const fs = require('fs');

const { authenticate } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { getUserById, getUserByEmail, getUserByStripeCustomerId, updateUser } = require('../services/userStorage');
const { sendEmail, sendEmailWithAttachments } = require('../services/email');
const { generateInvoice, generateInvoiceNumber, formatDate } = require('../services/invoiceGenerator');

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

// Cancel subscription with reason capture
router.post('/cancel-subscription', authenticate, async (req, res, next) => {
  try {
    const { reason, feedback } = req.body;
    const userId = req.user.id;

    const user = await getUserById(userId);

    if (!user.stripeSubscriptionId) {
      throw new AppError('No active subscription found', 400);
    }

    // Get the subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

    if (subscription.status !== 'active') {
      throw new AppError('Subscription is not active', 400);
    }

    // Cancel at end of billing period (user keeps access until then)
    const cancelledSubscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
      metadata: {
        ...subscription.metadata,
        cancellationReason: reason || 'Not specified',
        cancellationFeedback: feedback || '',
        cancelledAt: new Date().toISOString(),
      },
    });

    // Calculate the end date
    const periodEndDate = new Date(cancelledSubscription.current_period_end * 1000);

    // Update user record
    await updateUser(userId, {
      subscriptionCancelledAt: new Date().toISOString(),
      subscriptionEndsAt: periodEndDate.toISOString(),
      cancellationReason: reason,
      cancellationFeedback: feedback,
    });

    // Send cancellation confirmation email with end date
    await sendCancellationScheduledEmail(user, periodEndDate);

    console.log(`User ${userId} scheduled cancellation for ${periodEndDate.toISOString()}`);

    res.json({
      success: true,
      message: 'Subscription will be cancelled at the end of your billing period',
      endsAt: periodEndDate.toISOString(),
    });
  } catch (error) {
    console.error('Cancellation error:', error);
    next(error);
  }
});

// Reactivate a cancelled subscription (before period ends)
router.post('/reactivate-subscription', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await getUserById(userId);

    if (!user.stripeSubscriptionId) {
      throw new AppError('No subscription found', 400);
    }

    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

    if (!subscription.cancel_at_period_end) {
      throw new AppError('Subscription is not scheduled for cancellation', 400);
    }

    // Reactivate subscription
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    // Update user record
    await updateUser(userId, {
      subscriptionCancelledAt: null,
      subscriptionEndsAt: null,
      cancellationReason: null,
      cancellationFeedback: null,
    });

    console.log(`User ${userId} reactivated subscription`);

    res.json({
      success: true,
      message: 'Subscription reactivated successfully',
    });
  } catch (error) {
    console.error('Reactivation error:', error);
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
  let userId = subscription.metadata?.userId;
  const tier = subscription.metadata?.tier;

  // Try to find user by customer ID if no userId in metadata
  if (!userId) {
    const customerId = subscription.customer;
    const user = await getUserByStripeCustomerId(customerId);
    if (user) {
      userId = user.id;
    } else {
      console.log('Subscription updated for unknown customer:', customerId);
      return;
    }
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

// Handle successful payment (recurring and initial)
async function handlePaymentSucceeded(invoice) {
  const customerId = invoice.customer;

  // Find user by Stripe customer ID
  const user = await getUserByStripeCustomerId(customerId);
  if (!user) {
    console.log('Payment succeeded for unknown customer:', customerId);
    return;
  }

  // Get subscription details for tier info
  let tier = user.tier;
  if (invoice.subscription) {
    try {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      tier = subscription.metadata?.tier || user.tier;
    } catch (err) {
      console.error('Error fetching subscription:', err);
    }
  }

  const tierConfig = pricingConfig.tiers.find(t => t.id === tier);
  const tierName = tierConfig?.name || 'Premium';
  const tierPrice = tierConfig?.monthlyPrice || (invoice.amount_paid / 100);

  // Generate invoice PDF
  const invoiceNumber = generateInvoiceNumber();
  const periodStart = invoice.period_start ? new Date(invoice.period_start * 1000) : new Date();
  const periodEnd = invoice.period_end ? new Date(invoice.period_end * 1000) : new Date();

  try {
    const pdfBuffer = await generateInvoice({
      invoiceNumber,
      date: new Date(),
      customer: {
        name: user.name,
        email: user.email,
      },
      items: [
        {
          description: `PromptStack ${tierName} - Monthly Subscription`,
          amount: tierPrice,
        },
      ],
      periodStart,
      periodEnd,
      isPaid: true,
    });

    // Determine email type based on billing reason
    const isRecurring = invoice.billing_reason === 'subscription_cycle';
    const subject = isRecurring
      ? `Your PromptStack Invoice for ${formatDate(new Date())}`
      : `Welcome to PromptStack ${tierName}!`;

    const html = isRecurring
      ? generateMonthlyInvoiceEmailHtml(user, tierName, tierPrice, periodStart, periodEnd, invoiceNumber)
      : generateWelcomeInvoiceEmailHtml(user, tierConfig, invoiceNumber);

    const textContent = isRecurring
      ? `Your monthly invoice for PromptStack ${tierName} is attached.`
      : `Thank you for subscribing to PromptStack ${tierName}! Your invoice is attached.`;

    // Send email with PDF invoice attached
    await sendEmailWithAttachments(
      user.email,
      subject,
      html,
      textContent,
      [
        {
          filename: `PromptStack-Invoice-${invoiceNumber}.pdf`,
          content: pdfBuffer,
          mimeType: 'application/pdf',
        },
      ]
    );

    console.log(`Invoice ${invoiceNumber} sent to ${user.email} (${isRecurring ? 'recurring' : 'initial'})`);
  } catch (error) {
    console.error('Error generating/sending invoice:', error);
  }
}

// Handle failed payment
async function handlePaymentFailed(invoice) {
  const customerId = invoice.customer;

  // Find user by Stripe customer ID
  const user = await getUserByStripeCustomerId(customerId);
  if (!user) {
    console.log('Payment failed for unknown customer:', customerId);
    return;
  }

  // Send payment failed notification email
  await sendPaymentFailedEmail(user);

  console.log(`Payment failed notification sent to ${user.email}`);
}

// Send subscription confirmation email with PDF invoice
async function sendSubscriptionConfirmationEmail(user, tier) {
  const tierConfig = pricingConfig.tiers.find(t => t.id === tier);
  const tierName = tierConfig?.name || 'Premium';
  const tierPrice = tierConfig?.monthlyPrice || 29;

  // Generate invoice PDF
  const invoiceNumber = generateInvoiceNumber();
  const periodStart = new Date();
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const subject = `Welcome to PromptStack ${tierName}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to PromptStack</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a365d; margin-bottom: 10px;">PromptStack</h1>
          <p style="color: #666; font-size: 14px;">Built by Kiwis, for Kiwis</p>
        </div>

        <div style="background: #f7fafc; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h2 style="margin-top: 0; color: #2d3748;">Welcome to ${tierName}, ${user.name || 'there'}!</h2>
          <p>Thank you for subscribing to PromptStack ${tierName}. Your payment has been confirmed and all premium features are now unlocked.</p>

          <h3 style="color: #2d3748;">Your Subscription Details</h3>
          <ul>
            <li><strong>Plan:</strong> ${tierName}</li>
            <li><strong>Price:</strong> ${pricingConfig.currencySymbol}${tierPrice}/month (incl. GST)</li>
            <li><strong>Invoice #:</strong> ${invoiceNumber}</li>
            <li><strong>Billing:</strong> Monthly, starting today</li>
          </ul>

          <div style="background: #dbeafe; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #1e40af;">
              <strong>Your invoice is attached</strong><br>
              <span style="font-size: 14px;">Please find your PDF invoice attached to this email for your records.</span>
            </p>
          </div>

          <h3 style="color: #2d3748;">What's Now Unlocked</h3>
          <ul>
            ${tierConfig?.features?.map(f => `<li>${f}</li>`).join('\n            ') || '<li>All premium features</li>'}
          </ul>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/dashboard" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600;">Go to Dashboard</a>
          </div>
        </div>

        <p style="color: #666; font-size: 14px;">You can manage your subscription anytime from your <a href="${process.env.FRONTEND_URL}/dashboard/upgrade" style="color: #2563eb;">account settings</a>.</p>

        <p style="color: #666; font-size: 14px;">If you have any questions, just reply to this email - we're here to help!</p>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
          <p>PromptStack - Built by Kiwis, for Kiwis</p>
          <p>Auckland, New Zealand</p>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Welcome to PromptStack ${tierName}, ${user.name || 'there'}!

Thank you for subscribing to PromptStack ${tierName}. Your payment has been confirmed and all premium features are now unlocked.

Your Subscription Details:
- Plan: ${tierName}
- Price: ${pricingConfig.currencySymbol}${tierPrice}/month (incl. GST)
- Invoice #: ${invoiceNumber}
- Billing: Monthly, starting today

Your PDF invoice is attached to this email.

Go to Dashboard: ${process.env.FRONTEND_URL}/dashboard

You can manage your subscription anytime from your account settings.

PromptStack - Built by Kiwis, for Kiwis
  `;

  try {
    // Generate PDF invoice
    const pdfBuffer = await generateInvoice({
      invoiceNumber,
      date: new Date(),
      customer: {
        name: user.name,
        email: user.email,
      },
      items: [
        {
          description: `PromptStack ${tierName} - Monthly Subscription`,
          amount: tierPrice,
        },
      ],
      periodStart,
      periodEnd,
      isPaid: true,
    });

    // Send email with PDF attachment
    await sendEmailWithAttachments(
      user.email,
      subject,
      html,
      textContent,
      [
        {
          filename: `PromptStack-Invoice-${invoiceNumber}.pdf`,
          content: pdfBuffer,
          mimeType: 'application/pdf',
        },
      ]
    );

    console.log(`Subscription confirmation with invoice ${invoiceNumber} sent to ${user.email}`);
  } catch (error) {
    console.error('Failed to send confirmation email:', error);
  }
}

// Send subscription cancellation email (when subscription period ends)
async function sendSubscriptionCancellationEmail(user) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Subscription Ended</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a365d; margin-bottom: 10px;">PromptStack</h1>
          <p style="color: #666; font-size: 14px;">Built by Kiwis, for Kiwis</p>
        </div>

        <div style="background: #f7fafc; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h2 style="margin-top: 0; color: #2d3748;">Your Subscription Has Ended</h2>
          <p>Hi ${user.name || 'there'},</p>

          <p>Your PromptStack subscription has ended and your account has been moved to the free tier.</p>

          <p>You can still access all free prompts and features. Your saved prompts and custom prompts have been preserved.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/dashboard/upgrade" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600;">Resubscribe</a>
          </div>

          <p>If you'd like to resubscribe at any time, you can do so from your upgrade page.</p>
        </div>

        <p style="color: #666; font-size: 14px;">We'd love to hear your feedback - if there's anything we could have done better, please reply to this email.</p>

        <p style="color: #666; font-size: 14px;">Thank you for being a PromptStack member!</p>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
          <p>PromptStack - Built by Kiwis, for Kiwis</p>
          <p>Auckland, New Zealand</p>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Your Subscription Has Ended

Hi ${user.name || 'there'},

Your PromptStack subscription has ended and your account has been moved to the free tier.

You can still access all free prompts and features. Your saved prompts and custom prompts have been preserved.

If you'd like to resubscribe at any time, visit: ${process.env.FRONTEND_URL}/dashboard/upgrade

We'd love to hear your feedback - if there's anything we could have done better, please reply to this email.

Thank you for being a PromptStack member!

PromptStack - Built by Kiwis, for Kiwis
  `;

  try {
    await sendEmail(
      user.email,
      'Your PromptStack Subscription Has Ended',
      html,
      textContent
    );
  } catch (error) {
    console.error('Failed to send cancellation email:', error);
  }
}

// Generate welcome email HTML with invoice notice (for webhooks)
function generateWelcomeInvoiceEmailHtml(user, tierConfig, invoiceNumber) {
  const tierName = tierConfig?.name || 'Premium';
  const tierPrice = tierConfig?.monthlyPrice || 29;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to PromptStack</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a365d; margin-bottom: 10px;">PromptStack</h1>
          <p style="color: #666; font-size: 14px;">Built by Kiwis, for Kiwis</p>
        </div>

        <div style="background: #f7fafc; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h2 style="margin-top: 0; color: #2d3748;">Welcome to ${tierName}, ${user.name || 'there'}!</h2>
          <p>Thank you for subscribing to PromptStack ${tierName}. Your payment has been confirmed and all premium features are now unlocked.</p>

          <h3 style="color: #2d3748;">Your Subscription Details</h3>
          <ul>
            <li><strong>Plan:</strong> ${tierName}</li>
            <li><strong>Price:</strong> ${pricingConfig.currencySymbol}${tierPrice}/month (incl. GST)</li>
            <li><strong>Invoice #:</strong> ${invoiceNumber}</li>
            <li><strong>Billing:</strong> Monthly, starting today</li>
          </ul>

          <div style="background: #dbeafe; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #1e40af;">
              <strong>Your invoice is attached</strong><br>
              <span style="font-size: 14px;">Please find your PDF invoice attached to this email for your records.</span>
            </p>
          </div>

          <h3 style="color: #2d3748;">What's Now Unlocked</h3>
          <ul>
            ${tierConfig?.features?.map(f => `<li>${f}</li>`).join('\n            ') || '<li>All premium features</li>'}
          </ul>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/dashboard" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600;">Go to Dashboard</a>
          </div>
        </div>

        <p style="color: #666; font-size: 14px;">You can manage your subscription anytime from your <a href="${process.env.FRONTEND_URL}/dashboard/upgrade" style="color: #2563eb;">account settings</a>.</p>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
          <p>PromptStack - Built by Kiwis, for Kiwis</p>
          <p>Auckland, New Zealand</p>
        </div>
      </body>
    </html>
  `;
}

// Generate monthly invoice email HTML (for webhooks)
function generateMonthlyInvoiceEmailHtml(user, tierName, tierPrice, periodStart, periodEnd, invoiceNumber) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Monthly Invoice</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a365d; margin-bottom: 10px;">PromptStack</h1>
          <p style="color: #666; font-size: 14px;">Built by Kiwis, for Kiwis</p>
        </div>

        <div style="background: #f7fafc; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h2 style="margin-top: 0; color: #2d3748;">Your Monthly Invoice</h2>
          <p>Hi ${user.name || 'there'},</p>

          <p>Thank you for being a PromptStack ${tierName} subscriber! Your monthly payment has been processed successfully.</p>

          <h3 style="color: #2d3748;">Invoice Details</h3>
          <ul>
            <li><strong>Invoice #:</strong> ${invoiceNumber}</li>
            <li><strong>Plan:</strong> ${tierName}</li>
            <li><strong>Amount:</strong> ${pricingConfig.currencySymbol}${tierPrice} (incl. GST)</li>
            <li><strong>Period:</strong> ${formatDate(periodStart)} - ${formatDate(periodEnd)}</li>
            <li><strong>Status:</strong> <span style="color: #059669;">Paid</span></li>
          </ul>

          <div style="background: #dbeafe; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #1e40af;">
              <strong>Your invoice is attached</strong><br>
              <span style="font-size: 14px;">Please find your PDF invoice attached to this email for your records.</span>
            </p>
          </div>
        </div>

        <p style="color: #666; font-size: 14px;">You can manage your subscription anytime from your <a href="${process.env.FRONTEND_URL}/dashboard/upgrade" style="color: #2563eb;">account settings</a>.</p>

        <p style="color: #666; font-size: 14px;">Thanks for using PromptStack!</p>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
          <p>PromptStack - Built by Kiwis, for Kiwis</p>
          <p>Auckland, New Zealand</p>
        </div>
      </body>
    </html>
  `;
}

// Send cancellation scheduled email (subscription still active until end of period)
async function sendCancellationScheduledEmail(user, endDate) {
  const formattedEndDate = formatDate(endDate);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cancellation Confirmed</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a365d; margin-bottom: 10px;">PromptStack</h1>
          <p style="color: #666; font-size: 14px;">Built by Kiwis, for Kiwis</p>
        </div>

        <div style="background: #f7fafc; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h2 style="margin-top: 0; color: #2d3748;">Cancellation Confirmed</h2>
          <p>Hi ${user.name || 'there'},</p>

          <p>We've received your cancellation request. Your subscription has been scheduled for cancellation.</p>

          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #92400e;">Important: Your Access Continues</h3>
            <p style="margin-bottom: 0; color: #92400e;">
              Your premium access will remain active until <strong>${formattedEndDate}</strong>.
              You can continue to use all premium features until this date.
            </p>
          </div>

          <p>After ${formattedEndDate}:</p>
          <ul>
            <li>Your account will revert to the free tier</li>
            <li>Premium prompts and questions will be locked</li>
            <li>You can still access all free content</li>
            <li>Your saved prompts and custom prompts will be preserved</li>
          </ul>

          <h3 style="color: #2d3748;">Changed your mind?</h3>
          <p>You can reactivate your subscription anytime before ${formattedEndDate} to continue enjoying premium features without interruption.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/dashboard/upgrade" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600;">Reactivate Subscription</a>
          </div>
        </div>

        <p style="color: #666; font-size: 14px;">We're sorry to see you go. If there's anything we could have done better, please reply to this email - we value your feedback.</p>

        <p style="color: #666; font-size: 14px;">Thank you for being part of PromptStack!</p>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
          <p>PromptStack - Built by Kiwis, for Kiwis</p>
          <p>Auckland, New Zealand</p>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Cancellation Confirmed

Hi ${user.name || 'there'},

We've received your cancellation request. Your subscription has been scheduled for cancellation.

Important: Your premium access will remain active until ${formattedEndDate}. You can continue to use all premium features until this date.

After ${formattedEndDate}:
- Your account will revert to the free tier
- Premium prompts and questions will be locked
- You can still access all free content
- Your saved prompts and custom prompts will be preserved

Changed your mind? You can reactivate your subscription anytime before ${formattedEndDate}: ${process.env.FRONTEND_URL}/dashboard/upgrade

We're sorry to see you go. If there's anything we could have done better, please reply to this email.

Thank you for being part of PromptStack!

PromptStack - Built by Kiwis, for Kiwis
  `;

  try {
    await sendEmail(
      user.email,
      'Your PromptStack Cancellation is Confirmed',
      html,
      textContent
    );
  } catch (error) {
    console.error('Failed to send cancellation scheduled email:', error);
  }
}

// Send payment failed email
async function sendPaymentFailedEmail(user) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Failed</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a365d; margin-bottom: 10px;">PromptStack</h1>
          <p style="color: #666; font-size: 14px;">Built by Kiwis, for Kiwis</p>
        </div>

        <div style="background: #f7fafc; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h2 style="margin-top: 0; color: #2d3748;">Payment Failed</h2>
          <p>Hi ${user.name || 'there'},</p>

          <p>We were unable to process your payment for your PromptStack subscription. This could be due to:</p>

          <ul>
            <li>Insufficient funds</li>
            <li>Expired card</li>
            <li>Card declined by your bank</li>
          </ul>

          <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #991b1b;">Action Required</h3>
            <p style="margin-bottom: 0; color: #991b1b;">Please update your payment method to avoid losing access to your premium features.</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/dashboard/upgrade" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600;">Update Payment Method</a>
          </div>
        </div>

        <p style="color: #666; font-size: 14px;">If you have any questions or need assistance, please reply to this email.</p>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
          <p>PromptStack - Built by Kiwis, for Kiwis</p>
          <p>Auckland, New Zealand</p>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Payment Failed

Hi ${user.name || 'there'},

We were unable to process your payment for your PromptStack subscription. This could be due to:
- Insufficient funds
- Expired card
- Card declined by your bank

Action Required: Please update your payment method to avoid losing access to your premium features.

Update Payment Method: ${process.env.FRONTEND_URL}/dashboard/upgrade

If you have any questions or need assistance, please reply to this email.

PromptStack - Built by Kiwis, for Kiwis
  `;

  try {
    await sendEmail(
      user.email,
      'Action Required: Payment Failed for PromptStack',
      html,
      textContent
    );
  } catch (error) {
    console.error('Failed to send payment failed email:', error);
  }
}

module.exports = router;
