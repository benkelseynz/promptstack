'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import {
  User,
  Mail,
  Shield,
  Bell,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleResendVerification = async () => {
    if (!user?.email) return;
    setResendLoading(true);
    setResendMessage('');
    
    try {
      await api.resendVerification(user.email);
      setResendMessage('Verification email sent! Check your inbox.');
    } catch (err) {
      setResendMessage('Failed to send. Please try again later.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      {/* Profile Section */}
      <section className="card mb-6">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={user?.name || ''}
              className="input-field bg-gray-50"
              disabled
            />
            <p className="text-xs text-gray-500 mt-1">
              Contact support to update your name
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="flex items-center gap-3">
              <input
                type="email"
                value={user?.email || ''}
                className="input-field bg-gray-50 flex-1"
                disabled
              />
              {user?.emailVerified ? (
                <span className="flex items-center gap-1 text-green-600 text-sm">
                  <Check className="w-4 h-4" />
                  Verified
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Unverified
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Plan
            </label>
            <div className="flex items-center gap-3">
              <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-medium capitalize">
                {user?.tier || 'Free'}
              </span>
              <a
                href="/dashboard/upgrade"
                className="text-primary-600 text-sm hover:text-primary-700"
              >
                View upgrade options
              </a>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Member Since
            </label>
            <p className="text-gray-600">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('en-NZ', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Unknown'}
            </p>
          </div>
        </div>
      </section>

      {/* Email Verification Section */}
      {!user?.emailVerified && (
        <section className="card mb-6 border-amber-200 bg-amber-50">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-gray-900">Email Verification</h2>
          </div>

          <p className="text-gray-600 mb-4">
            Your email address has not been verified yet. Please check your inbox for a
            verification link, or request a new one below.
          </p>

          {resendMessage && (
            <div
              className={`text-sm mb-4 ${
                resendMessage.includes('sent') ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {resendMessage}
            </div>
          )}

          <button
            onClick={handleResendVerification}
            disabled={resendLoading}
            className="btn-secondary flex items-center gap-2"
          >
            {resendLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Mail className="w-5 h-5" />
            )}
            Resend Verification Email
          </button>
        </section>
      )}

      {/* Security Section */}
      <section className="card mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Security</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium text-gray-900">Password</p>
              <p className="text-sm text-gray-500">Change your account password</p>
            </div>
            <button className="btn-secondary text-sm" disabled>
              Coming Soon
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">Two-Factor Authentication</p>
              <p className="text-sm text-gray-500">Add an extra layer of security</p>
            </div>
            <button className="btn-secondary text-sm" disabled>
              Coming Soon
            </button>
          </div>
        </div>
      </section>

      {/* Notifications Section */}
      <section className="card mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium text-gray-900">New Prompt Alerts</p>
              <p className="text-sm text-gray-500">
                Get notified when new prompts are added to your industries
              </p>
            </div>
            <span className="text-sm text-gray-500">Coming Soon</span>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">Product Updates</p>
              <p className="text-sm text-gray-500">
                Receive updates about new features and improvements
              </p>
            </div>
            <span className="text-sm text-gray-500">Coming Soon</span>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="card border-red-200">
        <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Delete Account</p>
            <p className="text-sm text-gray-500">
              Permanently delete your account and all data
            </p>
          </div>
          <button className="btn-secondary text-red-600 border-red-300 hover:bg-red-50" disabled>
            Coming Soon
          </button>
        </div>
      </section>
    </div>
  );
}
