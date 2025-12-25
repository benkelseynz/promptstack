'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Question, QuestionCategory } from '@/types';
import {
  Search,
  Filter,
  Lock,
  Copy,
  Check,
  ChevronDown,
  X,
  Loader2,
  Layers,
  Target,
  Sparkles,
  CheckCircle,
  Play,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

const ITEMS_PER_PAGE = 12;

// Map category icon names to Lucide components
const categoryIcons: Record<string, React.ElementType> = {
  layers: Layers,
  target: Target,
  sparkles: Sparkles,
  'check-circle': CheckCircle,
  play: Play,
};

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<QuestionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAccess, setSelectedAccess] = useState<'all' | 'free' | 'premium'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load questions
  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const data = await api.getQuestions({
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          q: searchQuery || undefined,
          access: selectedAccess !== 'all' ? selectedAccess : undefined,
        });
        setQuestions(data.questions);
        setCategories(data.categories);
      } catch (err) {
        console.error('Failed to load questions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [searchQuery, selectedCategory, selectedAccess]);

  const handleCopy = async (question: Question) => {
    if (question.isLocked) return;

    await navigator.clipboard.writeText(question.question);
    setCopiedId(question.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedAccess('all');
    setPage(1);
  };

  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || selectedAccess !== 'all';

  // Pagination
  const totalPages = Math.ceil(questions.length / ITEMS_PER_PAGE);
  const paginatedQuestions = questions.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Get category name helper
  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || categoryId;
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Questions Library</h1>
        <p className="text-gray-600">
          Browse {questions.length} questions to take your AI outputs to the next level
        </p>
        <p className="text-sm text-gray-500 mt-2 italic">
          "In a world where the cost of answers is approaching zero, the value of the question becomes everything."
        </p>
      </div>

      {/* Search and filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search questions by text or tags..."
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
              <h3 className="font-medium text-gray-900">Filter Questions</h3>
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
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
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
                  <option value="all">All Questions</option>
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
      ) : paginatedQuestions.length === 0 ? (
        <div className="text-center py-12">
          <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No questions found matching your criteria.</p>
          <button onClick={clearFilters} className="btn-primary">
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedQuestions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                categoryName={getCategoryName(question.category)}
                categoryIcon={categoryIcons[categories.find(c => c.id === question.category)?.icon || 'layers']}
                copied={copiedId === question.id}
                onCopy={() => handleCopy(question)}
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
    </div>
  );
}

function QuestionCard({
  question,
  categoryName,
  categoryIcon: CategoryIcon,
  copied,
  onCopy,
}: {
  question: Question;
  categoryName: string;
  categoryIcon: React.ElementType;
  copied: boolean;
  onCopy: () => void;
}) {
  const isLocked = question.isLocked;

  return (
    <div
      className={`card cursor-pointer hover:shadow-md transition-shadow relative ${
        isLocked ? 'border-amber-200 bg-amber-50/30' : ''
      }`}
      onClick={onCopy}
    >
      {isLocked && (
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
          {categoryName}
        </span>
      </div>

      {/* Question text */}
      <p className={`font-medium text-gray-900 mb-3 pr-8 ${isLocked ? 'line-clamp-2' : ''}`}>
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
        {isLocked ? (
          <Link
            href="/dashboard/upgrade"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-amber-600 font-medium hover:text-amber-700 flex items-center gap-1"
          >
            Upgrade to unlock
            <ArrowRight className="w-3 h-3" />
          </Link>
        ) : (
          <span className="text-xs text-gray-500">
            Click to copy
          </span>
        )}

        {!isLocked && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopy();
            }}
            className="text-primary-600 hover:text-primary-700 transition-colors flex items-center gap-1"
          >
            {copied ? (
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
      </div>
    </div>
  );
}
