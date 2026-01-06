'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  ArrowLeft,
  Users,
  Loader2,
  Settings,
  Crown,
  LogOut,
  Library,
  HelpCircle,
  GitBranch,
  ChevronRight,
  BarChart3,
  Activity,
} from 'lucide-react';
import Link from 'next/link';
import type { Team, TeamRole, User } from '@/types';
import PromptsForYou from '@/components/PromptsForYou';
import ActivityFeed from '@/components/ActivityFeed';
import TeamSettingsModal from '@/components/TeamSettingsModal';

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  invitedByName: string;
  createdAt: string;
  expiresAt: string;
}

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [userRole, setUserRole] = useState<TeamRole>('member');
  const [maxMembers, setMaxMembers] = useState(50);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [workflowCount, setWorkflowCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const isOwner = userRole === 'owner';
  const isAdmin = userRole === 'admin' || userRole === 'owner';

  const loadTeamData = useCallback(async () => {
    try {
      const [teamData, userData, workflowsData] = await Promise.all([
        api.getTeam(teamId),
        api.getMe(),
        api.getWorkflows(teamId),
      ]);
      setTeam(teamData.team);
      setUserRole(teamData.role);
      setMaxMembers(teamData.maxMembers);
      setCurrentUser(userData.user);
      setWorkflowCount(workflowsData.total);

      // Load invitations if user is admin
      if (teamData.role === 'admin' || teamData.role === 'owner') {
        try {
          const invData = await api.getTeamInvitations(teamId);
          setInvitations(invData.invitations);
        } catch {
          // Ignore invitation loading errors
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadTeamData();
  }, [loadTeamData]);

  const handleLeaveTeam = async () => {
    if (isOwner) {
      alert('As the team owner, you cannot leave the team. Transfer ownership first or delete the team.');
      return;
    }

    if (!confirm('Are you sure you want to leave this team? You will lose access to all team prompts and content.')) {
      return;
    }

    setLeaving(true);
    try {
      await api.leaveTeam(teamId);
      router.push('/dashboard/team');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to leave team');
      setLeaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push('/dashboard/team')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Teams
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error || 'Team not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <button
        onClick={() => router.push('/dashboard/team')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Teams
      </button>

      {/* Team header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center">
              <Users className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
                {isOwner && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    <Crown className="w-3 h-3" />
                    Owner
                  </span>
                )}
              </div>
              <p className="text-gray-500">
                {team.members.length} of {maxMembers} members
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isOwner && (
              <button
                onClick={handleLeaveTeam}
                disabled={leaving}
                className="btn-secondary text-red-600 hover:bg-red-50 hover:border-red-200"
              >
                {leaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <LogOut className="w-4 h-4 mr-2" />
                    Leave Team
                  </>
                )}
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setShowSettingsModal(true)}
                className="btn-secondary"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Access Cards - 3 in a row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Link
          href={`/dashboard/team/${teamId}/prompts`}
          className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-primary-300 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                <Library className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Team Prompts</p>
                <p className="text-sm text-gray-500">
                  {team.prompts?.length || 0} prompts
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
          </div>
        </Link>

        <Link
          href={`/dashboard/team/${teamId}/questions`}
          className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-primary-300 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                <HelpCircle className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Team Questions</p>
                <p className="text-sm text-gray-500">
                  {team.questions?.length || 0} questions
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
          </div>
        </Link>

        <Link
          href={`/dashboard/team/${teamId}/workflows`}
          className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-primary-300 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                <GitBranch className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Workflows</p>
                <p className="text-sm text-gray-500">
                  {workflowCount} {workflowCount === 1 ? 'workflow' : 'workflows'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
          </div>
        </Link>
      </div>

      {/* Prompts For You Section */}
      <div className="mb-6">
        <PromptsForYou
          teamId={teamId}
          currentUserId={currentUser?.id || ''}
          onViewAll={() => router.push(`/dashboard/team/${teamId}/prompts`)}
          limit={3}
        />
      </div>

      {/* Analytics Button - Full Width */}
      <Link
        href={`/dashboard/team/${teamId}/analytics`}
        className="block bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-primary-300 transition-all group mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
              <BarChart3 className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Team Analytics</p>
              <p className="text-sm text-gray-500">View insights, trends, and team engagement metrics</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
        </div>
      </Link>

      {/* Activity Feed Section - Limited to 10 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <ActivityFeed
          teamId={teamId}
          currentUserId={currentUser?.id || ''}
          limit={10}
          showLoadMore={false}
        />
      </div>

      {/* Settings Modal */}
      {team && (
        <TeamSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          team={team}
          userRole={userRole}
          currentUserId={currentUser?.id || ''}
          invitations={invitations}
          maxMembers={maxMembers}
          onDataUpdated={loadTeamData}
        />
      )}
    </div>
  );
}
