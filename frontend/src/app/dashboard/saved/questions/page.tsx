'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { Question, CustomQuestion, QuestionCategory } from '@/types';
import {
  Bookmark,
  Plus,
  Pencil,
  Trash2,
  Lock,
  Loader2,
  X,
  Save,
  Copy,
  Check,
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  Layers,
  Target,
  Sparkles,
  CheckCircle,
  Play,
} from 'lucide-react';

// Map category icon names to Lucide components
const categoryIcons: Record<string, React.ElementType> = {
  layers: Layers,
  target: Target,
  sparkles: Sparkles,
  'check-circle': CheckCircle,
  play: Play,
};

export default function SavedQuestionsPage() {
  const searchParams = useSearchParams();
  const [savedQuestions, setSavedQuestions] = useState<Question[]>([]);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [categories, setCategories] = useState<QuestionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'saved' | 'custom'>('saved');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<CustomQuestion | null>(null);
  const [selectedCustomQuestion, setSelectedCustomQuestion] = useState<CustomQuestion | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Handle tab query parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'custom') {
      setActiveTab('custom');
    }
  }, [searchParams]);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const [savedData, customData, questionsData] = await Promise.all([
        api.getSavedQuestions(),
        api.getUserQuestions(),
        api.getQuestions(),
      ]);
      setSavedQuestions(savedData.questions);
      setCustomQuestions(customData.questions);
      setCategories(questionsData.categories);
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSaved = async (questionId: string) => {
    try {
      await api.removeSavedQuestion(questionId);
      setSavedQuestions((prev) => prev.filter((q) => q.id !== questionId));
    } catch (err) {
      console.error('Failed to remove saved question:', err);
    }
  };

  const handleDeleteCustom = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      await api.deleteUserQuestion(questionId);
      setCustomQuestions((prev) => prev.filter((q) => q.id !== questionId));
    } catch (err) {
      console.error('Failed to delete custom question:', err);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || categoryId || 'Custom';
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return categoryIcons[category?.icon || 'layers'] || Layers;
  };

  return (
    <div>
      {/* Back link */}
      <Link
        href="/dashboard/saved"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Saved
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Saved Questions</h1>
          <p className="text-gray-600">
            Your saved and custom questions in one place
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Question
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('saved')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'saved'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Saved from Library ({savedQuestions.length})
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'custom'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            My Custom Questions ({customQuestions.length})
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : activeTab === 'saved' ? (
        /* Saved Questions */
        savedQuestions.length === 0 ? (
          <div className="text-center py-12">
            <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No saved questions yet
            </h3>
            <p className="text-gray-600 mb-4">
              Browse the questions library and save your favourite questions for quick access.
            </p>
            <Link href="/dashboard/questions" className="btn-primary">
              Browse Questions
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedQuestions.map((question) => {
              const CategoryIcon = getCategoryIcon(question.category);
              return (
                <div
                  key={question.id}
                  className={`card hover:shadow-md transition-shadow ${
                    question.isLocked ? 'border-amber-200 bg-amber-50/30' : ''
                  }`}
                >
                  {question.isLocked && (
                    <div className="absolute top-3 right-3">
                      <Lock className="w-5 h-5 text-amber-600" />
                    </div>
                  )}

                  {/* Header badges */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        question.access === 'premium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {question.access === 'premium' ? 'Premium' : 'Free'}
                    </span>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600 flex items-center gap-1">
                      <CategoryIcon className="w-3 h-3" />
                      {getCategoryName(question.category)}
                    </span>
                  </div>

                  {/* Question text */}
                  <p className="font-medium text-gray-900 mb-3 pr-8">
                    "{question.question}"
                  </p>

                  {/* Context */}
                  <p className="text-sm text-gray-500 mb-3">
                    {question.context}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {question.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    {question.isLocked ? (
                      <Link
                        href="/dashboard/upgrade"
                        className="text-xs text-amber-600 font-medium hover:text-amber-700 flex items-center gap-1"
                      >
                        Upgrade to unlock
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleCopy(question.question, question.id)}
                        className="text-primary-600 hover:text-primary-700 transition-colors flex items-center gap-1"
                      >
                        {copiedId === question.id ? (
                          <>
                            <Check className="w-4 h-4 text-green-600" />
                            <span className="text-xs text-green-600 font-medium">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span className="text-xs font-medium">Copy</span>
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveSaved(question.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="Remove from saved"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Custom Questions */
        customQuestions.length === 0 ? (
          <div className="text-center py-12">
            <Plus className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No custom questions yet
            </h3>
            <p className="text-gray-600 mb-4">
              Create your own questions to use with any AI assistant.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              Create Your First Question
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customQuestions.map((question) => (
              <div
                key={question.id}
                className="card cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedCustomQuestion(question)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                    Custom
                  </span>
                  <span className="text-xs text-gray-500">{getCategoryName(question.category)}</span>
                </div>
                <p className="font-medium text-gray-900 mb-2">
                  "{question.question}"
                </p>
                {question.context && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {question.context}
                  </p>
                )}
                {question.tags && question.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {question.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500">
                    {new Date(question.updatedAt).toLocaleDateString('en-NZ')}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingQuestion(question);
                      }}
                      className="text-gray-400 hover:text-primary-600 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCustom(question.id);
                      }}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* View Custom Question Modal */}
      {selectedCustomQuestion && (
        <CustomQuestionViewModal
          question={selectedCustomQuestion}
          categories={categories}
          getCategoryName={getCategoryName}
          onClose={() => setSelectedCustomQuestion(null)}
          onEdit={() => {
            setEditingQuestion(selectedCustomQuestion);
            setSelectedCustomQuestion(null);
          }}
        />
      )}

      {/* Create/Edit Custom Question Modal */}
      {(showCreateModal || editingQuestion) && (
        <CustomQuestionModal
          question={editingQuestion}
          categories={categories}
          onClose={() => {
            setShowCreateModal(false);
            setEditingQuestion(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingQuestion(null);
            loadQuestions();
          }}
        />
      )}
    </div>
  );
}

function CustomQuestionModal({
  question,
  categories,
  onClose,
  onSave,
}: {
  question: CustomQuestion | null;
  categories: QuestionCategory[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [questionText, setQuestionText] = useState(question?.question || '');
  const [context, setContext] = useState(question?.context || '');
  const [category, setCategory] = useState(question?.category || 'custom');
  const [tags, setTags] = useState(question?.tags?.join(', ') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const tagArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      if (question) {
        await api.updateUserQuestion(question.id, {
          question: questionText,
          context,
          category,
          tags: tagArray,
        });
      } else {
        await api.createUserQuestion({
          question: questionText,
          context,
          category,
          tags: tagArray,
        });
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      <div className="relative min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              {question ? 'Edit Question' : 'Create Custom Question'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-field"
              >
                <option value="custom">Custom</option>
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
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {question ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function CustomQuestionViewModal({
  question,
  categories,
  getCategoryName,
  onClose,
  onEdit,
}: {
  question: CustomQuestion;
  categories: QuestionCategory[];
  getCategoryName: (id: string) => string;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(question.question);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      <div className="relative min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                Custom
              </span>
              <span className="text-sm text-gray-500">
                {getCategoryName(question.category)}
              </span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div className="space-y-4">
              {/* Question text */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Question</h3>
                <div className="bg-gray-900 rounded-lg p-4">
                  <p className="text-gray-100 text-lg font-medium">
                    "{question.question}"
                  </p>
                </div>
              </div>

              {/* Context */}
              {question.context && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Context</h3>
                  <p className="text-gray-600">{question.context}</p>
                </div>
              )}

              {/* Tags */}
              {question.tags && question.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {question.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t bg-gray-50">
            <button onClick={onEdit} className="btn-secondary flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              Edit Question
            </button>

            <button
              onClick={handleCopy}
              className="btn-primary flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy Question
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
