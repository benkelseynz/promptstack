'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { X, AlertTriangle, Loader2, Calendar, CheckCircle } from 'lucide-react';

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancelled: (endsAt: string) => void;
}

const CANCELLATION_REASONS = [
  { id: 'too_expensive', label: 'Too expensive' },
  { id: 'not_using', label: 'Not using it enough' },
  { id: 'missing_features', label: 'Missing features I need' },
  { id: 'found_alternative', label: 'Found an alternative' },
  { id: 'temporary', label: 'Just need a break' },
  { id: 'other', label: 'Other reason' },
];

export default function CancelSubscriptionModal({
  isOpen,
  onClose,
  onCancelled,
}: CancelSubscriptionModalProps) {
  const [step, setStep] = useState<'reason' | 'confirm' | 'success'>('reason');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [endsAt, setEndsAt] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCancel = async () => {
    if (!selectedReason) {
      setError('Please select a reason for cancelling');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.cancelSubscription(
        CANCELLATION_REASONS.find(r => r.id === selectedReason)?.label || selectedReason,
        feedback
      );

      setEndsAt(result.endsAt);
      setStep('success');
      onCancelled(result.endsAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('reason');
    setSelectedReason('');
    setFeedback('');
    setError(null);
    setEndsAt(null);
    onClose();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NZ', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">
              {step === 'success' ? 'Cancellation Confirmed' : 'Cancel Subscription'}
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
            {step === 'reason' && (
              <>
                <div className="flex items-start gap-4 mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-800 font-medium">Before you go...</p>
                    <p className="text-amber-700 text-sm mt-1">
                      We'd love to understand why you're leaving so we can improve.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <label className="block text-sm font-medium text-gray-700">
                    Why are you cancelling?
                  </label>
                  {CANCELLATION_REASONS.map((reason) => (
                    <label
                      key={reason.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedReason === reason.id
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={reason.id}
                        checked={selectedReason === reason.id}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-gray-700">{reason.label}</span>
                    </label>
                  ))}
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional feedback (optional)
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Tell us how we could improve..."
                    rows={3}
                    className="input-field"
                  />
                </div>

                {error && (
                  <p className="text-red-600 text-sm mb-4">{error}</p>
                )}

                <div className="flex gap-3">
                  <button onClick={handleClose} className="btn-secondary flex-1">
                    Keep Subscription
                  </button>
                  <button
                    onClick={() => setStep('confirm')}
                    disabled={!selectedReason}
                    className="btn-primary flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {step === 'confirm' && (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Confirm Cancellation
                  </h3>
                  <p className="text-gray-600">
                    Your subscription will remain active until the end of your current billing period.
                    After that, you'll lose access to premium features.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">What happens next:</h4>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      Keep access until your billing period ends
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      No more charges after cancellation
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      You can resubscribe anytime
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-600">!</span>
                      Premium prompts will be locked after period ends
                    </li>
                  </ul>
                </div>

                {error && (
                  <p className="text-red-600 text-sm mb-4">{error}</p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('reason')}
                    className="btn-secondary flex-1"
                    disabled={loading}
                  >
                    Go Back
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="btn-primary flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Cancelling...
                      </>
                    ) : (
                      'Confirm Cancellation'
                    )}
                  </button>
                </div>
              </>
            )}

            {step === 'success' && endsAt && (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Cancellation Confirmed
                  </h3>
                  <p className="text-gray-600">
                    Your subscription has been scheduled for cancellation.
                  </p>
                </div>

                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
                  <p className="text-primary-800 text-center">
                    <strong>Your premium access continues until:</strong>
                    <br />
                    <span className="text-lg">{formatDate(endsAt)}</span>
                  </p>
                </div>

                <p className="text-sm text-gray-500 text-center mb-6">
                  Changed your mind? You can reactivate your subscription anytime before this date.
                </p>

                <button onClick={handleClose} className="btn-primary w-full">
                  Got it
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
