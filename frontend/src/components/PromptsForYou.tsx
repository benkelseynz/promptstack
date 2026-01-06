'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Sparkles,
  Copy,
  Check,
  Eye,
  Loader2,
  User,
  MessageSquare,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import type { TeamPrompt, TeamCategory } from '@/types';

interface TaggedPrompt extends TeamPrompt {
  tagInfo: {
    taggedBy: string;
    taggedByName: string;
    message?: string;
    taggedAt: string;
    seen: boolean;
  };
}

interface PromptsForYouProps {
  teamId: string;
  currentUserId: string;
  onViewAll?: () => void;
  limit?: number;
}

export default function PromptsForYou({
  teamId,
  currentUserId,
  onViewAll,
  limit = 3,
}: PromptsForYouProps) {
  const [prompts, setPrompts] = useState<TaggedPrompt[]>([]);
  const [categories, setCategories] = useState<TeamCategory[]>([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [markingSeenId, setMarkingSeenId] = useState<string | null>(null);

  const loadPrompts = useCallback(async () => {
    try {
      const result = await api.getPromptsForMe(teamId);
      setPrompts(result.prompts);
      setCategories(result.categories);
      setUnseenCount(result.unseenCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prompts');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  const handleCopy = async (prompt: TaggedPrompt) => {
    await navigator.clipboard.writeText(prompt.content);
    setCopiedId(prompt.id);
    setTimeout(() => setCopiedId(null), 2000);

    // Mark as seen when copied
    if (!prompt.tagInfo.seen) {
      handleMarkSeen(prompt);
    }
  };

  const handleMarkSeen = async (prompt: TaggedPrompt) => {
    if (prompt.tagInfo.seen || markingSeenId === prompt.id) return;

    setMarkingSeenId(prompt.id);
    try {
      await api.markTagSeen(teamId, prompt.id, currentUserId);
      setPrompts(prev =>
        prev.map(p =>
          p.id === prompt.id
            ? { ...p, tagInfo: { ...p.tagInfo, seen: true } }
            : p
        )
      );
      setUnseenCount(prev => Math.max(0, prev - 1));
    } catch {
      // Silently fail - not critical
    } finally {
      setMarkingSeenId(null);
    }
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return null;
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return date.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' });
    } else if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else {
      return 'Just now';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={loadPrompts} className="btn-secondary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const displayPrompts = prompts.slice(0, limit);
  const hasMore = prompts.length > limit;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-gray-900">Prompts For You</h3>
          {unseenCount > 0 && (
            <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
              {unseenCount} new
            </span>
          )}
        </div>
        {hasMore && onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            View all
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      {prompts.length === 0 ? (
        <div className="text-center py-8 px-4">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm">
            No prompts tagged for you yet.
          </p>
          <p className="text-gray-400 text-xs mt-1">
            When teammates tag you on prompts, they&apos;ll appear here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {displayPrompts.map((prompt) => (
            <div
              key={prompt.id}
              className={`p-4 hover:bg-gray-50 transition-colors ${
                !prompt.tagInfo.seen ? 'bg-primary-50/50' : ''
              }`}
            >
              {/* Tag info */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="w-3 h-3 text-primary-600" />
                </div>
                <span className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900">
                    {prompt.tagInfo.taggedByName}
                  </span>
                  {' tagged you'}
                </span>
                <span className="text-xs text-gray-400">
                  {formatTimeAgo(prompt.tagInfo.taggedAt)}
                </span>
                {!prompt.tagInfo.seen && (
                  <span className="w-2 h-2 bg-primary-500 rounded-full" />
                )}
              </div>

              {/* Message if exists */}
              {prompt.tagInfo.message && (
                <div className="flex items-start gap-2 mb-3 ml-8">
                  <MessageSquare className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600 italic">
                    &ldquo;{prompt.tagInfo.message}&rdquo;
                  </p>
                </div>
              )}

              {/* Prompt card */}
              <div className="ml-8 bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getCategoryName(prompt.categoryId) && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                          {getCategoryName(prompt.categoryId)}
                        </span>
                      )}
                    </div>
                    <h4 className="font-medium text-gray-900 truncate">
                      {prompt.title}
                    </h4>
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                      {prompt.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!prompt.tagInfo.seen && (
                      <button
                        onClick={() => handleMarkSeen(prompt)}
                        disabled={markingSeenId === prompt.id}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Mark as seen"
                      >
                        {markingSeenId === prompt.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleCopy(prompt)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Copy prompt"
                    >
                      {copiedId === prompt.id ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer with count */}
      {prompts.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            {prompts.length} prompt{prompts.length !== 1 ? 's' : ''} tagged for you
          </p>
        </div>
      )}
    </div>
  );
}
