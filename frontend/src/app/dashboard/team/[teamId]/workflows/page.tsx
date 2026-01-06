'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  ArrowLeft,
  Plus,
  Loader2,
  GitBranch,
  Globe,
  Lock,
  User,
  Play,
  MoreVertical,
  Trash2,
  X,
  Search,
  LayoutGrid,
  FolderOpen,
} from 'lucide-react';
import type { TeamWorkflow, TeamRole, TeamCategory } from '@/types';

export default function TeamWorkflowsPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;

  const [workflows, setWorkflows] = useState<TeamWorkflow[]>([]);
  const [categories, setCategories] = useState<TeamCategory[]>([]);
  const [teamName, setTeamName] = useState('');
  const [userRole, setUserRole] = useState<TeamRole>('member');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createSharedWith, setCreateSharedWith] = useState<'team' | 'private'>('team');
  const [createCategoryId, setCreateCategoryId] = useState<string>('');
  const [creating, setCreating] = useState(false);

  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [teamData, workflowsData] = await Promise.all([
        api.getTeam(teamId),
        api.getWorkflows(teamId, {
          category: selectedCategory || undefined,
          q: searchQuery || undefined,
        }),
      ]);
      setTeamName(teamData.team.name);
      setUserRole(teamData.role);
      setWorkflows(workflowsData.workflows);
      setCategories(workflowsData.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [teamId, selectedCategory, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading) {
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
      const result = await api.createWorkflow(teamId, {
        name: createName.trim(),
        description: createDescription.trim() || undefined,
        sharedWith: createSharedWith,
        categoryId: createCategoryId || undefined,
      });
      // Navigate to the new workflow
      router.push(`/dashboard/team/${teamId}/workflows/${result.workflow.id}`);
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
      await api.deleteWorkflow(teamId, workflowId);
      setWorkflows(workflows.filter((w) => w.id !== workflowId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete workflow');
    } finally {
      setDeleting(null);
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

  // Count workflows per category
  const getWorkflowCountForCategory = (categoryId: string | null) => {
    if (categoryId === null) {
      return workflows.length;
    }
    if (categoryId === 'uncategorized') {
      return workflows.filter((w) => !w.categoryId).length;
    }
    return workflows.filter((w) => w.categoryId === categoryId).length;
  };

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
    <div className="max-w-6xl mx-auto">
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
          <h1 className="text-2xl font-bold text-gray-900">Team Workflows</h1>
          <p className="text-gray-600">
            {workflows.length} workflow{workflows.length !== 1 ? 's' : ''} shared with your team
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
              <span className="flex-1">All Workflows</span>
              <span className="text-sm text-gray-500">{getWorkflowCountForCategory(null)}</span>
            </button>

            {categories.map((category) => (
              <button
                key={category.id}
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
                    onClick={() =>
                      router.push(`/dashboard/team/${teamId}/workflows/${workflow.id}`)
                    }
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="p-2 bg-primary-100 rounded-lg">
                          <GitBranch className="w-5 h-5 text-primary-600" />
                        </div>
                        {workflow.sharedWith === 'team' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            <Globe className="w-3 h-3" />
                            Team
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                            <Lock className="w-3 h-3" />
                            Private
                          </span>
                        )}
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

                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(menuOpen === workflow.id ? null : workflow.id);
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {menuOpen === workflow.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpen(null);
                              }}
                            />
                            <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
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
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {workflow.createdByName}
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                      Created {formatDate(workflow.createdAt)}
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
                  setCreateSharedWith('team');
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
                  placeholder="e.g., Customer Feedback Analysis"
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

              {categories.length > 0 && (
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
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="visibility"
                      checked={createSharedWith === 'team'}
                      onChange={() => setCreateSharedWith('team')}
                      className="text-primary-600"
                    />
                    <Globe className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-gray-900">Shared with team</p>
                      <p className="text-sm text-gray-500">All team members can view and use</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="visibility"
                      checked={createSharedWith === 'private'}
                      onChange={() => setCreateSharedWith('private')}
                      className="text-primary-600"
                    />
                    <Lock className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900">Private</p>
                      <p className="text-sm text-gray-500">Only you can view and use</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateName('');
                  setCreateDescription('');
                  setCreateSharedWith('team');
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
    </div>
  );
}
