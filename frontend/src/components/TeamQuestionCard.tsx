'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import {
  Copy,
  Check,
  MoreVertical,
  Trash2,
  FolderOpen,
  HelpCircle,
  User,
  Loader2,
} from 'lucide-react';
import type { TeamQuestion, TeamCategory, TeamRole } from '@/types';
import NotesEditor from './NotesEditor';

interface TeamQuestionCardProps {
  question: TeamQuestion;
  teamId: string;
  categories: TeamCategory[];
  userRole: TeamRole;
  currentUserId: string;
  onDeleted: () => void;
  onUpdated: () => void;
}

export default function TeamQuestionCard({
  question,
  teamId,
  categories,
  userRole,
  currentUserId,
  onDeleted,
  onUpdated,
}: TeamQuestionCardProps) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const category = categories.find((c) => c.id === question.categoryId);
  const isAdmin = userRole === 'owner' || userRole === 'admin';
  const canDelete = isAdmin || question.addedBy === currentUserId;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(question.question);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove this question from the team?')) {
      return;
    }

    setDeleting(true);
    setMenuOpen(false);

    try {
      await api.removeTeamQuestion(teamId, question.id);
      onDeleted();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove question');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveNotes = async (notes: string) => {
    await api.updateQuestionNotes(teamId, question.id, notes);
    onUpdated();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NZ', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <div className={`card group ${deleting ? 'opacity-50' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {question.sourceType === 'library' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                <HelpCircle className="w-3 h-3" />
                Library
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
        </div>

        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={handleCopy}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Copy question"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          {canDelete && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Question content */}
      <p className="text-gray-900 font-medium mb-2">{question.question}</p>

      {/* Context */}
      {question.context && (
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{question.context}</p>
      )}

      {/* Tags */}
      {question.tags && question.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {question.tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
            >
              {tag}
            </span>
          ))}
          {question.tags.length > 3 && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
              +{question.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="mb-3">
        <NotesEditor
          notes={question.notes || ''}
          onSave={handleSaveNotes}
          lastUpdatedBy={question.notesUpdatedByName}
          lastUpdatedAt={question.notesUpdatedAt}
          placeholder="Add notes about this question..."
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <User className="w-3 h-3" />
          <span>{question.addedByName}</span>
        </div>
        <span>{formatDate(question.addedAt)}</span>
      </div>
    </div>
  );
}
