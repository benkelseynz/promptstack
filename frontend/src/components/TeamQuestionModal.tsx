'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import {
  X,
  Pencil,
  Save,
  Loader2,
  GitBranch,
} from 'lucide-react';
import type { TeamQuestion, TeamCategory } from '@/types';

interface TeamQuestionModalProps {
  question: TeamQuestion | null;
  teamId: string;
  categories: TeamCategory[];
  onClose: () => void;
  onSaved: () => void;
}

export default function TeamQuestionModal({
  question,
  teamId,
  categories,
  onClose,
  onSaved,
}: TeamQuestionModalProps) {
  const isLibraryQuestion = question?.sourceType === 'library';
  const [showEditChoice, setShowEditChoice] = useState(isLibraryQuestion);
  const [editChoice, setEditChoice] = useState<'replace' | 'copy' | null>(
    isLibraryQuestion ? null : 'replace'
  );
  const isCopy = isLibraryQuestion && editChoice === 'copy';

  const [questionText, setQuestionText] = useState(question?.question || '');
  const [context, setContext] = useState(question?.context || '');
  const [categoryId, setCategoryId] = useState(question?.categoryId || '');
  const [tags, setTags] = useState(question?.tags?.join(', ') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!question) return;

    const trimmedQuestion = questionText.trim();
    if (!trimmedQuestion) {
      setError('Question text is required');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const tagArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      if (isCopy) {
        await api.addTeamQuestion(teamId, {
          sourceType: 'custom',
          question: trimmedQuestion,
          context: context.trim(),
          categoryId: categoryId || undefined,
          tags: tagArray,
        });
      } else {
        await api.updateTeamQuestion(teamId, question.id, {
          question: trimmedQuestion,
          context: context.trim(),
          categoryId: categoryId || null,
          tags: tagArray,
          sourceType: isLibraryQuestion ? 'custom' : undefined,
        });
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save question');
    } finally {
      setLoading(false);
    }
  };

  if (!question) return null;

  if (showEditChoice) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative min-h-full flex items-center justify-center p-4">
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Edit Library Question</h2>
            <p className="text-gray-600 text-sm mb-4">
              This question is from the library. How would you like to proceed?
            </p>

            <div className="space-y-3 mb-6">
              <label
                className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  editChoice === 'replace'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="editChoice"
                  value="replace"
                  checked={editChoice === 'replace'}
                  onChange={() => setEditChoice('replace')}
                  className="sr-only"
                />
                <div className="flex items-start gap-3">
                  <Pencil className="w-5 h-5 text-primary-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Save and Replace</p>
                    <p className="text-sm text-gray-500">
                      Replace the existing question with your edited version. It will become a custom team question.
                    </p>
                  </div>
                </div>
              </label>

              <label
                className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  editChoice === 'copy'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="editChoice"
                  value="copy"
                  checked={editChoice === 'copy'}
                  onChange={() => setEditChoice('copy')}
                  className="sr-only"
                />
                <div className="flex items-start gap-3">
                  <GitBranch className="w-5 h-5 text-primary-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Create a Copy</p>
                    <p className="text-sm text-gray-500">
                      Keep the original library question and create a custom version.
                    </p>
                  </div>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={() => setShowEditChoice(false)}
                disabled={!editChoice}
                className="btn-primary"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      <div className="relative min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Edit Question</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question
              </label>
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                rows={3}
                className="input-field resize-none"
                placeholder="e.g., What assumptions am I making here?"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Context (optional)
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={2}
                className="input-field resize-none"
                placeholder="When to use this question..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="input-field"
              >
                <option value="">Uncategorized</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="input-field"
                placeholder="e.g., analysis, assumptions, critical thinking"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !questionText.trim()}
                className="btn-primary flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {isCopy ? 'Create Copy' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
