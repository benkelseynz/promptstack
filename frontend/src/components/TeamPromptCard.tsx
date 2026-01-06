'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import {
  Copy,
  Check,
  MoreVertical,
  Trash2,
  Edit3,
  FolderOpen,
  Library,
  User,
  StickyNote,
  UserPlus,
  Users,
} from 'lucide-react';
import type { TeamPrompt, TeamCategory, TeamRole, TeamMember } from '@/types';
import TagTeammateModal from './TagTeammateModal';

interface TeamPromptCardProps {
  prompt: TeamPrompt;
  teamId: string;
  categories: TeamCategory[];
  members: TeamMember[];
  userRole: TeamRole;
  currentUserId: string;
  onDeleted: () => void;
  onEdit: (prompt: TeamPrompt) => void;
  onClick?: () => void;
}

export default function TeamPromptCard({
  prompt,
  teamId,
  categories,
  members,
  userRole,
  currentUserId,
  onDeleted,
  onEdit,
  onClick,
}: TeamPromptCardProps) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);

  const category = categories.find((c) => c.id === prompt.categoryId);
  const isAdmin = userRole === 'owner' || userRole === 'admin';
  const canDelete = isAdmin || prompt.addedBy === currentUserId;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove this prompt from the team?')) {
      return;
    }

    setDeleting(true);
    setMenuOpen(false);

    try {
      await api.removeTeamPrompt(teamId, prompt.id);
      onDeleted();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove prompt');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NZ', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <div
      className={`card group ${deleting ? 'opacity-50' : ''} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {prompt.sourceType === 'library' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                <Library className="w-3 h-3" />
                Library
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                <Edit3 className="w-3 h-3" />
                Custom
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
          <h3 className="font-semibold text-gray-900 truncate">{prompt.title}</h3>
        </div>

        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Copy prompt"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          {/* Tag button */}
          {members.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowTagModal(true);
              }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors relative"
              title="Tag a teammate"
            >
              <UserPlus className="w-4 h-4" />
              {prompt.tags && prompt.tags.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">
                  {prompt.tags.length}
                </span>
              )}
            </button>
          )}

          {canDelete && (
            <div className="relative" onClick={(e) => e.stopPropagation()}>
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
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit(prompt);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </button>
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

      {/* Content preview */}
      <p className="text-sm text-gray-600 line-clamp-3 mb-3">{prompt.content}</p>

      {/* Notes */}
      {prompt.notes && (
        <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg mb-3">
          <StickyNote className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 line-clamp-2">{prompt.notes}</p>
        </div>
      )}

      {/* Keywords */}
      {prompt.keywords && prompt.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {prompt.keywords.slice(0, 3).map((keyword, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
            >
              {keyword}
            </span>
          ))}
          {prompt.keywords.length > 3 && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
              +{prompt.keywords.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <User className="w-3 h-3" />
          <span>{prompt.addedByName}</span>
        </div>
        <div className="flex items-center gap-2">
          {prompt.tags && prompt.tags.length > 0 && (
            <span className="flex items-center gap-1 text-primary-600">
              <Users className="w-3 h-3" />
              {prompt.tags.length}
            </span>
          )}
          <span>{formatDate(prompt.addedAt)}</span>
        </div>
      </div>

      {/* Tag Teammate Modal */}
      <TagTeammateModal
        isOpen={showTagModal}
        onClose={() => setShowTagModal(false)}
        teamId={teamId}
        prompt={prompt}
        members={members}
        currentUserId={currentUserId}
        onTagged={onDeleted} // Refresh the list when tagged
      />
    </div>
  );
}
