'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import type { Prompt, CustomPrompt, Industry } from '@/types';
import {
  Bookmark,
  BookmarkCheck,
  Plus,
  Pencil,
  Trash2,
  Lock,
  Loader2,
  X,
  Save,
  Copy,
  Check,
} from 'lucide-react';
import PromptModal from '@/components/PromptModal';

export default function SavedPromptsPage() {
  const [savedPrompts, setSavedPrompts] = useState<Prompt[]>([]);
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'saved' | 'custom'>('saved');
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<CustomPrompt | null>(null);
  const [selectedCustomPrompt, setSelectedCustomPrompt] = useState<CustomPrompt | null>(null);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const [savedData, customData, industriesData] = await Promise.all([
        api.getSavedPrompts(),
        api.getUserPrompts(),
        api.getIndustries(),
      ]);
      setSavedPrompts(savedData.prompts);
      // Add industry names to custom prompts
      const promptsWithIndustryNames = customData.prompts.map((p: CustomPrompt) => ({
        ...p,
        industryName: industriesData.industries.find((i: Industry) => i.id === p.industry)?.name || 'General',
      }));
      setCustomPrompts(promptsWithIndustryNames);
      setIndustries(industriesData.industries);
    } catch (err) {
      console.error('Failed to load prompts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSaved = async (promptId: string) => {
    try {
      await api.removeSavedPrompt(promptId);
      setSavedPrompts((prev) => prev.filter((p) => p.id !== promptId));
    } catch (err) {
      console.error('Failed to remove saved prompt:', err);
    }
  };

  const handleDeleteCustom = async (promptId: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;
    
    try {
      await api.deleteUserPrompt(promptId);
      setCustomPrompts((prev) => prev.filter((p) => p.id !== promptId));
    } catch (err) {
      console.error('Failed to delete custom prompt:', err);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-heading">My Prompts</h1>
          <p className="text-text-body">
            Your saved and custom prompts in one place
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Prompt
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-ice-200 mb-6">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('saved')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'saved'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-text-muted hover:text-text-body'
            }`}
          >
            Saved from Library ({savedPrompts.length})
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'custom'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-text-muted hover:text-text-body'
            }`}
          >
            My Custom Prompts ({customPrompts.length})
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : activeTab === 'saved' ? (
        /* Saved Prompts */
        savedPrompts.length === 0 ? (
          <div className="text-center py-12">
            <Bookmark className="w-12 h-12 text-ice-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-heading mb-2">
              No saved prompts yet
            </h3>
            <p className="text-text-body mb-4">
              Browse the library and save your favourite prompts for quick access.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedPrompts.map((prompt) => (
              <div
                key={prompt.id}
                className={`glass-card cursor-pointer ${
                  prompt.isLocked ? 'border-amber-200 bg-amber-50/50' : ''
                }`}
                onClick={() => setSelectedPrompt(prompt)}
              >
                <div className="flex items-start justify-between mb-2">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      prompt.access === 'premium'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {prompt.access === 'premium' ? 'Premium' : 'Free'}
                  </span>
                  {prompt.isLocked && <Lock className="w-4 h-4 text-amber-600" />}
                </div>
                <h3 className="font-semibold text-text-heading mb-2">{prompt.title}</h3>
                <p className="text-sm text-text-body mb-3 line-clamp-2">
                  {prompt.preview}
                </p>
                <div className="flex items-center justify-between pt-3 border-t border-ice-200">
                  <span className="text-xs text-text-muted">{prompt.industryName}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveSaved(prompt.id);
                    }}
                    className="text-ice-400 hover:text-red-600 transition-colors"
                    title="Remove from saved"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Custom Prompts */
        customPrompts.length === 0 ? (
          <div className="text-center py-12">
            <Plus className="w-12 h-12 text-ice-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-heading mb-2">
              No custom prompts yet
            </h3>
            <p className="text-text-body mb-4">
              Create your own prompts to use with any AI assistant.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              Create Your First Prompt
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customPrompts.map((prompt) => (
              <div
                key={prompt.id}
                className="glass-card cursor-pointer"
                onClick={() => setSelectedCustomPrompt(prompt)}
              >
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                    Custom
                  </span>
                  <span className="text-xs text-text-muted">{prompt.industryName || prompt.industry || 'General'}</span>
                </div>
                <h3 className="font-semibold text-text-heading mb-2">{prompt.title}</h3>
                <p className="text-sm text-text-body mb-3 line-clamp-2">
                  {prompt.content}
                </p>
                {prompt.role && prompt.role !== 'General' && (
                  <p className="text-xs text-text-muted mb-3">Role: {prompt.role}</p>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-ice-200">
                  <span className="text-xs text-text-muted">
                    {new Date(prompt.updatedAt).toLocaleDateString('en-NZ')}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPrompt(prompt);
                      }}
                      className="text-ice-400 hover:text-primary-600 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCustom(prompt.id);
                      }}
                      className="text-ice-400 hover:text-red-600 transition-colors"
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

      {/* View Saved Prompt Modal */}
      {selectedPrompt && (
        <PromptModal
          prompt={selectedPrompt}
          isSaved={true}
          onSave={() => handleRemoveSaved(selectedPrompt.id)}
          onClose={() => setSelectedPrompt(null)}
        />
      )}

      {/* View Custom Prompt Modal */}
      {selectedCustomPrompt && (
        <CustomPromptViewModal
          prompt={selectedCustomPrompt}
          onClose={() => setSelectedCustomPrompt(null)}
          onEdit={() => {
            setEditingPrompt(selectedCustomPrompt);
            setSelectedCustomPrompt(null);
          }}
        />
      )}

      {/* Create/Edit Custom Prompt Modal */}
      {(showCreateModal || editingPrompt) && (
        <CustomPromptModal
          prompt={editingPrompt}
          industries={industries}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPrompt(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingPrompt(null);
            loadPrompts();
          }}
        />
      )}
    </div>
  );
}

function CustomPromptModal({
  prompt,
  industries,
  onClose,
  onSave,
}: {
  prompt: CustomPrompt | null;
  industries: Industry[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [title, setTitle] = useState(prompt?.title || '');
  const [content, setContent] = useState(prompt?.content || '');
  const [keywords, setKeywords] = useState(prompt?.keywords.join(', ') || '');
  const [industry, setIndustry] = useState(prompt?.industry || 'general');
  const [role, setRole] = useState(prompt?.role || 'General');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get roles for selected industry
  const selectedIndustry = industries.find((i) => i.id === industry);
  const availableRoles = selectedIndustry?.roles || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const keywordArray = keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      const industryData = industries.find((i) => i.id === industry);

      if (prompt) {
        await api.updateUserPrompt(prompt.id, {
          title,
          content,
          keywords: keywordArray,
          industry,
          role,
        });
      } else {
        await api.createUserPrompt({
          title,
          content,
          keywords: keywordArray,
          industry,
          role,
        });
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      <div className="relative min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full">
          <div className="flex items-center justify-between p-4 border-b border-ice-200">
            <h2 className="text-lg font-semibold text-text-heading">
              {prompt ? 'Edit Prompt' : 'Create Custom Prompt'}
            </h2>
            <button onClick={onClose} className="text-ice-400 hover:text-text-body">
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
              <label className="block text-sm font-medium text-text-body mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field"
                placeholder="e.g., Weekly Report Summary"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-body mb-1">
                  Industry
                </label>
                <select
                  value={industry}
                  onChange={(e) => {
                    setIndustry(e.target.value);
                    setRole('General');
                  }}
                  className="input-field"
                >
                  {industries.map((ind) => (
                    <option key={ind.id} value={ind.id}>
                      {ind.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-body mb-1">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="input-field"
                >
                  <option value="General">General</option>
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-body mb-1">
                Prompt Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="input-field resize-none font-mono text-sm"
                placeholder="Enter your prompt here. Use [Placeholder] syntax for variables."
                required
              />
              <p className="text-xs text-text-muted mt-1">
                Tip: Use [Placeholder] for values you want to fill in later
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-body mb-1">
                Keywords (comma separated)
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="input-field"
                placeholder="e.g., report, summary, weekly"
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
                {prompt ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function CustomPromptViewModal({
  prompt,
  onClose,
  onEdit,
}: {
  prompt: CustomPrompt;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({});

  // Extract placeholders from content using useMemo to prevent recreation on every render
  const placeholders = useMemo(() => {
    const regex = /\[([^\]]+)\]/g;
    const result: string[] = [];
    let match;
    while ((match = regex.exec(prompt.content)) !== null) {
      if (!result.includes(match[1])) {
        result.push(match[1]);
      }
    }
    return result;
  }, [prompt.content]);

  // Calculate populated content
  const populatedContent = useMemo(() => {
    let content = prompt.content;
    for (const placeholder of placeholders) {
      const value = placeholderValues[placeholder] || `[${placeholder}]`;
      content = content.replace(new RegExp(`\\[${placeholder}\\]`, 'g'), value);
    }
    return content;
  }, [prompt.content, placeholders, placeholderValues]);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      <div className="relative min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-ice-200">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                Custom
              </span>
              <span className="inline-flex items-center text-sm text-text-muted h-6">{prompt.industryName || prompt.industry || 'General'}</span>
              {prompt.role && prompt.role !== 'General' && (
                <>
                  <span className="inline-flex items-center text-ice-300 h-6">•</span>
                  <span className="inline-flex items-center text-sm text-text-muted h-6">{prompt.role}</span>
                </>
              )}
            </div>
            <button onClick={onClose} className="text-ice-400 hover:text-text-body">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <h2 className="text-xl font-bold text-text-heading mb-4">{prompt.title}</h2>

            <div className="space-y-4">
              {/* Placeholder inputs */}
              {placeholders.length > 0 && (
                <div className="bg-ice-100 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-text-body mb-3">
                    Populate Placeholders
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {placeholders.map((placeholder) => (
                      <div key={placeholder}>
                        <label className="block text-xs text-text-muted mb-1">
                          {placeholder}
                        </label>
                        <input
                          type="text"
                          placeholder={`Enter ${placeholder}`}
                          value={placeholderValues[placeholder] || ''}
                          onChange={(e) =>
                            setPlaceholderValues((prev) => ({
                              ...prev,
                              [placeholder]: e.target.value,
                            }))
                          }
                          className="input-field text-sm py-1.5"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prompt content */}
              <div>
                <h3 className="text-sm font-medium text-text-body mb-2">
                  {placeholders.length > 0 && Object.keys(placeholderValues).some(k => placeholderValues[k])
                    ? 'Populated Prompt'
                    : 'Prompt Content'}
                </h3>
                <div className="bg-primary-800 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-ice-100 text-sm whitespace-pre-wrap font-mono">
                    {placeholders.length > 0 && Object.keys(placeholderValues).some(k => placeholderValues[k])
                      ? populatedContent
                      : prompt.content}
                  </pre>
                </div>
              </div>

              {/* Keywords */}
              {prompt.keywords && prompt.keywords.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-text-body mb-2">Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {prompt.keywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="text-xs bg-ice-100 text-text-muted px-2 py-1 rounded-full"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-ice-200 bg-ice-50">
            <button onClick={onEdit} className="btn-secondary flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              Edit Prompt
            </button>

            <div className="flex items-center gap-2">
              {placeholders.length > 0 && Object.keys(placeholderValues).some(k => placeholderValues[k]) && (
                <button
                  onClick={() => handleCopy(populatedContent)}
                  className="btn-secondary flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copy Populated
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => handleCopy(prompt.content)}
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
                    Copy Prompt
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
