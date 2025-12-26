'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import {
  CheckCircle,
  Sparkles,
  Library,
  HelpCircle,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export default function UpgradeSuccessPage() {
  const { refreshUser } = useAuth();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verify the checkout session and activate subscription
  useEffect(() => {
    const activateSubscription = async () => {
      if (!sessionId) {
        setError('No session ID found. Please contact support if you completed payment.');
        setProcessing(false);
        return;
      }

      try {
        // Verify the session and activate the subscription
        await api.verifyCheckoutSession(sessionId);

        // Refresh user data to get updated tier
        await refreshUser();
      } catch (err) {
        console.error('Failed to activate subscription:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to activate subscription. Please refresh the page or contact support.'
        );
      } finally {
        setProcessing(false);
      }
    };

    activateSubscription();
  }, [sessionId, refreshUser]);

  return (
    <div className="max-w-2xl mx-auto py-12">
      <div className="text-center mb-10">
        {processing ? (
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
        ) : (
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        )}

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          {processing
            ? 'Processing your subscription...'
            : error
            ? 'Something went wrong'
            : 'Welcome to Premium!'}
        </h1>
        <p className="text-lg text-gray-600">
          {processing
            ? 'Just a moment while we activate your account...'
            : error
            ? error
            : 'Your subscription is now active. All premium features have been unlocked!'}
        </p>
      </div>

      {!processing && !error && (
        <>
          {/* Celebration card */}
          <div className="card bg-gradient-to-r from-primary-50 to-purple-50 border-primary-200 mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Your Premium Benefits</h2>
                <p className="text-gray-600 text-sm">Here's what you can now access</p>
              </div>
            </div>

            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">Access to all premium prompts and templates</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">Access to all premium follow-up questions</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">Unlimited saved prompts</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">Unlimited custom prompts</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">Priority support</span>
              </li>
            </ul>
          </div>

          {/* Quick actions */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <Link
              href="/dashboard"
              className="card hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                  <Library className="w-6 h-6 text-primary-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Browse Prompts</h3>
                  <p className="text-sm text-gray-500">Explore all premium prompts</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
              </div>
            </Link>

            <Link
              href="/dashboard/questions"
              className="card hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <HelpCircle className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Questions Library</h3>
                  <p className="text-sm text-gray-500">Access all follow-up questions</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
              </div>
            </Link>
          </div>

          {/* Confirmation email note */}
          <div className="text-center text-gray-500 text-sm">
            <p>A confirmation email has been sent to your email address.</p>
            <p className="mt-1">
              Need help?{' '}
              <a href="mailto:support@promptstack.co.nz" className="text-primary-600 hover:text-primary-700">
                Contact support
              </a>
            </p>
          </div>
        </>
      )}

      {/* Error state actions */}
      {!processing && error && (
        <div className="text-center">
          <button
            onClick={() => window.location.reload()}
            className="btn-primary mb-4"
          >
            Try Again
          </button>
          <p className="text-gray-500 text-sm">
            If the problem persists, please{' '}
            <a href="mailto:support@promptstack.co.nz" className="text-primary-600 hover:text-primary-700">
              contact support
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
