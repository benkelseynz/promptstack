'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { X, Loader2, Mail, CheckCircle, AlertCircle } from 'lucide-react';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
  onInvited: () => void;
}

export default function InviteMemberModal({
  isOpen,
  onClose,
  teamId,
  teamName,
  onInvited,
}: InviteMemberModalProps) {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitedEmail, setInvitedEmail] = useState('');

  if (!isOpen) return null;

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleInvite = async () => {
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.inviteTeamMember(teamId, email.trim().toLowerCase(), role);
      setInvitedEmail(email.trim().toLowerCase());
      setStep('success');
      onInvited();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setEmail('');
    setRole('member');
    setError(null);
    setInvitedEmail('');
    onClose();
  };

  const handleInviteAnother = () => {
    setStep('form');
    setEmail('');
    setRole('member');
    setError(null);
    setInvitedEmail('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">
              {step === 'success' ? 'Invitation Sent!' : 'Invite Team Member'}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {step === 'form' && (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-primary-600" />
                  </div>
                  <p className="text-gray-600">
                    Invite a colleague to join <span className="font-medium">{teamName}</span>
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      className="input-field"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRole('member')}
                        className={`p-4 rounded-lg border-2 text-left transition-colors ${
                          role === 'member'
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-medium text-gray-900">Member</p>
                        <p className="text-sm text-gray-500">
                          Can view and add prompts
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('admin')}
                        className={`p-4 rounded-lg border-2 text-left transition-colors ${
                          role === 'admin'
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-medium text-gray-900">Admin</p>
                        <p className="text-sm text-gray-500">
                          Can also invite and manage members
                        </p>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-amber-800">
                    The invitee will need an <strong>Enterprise subscription</strong> to join the team.
                    They&apos;ll receive an email with instructions.
                  </p>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={handleClose} className="btn-secondary flex-1">
                    Cancel
                  </button>
                  <button
                    onClick={handleInvite}
                    disabled={loading || !email.trim()}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      'Send Invitation'
                    )}
                  </button>
                </div>
              </>
            )}

            {step === 'success' && (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Invitation Sent!
                  </h3>
                  <p className="text-gray-600">
                    We&apos;ve sent an invitation to <span className="font-medium">{invitedEmail}</span>
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">What happens next?</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>1. They&apos;ll receive an email with the team details</li>
                    <li>2. If they don&apos;t have an account, they&apos;ll sign up first</li>
                    <li>3. They&apos;ll subscribe to Enterprise and join your team</li>
                    <li>4. You&apos;ll see them in your member list once they join</li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <button onClick={handleInviteAnother} className="btn-secondary flex-1">
                    Invite Another
                  </button>
                  <button onClick={handleClose} className="btn-primary flex-1">
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
