'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { Skill, CustomSkill, WorkflowCategory } from '@/types';
import {
  Zap,
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
  Download,
  Eye,
  Code,
  FileText,
} from 'lucide-react';
import WorkflowCategoryModal from '@/components/WorkflowCategoryModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function SavedSkillsPage() {
  const searchParams = useSearchParams();
  const [savedSkills, setSavedSkills] = useState<Skill[]>([]);
  const [customSkills, setCustomSkills] = useState<CustomSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'saved' | 'custom'>('saved');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [selectedCustomSkill, setSelectedCustomSkill] = useState<CustomSkill | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState<CustomSkill | null>(null);
  const [workflowCategories, setWorkflowCategories] = useState<WorkflowCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<WorkflowCategory | null>(null);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState<string | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const [itemCategoryMenuOpen, setItemCategoryMenuOpen] = useState<string | null>(null);
  const [updatingCategoryId, setUpdatingCategoryId] = useState<string | null>(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'custom') {
      setActiveTab('custom');
    }
  }, [searchParams]);

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    setLoading(true);
    try {
      const [savedData, customData, categoriesData] = await Promise.all([
        api.getSavedSkills(),
        api.getUserSkills(),
        api.getWorkflowCategories(),
      ]);
      setSavedSkills(savedData.skills);
      setCustomSkills(customData.skills);
      setWorkflowCategories(categoriesData.categories);
    } catch (err) {
      console.error('Failed to load skills:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSaved = async (skillId: string) => {
    try {
      await api.removeSavedSkill(skillId);
      setSavedSkills((prev) => prev.filter((s) => s.id !== skillId));
    } catch (err) {
      console.error('Failed to remove saved skill:', err);
    }
  };

  const handleDeleteCustom = async (skillId: string) => {
    if (!confirm('Are you sure you want to delete this skill?')) return;

    try {
      await api.deleteUserSkill(skillId);
      setCustomSkills((prev) => prev.filter((s) => s.id !== skillId));
    } catch (err) {
      console.error('Failed to delete custom skill:', err);
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
        await api.updateSavedSkillCategory(id, categoryId);
        setSavedSkills((prev) =>
          prev.map((skill) =>
            skill.id === id ? { ...skill, categoryId } : skill
          )
        );
      } else {
        await api.updateUserSkill(id, { categoryId });
        setCustomSkills((prev) =>
          prev.map((skill) =>
            skill.id === id ? { ...skill, categoryId } : skill
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
      await loadSkills();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setDeletingCategory(null);
    }
  };

  const handleDownloadSkill = (skill: Skill | CustomSkill) => {
    const filename = skill.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    const tags = 'tags' in skill ? (skill.tags || []) : [];
    const frontmatter = [
      '---',
      `name: ${skill.title}`,
      `tags: [${tags.join(', ')}]`,
      `version: "1.0"`,
      '---',
      ''
    ].join('\n');

    const markdown = frontmatter + skill.content;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredSavedSkills = useMemo(() => {
    return savedSkills.filter((skill) => {
      const matchesSearch = !searchQuery
        || skill.title.toLowerCase().includes(searchQuery.toLowerCase())
        || skill.preview.toLowerCase().includes(searchQuery.toLowerCase())
        || (skill.tags || []).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
        || (skill.keywords || []).some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));

      const resolvedCategory = resolveCategoryId((skill as Skill & { categoryId?: string }).categoryId);
      const matchesCategory =
        selectedCategory === null
          ? true
          : selectedCategory === 'uncategorized'
          ? !resolvedCategory
          : resolvedCategory === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [savedSkills, searchQuery, selectedCategory, workflowCategories]);

  const filteredCustomSkills = useMemo(() => {
    return customSkills.filter((skill) => {
      const matchesSearch = !searchQuery
        || skill.title.toLowerCase().includes(searchQuery.toLowerCase())
        || skill.content.toLowerCase().includes(searchQuery.toLowerCase())
        || (skill.tags || []).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const resolvedCategory = resolveCategoryId(skill.categoryId);
      const matchesCategory =
        selectedCategory === null
          ? true
          : selectedCategory === 'uncategorized'
          ? !resolvedCategory
          : resolvedCategory === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [customSkills, searchQuery, selectedCategory, workflowCategories]);

  const activeSkills = activeTab === 'saved' ? savedSkills : customSkills;

  return (
    <div>
      <Link
        href="/dashboard/saved"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Saved
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Skills</h1>
          <p className="text-gray-600">
            AI skills you can download and attach to any agent or tool
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
            Create Skill
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
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Saved from Library ({savedSkills.length})
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'custom'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            My Custom Skills ({customSkills.length})
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
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
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="flex-1">All Skills</span>
                <span className="text-sm text-gray-500">{activeSkills.length}</span>
              </button>

              {workflowCategories.map((category) => {
                const count = activeSkills.filter(
                  (skill) => resolveCategoryId((skill as CustomSkill).categoryId) === category.id
                ).length;
                return (
                  <div key={category.id} className="relative group">
                    <button
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-emerald-100 text-emerald-700'
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
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <div className="w-3 h-3 rounded-full bg-gray-300 flex-shrink-0" />
                <span className="flex-1">Uncategorized</span>
                <span className="text-sm text-gray-400">
                  {activeSkills.filter((skill) => !resolveCategoryId((skill as CustomSkill).categoryId)).length}
                </span>
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your skills..."
                  className="input-field pl-10"
                />
              </div>
            </div>

            {activeTab === 'saved' ? (
              filteredSavedSkills.length === 0 ? (
                <div className="text-center py-12">
                  <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery || selectedCategory ? 'No skills found' : 'No saved skills yet'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchQuery || selectedCategory
                      ? 'Try a different search or category'
                      : 'Browse the skills library and save your favourites for quick access.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSavedSkills.map((skill) => (
                    <SkillCard
                      key={skill.id}
                      skill={skill}
                      type="saved"
                      categories={workflowCategories}
                      getCategoryById={getCategoryById}
                      resolveCategoryId={resolveCategoryId}
                      itemCategoryMenuOpen={itemCategoryMenuOpen}
                      setItemCategoryMenuOpen={setItemCategoryMenuOpen}
                      updatingCategoryId={updatingCategoryId}
                      handleUpdateCategory={handleUpdateCategory}
                      onClick={() => setSelectedSkill(skill)}
                      onRemove={() => handleRemoveSaved(skill.id)}
                      onDownload={() => handleDownloadSkill(skill)}
                    />
                  ))}
                </div>
              )
            ) : (
              filteredCustomSkills.length === 0 ? (
                <div className="text-center py-12">
                  <Plus className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery || selectedCategory ? 'No skills found' : 'No custom skills yet'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchQuery || selectedCategory
                      ? 'Try a different search or category'
                      : 'Create your own skills to provide AI agents with structured instructions.'}
                  </p>
                  {!searchQuery && !selectedCategory && (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="btn-primary"
                    >
                      Create Your First Skill
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCustomSkills.map((skill) => (
                    <CustomSkillCard
                      key={skill.id}
                      skill={skill}
                      categories={workflowCategories}
                      getCategoryById={getCategoryById}
                      resolveCategoryId={resolveCategoryId}
                      itemCategoryMenuOpen={itemCategoryMenuOpen}
                      setItemCategoryMenuOpen={setItemCategoryMenuOpen}
                      updatingCategoryId={updatingCategoryId}
                      handleUpdateCategory={handleUpdateCategory}
                      onClick={() => setSelectedCustomSkill(skill)}
                      onEdit={() => setEditingSkill(skill)}
                      onDelete={() => handleDeleteCustom(skill.id)}
                      onDownload={() => handleDownloadSkill(skill)}
                    />
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* View Saved Skill Modal */}
      {selectedSkill && (
        <SkillViewModal
          skill={selectedSkill}
          onClose={() => setSelectedSkill(null)}
          onDownload={() => handleDownloadSkill(selectedSkill)}
        />
      )}

      {/* View Custom Skill Modal */}
      {selectedCustomSkill && (
        <SkillViewModal
          skill={selectedCustomSkill}
          onClose={() => setSelectedCustomSkill(null)}
          onEdit={() => {
            setEditingSkill(selectedCustomSkill);
            setSelectedCustomSkill(null);
          }}
          onDownload={() => handleDownloadSkill(selectedCustomSkill)}
        />
      )}

      {/* Create/Edit Custom Skill Modal */}
      {(showCreateModal || editingSkill) && (
        <CreateSkillModal
          skill={editingSkill}
          categories={workflowCategories}
          onClose={() => {
            setShowCreateModal(false);
            setEditingSkill(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingSkill(null);
            loadSkills();
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
        onSaved={loadSkills}
      />
    </div>
  );
}

// ─── Skill Card (Saved from Library) ─────────────────────

function SkillCard({
  skill,
  type,
  categories,
  getCategoryById,
  resolveCategoryId,
  itemCategoryMenuOpen,
  setItemCategoryMenuOpen,
  updatingCategoryId,
  handleUpdateCategory,
  onClick,
  onRemove,
  onDownload,
}: {
  skill: Skill;
  type: 'saved';
  categories: WorkflowCategory[];
  getCategoryById: (id?: string | null) => WorkflowCategory | null;
  resolveCategoryId: (id?: string | null) => string | null;
  itemCategoryMenuOpen: string | null;
  setItemCategoryMenuOpen: (id: string | null) => void;
  updatingCategoryId: string | null;
  handleUpdateCategory: (type: 'saved' | 'custom', id: string, categoryId: string | null) => void;
  onClick: () => void;
  onRemove: () => void;
  onDownload: () => void;
}) {
  const category = getCategoryById(resolveCategoryId((skill as Skill & { categoryId?: string }).categoryId));
  const categoryLabel = category?.name || 'Uncategorized';
  const categoryColor = category?.color || '#9CA3AF';
  const menuId = `saved-${skill.id}`;

  return (
    <div
      className={`card cursor-pointer hover:shadow-md transition-shadow ${
        skill.isLocked ? 'border-amber-200 bg-amber-50/30' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
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
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">
              {skill.category}
            </span>
          )}
        </div>
        {skill.isLocked && <Lock className="w-4 h-4 text-amber-600" />}
      </div>
      <h3 className="font-semibold text-gray-900 mb-2">{skill.title}</h3>
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{skill.preview}</p>
      {skill.tags && skill.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {skill.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
          {skill.tags.length > 3 && (
            <span className="text-xs text-gray-400">+{skill.tags.length - 3}</span>
          )}
        </div>
      )}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {!skill.isLocked && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
              className="text-gray-400 hover:text-emerald-600 transition-colors"
              title="Download as Markdown"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-gray-400 hover:text-red-600 transition-colors"
          title="Remove from saved"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Custom Skill Card ────────────────────────────────────

function CustomSkillCard({
  skill,
  categories,
  getCategoryById,
  resolveCategoryId,
  itemCategoryMenuOpen,
  setItemCategoryMenuOpen,
  updatingCategoryId,
  handleUpdateCategory,
  onClick,
  onEdit,
  onDelete,
  onDownload,
}: {
  skill: CustomSkill;
  categories: WorkflowCategory[];
  getCategoryById: (id?: string | null) => WorkflowCategory | null;
  resolveCategoryId: (id?: string | null) => string | null;
  itemCategoryMenuOpen: string | null;
  setItemCategoryMenuOpen: (id: string | null) => void;
  updatingCategoryId: string | null;
  handleUpdateCategory: (type: 'saved' | 'custom', id: string, categoryId: string | null) => void;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDownload: () => void;
}) {
  const category = getCategoryById(resolveCategoryId(skill.categoryId));
  const categoryLabel = category?.name || 'Uncategorized';
  const categoryColor = category?.color || '#9CA3AF';
  const menuId = `custom-${skill.id}`;

  // Generate preview from content
  const preview = skill.content
    .replace(/^#+\s+.*$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\|.*\|/g, '')
    .replace(/[-*]\s+/g, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .trim()
    .substring(0, 150);

  return (
    <div
      className="card cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
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
                  onClick={() => handleUpdateCategory('custom', skill.id, null)}
                  disabled={updatingCategoryId === skill.id}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  <span className="w-2 h-2 rounded-full bg-gray-300" />
                  Uncategorized
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleUpdateCategory('custom', skill.id, cat.id)}
                    disabled={updatingCategoryId === skill.id}
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
      <h3 className="font-semibold text-gray-900 mb-2">{skill.title}</h3>
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{preview || skill.content}</p>
      {skill.tags && skill.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {skill.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-500">
          {new Date(skill.updatedAt).toLocaleDateString('en-NZ')}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            className="text-gray-400 hover:text-emerald-600 transition-colors"
            title="Download as Markdown"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="text-gray-400 hover:text-emerald-600 transition-colors"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
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
}

// ─── Skill View Modal ─────────────────────────────────────

function SkillViewModal({
  skill,
  onClose,
  onEdit,
  onDownload,
}: {
  skill: Skill | CustomSkill;
  onClose: () => void;
  onEdit?: () => void;
  onDownload: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCustom = 'createdAt' in skill;
  const tags = skill.tags || [];

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
        return null; // Skip code fences (simplified rendering)
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
                isCustom ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                <Zap className="w-3 h-3 mr-1" />
                {isCustom ? 'Custom Skill' : 'Library Skill'}
              </span>
              {tags.length > 0 && (
                <div className="flex items-center gap-1">
                  {tags.slice(0, 4).map((tag) => (
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

            {viewMode === 'preview' ? (
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
            <div className="flex items-center gap-2">
              {onEdit && (
                <button onClick={onEdit} className="btn-secondary flex items-center gap-2">
                  <Pencil className="w-4 h-4" />
                  Edit Skill
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onDownload()}
                className="btn-secondary flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download .md
              </button>
              <button
                onClick={() => handleCopy(skill.content)}
                className="btn-primary flex items-center gap-2"
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

// ─── Create/Edit Skill Modal ──────────────────────────────

const SKILL_TEMPLATE = `# [Skill Name]

## Role
You are an expert in [area of expertise]. You help with [scope of work].

## Tech Stack & Libraries
- [Language/Tool] [version]
- [Framework/Library]

## Conventions & Rules
- Rule 1
- Rule 2

## Patterns to Follow
\`\`\`
// Example code or pattern here
\`\`\`

## Anti-Patterns (Do NOT)
- Anti-pattern 1
- Anti-pattern 2

## Important Context
- Key context or domain knowledge here`;

function CreateSkillModal({
  skill,
  categories,
  onClose,
  onSave,
}: {
  skill: CustomSkill | null;
  categories: WorkflowCategory[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [mode, setMode] = useState<'guided' | 'freeform'>(skill ? 'freeform' : 'guided');
  const [title, setTitle] = useState(skill?.title || '');
  const [content, setContent] = useState(skill?.content || '');
  const [tags, setTags] = useState(skill?.tags.join(', ') || '');
  const [categoryId, setCategoryId] = useState<string | null>(skill?.categoryId || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Guided mode fields
  const [role, setRole] = useState('');
  const [techStack, setTechStack] = useState('');
  const [conventions, setConventions] = useState('');
  const [antiPatterns, setAntiPatterns] = useState('');
  const [examples, setExamples] = useState('');
  const [context, setContext] = useState('');

  // Parse existing content into guided mode fields (if editing)
  useEffect(() => {
    if (skill && mode === 'guided') {
      parseContentToGuided(skill.content);
    }
  }, []);

  const parseContentToGuided = (content: string) => {
    const sections: Record<string, string> = {};
    let currentSection = '';
    let currentContent: string[] = [];

    for (const line of content.split('\n')) {
      if (line.startsWith('## ')) {
        if (currentSection) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = line.slice(3).trim().toLowerCase();
        currentContent = [];
      } else if (!line.startsWith('# ')) {
        currentContent.push(line);
      }
    }
    if (currentSection) {
      sections[currentSection] = currentContent.join('\n').trim();
    }

    // Map sections to fields
    const findSection = (keywords: string[]) => {
      for (const key of Object.keys(sections)) {
        if (keywords.some(kw => key.includes(kw))) return sections[key];
      }
      return '';
    };

    setRole(findSection(['role', 'identity']));
    setTechStack(findSection(['tech', 'stack', 'libraries', 'tools']));
    setConventions(findSection(['conventions', 'rules', 'guidelines', 'principles']));
    setAntiPatterns(findSection(['anti', 'don\'t', 'do not']));
    setExamples(findSection(['example', 'pattern', 'follow']));
    setContext(findSection(['context', 'important', 'notes']));
  };

  const buildContentFromGuided = () => {
    const parts: string[] = [];
    parts.push(`# ${title}\n`);

    if (role.trim()) {
      parts.push(`## Role\n${role.trim()}\n`);
    }
    if (techStack.trim()) {
      parts.push(`## Tech Stack & Libraries\n${techStack.trim()}\n`);
    }
    if (conventions.trim()) {
      parts.push(`## Conventions & Rules\n${conventions.trim()}\n`);
    }
    if (examples.trim()) {
      parts.push(`## Patterns to Follow\n${examples.trim()}\n`);
    }
    if (antiPatterns.trim()) {
      parts.push(`## Anti-Patterns (Do NOT)\n${antiPatterns.trim()}\n`);
    }
    if (context.trim()) {
      parts.push(`## Important Context\n${context.trim()}\n`);
    }

    return parts.join('\n');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const tagArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const finalContent = mode === 'guided' ? buildContentFromGuided() : content;

      if (skill) {
        await api.updateUserSkill(skill.id, {
          title,
          content: finalContent,
          tags: tagArray,
          categoryId,
        });
      } else {
        await api.createUserSkill({
          title,
          content: finalContent,
          tags: tagArray,
          categoryId,
        });
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save skill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      <div className="relative min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {skill ? 'Edit Skill' : 'Create New Skill'}
              </h2>
              {/* Mode toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    if (mode === 'freeform' && !skill) {
                      // Build guided fields from freeform content
                      if (content) parseContentToGuided(content);
                    }
                    setMode('guided');
                  }}
                  className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-colors ${
                    mode === 'guided' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  Guided
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (mode === 'guided') {
                      // Build freeform content from guided fields
                      const built = buildContentFromGuided();
                      if (built.trim().length > title.length + 5) {
                        setContent(built);
                      }
                    }
                    setMode('freeform');
                  }}
                  className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-colors ${
                    mode === 'freeform' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                  }`}
                >
                  <Code className="w-3 h-3" />
                  Freeform
                </button>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Skill Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-field"
                  placeholder="e.g., Excel Best Practices, Email Writing Style"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="input-field"
                    placeholder="e.g., python, excel, data"
                  />
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
              </div>

              {mode === 'guided' ? (
                /* Guided Mode */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role / Identity
                    </label>
                    <textarea
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      rows={3}
                      className="input-field resize-none text-sm"
                      placeholder="You are an expert in... You help with..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tech Stack & Libraries
                    </label>
                    <textarea
                      value={techStack}
                      onChange={(e) => setTechStack(e.target.value)}
                      rows={3}
                      className="input-field resize-none text-sm"
                      placeholder="- Python 3.11+&#10;- pandas for data manipulation&#10;- openpyxl for Excel files"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Conventions & Rules
                    </label>
                    <textarea
                      value={conventions}
                      onChange={(e) => setConventions(e.target.value)}
                      rows={4}
                      className="input-field resize-none text-sm"
                      placeholder="- Always use named styles&#10;- First row is a header row&#10;- Use consistent formatting"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Patterns / Examples (optional)
                    </label>
                    <textarea
                      value={examples}
                      onChange={(e) => setExamples(e.target.value)}
                      rows={4}
                      className="input-field resize-none font-mono text-sm"
                      placeholder="Code examples or patterns to follow..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Anti-Patterns — Do NOT (optional)
                    </label>
                    <textarea
                      value={antiPatterns}
                      onChange={(e) => setAntiPatterns(e.target.value)}
                      rows={3}
                      className="input-field resize-none text-sm"
                      placeholder="- Never use merged cells&#10;- Don't hardcode values&#10;- Avoid deprecated functions"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Important Context (optional)
                    </label>
                    <textarea
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      rows={3}
                      className="input-field resize-none text-sm"
                      placeholder="Domain-specific knowledge, edge cases, or key decisions..."
                    />
                  </div>
                </div>
              ) : (
                /* Freeform Mode */
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Skill Content (Markdown)
                    </label>
                    {!skill && !content && (
                      <button
                        type="button"
                        onClick={() => setContent(SKILL_TEMPLATE.replace('[Skill Name]', title || 'Skill Name'))}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        Start from template
                      </button>
                    )}
                  </div>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={20}
                    className="input-field resize-none font-mono text-sm"
                    placeholder="Write your skill in Markdown format..."
                    required={mode === 'freeform'}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This content will be exported as a Markdown file — compatible with Cursor Rules, CLAUDE.md, and other AI tools.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-6">
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
                {skill ? 'Update Skill' : 'Create Skill'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
