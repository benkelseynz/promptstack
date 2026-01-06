'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ArrowLeft, Loader2, BarChart3 } from 'lucide-react';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

export default function TeamAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;

  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTeam = async () => {
      try {
        const data = await api.getTeam(teamId);
        setTeamName(data.team.name);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load team');
      } finally {
        setLoading(false);
      }
    };

    loadTeam();
  }, [teamId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.push(`/dashboard/team/${teamId}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Team
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back link */}
      <button
        onClick={() => router.push(`/dashboard/team/${teamId}`)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {teamName}
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary-100 rounded-xl">
          <BarChart3 className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Analytics</h1>
          <p className="text-gray-600">Insights and statistics for {teamName}</p>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <AnalyticsDashboard teamId={teamId} />
    </div>
  );
}
