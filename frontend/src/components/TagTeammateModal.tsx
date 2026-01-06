'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import {
  X,
  Search,
  UserPlus,
  Check,
  Loader2,
  Send,
} from 'lucide-react';
import type { TeamMember, TeamPrompt } from '@/types';

interface TagTeammateModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  prompt: TeamPrompt;
  members: TeamMember[];
  currentUserId: string;
  onTagged: () => void;
}

export default function TagTeammateModal({
  isOpen,
  onClose,
  teamId,
  prompt,
  members,
  currentUserId,
  onTagged,
}: TagTeammateModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Filter out current user and already-tagged members
  const alreadyTaggedIds = new Set((prompt.tags || []).map(t => t.userId));
  const availableMembers = members.filter(
    m => m.userId !== currentUserId && !alreadyTaggedIds.has(m.userId)
  );

  const filteredMembers = availableMembers.filter(m => {
    const query = searchQuery.toLowerCase();
    return (
      m.name?.toLowerCase().includes(query) ||
      m.email.toLowerCase().includes(query)
    );
  });

  const handleSubmit = async () => {
    if (!selectedMember) return;

    setSubmitting(true);
    setError(null);

    try {
      await api.tagTeammate(teamId, prompt.id, selectedMember.userId, message || undefined);
      setSuccess(true);
      setTimeout(() => {
        onTagged();
        handleClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to tag teammate');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedMember(null);
    setMessage('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Tag a Teammate
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Teammate Tagged!
                </h3>
                <p className="text-gray-600">
                  {selectedMember?.name || selectedMember?.email} will see this prompt in their &ldquo;For You&rdquo; section.
                </p>
              </div>
            ) : (
              <>
                {/* Prompt info */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-500 mb-1">Tagging for prompt:</p>
                  <p className="font-medium text-gray-900 truncate">{prompt.title}</p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {availableMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      {members.length <= 1
                        ? 'No teammates to tag. Invite members to your team first.'
                        : 'All teammates have already been tagged on this prompt.'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Search */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search teammates..."
                        className="input-field pl-9 text-sm"
                      />
                    </div>

                    {/* Member list */}
                    <div className="max-h-48 overflow-y-auto mb-4 border border-gray-200 rounded-lg">
                      {filteredMembers.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No teammates found
                        </p>
                      ) : (
                        filteredMembers.map((member) => (
                          <button
                            key={member.userId}
                            onClick={() => setSelectedMember(member)}
                            className={`w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 ${
                              selectedMember?.userId === member.userId
                                ? 'bg-primary-50'
                                : ''
                            }`}
                          >
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-medium text-primary-700">
                                {(member.name || member.email).charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {member.name || 'Unnamed'}
                              </p>
                              <p className="text-sm text-gray-500 truncate">
                                {member.email}
                              </p>
                            </div>
                            {selectedMember?.userId === member.userId && (
                              <Check className="w-5 h-5 text-primary-600 flex-shrink-0" />
                            )}
                          </button>
                        ))
                      )}
                    </div>

                    {/* Optional message */}
                    {selectedMember && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Add a note (optional)
                        </label>
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder={`Why you think ${selectedMember.name || selectedMember.email} should check this out...`}
                          className="input-field text-sm resize-none"
                          rows={2}
                          maxLength={200}
                        />
                        <p className="text-xs text-gray-400 mt-1 text-right">
                          {message.length}/200
                        </p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {!success && availableMembers.length > 0 && (
            <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={handleClose}
                className="btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedMember || submitting}
                className="btn-primary flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Tagging...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Tag Teammate
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
