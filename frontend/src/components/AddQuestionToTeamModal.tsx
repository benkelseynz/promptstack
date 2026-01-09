'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  X,
  Loader2,
  Users,
  CheckCircle,
  AlertCircle,
  FolderPlus,
  Plus,
} from 'lucide-react';
import type { Question, TeamSummary, TeamCategory } from '@/types';

interface AddQuestionToTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question;
}

type Step = 'select-team' | 'select-category' | 'success';

export default function AddQuestionToTeamModal({
  isOpen,
  onClose,
  question,
}: AddQuestionToTeamModalProps) {
  const [step, setStep] = useState<Step>('select-team');
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [categories, setCategories] = useState<TeamCategory[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamSummary | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadTeams();
    }
  }, [isOpen]);

  const loadTeams = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getMyTeams();
      setTeams(result.teams);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async (teamId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getTeamCategories(teamId);
      setCategories(result.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTeam = async (team: TeamSummary) => {
    setSelectedTeam(team);
    await loadCategories(team.id);
    setStep('select-category');
  };

  const handleCreateCategory = async () => {
    if (!selectedTeam || !newCategoryName.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await api.createTeamCategory(selectedTeam.id, {
        name: newCategoryName.trim(),
      });
      setCategories([...categories, result.category]);
      setSelectedCategory(result.category.id);
      setNewCategoryName('');
      setShowNewCategory(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTeam) return;

    setSubmitting(true);
    setError(null);

    try {
      await api.addTeamQuestion(selectedTeam.id, {
        sourceType: 'library',
        sourceId: question.id,
        question: question.question,
        context: question.context,
        categoryId: selectedCategory || undefined,
        tags: question.tags,
        notes: notes.trim() || undefined,
      });
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add question to team');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('select-team');
    setSelectedTeam(null);
    setSelectedCategory(null);
    setCategories([]);
    setNotes('');
    setError(null);
    setShowNewCategory(false);
    setNewCategoryName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">
              {step === 'success' ? 'Added to Team!' : 'Add to Team'}
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
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Step 1: Select Team */}
            {step === 'select-team' && !loading && (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-primary-600" />
                  </div>
                  <p className="text-gray-600">
                    Select which team to add this question to
                  </p>
                </div>

                {teams.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">
                      You&apos;re not a member of any teams yet.
                    </p>
                    <button onClick={handleClose} className="btn-secondary">
                      Close
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        onClick={() => handleSelectTeam(team)}
                        className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{team.name}</p>
                            <p className="text-sm text-gray-500">
                              {team.memberCount} member{team.memberCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Step 2: Select Category */}
            {step === 'select-category' && !loading && selectedTeam && (
              <>
                <div className="mb-6">
                  <button
                    onClick={() => {
                      setStep('select-team');
                      setSelectedTeam(null);
                      setSelectedCategory(null);
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    &larr; Back to teams
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-gray-600">
                    Adding to <span className="font-medium">{selectedTeam.name}</span>
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category (optional)
                  </label>
                  {categories.length > 0 ? (
                    <div className="space-y-2 mb-3">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className={`w-full p-3 text-left border rounded-lg transition-colors ${
                          selectedCategory === null
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-gray-600">No category</span>
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`w-full p-3 text-left border rounded-lg transition-colors ${
                            selectedCategory === cat.id
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="text-gray-900">{cat.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mb-3">
                      No categories yet. Create one below or add without a category.
                    </p>
                  )}

                  {showNewCategory ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Category name"
                        className="input-field flex-1"
                        maxLength={50}
                        autoFocus
                      />
                      <button
                        onClick={handleCreateCategory}
                        disabled={submitting || !newCategoryName.trim()}
                        className="btn-primary px-4 disabled:opacity-50"
                      >
                        {submitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Add'
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setShowNewCategory(false);
                          setNewCategoryName('');
                        }}
                        className="btn-secondary px-3"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowNewCategory(true)}
                      className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      <FolderPlus className="w-4 h-4" />
                      Create new category
                    </button>
                  )}
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes for your team about this question..."
                    className="input-field h-24 resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button onClick={handleClose} className="btn-secondary flex-1">
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Add to Team
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Success */}
            {step === 'success' && selectedTeam && (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Question Added!
                  </h3>
                  <p className="text-gray-600">
                    This question has been added to{' '}
                    <span className="font-medium">{selectedTeam.name}</span>
                  </p>
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
