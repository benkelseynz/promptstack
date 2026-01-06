'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { X, Loader2, UserPlus, CheckCircle, AlertCircle } from 'lucide-react';
import type { TeamSummary } from '@/types';

interface JoinTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoined: (team: TeamSummary) => void;
}

export default function JoinTeamModal({
  isOpen,
  onClose,
  onJoined,
}: JoinTeamModalProps) {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [teamName, setTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinedTeam, setJoinedTeam] = useState<TeamSummary | null>(null);

  if (!isOpen) return null;

  const formatTeamCode = (value: string) => {
    // Remove non-alphanumeric characters and convert to uppercase
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    // Insert hyphen after 4 characters
    if (cleaned.length > 4) {
      return cleaned.slice(0, 4) + '-' + cleaned.slice(4, 8);
    }
    return cleaned;
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTeamCode(e.target.value);
    if (formatted.length <= 9) { // XXXX-XXXX = 9 chars
      setTeamCode(formatted);
    }
  };

  const handleJoin = async () => {
    if (!teamName.trim()) {
      setError('Please enter the team name');
      return;
    }

    if (teamCode.length !== 9) {
      setError('Please enter a valid team code (format: XXXX-XXXX)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.joinTeam(teamName.trim(), teamCode);
      setJoinedTeam(result.team);
      setStep('success');
      onJoined(result.team);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join team');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setTeamName('');
    setTeamCode('');
    setError(null);
    setJoinedTeam(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">
              {step === 'success' ? 'Welcome to the Team!' : 'Join a Team'}
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
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserPlus className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-gray-600">
                    Enter the team name and code provided by your colleague to join their team.
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team Name
                    </label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Enter the exact team name"
                      className="input-field"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team Code
                    </label>
                    <input
                      type="text"
                      value={teamCode}
                      onChange={handleCodeChange}
                      placeholder="XXXX-XXXX"
                      className="input-field font-mono text-center text-lg tracking-wider"
                      maxLength={9}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      The code should look like: ABCD-1234
                    </p>
                  </div>
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
                    onClick={handleJoin}
                    disabled={loading || !teamName.trim() || teamCode.length !== 9}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Joining...
                      </>
                    ) : (
                      'Join Team'
                    )}
                  </button>
                </div>
              </>
            )}

            {step === 'success' && joinedTeam && (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    You've joined {joinedTeam.name}!
                  </h3>
                  <p className="text-gray-600">
                    You now have access to the team's shared prompts, questions, and workflows.
                  </p>
                </div>

                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-primary-900 mb-2">
                    What's next?
                  </h4>
                  <ul className="text-sm text-primary-800 space-y-1">
                    <li>• Browse prompts shared by your teammates</li>
                    <li>• Add prompts from the library to the team</li>
                    <li>• Create custom prompts for your team</li>
                    <li>• Tag prompts to specific teammates</li>
                  </ul>
                </div>

                <button onClick={handleClose} className="btn-primary w-full">
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
