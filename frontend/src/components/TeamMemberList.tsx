'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import {
  Crown,
  Shield,
  User,
  MoreVertical,
  UserMinus,
  ShieldCheck,
  ShieldOff,
  Loader2,
  Clock,
  X,
  Mail,
} from 'lucide-react';
import type { TeamMember, TeamRole } from '@/types';

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  invitedByName: string;
  createdAt: string;
  expiresAt: string;
}

interface TeamMemberListProps {
  teamId: string;
  members: TeamMember[];
  invitations: PendingInvitation[];
  currentUserId: string;
  userRole: TeamRole;
  onMemberUpdated: () => void;
}

export default function TeamMemberList({
  teamId,
  members,
  invitations,
  currentUserId,
  userRole,
  onMemberUpdated,
}: TeamMemberListProps) {
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOwner = userRole === 'owner';
  const isAdmin = userRole === 'admin' || userRole === 'owner';

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-amber-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-primary-500" />;
      default:
        return <User className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <Crown className="w-3 h-3" />
            Owner
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
            <Shield className="w-3 h-3" />
            Admin
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            Member
          </span>
        );
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'member') => {
    setLoading(userId);
    setError(null);
    setActionMenuOpen(null);

    try {
      await api.updateMemberRole(teamId, userId, newRole);
      onMemberUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setLoading(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member from the team?')) {
      return;
    }

    setLoading(userId);
    setError(null);
    setActionMenuOpen(null);

    try {
      await api.removeMember(teamId, userId);
      onMemberUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setLoading(null);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) {
      return;
    }

    setLoading(invitationId);
    setError(null);

    try {
      await api.cancelInvitation(teamId, invitationId);
      onMemberUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel invitation');
    } finally {
      setLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getExpiryText = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 0) return 'Expired';
    if (daysLeft === 1) return 'Expires tomorrow';
    return `Expires in ${daysLeft} days`;
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Current Members */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
          Members ({members.length})
        </h3>
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
          {members.map((member) => (
            <div
              key={member.userId}
              className="flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  {getRoleIcon(member.role)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">
                      {member.name || 'Unknown'}
                      {member.userId === currentUserId && (
                        <span className="text-gray-500 text-sm ml-1">(you)</span>
                      )}
                    </p>
                    {getRoleBadge(member.role)}
                  </div>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {loading === member.userId ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                ) : (
                  <>
                    {/* Show action menu for non-owners if current user has permission */}
                    {member.role !== 'owner' &&
                      member.userId !== currentUserId &&
                      (isOwner || (isAdmin && member.role === 'member')) && (
                        <div className="relative">
                          <button
                            onClick={() =>
                              setActionMenuOpen(
                                actionMenuOpen === member.userId ? null : member.userId
                              )
                            }
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-400" />
                          </button>

                          {actionMenuOpen === member.userId && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setActionMenuOpen(null)}
                              />
                              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                {/* Role management - only owner can change roles */}
                                {isOwner && (
                                  <>
                                    {member.role === 'member' ? (
                                      <button
                                        onClick={() =>
                                          handleUpdateRole(member.userId, 'admin')
                                        }
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                      >
                                        <ShieldCheck className="w-4 h-4" />
                                        Make Admin
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() =>
                                          handleUpdateRole(member.userId, 'member')
                                        }
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                      >
                                        <ShieldOff className="w-4 h-4" />
                                        Remove Admin
                                      </button>
                                    )}
                                  </>
                                )}
                                {/* Remove member */}
                                <button
                                  onClick={() => handleRemoveMember(member.userId)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  <UserMinus className="w-4 h-4" />
                                  Remove from Team
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invitations */}
      {isAdmin && invitations.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
            Pending Invitations ({invitations.length})
          </h3>
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{invitation.email}</p>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Clock className="w-3 h-3" />
                        Pending
                      </span>
                      {getRoleBadge(invitation.role)}
                    </div>
                    <p className="text-sm text-gray-500">
                      Invited by {invitation.invitedByName} • {getExpiryText(invitation.expiresAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {loading === invitation.id ? (
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  ) : (
                    <button
                      onClick={() => handleCancelInvitation(invitation.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-600"
                      title="Cancel invitation"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for invitations */}
      {isAdmin && invitations.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          No pending invitations
        </p>
      )}
    </div>
  );
}
