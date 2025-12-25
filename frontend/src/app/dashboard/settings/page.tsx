'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import ProfileQuestionnaire from '@/components/ProfileQuestionnaire';
import {
  User,
  Mail,
  Shield,
  Bell,
  Loader2,
  Check,
  AlertCircle,
  UserCog,
  ChevronRight,
} from 'lucide-react';

export default function SettingsPage() {
  const { user, profileStatus, refreshUser, refreshProfileStatus } = useAuth();
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [editingSection, setEditingSection] = useState<number | null>(null);

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

      {/* Profile Personalization Section */}
      <section className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <UserCog className="w-5 h-5 text-gray-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Profile Personalization</h2>
              <p className="text-sm text-gray-500">
                Customize how PromptStack generates prompts for you
              </p>
            </div>
          </div>
          {profileStatus && (
            <div className="text-right">
              <span
                className={`text-sm font-medium ${
                  profileStatus.completed ? 'text-green-600' : 'text-amber-600'
                }`}
              >
                {profileStatus.completionPercentage}% Complete
              </span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {profileStatus && (
          <div className="mb-4">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  profileStatus.completed ? 'bg-green-500' : 'bg-primary-600'
                }`}
                style={{ width: `${profileStatus.completionPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Section list */}
        <div className="space-y-2">
          {[
            { id: 'role', name: 'Your Role & Responsibilities', index: 0 },
            { id: 'communication', name: 'Communication Style', index: 1 },
            { id: 'writingStyle', name: 'Writing Style', index: 2 },
            { id: 'workingStyle', name: 'Working Style & Workflow', index: 3 },
            { id: 'formatting', name: 'Output Formatting', index: 4 },
            { id: 'personal', name: 'Personal Context', index: 5 },
          ].map((section) => {
            const isCompleted = profileStatus?.sectionsCompleted.includes(section.id);
            const isCore = ['role', 'communication', 'writingStyle'].includes(section.id);

            return (
              <button
                key={section.id}
                onClick={() => {
                  setEditingSection(section.index);
                  setShowQuestionnaire(true);
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <span className="w-2 h-2 bg-current rounded-full" />
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">{section.name}</span>
                    {isCore && !isCompleted && (
                      <span className="ml-2 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                        Core
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3">
          {!profileStatus?.completed ? (
            <button
              onClick={() => {
                setEditingSection(null);
                setShowQuestionnaire(true);
              }}
              className="btn-primary"
            >
              {profileStatus?.sectionsCompleted.length === 0
                ? 'Start Profile Setup'
                : 'Continue Setup'}
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingSection(0);
                setShowQuestionnaire(true);
              }}
              className="btn-secondary"
            >
              Edit Profile
            </button>
          )}
        </div>
      </section>

      {/* Questionnaire Modal */}
      {showQuestionnaire && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <ProfileQuestionnaire
            isModal
            onComplete={() => {
              setShowQuestionnaire(false);
              refreshProfileStatus();
            }}
            onClose={() => setShowQuestionnaire(false)}
            initialSection={editingSection ?? (profileStatus?.sectionsCompleted.length || 0)}
          />
        </div>
      )}

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
