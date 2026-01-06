'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import {
  X,
  Copy,
  Check,
  Library,
  Pencil,
  Save,
  Loader2,
  FolderOpen,
  User,
  Plus,
  GitBranch,
} from 'lucide-react';
import type { TeamPrompt, TeamCategory } from '@/types';

interface TeamPromptModalProps {
  prompt: TeamPrompt | null;
  teamId: string;
  categories: TeamCategory[];
  isCreating?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function TeamPromptModal({
  prompt,
  teamId,
  categories,
  isCreating = false,
  onClose,
  onSaved,
}: TeamPromptModalProps) {
  const [copied, setCopied] = useState(false);
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(isCreating);
  const [loading, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Edit form state
  const [title, setTitle] = useState(prompt?.title || '');
  const [content, setContent] = useState(prompt?.content || '');
  const [categoryId, setCategoryId] = useState(prompt?.categoryId || '');
  const [keywords, setKeywords] = useState(prompt?.keywords?.join(', ') || '');
  const [notes, setNotes] = useState(prompt?.notes || '');

  // For library prompts being edited - choice dialog
  const [showEditChoice, setShowEditChoice] = useState(false);
  const [editChoice, setEditChoice] = useState<'replace' | 'copy' | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const isLibraryPrompt = prompt?.sourceType === 'library';

  // Helper to escape special regex characters
  const escapeRegex = (str: string) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Extract placeholders from content
  const placeholders = useMemo(() => {
    const text = isEditing ? content : (prompt?.content || '');
    const regex = /\[([^\]]+)\]/g;
    const result: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (!result.includes(match[1])) {
        result.push(match[1]);
      }
    }
    return result;
  }, [isEditing, content, prompt?.content]);

  // Calculate populated content
  const populatedContent = useMemo(() => {
    const text = isEditing ? content : (prompt?.content || '');
    let result = text;
    for (const placeholder of placeholders) {
      const value = placeholderValues[placeholder] || `[${placeholder}]`;
      // Escape special regex characters in the placeholder
      const escapedPlaceholder = escapeRegex(placeholder);
      result = result.replace(new RegExp(`\\[${escapedPlaceholder}\\]`, 'g'), value);
    }
    return result;
  }, [isEditing, content, prompt?.content, placeholders, placeholderValues]);

