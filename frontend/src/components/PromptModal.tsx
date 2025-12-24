'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Prompt } from '@/types';
import {
  X,
  Lock,
  Copy,
  Check,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface PromptModalProps {
  prompt: Prompt;
  isSaved: boolean;
  onSave: () => void;
  onClose: () => void;
}

export default function PromptModal({
  prompt,
  isSaved,
  onSave,
  onClose,
}: PromptModalProps) {
  const [copied, setCopied] = useState(false);
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({});
  const [populatedContent, setPopulatedContent] = useState('');

  // Extract placeholders from content if not pre-populated by backend
  const extractPlaceholders = (content: string) => {
    const regex = /\[([^\]]+)\]/g;
    const found: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (!found.includes(match[1])) found.push(match[1]);
    }
    return found;
  };

  const placeholders = prompt.placeholders?.length
    ? prompt.placeholders
    : extractPlaceholders(prompt.content || '');

  // Update populated content when values change
  useEffect(() => {
    if (!prompt.content) return;
    
    let content = prompt.content;
    for (const placeholder of placeholders) {
      const value = placeholderValues[placeholder] || `[${placeholder}]`;
      content = content.replace(new RegExp(`\\[${placeholder}\\]`, 'g'), value);
    }
    setPopulatedContent(content);
  }, [prompt.content, placeholders, placeholderValues]);

  const handleCopy = async () => {
    if (prompt.isLocked) return;
    
    const textToCopy = placeholders.length > 0 && Object.keys(placeholderValues).length > 0
      ? populatedContent
      : prompt.content || '';
    
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePopulateAndCopy = async () => {
    if (prompt.isLocked) return;
    await navigator.clipboard.writeText(populatedContent);
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
              <span
                className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-full ${
                  (prompt as any).isCustom
                    ? 'bg-purple-100 text-purple-700'
                    : prompt.access === 'premium'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {(prompt as any).isCustom ? 'Custom' : prompt.access === 'premium' ? 'Premium' : 'Free'}
              </span>
              <span className="inline-flex items-center text-sm text-text-muted h-6">{prompt.industryName}</span>
              {prompt.role && (
                <>
                  <span className="inline-flex items-center text-ice-300 h-6">•</span>
                  <span className="inline-flex items-center text-sm text-text-muted h-6">{prompt.role}</span>
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-ice-400 hover:text-text-body"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <h2 className="text-xl font-bold text-text-heading mb-4">{prompt.title}</h2>

            {prompt.isLocked ? (
              /* Locked Premium Prompt */
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-amber-800 mb-2">
                    <Lock className="w-5 h-5" />
                    <span className="font-medium">Premium Content</span>
                  </div>
                  <p className="text-amber-700 text-sm">
                    This prompt is available to premium subscribers. Upgrade to unlock
                    full access to all premium prompts.
                  </p>
                </div>

                <div className="bg-ice-100 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-text-body mb-2">Preview</h3>
                  <p className="text-text-muted italic">{prompt.preview}</p>
                </div>

                <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 text-center">
                  <Sparkles className="w-8 h-8 text-primary-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-text-heading mb-2">
                    Unlock Premium Prompts
                  </h3>
                  <p className="text-text-body text-sm mb-4">
                    Get access to all premium prompts, advanced features, and priority support.
                  </p>
                  <Link
                    href="/dashboard/upgrade"
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    View Upgrade Options <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : (
              /* Unlocked Prompt */
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
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-ice-200 bg-ice-50">
            <button
              onClick={onSave}
              className="btn-secondary flex items-center gap-2"
            >
              {isSaved ? (
                <>
                  <BookmarkCheck className="w-5 h-5 text-primary-600" />
                  Saved
                </>
              ) : (
                <>
                  <Bookmark className="w-5 h-5" />
                  Save Prompt
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              {prompt.isLocked ? (
                <Link href="/dashboard/upgrade" className="btn-primary">
                  Upgrade to Copy
                </Link>
              ) : (
                <>
                  {placeholders.length > 0 && Object.keys(placeholderValues).some(k => placeholderValues[k]) && (
                    <button
                      onClick={handlePopulateAndCopy}
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
    </div>
  );
}
