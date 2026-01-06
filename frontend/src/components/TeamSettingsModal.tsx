'use client';

import { useState } from 'react';
import {
  X,
  Copy,
  Check,
  UserPlus,
  Settings,
  Users,
} from 'lucide-react';
import type { Team, TeamRole, User } from '@/types';
import TeamMemberList from './TeamMemberList';
import InviteMemberModal from './InviteMemberModal';

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  invitedByName: string;
  createdAt: string;
  expiresAt: string;
}

interface TeamSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team;
  userRole: TeamRole;
  currentUserId: string;
  invitations: PendingInvitation[];
  maxMembers: number;
  onDataUpdated: () => void;
}

export default function TeamSettingsModal({
  isOpen,
  onClose,
  team,
  userRole,
  currentUserId,
  invitations,
  maxMembers,
  onDataUpdated,
}: TeamSettingsModalProps) {
  const [codeCopied, setCodeCopied] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const isAdmin = userRole === 'admin' || userRole === 'owner';

  const copyTeamCode = async () => {
    if (team?.code) {
      await navigator.clipboard.writeText(team.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  // Filter out invitations for users who are already team members
  const filteredInvitations = invitations.filter(
    (inv) => !team.members.some((m) => m.email.toLowerCase() === inv.email.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Settings className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Team Settings</h2>
                <p className="text-sm text-gray-500">{team.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] space-y-6">
            {/* Team Code Section */}
            {isAdmin && (
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Team Code</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Share this code with colleagues to let them join your team
                </p>
                <div className="flex items-center gap-3">
                  <code className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-3 text-lg font-mono tracking-wider text-center">
                    {team.code}
                  </code>
                  <button
                    onClick={copyTeamCode}
                    className="btn-secondary p-3"
                    title="Copy code"
                  >
                    {codeCopied ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Invite Section */}
            {isAdmin && team.members.length < maxMembers && (
              <div className="bg-primary-50 rounded-xl p-5 border border-primary-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Invite Team Members</h3>
                    <p className="text-sm text-gray-500">
                      Send email invitations to add new members
                    </p>
                  </div>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="btn-primary"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite Member
                  </button>
                </div>
              </div>
            )}

            {/* Member limit warning */}
            {team.members.length >= maxMembers && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-amber-800">
                  This team has reached the maximum of {maxMembers} members.
                </p>
              </div>
            )}

            {/* Team Members Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-gray-400" />
                <h3 className="font-medium text-gray-900">
                  Team Members ({team.members.length}/{maxMembers})
                </h3>
              </div>
              <TeamMemberList
                teamId={team.id}
                members={team.members}
                invitations={filteredInvitations}
                currentUserId={currentUserId}
                userRole={userRole}
                onMemberUpdated={onDataUpdated}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Invite modal */}
      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        teamId={team.id}
        teamName={team.name}
        onInvited={() => {
          setShowInviteModal(false);
          onDataUpdated();
        }}
      />
    </>
  );
}
