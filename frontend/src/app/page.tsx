'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { PricingConfig } from '@/types';
import { ArrowRight, Sparkles, Shield, Zap, Users, Check, X, ChevronDown, ChevronUp, Loader2, MessageSquare } from 'lucide-react';

export default function LandingPage() {
  const { user } = useAuth();
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [expandedTiers, setExpandedTiers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadPricing = async () => {
      try {
        const data = await api.getPricing();
        setPricing(data);
      } catch (err) {
        console.error('Failed to load pricing:', err);
      }
    };
    loadPricing();
  }, []);

  const toggleTierExpanded = (tierId: string) => {
    setExpandedTiers(prev => ({ ...prev, [tierId]: !prev[tierId] }));
  };

  return (
    <div className="min-h-screen bg-snow-soft relative overflow-hidden">
      {/* Background gradient blobs for glassmorphism effect */}
      <div className="gradient-blob gradient-blob-1"></div>
      <div className="gradient-blob gradient-blob-2"></div>
      <div className="gradient-blob gradient-blob-3"></div>
      <div className="gradient-blob gradient-blob-4"></div>
      <div className="gradient-blob gradient-blob-5"></div>

      {/* Header */}
      <header className="header-frost fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-text-heading">PromptStack</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="#features" className="text-text-muted hover:text-primary-600 transition-colors">
                Features
              </Link>
              <Link href="#pricing" className="text-text-muted hover:text-primary-600 transition-colors">
                Pricing
              </Link>
              {user ? (
                <Link href="/dashboard" className="btn-primary flex items-center gap-2">
                  Go to Dashboard <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link href="/login" className="text-text-muted hover:text-primary-600 transition-colors">
                    Log in
                  </Link>
                  <Link href="/signup" className="btn-primary">
                    Get Started
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-24 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm text-primary-700 px-5 py-2.5 rounded-full text-sm font-medium mb-10 border border-ice-300">
            <span>🥝</span>
            <span>Built by Kiwis, for Kiwis</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-text-heading mb-8 leading-tight tracking-tight">
            Supercharge Your Work with
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-primary-500 to-frost-500">
              Premium AI Prompts
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-text-body max-w-3xl mx-auto mb-12 leading-relaxed">
            Stop wasting time crafting prompts from scratch. Access our curated library of
            industry-specific AI prompts designed for New Zealand professionals.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center mb-8">
            <Link
              href="/signup"
              className="btn-primary text-lg px-10 py-4 flex items-center justify-center gap-3"
            >
              Start Free <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="#features"
              className="btn-secondary text-lg px-10 py-4"
            >
              See How It Works
            </Link>
          </div>

          <p className="text-text-muted">
            No credit card required. Free tier includes access to 50+ prompts.
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold text-text-heading mb-6">
              Everything You Need to Work Smarter
            </h2>
            <p className="text-xl text-text-body max-w-2xl mx-auto">
              Our platform is designed specifically for New Zealand business professionals
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10 mb-20">
            <div className="glass-card cursor-default">
              <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center mb-6">
                <Zap className="w-7 h-7 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-text-heading mb-3">
                Industry-Specific Prompts
              </h3>
              <p className="text-text-body leading-relaxed">
                Curated prompts for finance, technology, marketing, healthcare and more.
                Each tailored to NZ business context.
              </p>
            </div>

            <div className="glass-card cursor-default">
              <div className="w-14 h-14 bg-gradient-to-br from-frost-100 to-frost-200 rounded-2xl flex items-center justify-center mb-6">
                <MessageSquare className="w-7 h-7 text-frost-500" />
              </div>
              <h3 className="text-xl font-semibold text-text-heading mb-3">
                Populate and Copy
              </h3>
              <p className="text-text-body leading-relaxed">
                Fill in placeholders like [Company Name] or [Client] and copy
                ready-to-use prompts in seconds.
              </p>
            </div>

            <div className="glass-card cursor-default">
              <div className="w-14 h-14 bg-gradient-to-br from-ice-200 to-ice-300 rounded-2xl flex items-center justify-center mb-6">
                <Shield className="w-7 h-7 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-text-heading mb-3">
                Save and Organise
              </h3>
              <p className="text-text-body leading-relaxed">
                Build your own library of saved and custom prompts. Access them anytime,
                anywhere.
              </p>
            </div>
          </div>

          {/* Coming Soon Features */}
          <div className="glass-card cursor-default">
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-frost-400" />
              <span className="text-sm font-medium text-primary-600 uppercase tracking-wide">
                Coming Soon
              </span>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <h4 className="font-semibold text-text-heading mb-2">AI Prompt Builder</h4>
                <p className="text-text-body">
                  Generate custom prompts using AI assistance
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-text-heading mb-2">Team Workspaces</h4>
                <p className="text-text-body">
                  Share prompts across your organisation
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-text-heading mb-2">API Access</h4>
                <p className="text-text-body">
                  Integrate prompts into your own applications
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quote Section - Light themed with frost panel */}
      <section className="py-24 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="frost-panel text-center py-16 px-8">
            <blockquote className="mb-12">
              <p className="text-2xl sm:text-3xl md:text-4xl font-light text-text-heading leading-relaxed">
                &ldquo;In a world where the cost of answers is approaching zero,{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-frost-500 font-medium">
                  the value of the question becomes everything.
                </span>&rdquo;
              </p>
            </blockquote>

            <p className="text-lg text-text-body mb-12 max-w-2xl mx-auto">
              This is why we built PromptStack &mdash; to give you the toolkit for asking better questions.
            </p>

            <div className="flex flex-wrap justify-center gap-12 sm:gap-20">
              <div className="text-center">
                <div className="text-4xl sm:text-5xl font-bold text-primary-700">500+</div>
                <div className="text-text-muted mt-2">Curated Prompts</div>
              </div>
              <div className="text-center">
                <div className="text-4xl sm:text-5xl font-bold text-primary-600">10+</div>
                <div className="text-text-muted mt-2">Industries</div>
              </div>
              <div className="text-center">
                <div className="text-4xl sm:text-5xl font-bold text-frost-500">100%</div>
                <div className="text-text-muted mt-2">NZ Focused</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold text-text-heading mb-6">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-text-body max-w-2xl mx-auto">
              Start free and upgrade when you need more
            </p>
          </div>

          {pricing ? (
            <>
              {/* Billing toggle */}
              <div className="flex items-center justify-center gap-4 mb-12">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-6 py-3 rounded-xl font-medium transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-primary-600 text-white shadow-lg'
                      : 'bg-white text-text-body hover:bg-ice-50 border border-ice-300'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`px-6 py-3 rounded-xl font-medium transition-all ${
                    billingCycle === 'annual'
                      ? 'bg-primary-600 text-white shadow-lg'
                      : 'bg-white text-text-body hover:bg-ice-50 border border-ice-300'
                  }`}
                >
                  Annual
                  <span className="ml-2 text-xs bg-frost-100 text-frost-500 px-2 py-0.5 rounded-full">
                    Save {pricing.annualDiscount}%
                  </span>
                </button>
              </div>

              {/* Pricing cards */}
              <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-20">
                {pricing.tiers.map((tier) => {
                  const monthlyPrice = tier.monthlyPrice;
                  const annualPrice = Math.round(monthlyPrice * 12 * (1 - pricing.annualDiscount / 100));
                  const displayPrice = billingCycle === 'annual' ? Math.round(annualPrice / 12) : monthlyPrice;
                  const hasDiscount = tier.discount && tier.originalPrice;
                  const discountValid = tier.discount?.validUntil
                    ? new Date(tier.discount.validUntil) > new Date()
                    : true;
                  const isExpanded = expandedTiers[tier.id];

                  return (
                    <div
                      key={tier.id}
                      className={`glass-card relative ${
                        tier.highlighted
                          ? 'ring-2 ring-primary-500'
                          : ''
                      }`}
                    >
                      {tier.badge && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="bg-gradient-to-r from-primary-500 to-primary-600 text-white text-xs font-medium px-4 py-1.5 rounded-full shadow-lg">
                            {tier.badge}
                          </span>
                        </div>
                      )}

                      <div className="text-center mb-8">
                        <h3 className="text-2xl font-bold text-text-heading mb-4">{tier.name}</h3>

                        <div className="flex items-baseline justify-center gap-1">
                          {hasDiscount && discountValid && (
                            <span className="text-text-muted line-through text-lg">
                              {pricing.currencySymbol}{tier.originalPrice}
                            </span>
                          )}
                          <span className="text-5xl font-bold text-text-heading">
                            {pricing.currencySymbol}{displayPrice}
                          </span>
                          {monthlyPrice > 0 && (
                            <span className="text-text-muted text-lg">/mo</span>
                          )}
                        </div>

                        {hasDiscount && discountValid && tier.discount && (
                          <div className="mt-3">
                            <span className="bg-frost-100 text-frost-500 text-xs font-medium px-3 py-1 rounded-full">
                              {tier.discount.label || `${tier.discount.percentage}% off`}
                            </span>
                          </div>
                        )}

                        {billingCycle === 'annual' && monthlyPrice > 0 && (
                          <p className="text-sm text-text-muted mt-3">
                            Billed as {pricing.currencySymbol}{annualPrice}/year
                          </p>
                        )}
                      </div>

                      {/* Collapsible features */}
                      <div className="mb-8">
                        <button
                          onClick={() => toggleTierExpanded(tier.id)}
                          className="flex items-center justify-between w-full text-sm font-medium text-text-body mb-4 hover:text-primary-600 transition-colors"
                        >
                          <span>What&apos;s included</span>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>

                        {isExpanded && (
                          <ul className="space-y-3">
                            {tier.features.map((feature, index) => (
                              <li key={index} className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                                <span className="text-text-body">{feature}</span>
                              </li>
                            ))}
                            {tier.limitations?.map((limitation, index) => (
                              <li key={`lim-${index}`} className="flex items-start gap-3">
                                <X className="w-5 h-5 text-ice-400 flex-shrink-0 mt-0.5" />
                                <span className="text-text-muted">{limitation}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <Link
                        href="/signup"
                        className={`block w-full text-center py-3 rounded-xl font-medium transition-all ${
                          tier.highlighted
                            ? 'btn-primary'
                            : 'bg-white text-text-body border border-ice-300 hover:bg-ice-50'
                        }`}
                      >
                        Get Started
                      </Link>
                    </div>
                  );
                })}
              </div>

              {/* Refund policy */}
              <p className="text-center text-text-muted text-sm mb-16">
                {pricing.refundPolicy}
              </p>
            </>
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          )}

          {/* CTA */}
          <div className="text-center pt-8 border-t border-ice-200">
            <h3 className="text-2xl sm:text-3xl font-bold text-text-heading mb-4">
              Ready to Transform Your Workflow?
            </h3>
            <p className="text-lg text-text-body mb-8 max-w-2xl mx-auto">
              Join hundreds of NZ professionals using PromptStack to work smarter with AI.
            </p>
            <Link
              href="/signup"
              className="btn-primary text-lg px-10 py-4 inline-flex items-center gap-3"
            >
              Get Started Free <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 relative z-10 border-t border-ice-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-text-heading">PromptStack</span>
            </div>
            <p className="text-text-muted text-sm">
              © 2024 PromptStack. Built with aroha in Auckland.
            </p>
            <div className="flex gap-6 text-sm text-text-muted">
              <Link href="/privacy" className="hover:text-primary-600 transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-primary-600 transition-colors">Terms</Link>
              <Link href="/contact" className="hover:text-primary-600 transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
