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
    <div className="snap-y snap-proximity overflow-y-auto h-screen">
      {/* Header */}
      <header className="border-b border-primary-100 bg-white/90 backdrop-blur-sm fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">PromptStack</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="#features" className="text-gray-600 hover:text-primary-600 transition-colors">
                Features
              </Link>
              <Link href="#pricing" className="text-gray-600 hover:text-primary-600 transition-colors">
                Pricing
              </Link>
              {user ? (
                <Link href="/dashboard" className="btn-primary flex items-center gap-2">
                  Go to Dashboard <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link href="/login" className="text-gray-600 hover:text-primary-600 transition-colors">
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

      {/* Hero - Full screen, expanded layout */}
      <section className="min-h-screen flex flex-col justify-center snap-start bg-gradient-to-b from-primary-50/50 via-white to-white pt-16 relative overflow-hidden">
        {/* Subtle cosmic glow effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-[600px] h-[600px] bg-primary-200/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-nebula-200/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 py-20">
          <div className="inline-flex items-center gap-2 bg-primary-100/80 text-primary-700 px-5 py-2.5 rounded-full text-sm font-medium mb-10 backdrop-blur-sm">
            <span>🥝</span>
            <span>Built by Kiwis, for Kiwis</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-8 leading-tight tracking-tight">
            Supercharge Your Work with
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-primary-500 to-nebula-500">
              Premium AI Prompts
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed">
            Stop wasting time crafting prompts from scratch. Access our curated library of
            industry-specific AI prompts designed for New Zealand professionals.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center mb-8">
            <Link
              href="/signup"
              className="btn-primary text-lg px-10 py-4 flex items-center justify-center gap-3 shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 transition-all"
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

          <p className="text-gray-500">
            No credit card required. Free tier includes access to 50+ prompts.
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-gray-400" />
        </div>
      </section>

      {/* Features - Full screen */}
      <section id="features" className="min-h-screen flex items-center snap-start bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Everything You Need to Work Smarter
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our platform is designed specifically for New Zealand business professionals
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10 mb-20">
            <div className="card hover:shadow-lg transition-shadow p-8">
              <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center mb-6">
                <Zap className="w-7 h-7 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Industry-Specific Prompts
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Curated prompts for finance, technology, marketing, healthcare and more.
                Each tailored to NZ business context.
              </p>
            </div>

            <div className="card hover:shadow-lg transition-shadow p-8">
              <div className="w-14 h-14 bg-gradient-to-br from-accent-100 to-accent-200 rounded-2xl flex items-center justify-center mb-6">
                <MessageSquare className="w-7 h-7 text-accent-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Populate and Copy
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Fill in placeholders like [Company Name] or [Client] and copy
                ready-to-use prompts in seconds.
              </p>
            </div>

            <div className="card hover:shadow-lg transition-shadow p-8">
              <div className="w-14 h-14 bg-gradient-to-br from-nebula-100 to-nebula-200 rounded-2xl flex items-center justify-center mb-6">
                <Shield className="w-7 h-7 text-nebula-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Save and Organise
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Build your own library of saved and custom prompts. Access them anytime,
                anywhere.
              </p>
            </div>
          </div>

          {/* Coming Soon Features */}
          <div className="border border-primary-100 rounded-2xl p-10 bg-gradient-to-br from-primary-50/50 to-white">
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-primary-400" />
              <span className="text-sm font-medium text-primary-600 uppercase tracking-wide">
                Coming Soon
              </span>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">AI Prompt Builder</h4>
                <p className="text-gray-600">
                  Generate custom prompts using AI assistance
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Team Workspaces</h4>
                <p className="text-gray-600">
                  Share prompts across your organisation
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">API Access</h4>
                <p className="text-gray-600">
                  Integrate prompts into your own applications
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quote Section - Full screen, expanded, cosmic theme */}
      <section className="min-h-screen flex items-center justify-center snap-start relative overflow-hidden">
        {/* Deep cosmic background */}
        <div className="absolute inset-0 bg-gradient-to-br from-cosmos-950 via-primary-950 to-cosmos-900"></div>

        {/* Animated cosmic elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/6 w-[500px] h-[500px] bg-primary-500/20 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/6 w-[600px] h-[600px] bg-nebula-500/15 rounded-full blur-[120px]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-600/10 rounded-full blur-[150px]"></div>
        </div>

        {/* Star-like particles effect */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-[10%] left-[15%] w-1 h-1 bg-white rounded-full"></div>
          <div className="absolute top-[20%] right-[25%] w-1.5 h-1.5 bg-white rounded-full"></div>
          <div className="absolute top-[70%] left-[10%] w-1 h-1 bg-white rounded-full"></div>
          <div className="absolute top-[60%] right-[15%] w-1 h-1 bg-white rounded-full"></div>
          <div className="absolute top-[30%] left-[70%] w-1.5 h-1.5 bg-white rounded-full"></div>
          <div className="absolute top-[80%] right-[30%] w-1 h-1 bg-white rounded-full"></div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 py-20">
          <blockquote className="mb-16">
            <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light text-white leading-relaxed tracking-tight">
              &ldquo;In a world where the cost of answers is approaching zero,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-accent-400 to-nebula-400 font-medium">
                the value of the question becomes everything.
              </span>&rdquo;
            </p>
          </blockquote>

          <p className="text-xl sm:text-2xl text-gray-300 mb-16 max-w-3xl mx-auto leading-relaxed">
            This is why we built PromptStack &mdash; to give you the toolkit for asking better questions.
          </p>

          <div className="flex flex-wrap justify-center gap-12 sm:gap-20">
            <div className="text-center">
              <div className="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-primary-300 to-primary-500">500+</div>
              <div className="text-gray-400 mt-2">Curated Prompts</div>
            </div>
            <div className="text-center">
              <div className="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-accent-300 to-accent-500">10+</div>
              <div className="text-gray-400 mt-2">Industries</div>
            </div>
            <div className="text-center">
              <div className="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-nebula-300 to-nebula-500">100%</div>
              <div className="text-gray-400 mt-2">NZ Focused</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing + CTA - Combined section */}
      <section id="pricing" className="min-h-screen flex flex-col justify-center snap-start bg-gradient-to-b from-white to-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
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
                      ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`px-6 py-3 rounded-xl font-medium transition-all ${
                    billingCycle === 'annual'
                      ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Annual
                  <span className="ml-2 text-xs bg-accent-100 text-accent-700 px-2 py-0.5 rounded-full">
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
                      className={`card relative p-8 ${
                        tier.highlighted
                          ? 'ring-2 ring-primary-500 shadow-xl shadow-primary-500/10'
                          : 'hover:shadow-lg transition-shadow'
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
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">{tier.name}</h3>

                        <div className="flex items-baseline justify-center gap-1">
                          {hasDiscount && discountValid && (
                            <span className="text-gray-400 line-through text-lg">
                              {pricing.currencySymbol}{tier.originalPrice}
                            </span>
                          )}
                          <span className="text-5xl font-bold text-gray-900">
                            {pricing.currencySymbol}{displayPrice}
                          </span>
                          {monthlyPrice > 0 && (
                            <span className="text-gray-500 text-lg">/mo</span>
                          )}
                        </div>

                        {hasDiscount && discountValid && tier.discount && (
                          <div className="mt-3">
                            <span className="bg-accent-100 text-accent-700 text-xs font-medium px-3 py-1 rounded-full">
                              {tier.discount.label || `${tier.discount.percentage}% off`}
                            </span>
                          </div>
                        )}

                        {billingCycle === 'annual' && monthlyPrice > 0 && (
                          <p className="text-sm text-gray-500 mt-3">
                            Billed as {pricing.currencySymbol}{annualPrice}/year
                          </p>
                        )}
                      </div>

                      {/* Collapsible features */}
                      <div className="mb-8">
                        <button
                          onClick={() => toggleTierExpanded(tier.id)}
                          className="flex items-center justify-between w-full text-sm font-medium text-gray-700 mb-4 hover:text-primary-600 transition-colors"
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
                                <Check className="w-5 h-5 text-accent-500 flex-shrink-0 mt-0.5" />
                                <span className="text-gray-600">{feature}</span>
                              </li>
                            ))}
                            {tier.limitations?.map((limitation, index) => (
                              <li key={`lim-${index}`} className="flex items-start gap-3">
                                <X className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
                                <span className="text-gray-400">{limitation}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <Link
                        href="/signup"
                        className={`block w-full text-center py-3 rounded-xl font-medium transition-all ${
                          tier.highlighted
                            ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-500/25'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Get Started
                      </Link>
                    </div>
                  );
                })}
              </div>

              {/* Refund policy */}
              <p className="text-center text-gray-500 text-sm mb-16">
                {pricing.refundPolicy}
              </p>
            </>
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          )}

          {/* CTA integrated into pricing section */}
          <div className="text-center pt-8 border-t border-gray-200">
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              Ready to Transform Your Workflow?
            </h3>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Join hundreds of NZ professionals using PromptStack to work smarter with AI.
            </p>
            <Link
              href="/signup"
              className="btn-primary text-lg px-10 py-4 inline-flex items-center gap-3 shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 transition-all"
            >
              Get Started Free <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Footer integrated */}
        <footer className="mt-auto pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="border-t border-gray-200 py-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold text-gray-900">PromptStack</span>
                </div>
                <p className="text-gray-500 text-sm">
                  © 2024 PromptStack. Built with aroha in Auckland.
                </p>
                <div className="flex gap-6 text-sm text-gray-500">
                  <Link href="/privacy" className="hover:text-primary-600 transition-colors">Privacy</Link>
                  <Link href="/terms" className="hover:text-primary-600 transition-colors">Terms</Link>
                  <Link href="/contact" className="hover:text-primary-600 transition-colors">Contact</Link>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </section>
    </div>
  );
}
