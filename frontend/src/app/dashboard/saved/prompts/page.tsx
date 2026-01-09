'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { Prompt, CustomPrompt, Industry, WorkflowCategory } from '@/types';
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
  Search,
  FolderPlus,
  LayoutGrid,
  MoreVertical,
  FolderOpen,
} from 'lucide-react';
import PromptModal from '@/components/PromptModal';
import WorkflowCategoryModal from '@/components/WorkflowCategoryModal';

export default function SavedPromptsPage() {
  const searchParams = useSearchParams();
  const [savedPrompts, setSavedPrompts] = useState<Prompt[]>([]);
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'saved' | 'custom'>('saved');
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<CustomPrompt | null>(null);
  const [selectedCustomPrompt, setSelectedCustomPrompt] = useState<CustomPrompt | null>(null);
  const [workflowCategories, setWorkflowCategories] = useState<WorkflowCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<WorkflowCategory | null>(null);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState<string | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const [itemCategoryMenuOpen, setItemCategoryMenuOpen] = useState<string | null>(null);
  const [updatingCategoryId, setUpdatingCategoryId] = useState<string | null>(null);

  // Handle tab query parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'custom') {
      setActiveTab('custom');
    }
  }, [searchParams]);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const [savedData, customData, industriesData, categoriesData] = await Promise.all([
        api.getSavedPrompts(),
        api.getUserPrompts(),
        api.getIndustries(),
        api.getWorkflowCategories(),
      ]);
      setSavedPrompts(savedData.prompts);
      // Add industry names to custom prompts
      const promptsWithIndustryNames = customData.prompts.map((p: CustomPrompt) => ({
        ...p,
        industryName: industriesData.industries.find((i: Industry) => i.id === p.industry)?.name || 'General',
      }));
      setCustomPrompts(promptsWithIndustryNames);
      setIndustries(industriesData.industries);
      setWorkflowCategories(categoriesData.categories);
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

  const resolveCategoryId = (categoryId?: string | null) => {
    if (!categoryId) return null;
    return workflowCategories.some((cat) => cat.id === categoryId) ? categoryId : null;
  };

  const getCategoryById = (categoryId?: string | null) => {
    if (!categoryId) return null;
    return workflowCategories.find((cat) => cat.id === categoryId) || null;
  };

  const handleUpdateCategory = async (
    type: 'saved' | 'custom',
    id: string,
    categoryId: string | null
  ) => {
    setUpdatingCategoryId(id);
    try {
      if (type === 'saved') {
        await api.updateSavedPromptCategory(id, categoryId);
        setSavedPrompts((prev) =>
          prev.map((prompt) =>
            prompt.id === id ? { ...prompt, categoryId } : prompt
          )
        );
      } else {
        await api.updateUserPrompt(id, { categoryId });
        setCustomPrompts((prev) =>
          prev.map((prompt) =>
            prompt.id === id ? { ...prompt, categoryId } : prompt
          )
        );
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update category');
    } finally {
      setUpdatingCategoryId(null);
      setItemCategoryMenuOpen(null);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Delete this category? Items in this category will become uncategorized.')) {
      return;
    }

    setDeletingCategory(categoryId);
    setCategoryMenuOpen(null);

    try {
      await api.deleteWorkflowCategory(categoryId);
      if (selectedCategory === categoryId) {
        setSelectedCategory(null);
      }
      await loadPrompts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setDeletingCategory(null);
    }
  };

  const filteredSavedPrompts = useMemo(() => {
    return savedPrompts.filter((prompt) => {
      const matchesSearch = !searchQuery
        || prompt.title.toLowerCase().includes(searchQuery.toLowerCase())
        || prompt.preview.toLowerCase().includes(searchQuery.toLowerCase())
        || (prompt.keywords || []).some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));

      const resolvedCategory = resolveCategoryId(prompt.categoryId);
      const matchesCategory =
        selectedCategory === null
          ? true
          : selectedCategory === 'uncategorized'
          ? !resolvedCategory
          : resolvedCategory === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [savedPrompts, searchQuery, selectedCategory, workflowCategories]);

  const filteredCustomPrompts = useMemo(() => {
    return customPrompts.filter((prompt) => {
      const matchesSearch = !searchQuery
        || prompt.title.toLowerCase().includes(searchQuery.toLowerCase())
        || prompt.content.toLowerCase().includes(searchQuery.toLowerCase())
        || (prompt.keywords || []).some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));

      const resolvedCategory = resolveCategoryId(prompt.categoryId);
      const matchesCategory =
        selectedCategory === null
          ? true
          : selectedCategory === 'uncategorized'
          ? !resolvedCategory
          : resolvedCategory === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [customPrompts, searchQuery, selectedCategory, workflowCategories]);

  const activePrompts = activeTab === 'saved' ? savedPrompts : customPrompts;
  const filteredPrompts = activeTab === 'saved' ? filteredSavedPrompts : filteredCustomPrompts;

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
          <h1 className="text-2xl font-bold text-gray-900">My Saved Prompts</h1>
          <p className="text-gray-600">
            Your saved and custom prompts in one place
          </p>
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
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Prompt
          </button>
        </div>
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
            Saved from Library ({savedPrompts.length})
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'custom'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
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
      ) : (
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
                <span className="flex-1">All Prompts</span>
                <span className="text-sm text-gray-500">{activePrompts.length}</span>
              </button>

              {workflowCategories.map((category) => {
                const count = activePrompts.filter(
                  (prompt) => resolveCategoryId(prompt.categoryId) === category.id
                ).length;
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
                  {activePrompts.filter((prompt) => !resolveCategoryId(prompt.categoryId)).length}
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
                  placeholder="Search your prompts..."
                  className="input-field pl-10"
                />
              </div>
            </div>

            {activeTab === 'saved' ? (
              /* Saved Prompts */
              filteredSavedPrompts.length === 0 ? (
                <div className="text-center py-12">
                  <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery || selectedCategory ? 'No prompts found' : 'No saved prompts yet'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchQuery || selectedCategory
                      ? 'Try a different search or category'
                      : 'Browse the library and save your favourite prompts for quick access.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSavedPrompts.map((prompt) => {
                    const category = getCategoryById(resolveCategoryId(prompt.categoryId));
                    const categoryLabel = category?.name || 'Uncategorized';
                    const categoryColor = category?.color || '#9CA3AF';
                    const menuId = `saved-${prompt.id}`;
                    return (
                      <div
                        key={prompt.id}
                        className={`card cursor-pointer hover:shadow-md transition-shadow ${
                          prompt.isLocked ? 'border-amber-200 bg-amber-50/30' : ''
                        }`}
                        onClick={() => setSelectedPrompt(prompt)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-xs font-medium px-2 py-1 rounded-full ${
                                prompt.access === 'premium'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {prompt.access === 'premium' ? 'Premium' : 'Free'}
                            </span>
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() =>
                                  setItemCategoryMenuOpen(
                                    itemCategoryMenuOpen === menuId ? null : menuId
                                  )
                                }
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors"
                                style={{
                                  backgroundColor: categoryColor + '20',
                                  color: categoryColor,
                                }}
                              >
                                <FolderOpen className="w-3 h-3" />
                                {categoryLabel}
                              </button>

                              {itemCategoryMenuOpen === menuId && (
                                <>
                                  <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setItemCategoryMenuOpen(null)}
                                  />
                                  <div className="absolute left-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                    <button
                                      onClick={() => handleUpdateCategory('saved', prompt.id, null)}
                                      disabled={updatingCategoryId === prompt.id}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                                    >
                                      <span className="w-2 h-2 rounded-full bg-gray-300" />
                                      Uncategorized
                                    </button>
                                    {workflowCategories.map((cat) => (
                                      <button
                                        key={cat.id}
                                        onClick={() => handleUpdateCategory('saved', prompt.id, cat.id)}
                                        disabled={updatingCategoryId === prompt.id}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                                      >
                                        <span
                                          className="w-2 h-2 rounded-full"
                                          style={{ backgroundColor: cat.color }}
                                        />
                                        {cat.name}
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          {prompt.isLocked && <Lock className="w-4 h-4 text-amber-600" />}
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">{prompt.title}</h3>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {prompt.preview}
                        </p>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <span className="text-xs text-gray-500">{prompt.industryName}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveSaved(prompt.id);
                            }}
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
              /* Custom Prompts */
              filteredCustomPrompts.length === 0 ? (
                <div className="text-center py-12">
                  <Plus className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery || selectedCategory ? 'No prompts found' : 'No custom prompts yet'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchQuery || selectedCategory
                      ? 'Try a different search or category'
                      : 'Create your own prompts to use with any AI assistant.'}
                  </p>
                  {!searchQuery && !selectedCategory && (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="btn-primary"
                    >
                      Create Your First Prompt
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCustomPrompts.map((prompt) => {
                    const category = getCategoryById(resolveCategoryId(prompt.categoryId));
                    const categoryLabel = category?.name || 'Uncategorized';
                    const categoryColor = category?.color || '#9CA3AF';
                    const menuId = `custom-${prompt.id}`;
                    return (
                      <div
                        key={prompt.id}
                        className="card cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedCustomPrompt(prompt)}
                      >
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                            Custom
                          </span>
                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() =>
                                setItemCategoryMenuOpen(
                                  itemCategoryMenuOpen === menuId ? null : menuId
                                )
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors"
                              style={{
                                backgroundColor: categoryColor + '20',
                                color: categoryColor,
                              }}
                            >
                              <FolderOpen className="w-3 h-3" />
                              {categoryLabel}
                            </button>

                            {itemCategoryMenuOpen === menuId && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setItemCategoryMenuOpen(null)}
                                />
                                <div className="absolute left-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                  <button
                                    onClick={() => handleUpdateCategory('custom', prompt.id, null)}
                                    disabled={updatingCategoryId === prompt.id}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                                  >
                                    <span className="w-2 h-2 rounded-full bg-gray-300" />
                                    Uncategorized
                                  </button>
                                  {workflowCategories.map((cat) => (
                                    <button
                                      key={cat.id}
                                      onClick={() => handleUpdateCategory('custom', prompt.id, cat.id)}
                                      disabled={updatingCategoryId === prompt.id}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                                    >
                                      <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: cat.color }}
                                      />
                                      {cat.name}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {prompt.industryName || prompt.industry || 'General'}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">{prompt.title}</h3>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {prompt.content}
                        </p>
                        {prompt.role && prompt.role !== 'General' && (
                          <p className="text-xs text-gray-500 mb-3">Role: {prompt.role}</p>
                        )}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <span className="text-xs text-gray-500">
                            {new Date(prompt.updatedAt).toLocaleDateString('en-NZ')}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingPrompt(prompt);
                              }}
                              className="text-gray-400 hover:text-primary-600 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCustom(prompt.id);
                              }}
                              className="text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>
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
          categories={workflowCategories}
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

      <WorkflowCategoryModal
        isOpen={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false);
          setEditingCategory(null);
        }}
        category={editingCategory}
        onSaved={loadPrompts}
      />
    </div>
  );
}

function CustomPromptModal({
  prompt,
  industries,
  categories,
  onClose,
  onSave,
}: {
  prompt: CustomPrompt | null;
  industries: Industry[];
  categories: WorkflowCategory[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [title, setTitle] = useState(prompt?.title || '');
  const [content, setContent] = useState(prompt?.content || '');
  const [keywords, setKeywords] = useState(prompt?.keywords.join(', ') || '');
  const [industry, setIndustry] = useState(prompt?.industry || 'general');
  const [role, setRole] = useState(prompt?.role || 'General');
  const [categoryId, setCategoryId] = useState<string | null>(prompt?.categoryId || null);
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

      if (prompt) {
        await api.updateUserPrompt(prompt.id, {
          title,
          content,
          keywords: keywordArray,
          industry,
          role,
          categoryId,
        });
      } else {
        await api.createUserPrompt({
          title,
          content,
          keywords: keywordArray,
          industry,
          role,
          categoryId,
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
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              {prompt ? 'Edit Prompt' : 'Create Custom Prompt'}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={categoryId || ''}
                onChange={(e) => setCategoryId(e.target.value || null)}
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
                rows={8}
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
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                Custom
              </span>
              <span className="inline-flex items-center text-sm text-gray-500 h-6">{prompt.industryName || prompt.industry || 'General'}</span>
              {prompt.role && prompt.role !== 'General' && (
                <>
                  <span className="inline-flex items-center text-gray-300 h-6">•</span>
                  <span className="inline-flex items-center text-sm text-gray-500 h-6">{prompt.role}</span>
                </>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{prompt.title}</h2>

            <div className="space-y-4">
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
                  {placeholders.length > 0 && Object.keys(placeholderValues).some(k => placeholderValues[k])
                    ? 'Populated Prompt'
                    : 'Prompt Content'}
                </h3>
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-gray-100 text-sm whitespace-pre-wrap font-mono">
                    {placeholders.length > 0 && Object.keys(placeholderValues).some(k => placeholderValues[k])
                      ? populatedContent
                      : prompt.content}
                  </pre>
                </div>
              </div>

              {/* Keywords */}
              {prompt.keywords && prompt.keywords.length > 0 && (
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
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t bg-gray-50">
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
