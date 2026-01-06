'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { X, Loader2, Users, CheckCircle, Copy, Check } from 'lucide-react';
import type { TeamSummary } from '@/types';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (team: TeamSummary) => void;
}

export default function CreateTeamModal({
  isOpen,
  onClose,
  onCreated,
}: CreateTeamModalProps) {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTeam, setCreatedTeam] = useState<TeamSummary | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!teamName.trim() || teamName.trim().length < 2) {
      setError('Team name must be at least 2 characters');
      return;
    }

    if (teamName.trim().length > 100) {
      setError('Team name must be 100 characters or less');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.createTeam(teamName.trim());
      setCreatedTeam(result.team);
      setStep('success');
      onCreated(result.team);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setTeamName('');
    setError(null);
    setCreatedTeam(null);
    setCodeCopied(false);
    onClose();
  };

  const copyTeamCode = async () => {
    if (createdTeam?.code) {
      await navigator.clipboard.writeText(createdTeam.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">
              {step === 'success' ? 'Team Created!' : 'Create a Team'}
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
                    <Users className="w-8 h-8 text-primary-600" />
                  </div>
                  <p className="text-gray-600">
                    Create a team to share prompts, questions, and workflows with your colleagues.
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Name
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g., Acme Corp Marketing"
                    className="input-field"
                    maxLength={100}
                    autoFocus
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    This will be visible to team members when they join.
                  </p>
                </div>

                {error && (
                  <p className="text-red-600 text-sm mb-4">{error}</p>
                )}

                <div className="flex gap-3">
                  <button onClick={handleClose} className="btn-secondary flex-1">
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={loading || !teamName.trim()}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      'Create Team'
                    )}
                  </button>
                </div>
              </>
            )}

            {step === 'success' && createdTeam && (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {createdTeam.name}
                  </h3>
                  <p className="text-gray-600">
                    Your team has been created successfully!
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Share this code with your team members:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-3 text-lg font-mono text-center tracking-wider">
                      {createdTeam.code}
                    </code>
                    <button
                      onClick={copyTeamCode}
                      className="btn-secondary p-3"
                      title="Copy code"
                    >
                      {codeCopied ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-primary-900 mb-2">
                    How to invite team members:
                  </h4>
                  <ol className="text-sm text-primary-800 space-y-1 list-decimal list-inside">
                    <li>Share the team name and code above</li>
                    <li>They need an Enterprise subscription</li>
                    <li>They go to Team Features and click "Join a Team"</li>
                    <li>Enter the team name and code to join</li>
                  </ol>
                </div>

                <button onClick={handleClose} className="btn-primary w-full">
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
