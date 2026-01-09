'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  ArrowLeft,
  Search,
  FolderPlus,
  Loader2,
  HelpCircle,
  LayoutGrid,
  MoreVertical,
  Pencil,
  Trash2,
  Plus,
} from 'lucide-react';
import type { TeamQuestion, TeamCategory, TeamRole, User } from '@/types';
import TeamQuestionCard from '@/components/TeamQuestionCard';
import CategoryModal from '@/components/CategoryModal';
import TeamQuestionModal from '@/components/TeamQuestionModal';

const ITEMS_PER_PAGE = 12;

export default function TeamQuestionsPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;

  const [questions, setQuestions] = useState<TeamQuestion[]>([]);
  const [categories, setCategories] = useState<TeamCategory[]>([]);
  const [teamName, setTeamName] = useState('');
  const [userRole, setUserRole] = useState<TeamRole>('member');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TeamCategory | null>(null);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState<string | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<TeamQuestion | null>(null);

  const isAdmin = userRole === 'owner' || userRole === 'admin';

  const loadData = useCallback(async () => {
    try {
      const [teamData, questionsData, userData] = await Promise.all([
        api.getTeam(teamId),
        api.getTeamQuestions(teamId),
        api.getMe(),
      ]);
      setTeamName(teamData.team.name);
      setUserRole(teamData.role);
      setQuestions(questionsData.questions);
      setCategories(questionsData.categories);
      setCurrentUser(userData.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const result = await api.getTeamQuestions(teamId, {
        category: selectedCategory || undefined,
        q: searchQuery || undefined,
      });
      setQuestions(result.questions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading) {
        handleSearch();
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategory]);

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Delete this category? Questions in this category will become uncategorized.')) {
      return;
    }

    setDeletingCategory(categoryId);
    setCategoryMenuOpen(null);

    try {
      await api.deleteTeamCategory(teamId, categoryId);
      setCategories(categories.filter((c) => c.id !== categoryId));
      if (selectedCategory === categoryId) {
        setSelectedCategory(null);
      }
      // Refresh questions
      const result = await api.getTeamQuestions(teamId);
      setQuestions(result.questions);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setDeletingCategory(null);
    }
  };

  const filteredQuestions = questions;
  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedQuestions = filteredQuestions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  if (loading && questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <button
          onClick={() => router.push(`/dashboard/team/${teamId}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Team
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Back link */}
      <button
        onClick={() => router.push(`/dashboard/team/${teamId}`)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {teamName}
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Questions</h1>
          <p className="text-gray-600">{filteredQuestions.length} questions shared with your team</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditingCategory(null);
              setShowCategoryModal(true);
            }}
            className="btn-secondary flex items-center gap-2"
          >
            <FolderPlus className="w-4 h-4" />
            New Category
          </button>
          <button
            onClick={() => router.push('/dashboard/questions')}
            className="btn-primary flex items-center gap-2"
          >
            <HelpCircle className="w-4 h-4" />
            Browse Questions
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar - Categories */}
        <div className="w-64 flex-shrink-0">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
            Categories
          </h3>
          <div className="space-y-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                selectedCategory === null
                  ? 'bg-primary-100 text-primary-700'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="flex-1">All Questions</span>
              <span className="text-sm text-gray-500">{questions.length}</span>
            </button>

            {categories.map((category) => {
              const count = questions.filter((q) => q.categoryId === category.id).length;
              return (
                <div key={category.id} className="relative group">
                  <button
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-primary-100 text-primary-700'
                        : 'hover:bg-gray-100 text-gray-700'
                    } ${deletingCategory === category.id ? 'opacity-50' : ''}`}
                    disabled={deletingCategory === category.id}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="flex-1 truncate">{category.name}</span>
                    <span className="text-sm text-gray-500">{count}</span>
                  </button>

                  {isAdmin && (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCategoryMenuOpen(
                            categoryMenuOpen === category.id ? null : category.id
                          );
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>

                      {categoryMenuOpen === category.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setCategoryMenuOpen(null)}
                          />
                          <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                            <button
                              onClick={() => {
                                setCategoryMenuOpen(null);
                                setEditingCategory(category);
                                setShowCategoryModal(true);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Pencil className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <button
              onClick={() => setSelectedCategory('uncategorized')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                selectedCategory === 'uncategorized'
                  ? 'bg-primary-100 text-primary-700'
                  : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              <div className="w-3 h-3 rounded-full bg-gray-300 flex-shrink-0" />
              <span className="flex-1">Uncategorized</span>
              <span className="text-sm text-gray-400">
                {questions.filter((q) => !q.categoryId).length}
              </span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search team questions..."
                className="input-field pl-10"
              />
            </div>
          </div>

          {/* Questions Grid */}
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || selectedCategory ? 'No questions found' : 'No questions yet'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || selectedCategory
                  ? 'Try a different search or category'
                  : 'Add questions from the library to share with your team'}
              </p>
              <button
                onClick={() => router.push('/dashboard/questions')}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Browse Questions
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedQuestions.map((question) => (
                <TeamQuestionCard
                  key={question.id}
                  question={question}
                  teamId={teamId}
                  categories={categories}
                  userRole={userRole}
                  currentUserId={currentUser?.id || ''}
                  onDeleted={loadData}
                  onUpdated={loadData}
                  onEdit={setSelectedQuestion}
                />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="btn-secondary disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-gray-600 px-4">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="btn-secondary disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Category Modal */}
      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false);
          setEditingCategory(null);
        }}
        teamId={teamId}
        category={editingCategory}
        onSaved={loadData}
      />

      {selectedQuestion && (
        <TeamQuestionModal
          question={selectedQuestion}
          teamId={teamId}
          categories={categories}
          onClose={() => setSelectedQuestion(null)}
          onSaved={loadData}
        />
      )}
    </div>
  );
}
