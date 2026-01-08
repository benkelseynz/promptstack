'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import {
  Plus,
  Loader2,
  GitBranch,
  Play,
  MoreVertical,
  Trash2,
  X,
  Lock,
  Sparkles,
  Search,
  LayoutGrid,
  FolderOpen,
  Pencil,
  Settings,
  ChevronDown,
} from 'lucide-react';
import type { PersonalWorkflow, WorkflowCategory } from '@/types';

const CATEGORY_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
];

export default function WorkflowsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [workflows, setWorkflows] = useState<PersonalWorkflow[]>([]);
  const [categories, setCategories] = useState<WorkflowCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createCategoryId, setCreateCategoryId] = useState<string>('');
  const [creating, setCreating] = useState(false);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<WorkflowCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState(CATEGORY_COLORS[0]);
  const [savingCategory, setSavingCategory] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(false);

  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [settingsWorkflow, setSettingsWorkflow] = useState<PersonalWorkflow | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [deletingFromSettings, setDeletingFromSettings] = useState(false);

  const isPremium = user?.tier === 'professional' || user?.tier === 'enterprise';

  const loadData = useCallback(async () => {
    if (!isPremium) {
      setLoading(false);
      return;
    }

    try {
      const data = await api.getPersonalWorkflows({
        category: selectedCategory || undefined,
        q: searchQuery || undefined,
      });
      setWorkflows(data.workflows);
      setCategories(data.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflows');
    } finally {
      setLoading(false);
    }
  }, [isPremium, selectedCategory, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading && isPremium) {
        loadData();
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCategory]);

  const handleCreate = async () => {
    if (!createName.trim()) return;

    setCreating(true);
    try {
      const result = await api.createPersonalWorkflow({
        name: createName.trim(),
        description: createDescription.trim() || undefined,
        categoryId: createCategoryId || undefined,
      });
      // Navigate to the new workflow
      router.push(`/dashboard/workflows/${result.workflow.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create workflow');
      setCreating(false);
    }
  };

  const handleDelete = async (workflowId: string) => {
    if (!confirm('Delete this workflow? This action cannot be undone.')) return;

    setDeleting(workflowId);
    setMenuOpen(null);

    try {
      await api.deletePersonalWorkflow(workflowId);
      setWorkflows(workflows.filter((w) => w.id !== workflowId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete workflow');
    } finally {
      setDeleting(null);
    }
  };

  const openSettings = (workflow: PersonalWorkflow) => {
    setSettingsWorkflow(workflow);
    setEditName(workflow.name);
    setEditDescription(workflow.description || '');
    setEditCategoryId(workflow.categoryId || null);
    setCategoryMenuOpen(false);
    setShowSettingsModal(true);
  };

  const closeSettings = () => {
    setShowSettingsModal(false);
    setSettingsWorkflow(null);
    setCategoryMenuOpen(false);
    setSavingSettings(false);
    setDeletingFromSettings(false);
  };

  const handleSaveSettings = async () => {
    if (!settingsWorkflow) return;
    setSavingSettings(true);
    try {
      await api.updatePersonalWorkflow(settingsWorkflow.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        categoryId: editCategoryId,
      });
      await loadData();
      closeSettings();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update workflow');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDeleteFromSettings = async () => {
    if (!settingsWorkflow) return;
    if (!confirm('Delete this workflow? This action cannot be undone.')) return;
    setDeletingFromSettings(true);
    try {
      await api.deletePersonalWorkflow(settingsWorkflow.id);
      await loadData();
      closeSettings();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete workflow');
      setDeletingFromSettings(false);
    }
  };

  const openCategoryModal = (category?: WorkflowCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.name);
      setCategoryColor(category.color);
    } else {
      setEditingCategory(null);
      setCategoryName('');
      setCategoryColor(CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)]);
    }
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) return;

    setSavingCategory(true);
    try {
      if (editingCategory) {
        await api.updateWorkflowCategory(editingCategory.id, {
          name: categoryName.trim(),
          color: categoryColor,
        });
      } else {
        await api.createWorkflowCategory({
          name: categoryName.trim(),
          color: categoryColor,
        });
      }
      setShowCategoryModal(false);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!editingCategory) return;
    if (!confirm('Delete this category? Workflows in this category will become uncategorized.'))
      return;

    setDeletingCategory(true);
    try {
      await api.deleteWorkflowCategory(editingCategory.id);
      setShowCategoryModal(false);
      if (selectedCategory === editingCategory.id) {
        setSelectedCategory(null);
      }
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setDeletingCategory(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getCategoryById = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId);
  };

  // Count workflows per category (based on all workflows, not filtered)
  const getWorkflowCountForCategory = (categoryId: string | null) => {
    if (categoryId === null) {
      return workflows.length;
    }
    if (categoryId === 'uncategorized') {
      return workflows.filter((w) => !w.categoryId).length;
    }
    return workflows.filter((w) => w.categoryId === categoryId).length;
  };

  // Show upgrade prompt for free users
  if (!isPremium) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Workflows is a Premium Feature
          </h1>
          <p className="text-gray-600 mb-8 max-w-lg mx-auto">
            Create reusable sequences of prompts to streamline your AI workflows. Upgrade to
            Premium to unlock this powerful feature and boost your productivity.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard/upgrade" className="btn-primary inline-flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Upgrade to Premium
            </Link>
          </div>

          {/* Feature preview */}
          <div className="mt-12 p-6 bg-gray-50 rounded-xl border border-gray-200 text-left max-w-2xl mx-auto">
            <h3 className="font-semibold text-gray-900 mb-4">What you can do with Workflows:</h3>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-start gap-3">
                <GitBranch className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                <span>Create step-by-step sequences of prompts for recurring tasks</span>
              </li>
              <li className="flex items-start gap-3">
                <GitBranch className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                <span>Add instructions between prompts to guide your process</span>
              </li>
              <li className="flex items-start gap-3">
                <GitBranch className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                <span>Include file requirements to keep track of needed inputs</span>
              </li>
              <li className="flex items-start gap-3">
                <GitBranch className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                <span>
                  Copy individual prompts with one click as you work through your workflow
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (loading && workflows.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Workflows</h1>
          <p className="text-gray-600">
            {workflows.length} workflow{workflows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Workflow
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar - Categories */}
        <div className="w-64 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              Categories
            </h3>
            <button
              onClick={() => openCategoryModal()}
              className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
              title="Add category"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
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
              <span className="flex-1">All Workflows</span>
              <span className="text-sm text-gray-500">{getWorkflowCountForCategory(null)}</span>
            </button>

            {categories.map((category) => (
              <div key={category.id} className="group relative">
                <button
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-primary-100 text-primary-700'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="flex-1 truncate">{category.name}</span>
                  <span className="text-sm text-gray-500">
                    {getWorkflowCountForCategory(category.id)}
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openCategoryModal(category);
                  }}
                  className="absolute right-8 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Edit category"
                >
                  <Pencil className="w-3 h-3 text-gray-500" />
                </button>
              </div>
            ))}

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
                {getWorkflowCountForCategory('uncategorized')}
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
                placeholder="Search workflows..."
                className="input-field pl-10"
              />
            </div>
          </div>

          {/* Workflows list */}
          {workflows.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <GitBranch className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || selectedCategory ? 'No workflows found' : 'No workflows yet'}
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {searchQuery || selectedCategory
                  ? 'Try a different search or category'
                  : 'Create your first workflow to build reusable sequences of prompts and instructions'}
              </p>
              {!searchQuery && !selectedCategory && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create First Workflow
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workflows.map((workflow) => {
                const category = workflow.categoryId ? getCategoryById(workflow.categoryId) : null;
                return (
                  <div
                    key={workflow.id}
                    className={`card hover:shadow-md transition-shadow cursor-pointer ${
                      deleting === workflow.id ? 'opacity-50' : ''
                    }`}
                    onClick={() => router.push(`/dashboard/workflows/${workflow.id}`)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="p-2 bg-primary-100 rounded-lg">
                          <GitBranch className="w-5 h-5 text-primary-600" />
                        </div>
                        {category && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                            style={{
                              backgroundColor: category.color + '20',
                              color: category.color,
                            }}
                          >
                            <FolderOpen className="w-3 h-3" />
                            {category.name}
                          </span>
                        )}
                      </div>

                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setMenuOpen(menuOpen === workflow.id ? null : workflow.id)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {menuOpen === workflow.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setMenuOpen(null)}
                            />
                            <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                              <button
                                onClick={() => {
                                  setMenuOpen(null);
                                  openSettings(workflow);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Settings className="w-4 h-4" />
                                Settings
                              </button>
                              <button
                                onClick={() => {
                                  setMenuOpen(null);
                                  handleDelete(workflow.id);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-1">{workflow.name}</h3>
                    {workflow.description && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                        {workflow.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Play className="w-3 h-3" />
                        {workflow.steps.length} {workflow.steps.length === 1 ? 'step' : 'steps'}
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                      Updated {formatDate(workflow.updatedAt)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Workflow Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Create Workflow</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateName('');
                  setCreateDescription('');
                  setCreateCategoryId('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Workflow Name *
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="input-field"
                  placeholder="e.g., Content Creation Process"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="input-field"
                  rows={3}
                  placeholder="Describe what this workflow is for..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category (optional)
                </label>
                <select
                  value={createCategoryId}
                  onChange={(e) => setCreateCategoryId(e.target.value)}
                  className="input-field"
                >
                  <option value="">No category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateName('');
                  setCreateDescription('');
                  setCreateCategoryId('');
                }}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !createName.trim()}
                className="flex-1 btn-primary"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  'Create Workflow'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && settingsWorkflow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Workflow Settings</h3>
              <button
                onClick={() => {
                  setEditName(settingsWorkflow.name);
                  setEditDescription(settingsWorkflow.description || '');
                  setEditCategoryId(settingsWorkflow.categoryId || null);
                  closeSettings();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Workflow Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input-field"
                  placeholder="Enter workflow name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="input-field"
                  rows={3}
                  placeholder="Describe what this workflow is for..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCategoryMenuOpen(!categoryMenuOpen)}
                    className="input-field flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2 text-sm text-gray-700">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: categories.find((c) => c.id === editCategoryId)?.color || '#d1d5db',
                        }}
                      />
                      {categories.find((c) => c.id === editCategoryId)?.name || 'Uncategorized'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>

                  {categoryMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setCategoryMenuOpen(false)}
                      />
                      <div className="absolute left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-56 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setEditCategoryId(null);
                            setCategoryMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 ${
                            editCategoryId ? 'text-gray-700' : 'bg-gray-50 text-gray-900'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-gray-300" />
                          Uncategorized
                        </button>
                        {categories.map((category) => (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => {
                              setEditCategoryId(category.id);
                              setCategoryMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 ${
                              editCategoryId === category.id
                                ? 'bg-gray-50 text-gray-900'
                                : 'text-gray-700'
                            }`}
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            {category.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleDeleteFromSettings}
                  disabled={deletingFromSettings}
                  className="w-full flex items-center justify-center gap-2 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  {deletingFromSettings ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Delete Workflow
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setEditName(settingsWorkflow.name);
                  setEditDescription(settingsWorkflow.description || '');
                  setEditCategoryId(settingsWorkflow.categoryId || null);
                  closeSettings();
                }}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings || !editName.trim()}
                className="flex-1 btn-primary"
              >
                {savingSettings ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {editingCategory ? 'Edit Category' : 'New Category'}
              </h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="input-field"
                  placeholder="e.g., Marketing"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setCategoryColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        categoryColor === color
                          ? 'border-gray-900 scale-110'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex gap-3">
              {editingCategory && (
                <button
                  onClick={handleDeleteCategory}
                  disabled={deletingCategory}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium"
                >
                  {deletingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
                </button>
              )}
              <div className="flex-1" />
              <button onClick={() => setShowCategoryModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleSaveCategory}
                disabled={savingCategory || !categoryName.trim()}
                className="btn-primary"
              >
                {savingCategory ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : editingCategory ? (
                  'Save'
                ) : (
                  'Create'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
