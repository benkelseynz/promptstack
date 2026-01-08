'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Plus,
  Loader2,
  FileText,
  MessageSquare,
  ArrowUp,
  ArrowDown,
  X,
  Globe,
  Lock,
  Settings,
  Trash2,
  Copy,
  Check,
  Pencil,
  ChevronDown,
  Paperclip,
  ArrowRight,
} from 'lucide-react';
import type { TeamWorkflow, WorkflowStep, TeamCategory } from '@/types';

interface WorkflowBuilderProps {
  teamId: string;
  workflow: TeamWorkflow;
  canEdit: boolean;
  onUpdated: () => void;
  onDeleted: () => void;
}

export default function WorkflowBuilder({
  teamId,
  workflow,
  canEdit,
  onUpdated,
  onDeleted,
}: WorkflowBuilderProps) {
  const [steps, setSteps] = useState<WorkflowStep[]>(workflow.steps);
  const [showAddStep, setShowAddStep] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [addStepType, setAddStepType] = useState<'prompt' | 'instruction' | null>(null);
  const [reordering, setReordering] = useState(false);
  const [deletingWorkflow, setDeletingWorkflow] = useState(false);
  const [copiedStepId, setCopiedStepId] = useState<string | null>(null);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);

  // Add step form state
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepContent, setNewStepContent] = useState('');
  const [newStepFiles, setNewStepFiles] = useState<string[]>([]);
  const [newFileInput, setNewFileInput] = useState('');
  const [newInstruction, setNewInstruction] = useState('');
  const [addingStep, setAddingStep] = useState(false);

  // Edit step form state
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editFiles, setEditFiles] = useState<string[]>([]);
  const [editFileInput, setEditFileInput] = useState('');
  const [editInstruction, setEditInstruction] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Settings state
  const [editName, setEditName] = useState(workflow.name);
  const [editDescription, setEditDescription] = useState(workflow.description || '');
  const [editSharedWith, setEditSharedWith] = useState(workflow.sharedWith);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(workflow.categoryId || null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [categories, setCategories] = useState<TeamCategory[]>([]);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);

  // Sync steps when workflow prop changes
  useEffect(() => {
    setSteps(workflow.steps);
  }, [workflow.steps]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await api.getTeamCategories(teamId);
        setCategories(data.categories);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    loadCategories();
  }, [teamId]);

  const resetAddForm = () => {
    setAddStepType(null);
    setNewStepTitle('');
    setNewStepContent('');
    setNewStepFiles([]);
    setNewFileInput('');
    setNewInstruction('');
    setShowAddStep(false);
  };

  const handleAddStep = async () => {
    if (!addStepType) return;

    setAddingStep(true);
    try {
      if (addStepType === 'prompt') {
        await api.addWorkflowStep(teamId, workflow.id, {
          type: 'prompt',
          title: newStepTitle,
          content: newStepContent,
          files: newStepFiles.length > 0 ? newStepFiles : undefined,
        });
      } else {
        await api.addWorkflowStep(teamId, workflow.id, {
          type: 'instruction',
          instruction: newInstruction,
        });
      }
      onUpdated();
      resetAddForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add step');
    } finally {
      setAddingStep(false);
    }
  };

  const handleAddFile = () => {
    if (newFileInput.trim()) {
      setNewStepFiles([...newStepFiles, newFileInput.trim()]);
      setNewFileInput('');
    }
  };

  const handleRemoveFile = (index: number) => {
    setNewStepFiles(newStepFiles.filter((_, i) => i !== index));
  };

  const handleAddEditFile = () => {
    if (editFileInput.trim()) {
      setEditFiles([...editFiles, editFileInput.trim()]);
      setEditFileInput('');
    }
  };

  const handleRemoveEditFile = (index: number) => {
    setEditFiles(editFiles.filter((_, i) => i !== index));
  };

  const handleStartEdit = (step: WorkflowStep) => {
    setEditingStepId(step.id);
    if (step.type === 'prompt') {
      setEditTitle(step.title || '');
      setEditContent(step.content || '');
      setEditFiles(step.files || []);
    } else {
      setEditInstruction(step.instruction || '');
    }
  };

  const handleCancelEdit = () => {
    setEditingStepId(null);
    setEditTitle('');
    setEditContent('');
    setEditFiles([]);
    setEditFileInput('');
    setEditInstruction('');
  };

  const handleSaveEdit = async (step: WorkflowStep) => {
    setSavingEdit(true);
    try {
      if (step.type === 'prompt') {
        await api.updateWorkflowStep(teamId, workflow.id, step.id, {
          title: editTitle,
          content: editContent,
          files: editFiles,
        });
      } else {
        await api.updateWorkflowStep(teamId, workflow.id, step.id, {
          instruction: editInstruction,
        });
      }
      onUpdated();
      handleCancelEdit();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update step');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!confirm('Remove this step from the workflow?')) return;
    try {
      await api.deleteWorkflowStep(teamId, workflow.id, stepId);
      setSteps(steps.filter((s) => s.id !== stepId));
      onUpdated();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove step');
    }
  };

  const handleMoveStep = async (stepId: string, direction: 'up' | 'down') => {
    const currentIndex = steps.findIndex((s) => s.id === stepId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;

    const newSteps = [...steps];
    [newSteps[currentIndex], newSteps[newIndex]] = [newSteps[newIndex], newSteps[currentIndex]];
    const stepIds = newSteps.map((s) => s.id);

    setReordering(true);
    setSteps(newSteps);

    try {
      await api.reorderWorkflowSteps(teamId, workflow.id, stepIds);
      onUpdated();
    } catch (err) {
      setSteps(steps);
      alert(err instanceof Error ? err.message : 'Failed to reorder steps');
    } finally {
      setReordering(false);
    }
  };

  const handleCopyPrompt = async (step: WorkflowStep) => {
    if (step.type !== 'prompt' || !step.content) return;
    await navigator.clipboard.writeText(step.content);
    setCopiedStepId(step.id);
    setTimeout(() => setCopiedStepId(null), 2000);
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await api.updateWorkflow(teamId, workflow.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        sharedWith: editSharedWith,
        categoryId: editCategoryId,
      });
      onUpdated();
      setShowSettings(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update workflow');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDeleteWorkflow = async () => {
    if (!confirm('Delete this workflow? This action cannot be undone.')) return;
    setDeletingWorkflow(true);
    try {
      await api.deleteWorkflow(teamId, workflow.id);
      onDeleted();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete workflow');
      setDeletingWorkflow(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{workflow.name}</h1>
            {workflow.description && (
              <p className="text-gray-600 mb-3">{workflow.description}</p>
            )}
            <div className="flex items-center gap-3">
              {workflow.sharedWith === 'team' ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  <Globe className="w-3 h-3" />
                  Shared with team
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                  <Lock className="w-3 h-3" />
                  Private
                </span>
              )}
              <span className="text-sm text-gray-500">
                {steps.length} {steps.length === 1 ? 'step' : 'steps'}
              </span>
            </div>
          </div>

          {canEdit && (
            <button
              onClick={() => {
                setEditName(workflow.name);
                setEditDescription(workflow.description || '');
                setEditSharedWith(workflow.sharedWith);
                setEditCategoryId(workflow.categoryId || null);
                setCategoryMenuOpen(false);
                setShowSettings(true);
              }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              title="Workflow settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Workflow Steps - Vertical Flow */}
      <div className="relative">
        {steps.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No steps yet</h3>
            <p className="text-gray-500 mb-4">Start building your workflow by adding prompts or instructions.</p>
            {canEdit && (
              <button
                onClick={() => setShowAddStep(true)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add First Step
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className="relative">
                {/* Connector line */}
                {index > 0 && (
                  <div className="absolute left-8 -top-4 w-0.5 h-4 bg-gray-300" />
                )}

                {/* Step card */}
                <div className={`bg-white rounded-xl shadow-sm border ${
                  step.type === 'prompt' ? 'border-blue-200' : 'border-amber-200'
                } overflow-hidden`}>
                  {/* Step header */}
                  <div className={`px-4 py-2 flex items-center justify-between ${
                    step.type === 'prompt' ? 'bg-blue-50' : 'bg-amber-50'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium ${
                        step.type === 'prompt' ? 'bg-blue-500' : 'bg-amber-500'
                      }`}>
                        {index + 1}
                      </div>
                      <span className={`text-sm font-medium ${
                        step.type === 'prompt' ? 'text-blue-700' : 'text-amber-700'
                      }`}>
                        {step.type === 'prompt' ? 'Prompt' : 'Instruction'}
                      </span>
                    </div>

                    {canEdit && editingStepId !== step.id && (
                      <div className="flex items-center gap-1">
                        {steps.length > 1 && (
                          <>
                            <button
                              onClick={() => handleMoveStep(step.id, 'up')}
                              disabled={index === 0 || reordering}
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded disabled:opacity-30"
                              title="Move up"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleMoveStep(step.id, 'down')}
                              disabled={index === steps.length - 1 || reordering}
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded disabled:opacity-30"
                              title="Move down"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleStartEdit(step)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStep(step.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white/50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Step content */}
                  <div className="p-4">
                    {editingStepId === step.id ? (
                      /* Edit mode */
                      <div className="space-y-4">
                        {step.type === 'prompt' ? (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="input-field"
                                placeholder="Enter prompt title"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Prompt Content</label>
                              <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="input-field resize-none font-mono text-sm"
                                rows={6}
                                placeholder="Enter your prompt here..."
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Required Files (optional)</label>
                              <div className="flex gap-2 mb-2">
                                <input
                                  type="text"
                                  value={editFileInput}
                                  onChange={(e) => setEditFileInput(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEditFile())}
                                  className="input-field flex-1"
                                  placeholder="e.g., project_brief.pdf"
                                />
                                <button
                                  type="button"
                                  onClick={handleAddEditFile}
                                  className="btn-secondary"
                                >
                                  Add
                                </button>
                              </div>
                              {editFiles.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {editFiles.map((file, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm">
                                      <Paperclip className="w-3 h-3 text-gray-500" />
                                      {file}
                                      <button onClick={() => handleRemoveEditFile(i)} className="ml-1 text-gray-400 hover:text-red-500">
                                        <X className="w-3 h-3" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Instruction</label>
                            <textarea
                              value={editInstruction}
                              onChange={(e) => setEditInstruction(e.target.value)}
                              className="input-field resize-none"
                              rows={3}
                              placeholder="Enter instruction..."
                            />
                          </div>
                        )}
                        <div className="flex justify-end gap-2">
                          <button onClick={handleCancelEdit} className="btn-secondary">Cancel</button>
                          <button
                            onClick={() => handleSaveEdit(step)}
                            disabled={savingEdit || (step.type === 'prompt' ? !editTitle.trim() || !editContent.trim() : !editInstruction.trim())}
                            className="btn-primary"
                          >
                            {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* View mode */
                      <>
                        {step.type === 'prompt' ? (
                          <>
                            <h4 className="font-semibold text-gray-900 mb-2">{step.title}</h4>
                            <div className="bg-gray-900 rounded-lg p-4 mb-3 relative group">
                              <pre className="text-gray-100 text-sm whitespace-pre-wrap font-mono">
                                {step.content}
                              </pre>
                              <button
                                onClick={() => handleCopyPrompt(step)}
                                className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Copy prompt"
                              >
                                {copiedStepId === step.id ? (
                                  <Check className="w-4 h-4 text-green-400" />
                                ) : (
                                  <Copy className="w-4 h-4 text-gray-300" />
                                )}
                              </button>
                            </div>
                            {step.files && step.files.length > 0 && (
                              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                                <Paperclip className="w-4 h-4 text-blue-600 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-blue-800">Required files:</p>
                                  <ul className="text-sm text-blue-700 mt-1">
                                    {step.files.map((file, i) => (
                                      <li key={i}>{file}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-start gap-3">
                            <ArrowRight className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                            <p className="text-gray-700">{step.instruction}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Connector arrow */}
                {index < steps.length - 1 && (
                  <div className="flex justify-center py-2">
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  </div>
                )}
              </div>
            ))}

            {/* Add step button */}
            {canEdit && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setShowAddStep(true)}
                  className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-300 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Step
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Step Modal */}
      {showAddStep && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {addStepType === null ? 'Add Step' : addStepType === 'prompt' ? 'Add Prompt' : 'Add Instruction'}
              </h3>
              <button onClick={resetAddForm} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-4">
              {addStepType === null ? (
                /* Step type selection */
                <div className="space-y-3">
                  <p className="text-gray-600 mb-4">What type of step would you like to add?</p>
                  <button
                    onClick={() => setAddStepType('prompt')}
                    className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Prompt</p>
                        <p className="text-sm text-gray-500">Add a prompt with optional file requirements</p>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setAddStepType('instruction')}
                    className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-amber-300 hover:bg-amber-50 transition-colors text-left"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Instruction</p>
                        <p className="text-sm text-gray-500">Add a manual instruction or note between prompts</p>
                      </div>
                    </div>
                  </button>
                </div>
              ) : addStepType === 'prompt' ? (
                /* Prompt form */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={newStepTitle}
                      onChange={(e) => setNewStepTitle(e.target.value)}
                      className="input-field"
                      placeholder="e.g., Initial Project Analysis"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prompt Content *</label>
                    <textarea
                      value={newStepContent}
                      onChange={(e) => setNewStepContent(e.target.value)}
                      className="input-field resize-none font-mono text-sm"
                      rows={8}
                      placeholder="Enter your prompt here..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Required Files (optional)</label>
                    <p className="text-xs text-gray-500 mb-2">List any files that need to be provided for this prompt</p>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newFileInput}
                        onChange={(e) => setNewFileInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFile())}
                        className="input-field flex-1"
                        placeholder="e.g., project_brief.pdf, requirements.docx"
                      />
                      <button type="button" onClick={handleAddFile} className="btn-secondary">
                        Add
                      </button>
                    </div>
                    {newStepFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {newStepFiles.map((file, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm">
                            <Paperclip className="w-3 h-3 text-gray-500" />
                            {file}
                            <button onClick={() => handleRemoveFile(i)} className="ml-1 text-gray-400 hover:text-red-500">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Instruction form */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instruction *</label>
                    <p className="text-xs text-gray-500 mb-2">Add a note or manual step to complete before the next prompt</p>
                    <textarea
                      value={newInstruction}
                      onChange={(e) => setNewInstruction(e.target.value)}
                      className="input-field resize-none"
                      rows={4}
                      placeholder="e.g., Move the generated file to the /docs folder before proceeding..."
                    />
                  </div>
                </div>
              )}
            </div>

            {addStepType !== null && (
              <div className="p-4 border-t border-gray-200 flex gap-3">
                <button onClick={() => setAddStepType(null)} className="btn-secondary flex-1">
                  Back
                </button>
                <button
                  onClick={handleAddStep}
                  disabled={addingStep || (addStepType === 'prompt' ? !newStepTitle.trim() || !newStepContent.trim() : !newInstruction.trim())}
                  className="btn-primary flex-1"
                >
                  {addingStep ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Add Step'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Workflow Settings</h3>
              <button
                onClick={() => {
                  setShowSettings(false);
                  setEditName(workflow.name);
                  setEditDescription(workflow.description || '');
                  setEditSharedWith(workflow.sharedWith);
                  setEditCategoryId(workflow.categoryId || null);
                  setCategoryMenuOpen(false);
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="sharedWith"
                      checked={editSharedWith === 'team'}
                      onChange={() => setEditSharedWith('team')}
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
                      name="sharedWith"
                      checked={editSharedWith === 'private'}
                      onChange={() => setEditSharedWith('private')}
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

              {/* Delete workflow */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleDeleteWorkflow}
                  disabled={deletingWorkflow}
                  className="w-full flex items-center justify-center gap-2 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  {deletingWorkflow ? (
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
                  setShowSettings(false);
                  setEditName(workflow.name);
                  setEditDescription(workflow.description || '');
                  setEditSharedWith(workflow.sharedWith);
                  setEditCategoryId(workflow.categoryId || null);
                  setCategoryMenuOpen(false);
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
    </div>
  );
}
