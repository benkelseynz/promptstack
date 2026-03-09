'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Skill } from '@/types';
import {
  Search,
  Filter,
  Lock,
  Copy,
  Check,
  Bookmark,
  BookmarkCheck,
  X,
  Loader2,
  Zap,
  Download,
  Eye,
  Code,
  ChevronDown,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function SkillLibraryPage() {
  const { user } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAccess, setSelectedAccess] = useState<'all' | 'free' | 'premium'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [savedSkillIds, setSavedSkillIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await api.getSkillCategories();
        setCategories(data.categories);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    loadCategories();
  }, []);

  // Load saved skill IDs
  useEffect(() => {
    const loadSaved = async () => {
      try {
        const data = await api.getSavedSkills();
        setSavedSkillIds(new Set(data.skills.map((s) => s.id)));
      } catch {
        // Not logged in or error - that's fine
      }
    };
    loadSaved();
  }, []);

  // Search/browse skills
  useEffect(() => {
    const fetchSkills = async () => {
      setLoading(true);
      try {
        const data = await api.getSkills({
          q: searchQuery || undefined,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          access: selectedAccess !== 'all' ? selectedAccess : undefined,
          page,
          limit: 12,
        });
        setSkills(data.skills);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      } catch (err) {
        console.error('Failed to search skills:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSkills();
  }, [searchQuery, selectedCategory, selectedAccess, page]);

  const handleSaveSkill = async (skillId: string) => {
    try {
      if (savedSkillIds.has(skillId)) {
        await api.removeSavedSkill(skillId);
        setSavedSkillIds((prev) => {
          const next = new Set(prev);
          next.delete(skillId);
          return next;
        });
      } else {
        await api.saveSkill(skillId);
        setSavedSkillIds((prev) => new Set(prev).add(skillId));
      }
    } catch (err) {
      console.error('Failed to save skill:', err);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedAccess('all');
    setPage(1);
  };

  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || selectedAccess !== 'all';

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-6 h-6 text-emerald-600" />
          <h1 className="text-2xl font-bold text-gray-900">Skill Library</h1>
        </div>
        <p className="text-gray-600">
          Browse {total} AI skills — structured Markdown documents that give AI agents the context they need
        </p>
      </div>

      {/* Search and filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search skills by title, tags, or keywords..."
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
              hasActiveFilters ? 'ring-2 ring-emerald-500' : ''
            }`}
          >
            <Filter className="w-5 h-5" />
            Filters
            {hasActiveFilters && (
              <span className="bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Filter Skills</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setPage(1);
                  }}
                  className="input-field"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
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
                  <option value="all">All Skills</option>
                  <option value="free">Free Only</option>
                  <option value="premium">Premium Only</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Category chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setSelectedCategory('all'); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(cat); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : skills.length === 0 ? (
        <div className="text-center py-12">
          <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No skills found matching your criteria.</p>
          <button onClick={clearFilters} className="btn-primary">
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                isSaved={savedSkillIds.has(skill.id)}
                onSave={() => handleSaveSkill(skill.id)}
                onClick={() => setSelectedSkill(skill)}
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

      {/* Skill View Modal */}
      {selectedSkill && (
        <SkillViewModal
          skill={selectedSkill}
          isSaved={savedSkillIds.has(selectedSkill.id)}
          onSave={() => handleSaveSkill(selectedSkill.id)}
          onClose={() => setSelectedSkill(null)}
        />
      )}
    </div>
  );
}

// ─── Skill Card ──────────────────────────────────────────

function SkillCard({
  skill,
  isSaved,
  onSave,
  onClick,
}: {
  skill: Skill;
  isSaved: boolean;
  onSave: () => void;
  onClick: () => void;
}) {
  return (
    <div
      className={`card cursor-pointer hover:shadow-md transition-shadow relative ${
        skill.isLocked ? 'border-amber-200 bg-amber-50/30' : ''
      }`}
      onClick={onClick}
    >
      {skill.isLocked && (
        <div className="absolute top-3 right-3">
          <Lock className="w-5 h-5 text-amber-600" />
        </div>
      )}

      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${
            skill.access === 'premium'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {skill.access === 'premium' ? 'Premium' : 'Free'}
        </span>
        {skill.category && (
          <span className="text-xs text-gray-500">
            {skill.category.charAt(0).toUpperCase() + skill.category.slice(1)}
          </span>
        )}
      </div>

      <h3 className="font-semibold text-gray-900 mb-2 pr-8">{skill.title}</h3>

      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
        {skill.preview}
      </p>

      {skill.tags && skill.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {skill.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
          {skill.tags.length > 4 && (
            <span className="text-xs text-gray-400">+{skill.tags.length - 4}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
          className="text-gray-400 hover:text-emerald-600 transition-colors"
          title={isSaved ? 'Remove from saved' : 'Save skill'}
        >
          {isSaved ? (
            <BookmarkCheck className="w-5 h-5 text-emerald-600" />
          ) : (
            <Bookmark className="w-5 h-5" />
          )}
        </button>

        {skill.isLocked ? (
          <span className="text-xs text-amber-600 font-medium">
            Upgrade to unlock
          </span>
        ) : (
          <span className="text-xs text-emerald-600 font-medium">
            Click to view
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Skill View Modal ────────────────────────────────────

function SkillViewModal({
  skill,
  isSaved,
  onSave,
  onClose,
}: {
  skill: Skill;
  isSaved: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(skill.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (skill.isLocked) return;

    const filename = skill.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    const frontmatter = [
      '---',
      `name: ${skill.title}`,
      `description: ${skill.preview || ''}`,
      `tags: [${(skill.tags || []).join(', ')}]`,
      `version: "1.0"`,
      '---',
      '',
    ].join('\n');

    const blob = new Blob([frontmatter + skill.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Simple markdown rendering
  const renderMarkdown = (content: string) => {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('# ')) {
        return <h1 key={i} className="text-xl font-bold text-gray-900 mb-3 mt-4">{line.slice(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-lg font-semibold text-gray-800 mb-2 mt-4">{line.slice(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-base font-semibold text-gray-700 mb-2 mt-3">{line.slice(4)}</h3>;
      }
      if (line.startsWith('- ')) {
        return <li key={i} className="text-sm text-gray-700 ml-4 mb-1">{line.slice(2)}</li>;
      }
      if (line.startsWith('```')) {
        return null;
      }
      if (line.startsWith('|')) {
        return <div key={i} className="text-sm text-gray-600 font-mono">{line}</div>;
      }
      if (line.trim() === '') {
        return <div key={i} className="h-2" />;
      }
      return <p key={i} className="text-sm text-gray-700 mb-1">{line}</p>;
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      <div className="relative min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-full ${
                skill.access === 'premium'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                <Zap className="w-3 h-3 mr-1" />
                {skill.access === 'premium' ? 'Premium Skill' : 'Free Skill'}
              </span>
              {skill.category && (
                <span className="text-xs text-gray-500">
                  {skill.category.charAt(0).toUpperCase() + skill.category.slice(1)}
                </span>
              )}
              {skill.tags && skill.tags.length > 0 && (
                <div className="hidden sm:flex items-center gap-1">
                  {skill.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('preview')}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                    viewMode === 'preview' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  Preview
                </button>
                <button
                  onClick={() => setViewMode('raw')}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                    viewMode === 'raw' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                  }`}
                >
                  <Code className="w-3 h-3" />
                  Markdown
                </button>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{skill.title}</h2>

            {skill.isLocked ? (
              <div className="text-center py-12">
                <Lock className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Premium Skill</h3>
                <p className="text-gray-600 mb-2">
                  Upgrade to Professional or Enterprise to access the full content of this skill.
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  {skill.preview}
                </p>
              </div>
            ) : viewMode === 'preview' ? (
              <div className="prose prose-sm max-w-none">
                {renderMarkdown(skill.content)}
              </div>
            ) : (
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-gray-100 text-sm whitespace-pre-wrap font-mono">
                  {skill.content}
                </pre>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t bg-gray-50">
            <button
              onClick={onSave}
              className="btn-secondary flex items-center gap-2"
            >
              {isSaved ? (
                <>
                  <BookmarkCheck className="w-4 h-4 text-emerald-600" />
                  Saved
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4" />
                  Save to Library
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              {!skill.isLocked && (
                <button
                  onClick={handleDownload}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download .md
                </button>
              )}
              <button
                onClick={handleCopy}
                disabled={skill.isLocked}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Content
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
