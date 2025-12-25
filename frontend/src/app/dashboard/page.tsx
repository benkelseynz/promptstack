'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Prompt, Industry, FilterOptions, CustomPrompt } from '@/types';
import {
  Search,
  Filter,
  Lock,
  Copy,
  Check,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  X,
  Loader2,
  Sparkles,
  User,
} from 'lucide-react';
import PromptModal from '@/components/PromptModal';

const ITEMS_PER_PAGE = 12;
const CLICK_STORAGE_KEY = 'promptstack_clicks';

// Helper functions for click tracking
function getClickData(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const data = localStorage.getItem(CLICK_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function recordClick(promptId: string) {
  if (typeof window === 'undefined') return;
  try {
    const data = getClickData();
    data[promptId] = Date.now();
    localStorage.setItem(CLICK_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

function sortByRecentClicks<T extends { id: string }>(prompts: T[]): T[] {
  const clicks = getClickData();
  return [...prompts].sort((a, b) => {
    const clickA = clicks[a.id] || 0;
    const clickB = clicks[b.id] || 0;
    return clickB - clickA; // Most recent first
  });
}

export default function DashboardPage() {
  const { user, profileStatus } = useAuth();
  const searchParams = useSearchParams();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [filters, setFilters] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedAccess, setSelectedAccess] = useState<'all' | 'free' | 'premium'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [savedPromptIds, setSavedPromptIds] = useState<Set<string>>(new Set());
  const [customPrompts, setCustomPrompts] = useState<Prompt[]>([]);
  const [allLibraryPrompts, setAllLibraryPrompts] = useState<Prompt[]>([]);
  const [customPromptsLoaded, setCustomPromptsLoaded] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Track request ID to ignore stale responses
  const requestIdRef = useRef(0);

  const isWelcome = searchParams.get('welcome') === 'true';

  // Load filters and industries
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [filtersData, industriesData] = await Promise.all([
          api.getFilters(),
          api.getIndustries(),
        ]);
        setFilters(filtersData);
        setIndustries(industriesData.industries);
      } catch (err) {
        console.error('Failed to load filters:', err);
      }
    };
    loadFilters();
  }, []);

  // Load saved prompts and custom prompts
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const [savedData, customData, industriesData] = await Promise.all([
          api.getSavedPrompts(),
          api.getUserPrompts(),
          api.getIndustries(),
        ]);
        setSavedPromptIds(new Set(savedData.prompts.map((p) => p.id)));

        // Convert custom prompts to Prompt format for display
        const customAsPrompts: Prompt[] = customData.prompts.map((cp: CustomPrompt) => ({
          id: cp.id,
          title: cp.title,
          content: cp.content,
          preview: cp.content.substring(0, 150) + (cp.content.length > 150 ? '...' : ''),
          access: 'free' as const,
          industry: cp.industry || 'custom',
          industryName: industriesData.industries.find((i: Industry) => i.id === cp.industry)?.name || 'Custom',
          role: cp.role || 'General',
          keywords: cp.keywords || [],
          placeholders: [],
          isLocked: false,
          isCustom: true,
        }));
        setCustomPrompts(customAsPrompts);
        setCustomPromptsLoaded(true);
      } catch (err) {
        console.error('Failed to load user data:', err);
        setCustomPromptsLoaded(true); // Still mark as loaded so search can proceed
      }
    };
    loadUserData();
  }, []);

  // Filter custom prompts based on current search criteria
  const filteredCustomPrompts = useMemo(() => {
    let filtered = customPrompts;
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(searchLower) ||
        p.keywords.some(k => k.toLowerCase().includes(searchLower))
      );
    }
    if (selectedIndustry !== 'all') {
      filtered = filtered.filter(p => p.industry === selectedIndustry);
    }
    if (selectedRole) {
      filtered = filtered.filter(p => p.role === selectedRole);
    }
    if (selectedAccess === 'premium') {
      filtered = []; // Custom prompts are never premium
    }
    return filtered;
  }, [customPrompts, searchQuery, selectedIndustry, selectedRole, selectedAccess]);

  // Search prompts with proper pagination - combine ALL prompts then sort by clicks
  useEffect(() => {
    // Wait until custom prompts have been loaded
    if (!customPromptsLoaded) {
      return;
    }

    // Increment request ID to track this specific request
    const currentRequestId = ++requestIdRef.current;

    const fetchPrompts = async () => {
      setLoading(true);
      try {
        // Fetch library prompts from API
        const data = await api.searchPrompts({
          q: searchQuery || undefined,
          industry: selectedIndustry !== 'all' ? selectedIndustry : undefined,
          role: selectedRole || undefined,
          access: selectedAccess,
          page: 1,
          limit: 100, // Fetch enough to get all prompts for sorting
        });

        // Ignore this response if a newer request has been made
        if (currentRequestId !== requestIdRef.current) {
          console.log('Ignoring stale response');
          return;
        }

        // Combine ALL prompts (custom + library) into one pool
        const allPrompts = [...filteredCustomPrompts, ...data.prompts];

        // Sort ALL prompts by recent clicks - most recently clicked first
        const sortedPrompts = sortByRecentClicks(allPrompts);

        // Calculate pagination
        const totalCount = sortedPrompts.length;
        const totalPagesCount = Math.ceil(totalCount / ITEMS_PER_PAGE);

        // Get current page slice
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const pagePrompts = sortedPrompts.slice(startIndex, endIndex);

        setPrompts(pagePrompts);
        setTotalPages(totalPagesCount);
        setTotal(totalCount);
        setAllLibraryPrompts(data.prompts);
      } catch (err) {
        // Ignore errors from stale requests
        if (currentRequestId !== requestIdRef.current) {
          return;
        }
        console.error('Failed to search prompts:', err);
      } finally {
        // Only update loading state if this is still the current request
        if (currentRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    };

    fetchPrompts();
  }, [searchQuery, selectedIndustry, selectedRole, selectedAccess, page, filteredCustomPrompts, customPromptsLoaded]);

  const handleSavePrompt = async (promptId: string) => {
    try {
      if (savedPromptIds.has(promptId)) {
        await api.removeSavedPrompt(promptId);
        setSavedPromptIds((prev) => {
          const next = new Set(prev);
          next.delete(promptId);
          return next;
        });
      } else {
        await api.savePrompt(promptId);
        setSavedPromptIds((prev) => new Set(prev).add(promptId));
      }
    } catch (err) {
      console.error('Failed to save prompt:', err);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedIndustry('all');
    setSelectedRole('');
    setSelectedAccess('all');
    setPage(1);
  };

  const hasActiveFilters = searchQuery || selectedIndustry !== 'all' || selectedRole || selectedAccess !== 'all';

  return (
    <div>
      {/* Welcome banner */}
      {isWelcome && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-primary-600" />
          <div>
            <p className="font-medium text-primary-900">
              Kia ora! Welcome to PromptStack
            </p>
            <p className="text-sm text-primary-700">
              Check your email to verify your account and unlock all features.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Prompt Library</h1>
        <p className="text-gray-600">
          Browse {total} curated AI prompts for New Zealand professionals
        </p>
      </div>

      {/* Search and filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search prompts by title, keywords, or role..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="input-field pl-10"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-2 ${
              hasActiveFilters ? 'ring-2 ring-primary-500' : ''
            }`}
          >
            <Filter className="w-5 h-5" />
            Filters
            {hasActiveFilters && (
              <span className="bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Filter Prompts</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Industry
                </label>
                <select
                  value={selectedIndustry}
                  onChange={(e) => {
                    setSelectedIndustry(e.target.value);
                    setPage(1);
                  }}
                  className="input-field"
                >
                  <option value="all">All Industries</option>
                  {industries.map((ind) => (
                    <option key={ind.id} value={ind.id}>
                      {ind.name} ({ind.promptCount})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => {
                    setSelectedRole(e.target.value);
                    setPage(1);
                  }}
                  className="input-field"
                >
                  <option value="">All Roles</option>
                  {filters?.roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Access Level
                </label>
                <select
                  value={selectedAccess}
                  onChange={(e) => {
                    setSelectedAccess(e.target.value as 'all' | 'free' | 'premium');
                    setPage(1);
                  }}
                  className="input-field"
                >
                  <option value="all">All Prompts</option>
                  <option value="free">Free Only</option>
                  <option value="premium">Premium Only</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : prompts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No prompts found matching your criteria.</p>
          <button onClick={clearFilters} className="btn-primary">
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prompts.map((prompt) => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                isSaved={savedPromptIds.has(prompt.id)}
                onSave={() => handleSavePrompt(prompt.id)}
                onClick={() => {
                  recordClick(prompt.id);
                  setSelectedPrompt(prompt);
                }}
                profileReady={profileStatus?.completed || false}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-gray-600 px-4">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Prompt Modal */}
      {selectedPrompt && (
        <PromptModal
          prompt={selectedPrompt}
          isSaved={savedPromptIds.has(selectedPrompt.id)}
          onSave={() => handleSavePrompt(selectedPrompt.id)}
          onClose={() => setSelectedPrompt(null)}
        />
      )}
    </div>
  );
}

function PromptCard({
  prompt,
  isSaved,
  onSave,
  onClick,
  profileReady,
}: {
  prompt: Prompt;
  isSaved: boolean;
  onSave: () => void;
  onClick: () => void;
  profileReady: boolean;
}) {
  // Check if this prompt can be personalised (has contextTags and is not a custom prompt)
  const isCustomPrompt = (prompt as any).isCustom;
  const hasContextTags = !isCustomPrompt && prompt.contextTags && prompt.contextTags.length > 0;
  const canPersonalise = hasContextTags && profileReady;
  const showProfilePrompt = hasContextTags && !profileReady && !prompt.isLocked;

  return (
    <div
      className={`card cursor-pointer hover:shadow-md transition-shadow relative ${
        prompt.isLocked ? 'border-amber-200 bg-amber-50/30' : ''
      }`}
      onClick={onClick}
    >
      {prompt.isLocked && (
        <div className="absolute top-3 right-3">
          <Lock className="w-5 h-5 text-amber-600" />
        </div>
      )}

      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${
            (prompt as any).isCustom
              ? 'bg-purple-100 text-purple-700'
              : prompt.access === 'premium'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {(prompt as any).isCustom ? 'Custom' : prompt.access === 'premium' ? 'Premium' : 'Free'}
        </span>
        {canPersonalise && (
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary-100 text-primary-700 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Personalised
          </span>
        )}
        <span className="text-xs text-gray-500">{prompt.industryName}</span>
      </div>

      <h3 className="font-semibold text-gray-900 mb-2 pr-8">{prompt.title}</h3>

      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
        {prompt.preview}
      </p>

      {prompt.role && (
        <p className="text-xs text-gray-500 mb-3">Role: {prompt.role}</p>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
          className="text-gray-400 hover:text-primary-600 transition-colors"
          title={isSaved ? 'Remove from saved' : 'Save prompt'}
        >
          {isSaved ? (
            <BookmarkCheck className="w-5 h-5 text-primary-600" />
          ) : (
            <Bookmark className="w-5 h-5" />
          )}
        </button>

        {prompt.isLocked ? (
          <span className="text-xs text-amber-600 font-medium">
            Upgrade to unlock
          </span>
        ) : showProfilePrompt ? (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <User className="w-3 h-3" />
            Complete profile to personalise
          </span>
        ) : (
          <span className="text-xs text-primary-600 font-medium">
            Click to view
          </span>
        )}
      </div>
    </div>
  );
}
