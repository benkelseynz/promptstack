'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  UserPlus,
  UserMinus,
  Mail,
  FileText,
  Trash2,
  HelpCircle,
  GitBranch,
  Tag,
  FolderPlus,
  Activity,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import type { TeamActivity, ActivityType } from '@/types';

interface ActivityFeedProps {
  teamId: string;
  currentUserId: string;
  limit?: number;
  showLoadMore?: boolean;
  compact?: boolean;
}

const activityConfig: Record<
  ActivityType,
  { icon: React.ElementType; color: string; getMessage: (a: TeamActivity) => string }
> = {
  member_joined: {
    icon: UserPlus,
    color: 'text-green-600 bg-green-100',
    getMessage: (a) => `${a.actorName} joined the team`,
  },
  member_left: {
    icon: UserMinus,
    color: 'text-red-600 bg-red-100',
    getMessage: (a) => `${a.actorName} left the team`,
  },
  member_invited: {
    icon: Mail,
    color: 'text-blue-600 bg-blue-100',
    getMessage: (a) => `${a.actorName} invited ${a.targetName}`,
  },
  member_role_changed: {
    icon: UserPlus,
    color: 'text-purple-600 bg-purple-100',
    getMessage: (a) => `${a.actorName} changed ${a.targetName}'s role`,
  },
  prompt_added: {
    icon: FileText,
    color: 'text-primary-600 bg-primary-100',
    getMessage: (a) => `${a.actorName} added "${a.targetName}"`,
  },
  prompt_removed: {
    icon: Trash2,
    color: 'text-red-600 bg-red-100',
    getMessage: (a) => `${a.actorName} removed "${a.targetName}"`,
  },
  question_added: {
    icon: HelpCircle,
    color: 'text-purple-600 bg-purple-100',
    getMessage: (a) => `${a.actorName} added "${a.targetName}"`,
  },
  question_removed: {
    icon: Trash2,
    color: 'text-red-600 bg-red-100',
    getMessage: (a) => `${a.actorName} removed a question`,
  },
  workflow_created: {
    icon: GitBranch,
    color: 'text-blue-600 bg-blue-100',
    getMessage: (a) => `${a.actorName} created workflow "${a.targetName}"`,
  },
  workflow_updated: {
    icon: GitBranch,
    color: 'text-blue-600 bg-blue-100',
    getMessage: (a) => `${a.actorName} updated workflow "${a.targetName}"`,
  },
  workflow_deleted: {
    icon: Trash2,
    color: 'text-red-600 bg-red-100',
    getMessage: (a) => `${a.actorName} deleted workflow "${a.targetName}"`,
  },
  prompt_tagged: {
    icon: Tag,
    color: 'text-amber-600 bg-amber-100',
    getMessage: (a) => {
      const taggedUser = (a.metadata?.taggedUser as string) || 'someone';
      return `${a.actorName} tagged ${taggedUser} on "${a.targetName}"`;
    },
  },
  category_created: {
    icon: FolderPlus,
    color: 'text-green-600 bg-green-100',
    getMessage: (a) => `${a.actorName} created category "${a.targetName}"`,
  },
  category_deleted: {
    icon: Trash2,
    color: 'text-red-600 bg-red-100',
    getMessage: (a) => `${a.actorName} deleted category "${a.targetName}"`,
  },
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
  });
}

export default function ActivityFeed({
  teamId,
  currentUserId,
  limit = 20,
  showLoadMore = true,
  compact = false,
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<TeamActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadActivities = useCallback(
    async (reset = false) => {
      try {
        const currentOffset = reset ? 0 : offset;
        const result = await api.getTeamActivity(teamId, {
          limit,
          offset: currentOffset,
        });

        if (reset) {
          setActivities(result.activities);
        } else {
          setActivities((prev) => [...prev, ...result.activities]);
        }

        setHasMore(result.hasMore);
        setOffset(currentOffset + result.activities.length);

        // Mark activities as read
        if (result.activities.length > 0) {
          const unreadIds = result.activities
            .filter((a) => !a.readBy?.includes(currentUserId) && a.actorId !== currentUserId)
            .map((a) => a.id);
          if (unreadIds.length > 0) {
            api.markActivityRead(teamId, unreadIds).catch(console.error);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load activity');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [teamId, limit, offset, currentUserId]
  );

  useEffect(() => {
    loadActivities(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const handleLoadMore = () => {
    setLoadingMore(true);
    loadActivities(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity) => {
        const config = activityConfig[activity.type];
        if (!config) return null;

        const Icon = config.icon;
        const isUnread = !activity.readBy?.includes(currentUserId) && activity.actorId !== currentUserId;

        return (
          <div
            key={activity.id}
            className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
              isUnread ? 'bg-primary-50' : 'hover:bg-gray-50'
            } ${compact ? 'py-2' : ''}`}
          >
            <div className={`p-2 rounded-full ${config.color} flex-shrink-0`}>
              <Icon className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-gray-900 ${compact ? 'text-sm' : ''}`}>
                {config.getMessage(activity)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatRelativeTime(activity.createdAt)}
              </p>
            </div>
            {isUnread && (
              <div className="w-2 h-2 bg-primary-600 rounded-full flex-shrink-0 mt-2" />
            )}
          </div>
        );
      })}

      {showLoadMore && hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 flex items-center justify-center gap-2"
        >
          {loadingMore ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Load more
            </>
          )}
        </button>
      )}
    </div>
  );
}
