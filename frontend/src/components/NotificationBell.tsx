'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Bell, Loader2, ExternalLink } from 'lucide-react';
import type { TeamSummary, TeamActivity } from '@/types';
import ActivityFeed from './ActivityFeed';

interface NotificationBellProps {
  currentUserId: string;
}

export default function NotificationBell({ currentUserId }: NotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  const loadTeamsAndCounts = useCallback(async () => {
    try {
      const teamsData = await api.getMyTeams();
      setTeams(teamsData.teams);

      if (teamsData.teams.length > 0) {
        setSelectedTeamId(teamsData.teams[0].id);

        // Load unread counts for all teams
        const counts: Record<string, number> = {};
        await Promise.all(
          teamsData.teams.map(async (team) => {
            try {
              const result = await api.getUnreadActivityCount(team.id);
              counts[team.id] = result.count;
            } catch {
              counts[team.id] = 0;
            }
          })
        );
        setUnreadCounts(counts);
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeamsAndCounts();
  }, [loadTeamsAndCounts]);

  // Refresh counts periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (teams.length > 0) {
        teams.forEach(async (team) => {
          try {
            const result = await api.getUnreadActivityCount(team.id);
            setUnreadCounts((prev) => ({ ...prev, [team.id]: result.count }));
          } catch {
            // Ignore errors
          }
        });
      }
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [teams]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    if (!selectedTeamId) return;
    try {
      await api.markActivityRead(selectedTeamId);
      setUnreadCounts((prev) => ({ ...prev, [selectedTeamId]: 0 }));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  if (teams.length === 0 && !loading) {
    return null; // Don't show if user has no teams
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        title="Team Activity"
      >
        <Bell className="w-5 h-5" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center px-1">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Team Activity</h3>
              {selectedTeamId && unreadCounts[selectedTeamId] > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-primary-600 hover:text-primary-700"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Team selector */}
            {teams.length > 1 && (
              <div className="mt-3 flex gap-1 flex-wrap">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeamId(team.id)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors relative ${
                      selectedTeamId === team.id
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {team.name}
                    {unreadCounts[team.id] > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Activity feed */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
              </div>
            ) : selectedTeamId ? (
              <ActivityFeed
                teamId={selectedTeamId}
                currentUserId={currentUserId}
                limit={10}
                showLoadMore={false}
                compact
              />
            ) : (
              <div className="py-8 text-center text-gray-500">
                No teams found
              </div>
            )}
          </div>

          {/* Footer */}
          {selectedTeamId && (
            <div className="p-3 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => {
                  router.push(`/dashboard/team/${selectedTeamId}`);
                  setIsOpen(false);
                }}
                className="w-full text-sm text-primary-600 hover:text-primary-700 flex items-center justify-center gap-1"
              >
                View team
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
