'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { PricingConfig, PricingTier } from '@/types';
import {
  Check,
  X,
  Sparkles,
  Loader2,
  Clock,
  ExternalLink,
  AlertCircle,
  CreditCard,
  Settings,
} from 'lucide-react';

export default function UpgradePage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check for cancelled checkout
  const cancelled = searchParams.get('cancelled');

  useEffect(() => {
    const loadPricing = async () => {
      try {
        const data = await api.getPricing();
        setPricing(data);
      } catch (err) {
        console.error('Failed to load pricing:', err);
      } finally {
        setLoading(false);
      }
    };
    loadPricing();
  }, []);

  const handleSelectTier = async (tierId: string) => {
    if (tierId === 'free') return;
    if (tierId !== 'professional' && tierId !== 'enterprise') return;

    setCheckoutLoading(tierId);
    setError(null);

    try {
      const { url } = await api.createCheckoutSession(tierId);

      // Open Stripe checkout in a new tab
      window.open(url, '_blank');
    } catch (err) {
      console.error('Failed to create checkout session:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout. Please try again.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { url } = await api.createPortalSession();
      window.open(url, '_blank');
    } catch (err) {
      console.error('Failed to create portal session:', err);
      setError('Failed to open subscription management. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!pricing) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load pricing information.</p>
      </div>
    );
  }

  const hasPaidSubscription = user?.tier === 'professional' || user?.tier === 'enterprise';

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          {hasPaidSubscription ? 'Manage Your Subscription' : 'Upgrade Your PromptStack'}
        </h1>
        <p className="text-lg text-gray-600">
          {hasPaidSubscription
            ? `You're on the ${pricing?.tiers.find(t => t.id === user.tier)?.name} plan`
            : 'Unlock premium prompts and supercharge your AI productivity'}
        </p>
      </div>

      {/* Cancelled checkout notification */}
      {cancelled && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-amber-800">
            Your checkout was cancelled. No charges were made. Feel free to try again when you are ready.
          </p>
        </div>
      )}

      {/* Error notification */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Subscription management for existing subscribers */}
      {hasPaidSubscription && (
        <div className="mb-8 p-6 bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Your Subscription</h3>
                <p className="text-gray-600 text-sm">
                  Manage billing, update payment method, or cancel subscription
                </p>
              </div>
            </div>
            <button
              onClick={handleManageSubscription}
              className="btn-secondary flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Manage Subscription
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <button
          onClick={() => setBillingCycle('monthly')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            billingCycle === 'monthly'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingCycle('annual')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            billingCycle === 'annual'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Annual
          <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
            Save {pricing.annualDiscount}%
          </span>
        </button>
      </div>

      {/* Pricing cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {pricing.tiers.map((tier) => (
          <PricingCard
            key={tier.id}
            tier={tier}
            currency={pricing.currencySymbol}
            billingCycle={billingCycle}
            annualDiscount={pricing.annualDiscount}
            isCurrentTier={user?.tier === tier.id}
            isLoading={checkoutLoading === tier.id}
            onSelect={() => handleSelectTier(tier.id)}
          />
        ))}
      </div>

      {/* Features comparison */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Compare Plans</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Feature</th>
                {pricing.tiers.map((tier) => (
                  <th key={tier.id} className="text-center py-3 px-4 font-medium text-gray-700">
                    {tier.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3 px-4 text-gray-600">Free prompts</td>
                <td className="text-center py-3 px-4"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                <td className="text-center py-3 px-4"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                <td className="text-center py-3 px-4"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4 text-gray-600">Premium prompts</td>
                <td className="text-center py-3 px-4"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
                <td className="text-center py-3 px-4"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                <td className="text-center py-3 px-4"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4 text-gray-600">Saved prompts</td>
                <td className="text-center py-3 px-4 text-gray-600">10</td>
                <td className="text-center py-3 px-4 text-gray-600">Unlimited</td>
                <td className="text-center py-3 px-4 text-gray-600">Unlimited</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4 text-gray-600">Custom prompts</td>
                <td className="text-center py-3 px-4 text-gray-600">5</td>
                <td className="text-center py-3 px-4 text-gray-600">Unlimited</td>
                <td className="text-center py-3 px-4 text-gray-600">Unlimited</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4 text-gray-600">AI Prompt Builder</td>
                <td className="text-center py-3 px-4"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
                <td className="text-center py-3 px-4"><Clock className="w-5 h-5 text-amber-500 mx-auto" title="Coming soon" /></td>
                <td className="text-center py-3 px-4"><Clock className="w-5 h-5 text-amber-500 mx-auto" title="Coming soon" /></td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4 text-gray-600">Team sharing</td>
                <td className="text-center py-3 px-4"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
                <td className="text-center py-3 px-4"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
                <td className="text-center py-3 px-4"><Clock className="w-5 h-5 text-amber-500 mx-auto" title="Coming soon" /></td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-gray-600">Support</td>
                <td className="text-center py-3 px-4 text-gray-600">Email</td>
                <td className="text-center py-3 px-4 text-gray-600">Priority</td>
                <td className="text-center py-3 px-4 text-gray-600">Dedicated</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-gray-500 mt-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          Coming soon features are currently in development
        </p>
      </div>

      {/* Refund policy */}
      <div className="text-center mt-8 text-gray-500 text-sm">
        {pricing.refundPolicy}
      </div>

      {/* Payment security notice */}
      <div className="text-center mt-4 text-gray-400 text-xs flex items-center justify-center gap-2">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Secure payments powered by Stripe
      </div>
    </div>
  );
}

function PricingCard({
  tier,
  currency,
  billingCycle,
  annualDiscount,
  isCurrentTier,
  isLoading,
  onSelect,
}: {
  tier: PricingTier;
  currency: string;
  billingCycle: 'monthly' | 'annual';
  annualDiscount: number;
  isCurrentTier: boolean;
  isLoading: boolean;
  onSelect: () => void;
}) {
  const monthlyPrice = tier.monthlyPrice;
  const annualPrice = Math.round(monthlyPrice * 12 * (1 - annualDiscount / 100));
  const displayPrice = billingCycle === 'annual' ? Math.round(annualPrice / 12) : monthlyPrice;

  const hasDiscount = tier.discount && tier.originalPrice;
  const discountValid = tier.discount?.validUntil
    ? new Date(tier.discount.validUntil) > new Date()
    : true;

  return (
    <div
      className={`card relative ${
        tier.highlighted ? 'ring-2 ring-primary-600 shadow-lg' : ''
      }`}
    >
      {tier.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary-600 text-white text-xs font-medium px-3 py-1 rounded-full">
            {tier.badge}
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{tier.name}</h3>
        
        <div className="flex items-baseline justify-center gap-1">
          {hasDiscount && discountValid && (
            <span className="text-gray-400 line-through text-lg">
              {currency}{tier.originalPrice}
            </span>
          )}
          <span className="text-4xl font-bold text-gray-900">
            {currency}{displayPrice}
          </span>
          {monthlyPrice > 0 && (
            <span className="text-gray-500">/mo</span>
          )}
        </div>

        {hasDiscount && discountValid && tier.discount && (
          <div className="mt-2">
            <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded-full">
              {tier.discount.label || `${tier.discount.percentage}% off`}
            </span>
          </div>
        )}

        {billingCycle === 'annual' && monthlyPrice > 0 && (
          <p className="text-sm text-gray-500 mt-2">
            Billed as {currency}{annualPrice}/year
          </p>
        )}
      </div>

      <ul className="space-y-3 mb-6">
        {tier.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span className="text-gray-600 text-sm">{feature}</span>
          </li>
        ))}
        {tier.limitations?.map((limitation, index) => (
          <li key={`lim-${index}`} className="flex items-start gap-2">
            <X className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
            <span className="text-gray-400 text-sm">{limitation}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        disabled={isCurrentTier || isLoading}
        className={`w-full flex items-center justify-center gap-2 ${
          tier.highlighted ? 'btn-primary' : 'btn-secondary'
        } ${isCurrentTier || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Opening checkout...
          </>
        ) : isCurrentTier ? (
          'Current Plan'
        ) : tier.id === 'free' ? (
          'Get Started'
        ) : (
          <>
            Upgrade
            <ExternalLink className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
}