  const handleCopy = async () => {
    const textToCopy = Object.keys(placeholderValues).some(k => placeholderValues[k])
      ? populatedContent
      : (prompt?.content || content);

    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartEdit = () => {
    if (isLibraryPrompt && !showEditChoice) {
      // Show choice dialog for library prompts
      setShowEditChoice(true);
      setNewTitle(prompt?.title ? `${prompt.title} (Copy)` : '');
    } else {
      setIsEditing(true);
    }
  };

  const handleEditChoiceConfirm = () => {
    if (editChoice === 'copy') {
      // Create a new copy - update title for the new prompt
      setTitle(newTitle || `${prompt?.title} (Copy)`);
    } else {
      setTitle(prompt?.title || '');
    }
    setShowEditChoice(false);
    setIsEditing(true);
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);

    try {
      const keywordArray = keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      if (isCreating) {
        // Create new custom prompt
        await api.addTeamPrompt(teamId, {
          sourceType: 'custom',
          title: title.trim(),
          content: content.trim(),
          categoryId: categoryId || undefined,
          keywords: keywordArray,
          notes: notes.trim() || undefined,
        });
      } else if (editChoice === 'copy') {
        // Create a new copy of the prompt
        await api.addTeamPrompt(teamId, {
          sourceType: 'custom',
          title: title.trim(),
          content: content.trim(),
          categoryId: categoryId || undefined,
          keywords: keywordArray,
          notes: notes.trim() || undefined,
        });
      } else {
        // Update existing prompt
        // If replacing a library prompt, convert it to custom
        const updateData: {
          title: string;
          content: string;
          categoryId: string | null;
          keywords: string[];
          notes: string;
          sourceType?: 'custom';
        } = {
          title: title.trim(),
          content: content.trim(),
          categoryId: categoryId || null,
          keywords: keywordArray,
          notes: notes.trim(),
        };

        // Convert library prompt to custom when editing with "replace"
        if (isLibraryPrompt && editChoice === 'replace') {
          updateData.sourceType = 'custom';
        }

        await api.updateTeamPrompt(teamId, prompt!.id, updateData);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt');
    } finally {
      setSaving(false);
    }
  };

  if (!prompt && !isCreating) return null;

  // Edit choice dialog for library prompts
  if (showEditChoice) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative min-h-full flex items-center justify-center p-4">
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Edit Library Prompt</h2>
            <p className="text-gray-600 text-sm mb-4">
              This prompt is from the library. How would you like to proceed?
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
                      Replace the existing prompt with your edited version. It will become a custom team prompt.
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
                      Keep the original library prompt and create a new custom version.
                    </p>
                  </div>
                </div>
              </label>
            </div>

            {editChoice === 'copy' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Prompt Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="input-field"
                  placeholder="Enter a title for the copy"
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleEditChoiceConfirm}
                disabled={!editChoice || (editChoice === 'copy' && !newTitle.trim())}
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
        <div className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              {isCreating ? (
                <span className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                  <Plus className="w-3 h-3 mr-1" />
                  New Custom
                </span>
              ) : prompt?.sourceType === 'library' ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                  <Library className="w-3 h-3" />
                  Library
                </span>
              ) : (
                <span className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                  Custom
                </span>
              )}
              {!isCreating && prompt?.categoryId && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                  style={{
                    backgroundColor: (categories.find(c => c.id === prompt.categoryId)?.color || '#9CA3AF') + '20',
                    color: categories.find(c => c.id === prompt.categoryId)?.color || '#9CA3AF',
                  }}
                >
                  <FolderOpen className="w-3 h-3" />
                  {categories.find(c => c.id === prompt.categoryId)?.name || 'Uncategorized'}
                </span>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {isEditing ? (
              /* Edit/Create Mode */
              <div className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    Prompt Content
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={10}
                    className="input-field resize-none font-mono text-sm"
                    placeholder="Enter your prompt here. Use [Placeholder] syntax for variables."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Tip: Use [Placeholder] for values you want to fill in later
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Team Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="input-field resize-none"
                    placeholder="Add notes for your team about this prompt..."
                  />
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900">{prompt?.title}</h2>

                {/* Placeholder inputs */}
                {placeholders.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      Populate Placeholders
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {placeholders.map((placeholder) => (
                        <div key={placeholder}>
                          <label className="block text-xs text-gray-500 mb-1">
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
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    {Object.keys(placeholderValues).some(k => placeholderValues[k])
                      ? 'Populated Prompt'
                      : 'Prompt Content'}
                  </h3>
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-gray-100 text-sm whitespace-pre-wrap font-mono">
                      {Object.keys(placeholderValues).some(k => placeholderValues[k])
                        ? populatedContent
                        : prompt?.content}
                    </pre>
                  </div>
                </div>

                {/* Notes */}
                {prompt?.notes && (
                  <div className="bg-amber-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-amber-800 mb-1">Team Notes</h3>
                    <p className="text-sm text-amber-700">{prompt.notes}</p>
                  </div>
                )}

                {/* Keywords */}
                {prompt?.keywords && prompt.keywords.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Keywords</h3>
                    <div className="flex flex-wrap gap-2">
                      {prompt.keywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Added by */}
                {prompt?.addedByName && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 pt-2 border-t">
                    <User className="w-4 h-4" />
                    <span>Added by {prompt.addedByName}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t bg-gray-50">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    if (isCreating) {
                      onClose();
                    } else {
                      setIsEditing(false);
                      setTitle(prompt?.title || '');
                      setContent(prompt?.content || '');
                      setCategoryId(prompt?.categoryId || '');
                      setKeywords(prompt?.keywords?.join(', ') || '');
                      setNotes(prompt?.notes || '');
                    }
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading || !title.trim() || !content.trim()}
                  className="btn-primary flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {isCreating ? 'Create Prompt' : editChoice === 'copy' ? 'Create Copy' : 'Save Changes'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleStartEdit}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Pencil className="w-5 h-5" />
                  Edit Prompt
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
                      Copy Prompt
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
