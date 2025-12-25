'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProfileQuestionnaire from './ProfileQuestionnaire';

interface ProfileReminderProps {
  variant?: 'banner' | 'welcome';
}

export default function ProfileReminder({ variant = 'banner' }: ProfileReminderProps) {
  const { user, profileStatus } = useAuth();
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Check localStorage for dismissed state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissedUntil = localStorage.getItem('profileReminderDismissed');
      if (dismissedUntil) {
        const dismissedDate = new Date(dismissedUntil);
        if (dismissedDate > new Date()) {
          setDismissed(true);
        } else {
          localStorage.removeItem('profileReminderDismissed');
        }
      }
    }
  }, []);

  // Don't show if no user, profile is complete, or dismissed
  if (!user || !profileStatus || profileStatus.completed || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    // Dismiss for 7 days
    const dismissUntil = new Date();
    dismissUntil.setDate(dismissUntil.getDate() + 7);
    localStorage.setItem('profileReminderDismissed', dismissUntil.toISOString());
    setDismissed(true);
  };

  const handleComplete = () => {
    setShowQuestionnaire(false);
  };

  const completedSections = profileStatus.sectionsCompleted.length;
  const totalSections = profileStatus.sections.length;
  const coreSectionsCompleted = profileStatus.sections
    .filter(s => s.isCore && s.completed).length;
  const totalCoreSections = profileStatus.sections.filter(s => s.isCore).length;

  // Welcome variant for first-time users (no sections completed)
  if (variant === 'welcome' && completedSections === 0) {
    return (
      <>
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-1">
                Welcome to PromptStack, {user.name?.split(' ')[0] || 'there'}!
              </h3>
              <p className="text-primary-100 text-sm mb-4">
                Complete your profile to get personalized prompts that match your role,
                communication style, and preferences. It only takes a few minutes and makes
                a big difference.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowQuestionnaire(true)}
                  className="bg-white text-primary-700 px-4 py-2 rounded-lg font-medium hover:bg-primary-50 transition-colors"
                >
                  Complete Your Profile
                </button>
                <button
                  onClick={handleDismiss}
                  className="text-primary-200 hover:text-white text-sm"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Questionnaire Modal */}
        {showQuestionnaire && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <ProfileQuestionnaire
              isModal
              onComplete={handleComplete}
              onClose={() => setShowQuestionnaire(false)}
            />
          </div>
        )}
      </>
    );
  }

  // Banner variant for returning users with incomplete profile
  return (
    <>
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-amber-800">
                <span className="font-medium">Your profile is {profileStatus.completionPercentage}% complete.</span>
                {coreSectionsCompleted < totalCoreSections && (
                  <span className="ml-1">
                    Complete the core sections to unlock personalized prompts.
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQuestionnaire(true)}
              className="text-amber-700 hover:text-amber-900 font-medium text-sm"
            >
              Continue Setup
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 text-amber-400 hover:text-amber-600 rounded"
              title="Dismiss for 7 days"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mini progress bar */}
        <div className="mt-2 flex gap-1">
          {profileStatus.sections.map((section) => (
            <div
              key={section.name}
              className={`flex-1 h-1 rounded-full ${
                section.completed
                  ? 'bg-amber-500'
                  : section.isCore
                  ? 'bg-amber-200'
                  : 'bg-amber-100'
              }`}
              title={`${section.name}${section.isCore ? ' (Core)' : ''}: ${section.completed ? 'Complete' : 'Incomplete'}`}
            />
          ))}
        </div>
      </div>

      {/* Questionnaire Modal */}
      {showQuestionnaire && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <ProfileQuestionnaire
            isModal
            onComplete={handleComplete}
            onClose={() => setShowQuestionnaire(false)}
            initialSection={completedSections}
          />
        </div>
      )}
    </>
  );
}
