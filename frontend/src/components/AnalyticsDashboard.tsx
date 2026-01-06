'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Users,
  FileText,
  HelpCircle,
  GitBranch,
  FolderOpen,
  TrendingUp,
  Activity,
  Award,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import type { TeamAnalytics } from '@/types';

interface AnalyticsDashboardProps {
  teamId: string;
}

export default function AnalyticsDashboard({ teamId }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<TeamAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTeamAnalytics(teamId);
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || 'Failed to load analytics'}</p>
        <button onClick={loadAnalytics} className="btn-secondary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Refresh button */}
      <div className="flex justify-end">
        <button
          onClick={loadAnalytics}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          icon={Users}
          label="Members"
          value={analytics.overview.totalMembers}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          icon={FileText}
          label="Prompts"
          value={analytics.overview.totalPrompts}
          color="bg-primary-100 text-primary-600"
        />
        <StatCard
          icon={HelpCircle}
          label="Questions"
          value={analytics.overview.totalQuestions}
          color="bg-purple-100 text-purple-600"
        />
        <StatCard
          icon={GitBranch}
          label="Workflows"
          value={analytics.overview.totalWorkflows}
          color="bg-green-100 text-green-600"
        />
        <StatCard
          icon={FolderOpen}
          label="Categories"
          value={analytics.overview.totalCategories}
          color="bg-amber-100 text-amber-600"
        />
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="space-y-4">
            <TrendItem
              label="Prompts added (30d)"
              value={analytics.trends.promptsAdded30d}
              icon={FileText}
            />
            <TrendItem
              label="Questions added (30d)"
              value={analytics.trends.questionsAdded30d}
              icon={HelpCircle}
            />
            <TrendItem
              label="Activities this week"
              value={analytics.trends.activitiesThisWeek}
              icon={Activity}
            />
            <TrendItem
              label="Activities this month"
              value={analytics.trends.activitiesThisMonth}
              icon={Activity}
            />
          </div>
        </div>

        {/* Top Contributors */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-gray-900">Top Contributors (30d)</h3>
          </div>
          {analytics.topContributors.length === 0 ? (
            <p className="text-gray-500 text-sm">No activity in the last 30 days</p>
          ) : (
            <div className="space-y-3">
              {analytics.topContributors.map((contributor, index) => (
                <div key={contributor.userId} className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index === 0
                        ? 'bg-amber-100 text-amber-700'
                        : index === 1
                        ? 'bg-gray-200 text-gray-700'
                        : index === 2
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{contributor.name}</p>
                  </div>
                  <span className="text-sm text-gray-500">
                    {contributor.count} {contributor.count === 1 ? 'action' : 'actions'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category Distribution */}
      {analytics.categoryStats.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900">Content by Category</h3>
          </div>
          <div className="space-y-3">
            {analytics.categoryStats.map((cat) => {
              const total = analytics.overview.totalPrompts + analytics.overview.totalQuestions;
              const percentage = total > 0 ? Math.round((cat.count / total) * 100) : 0;
              return (
                <div key={cat.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-gray-700">{cat.name}</span>
                    </div>
                    <span className="text-gray-500">
                      {cat.count} items ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Workflow Stats */}
      {analytics.workflowStats.total > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <GitBranch className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">Workflow Overview</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{analytics.workflowStats.total}</p>
              <p className="text-sm text-gray-500">Total</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{analytics.workflowStats.shared}</p>
              <p className="text-sm text-gray-500">Shared</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-600">{analytics.workflowStats.private}</p>
              <p className="text-sm text-gray-500">Private</p>
            </div>
          </div>
        </div>
      )}

      {/* Last updated */}
      <p className="text-xs text-gray-400 text-right">
        Last updated: {new Date(analytics.generatedAt).toLocaleString('en-NZ')}
      </p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

function TrendItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}
