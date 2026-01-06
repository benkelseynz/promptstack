'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  X,
  Users,
  Check,
  Loader2,
  ChevronRight,
  FolderPlus,
  HelpCircle,
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
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New category creation
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#6366f1');
  const [creatingCategory, setCreatingCategory] = useState(false);

  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
    '#f97316', '#eab308', '#22c55e', '#06b6d4',
  ];

  // Load teams when modal opens
  useEffect(() => {
    if (isOpen) {
      loadTeams();
    } else {
      // Reset state when modal closes
      setStep('select-team');
      setSelectedTeam(null);
      setSelectedCategory(null);
      setCategories([]);
      setError(null);
      setShowNewCategory(false);
      setNewCategoryName('');
    }
  }, [isOpen]);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const data = await api.getMyTeams();
      setTeams(data.teams);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async (teamId: string) => {
    setLoadingCategories(true);
    try {
      const data = await api.getTeamCategories(teamId);
      setCategories(data.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleSelectTeam = async (team: TeamSummary) => {
    setSelectedTeam(team);
    setError(null);
    await loadCategories(team.id);
    setStep('select-category');
  };

  const handleCreateCategory = async () => {
    if (!selectedTeam || !newCategoryName.trim()) return;

    setCreatingCategory(true);
    try {
      const result = await api.createTeamCategory(selectedTeam.id, {
        name: newCategoryName.trim(),
        color: newCategoryColor,
      });
      setCategories([...categories, result.category]);
      setSelectedCategory(result.category.id);
      setShowNewCategory(false);
      setNewCategoryName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setCreatingCategory(false);
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
      });
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add question to team');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Add to Team
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {step === 'success' ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Question Added!
                </h3>
                <p className="text-gray-600 mb-4">
                  This question has been added to {selectedTeam?.name}.
                </p>
                <button onClick={handleClose} className="btn-primary">
                  Done
                </button>
              </div>
            ) : step === 'select-team' ? (
              <>
                {/* Question preview */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <HelpCircle className="w-4 h-4 text-primary-600" />
                    <span className="text-sm font-medium text-gray-700">Question</span>
                  </div>
                  <p className="text-sm text-gray-900 line-clamp-2">
                    &ldquo;{question.question}&rdquo;
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Select a team
                </h3>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                  </div>
                ) : teams.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">You&apos;re not in any teams yet.</p>
                    <p className="text-sm text-gray-500">
                      Create or join a team to share questions.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        onClick={() => handleSelectTeam(team)}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-primary-50 rounded-lg transition-colors text-left"
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
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Back button */}
                <button
                  onClick={() => setStep('select-team')}
                  className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-1"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Back to teams
                </button>

                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Select a category (optional)
                </h3>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {loadingCategories ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                          selectedCategory === null
                            ? 'bg-primary-50 ring-2 ring-primary-500'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-gray-300" />
                        <span className="text-gray-700">No category</span>
                      </button>

                      {categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                            selectedCategory === category.id
                              ? 'bg-primary-50 ring-2 ring-primary-500'
                              : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-gray-700">{category.name}</span>
                        </button>
                      ))}
                    </div>

                    {/* Create new category */}
                    {!showNewCategory ? (
                      <button
                        onClick={() => setShowNewCategory(true)}
                        className="w-full flex items-center gap-2 p-3 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        <FolderPlus className="w-4 h-4" />
                        <span className="text-sm font-medium">Create new category</span>
                      </button>
                    ) : (
                      <div className="border border-gray-200 rounded-lg p-3 space-y-3">
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Category name"
                          className="input-field text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          {colors.map((color) => (
                            <button
                              key={color}
                              onClick={() => setNewCategoryColor(color)}
                              className={`w-6 h-6 rounded-full ${
                                newCategoryColor === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowNewCategory(false)}
                            className="btn-secondary text-sm flex-1"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleCreateCategory}
                            disabled={!newCategoryName.trim() || creatingCategory}
                            className="btn-primary text-sm flex-1"
                          >
                            {creatingCategory ? (
                              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                            ) : (
                              'Create'
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {step === 'select-category' && (
            <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={handleClose}
                className="btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Add to Team
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
