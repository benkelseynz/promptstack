'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  Users,
  Plus,
  UserPlus,
  Lock,
  Crown,
  Share2,
  FolderKanban,
  Workflow,
  ArrowRight,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import type { TeamSummary } from '@/types';
import CreateTeamModal from '@/components/CreateTeamModal';
import JoinTeamModal from '@/components/JoinTeamModal';

export default function TeamFeaturesPage() {
  const { user } = useAuth();
  const isEnterprise = user?.tier === 'enterprise';

  // For non-enterprise users, show upgrade prompt
  if (!isEnterprise) {
    return <EnterpriseUpgradePrompt />;
  }

  // For enterprise users, show team management
  return <TeamDashboard />;
}

function EnterpriseUpgradePrompt() {
  return (
    <div className="max-w-2xl mx-auto text-center py-12">
      <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Lock className="w-10 h-10 text-amber-600" />
      </div>

      <span className="inline-block bg-amber-100 text-amber-700 text-sm font-medium px-3 py-1 rounded-full mb-4">
        Enterprise Feature
      </span>

      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Team Features
      </h1>

      <p className="text-lg text-gray-600 mb-8">
        Collaborate with your team on prompts, questions, and workflows.
        Team features are available exclusively on the Enterprise plan.
      </p>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="card text-left">
          <Share2 className="w-8 h-8 text-primary-600 mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Shared Prompt Library</h3>
          <p className="text-sm text-gray-600">
            Share prompts across your team with custom categories and organisation.
          </p>
        </div>

        <div className="card text-left">
          <Users className="w-8 h-8 text-primary-600 mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Teammate Tagging</h3>
          <p className="text-sm text-gray-600">
            Tag prompts to colleagues with personalised recommendations.
          </p>
        </div>

        <div className="card text-left">
          <Workflow className="w-8 h-8 text-primary-600 mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Workflows</h3>
          <p className="text-sm text-gray-600">
            Create multi-step prompt sequences for repeatable processes.
          </p>
        </div>

        <div className="card text-left">
          <FolderKanban className="w-8 h-8 text-primary-600 mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Custom Categories</h3>
          <p className="text-sm text-gray-600">
            Organise prompts by role, task, or any structure that fits your team.
          </p>
        </div>
      </div>

      <Link href="/dashboard/upgrade" className="btn-primary inline-flex items-center gap-2">
        <Crown className="w-5 h-5" />
        Upgrade to Enterprise
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function TeamDashboard() {
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      const result = await api.getMyTeams();
      setTeams(result.teams);
    } catch (error) {
      console.error('Failed to load teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTeamCreated = (team: TeamSummary) => {
    setTeams(prev => [...prev, team]);
  };

  const handleTeamJoined = (team: TeamSummary) => {
    setTeams(prev => [...prev, team]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // If user has teams, show team list
  if (teams.length > 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Your Teams
            </h1>
            <p className="text-gray-600">
              {teams.length} team{teams.length !== 1 ? 's' : ''} you're a member of
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowJoinModal(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Join Team
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Team
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/dashboard/team/${team.id}`}
              className="card hover:shadow-lg transition-shadow block"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{team.name}</h3>
                    <p className="text-sm text-gray-500">
                      {team.memberCount} member{team.memberCount !== 1 ? 's' : ''} •
                      {' '}You're {team.role === 'owner' ? 'the owner' : `a ${team.role}`}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </Link>
          ))}
        </div>

        <CreateTeamModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleTeamCreated}
        />
        <JoinTeamModal
          isOpen={showJoinModal}
          onClose={() => setShowJoinModal(false)}
          onJoined={handleTeamJoined}
        />
      </div>
    );
  }

  // No teams yet - show landing page
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Team Features
        </h1>
        <p className="text-lg text-gray-600">
          Collaborate with your team on prompts, questions, and workflows.
        </p>
      </div>

      {/* Create or Join Options */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {/* Create a Team */}
        <button
          className="card hover:shadow-lg transition-shadow cursor-pointer text-left group"
          onClick={() => setShowCreateModal(true)}
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary-200 transition-colors">
              <Plus className="w-7 h-7 text-primary-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-primary-700 transition-colors">
                Create a Team
              </h2>
              <p className="text-gray-600 mb-3">
                Start a new team for your company or department. Invite colleagues and start sharing prompts.
              </p>
              <span className="text-primary-600 font-medium inline-flex items-center gap-1">
                Get started
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </button>

        {/* Join a Team */}
        <button
          className="card hover:shadow-lg transition-shadow cursor-pointer text-left group"
          onClick={() => setShowJoinModal(true)}
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition-colors">
              <UserPlus className="w-7 h-7 text-green-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-green-700 transition-colors">
                Join a Team
              </h2>
              <p className="text-gray-600 mb-3">
                Got a team code from a colleague? Enter your team name and code to join an existing team.
              </p>
              <span className="text-green-600 font-medium inline-flex items-center gap-1">
                Join now
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* Feature Highlights */}
      <div className="bg-gray-50 rounded-2xl p-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">
          What you can do with teams
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
              <Share2 className="w-6 h-6 text-primary-600" />
            </div>
            <h4 className="font-medium text-gray-900 mb-1">Share Prompts</h4>
            <p className="text-sm text-gray-600">
              Add prompts from the library or create custom ones for your team.
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
              <Users className="w-6 h-6 text-primary-600" />
            </div>
            <h4 className="font-medium text-gray-900 mb-1">Tag Teammates</h4>
            <p className="text-sm text-gray-600">
              Recommend prompts to colleagues who might find them useful.
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
              <Workflow className="w-6 h-6 text-primary-600" />
            </div>
            <h4 className="font-medium text-gray-900 mb-1">Build Workflows</h4>
            <p className="text-sm text-gray-600">
              Create step-by-step processes using multiple prompts.
            </p>
          </div>
        </div>
      </div>

      <CreateTeamModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleTeamCreated}
      />
      <JoinTeamModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoined={handleTeamJoined}
      />
    </div>
  );
}
