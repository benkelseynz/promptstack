const { v4: uuidv4 } = require('uuid');
const teamStorage = require('./teamStorage');

/**
 * Activity types supported by the system
 */
const ActivityTypes = {
  MEMBER_JOINED: 'member_joined',
  MEMBER_LEFT: 'member_left',
  MEMBER_INVITED: 'member_invited',
  MEMBER_ROLE_CHANGED: 'member_role_changed',
  PROMPT_ADDED: 'prompt_added',
  PROMPT_REMOVED: 'prompt_removed',
  QUESTION_ADDED: 'question_added',
  QUESTION_REMOVED: 'question_removed',
  WORKFLOW_CREATED: 'workflow_created',
  WORKFLOW_UPDATED: 'workflow_updated',
  WORKFLOW_DELETED: 'workflow_deleted',
  PROMPT_TAGGED: 'prompt_tagged',
  CATEGORY_CREATED: 'category_created',
  CATEGORY_DELETED: 'category_deleted',
};

/**
 * Log an activity to a team's activity feed
 * @param {string} teamId - The team ID
 * @param {object} activity - Activity data
 * @param {string} activity.type - Activity type from ActivityTypes
 * @param {string} activity.actorId - User ID who performed the action
 * @param {string} activity.actorName - Name of the user who performed the action
 * @param {string} [activity.targetId] - ID of the target (prompt, question, member, etc.)
 * @param {string} [activity.targetName] - Name/title of the target
 * @param {object} [activity.metadata] - Additional metadata
 * @returns {Promise<object>} The created activity entry
 */
async function logActivity(teamId, { type, actorId, actorName, targetId, targetName, metadata }) {
  try {
    const team = await teamStorage.getTeamById(teamId);
    if (!team) {
      console.error(`Activity logging failed: Team ${teamId} not found`);
      return null;
    }

    const activity = {
      id: uuidv4(),
      type,
      actorId,
      actorName: actorName || 'Unknown',
      targetId: targetId || null,
      targetName: targetName || null,
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
      readBy: [], // Track which users have read this activity
    };

    // Initialize activity array if it doesn't exist
    if (!team.activity) {
      team.activity = [];
    }

    // Add to beginning of array (most recent first)
    team.activity.unshift(activity);

    // Keep only the last 500 activities to prevent unbounded growth
    if (team.activity.length > 500) {
      team.activity = team.activity.slice(0, 500);
    }

    await teamStorage.updateTeam(teamId, { activity: team.activity });

    return activity;
  } catch (error) {
    console.error('Failed to log activity:', error);
    return null;
  }
}

/**
 * Get activity feed for a team
 * @param {string} teamId - The team ID
 * @param {object} options - Query options
 * @param {number} [options.limit=50] - Max activities to return
 * @param {number} [options.offset=0] - Offset for pagination
 * @param {string} [options.type] - Filter by activity type
 * @returns {Promise<object>} Activity feed with pagination info
 */
async function getActivityFeed(teamId, { limit = 50, offset = 0, type } = {}) {
  const team = await teamStorage.getTeamById(teamId);
  if (!team) {
    throw new Error('Team not found');
  }

  let activities = team.activity || [];

  // Filter by type if specified
  if (type) {
    activities = activities.filter(a => a.type === type);
  }

  const total = activities.length;
  const paginatedActivities = activities.slice(offset, offset + limit);

  return {
    activities: paginatedActivities,
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  };
}

/**
 * Get unread activity count for a user
 * @param {string} teamId - The team ID
 * @param {string} userId - The user ID
 * @returns {Promise<number>} Count of unread activities
 */
async function getUnreadCount(teamId, userId) {
  const team = await teamStorage.getTeamById(teamId);
  if (!team) {
    return 0;
  }

  const activities = team.activity || [];

  // Count activities not read by this user and not created by this user
  const unreadCount = activities.filter(
    a => !a.readBy?.includes(userId) && a.actorId !== userId
  ).length;

  return unreadCount;
}

/**
 * Mark activities as read for a user
 * @param {string} teamId - The team ID
 * @param {string} userId - The user ID
 * @param {string[]} [activityIds] - Specific activity IDs to mark read (all if not provided)
 * @returns {Promise<number>} Number of activities marked as read
 */
async function markAsRead(teamId, userId, activityIds = null) {
  const team = await teamStorage.getTeamById(teamId);
  if (!team) {
    throw new Error('Team not found');
  }

  let markedCount = 0;
  const activities = team.activity || [];

  activities.forEach(activity => {
    // Skip if already read by this user
    if (activity.readBy?.includes(userId)) {
      return;
    }

    // If specific IDs provided, only mark those
    if (activityIds && !activityIds.includes(activity.id)) {
      return;
    }

    // Initialize readBy array if needed
    if (!activity.readBy) {
      activity.readBy = [];
    }

    activity.readBy.push(userId);
    markedCount++;
  });

  if (markedCount > 0) {
    await teamStorage.updateTeam(teamId, { activity: activities });
  }

  return markedCount;
}

/**
 * Get team analytics/statistics
 * @param {string} teamId - The team ID
 * @returns {Promise<object>} Team analytics data
 */
async function getTeamAnalytics(teamId) {
  const team = await teamStorage.getTeamById(teamId);
  if (!team) {
    throw new Error('Team not found');
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const prompts = team.prompts || [];
  const questions = team.questions || [];
  const workflows = team.workflows || [];
  const activities = team.activity || [];
  const members = team.members || [];

  // Calculate activity trends
  const recentActivities = activities.filter(
    a => new Date(a.createdAt) > thirtyDaysAgo
  );
  const weekActivities = activities.filter(
    a => new Date(a.createdAt) > sevenDaysAgo
  );

  // Count activities by type
  const activityByType = {};
  recentActivities.forEach(a => {
    activityByType[a.type] = (activityByType[a.type] || 0) + 1;
  });

  // Most active members (last 30 days)
  const memberActivity = {};
  recentActivities.forEach(a => {
    if (a.actorId) {
      memberActivity[a.actorId] = memberActivity[a.actorId] || {
        userId: a.actorId,
        name: a.actorName,
        count: 0,
      };
      memberActivity[a.actorId].count++;
    }
  });
  const topContributors = Object.values(memberActivity)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Recent additions
  const recentPrompts = prompts
    .filter(p => new Date(p.addedAt) > thirtyDaysAgo)
    .length;
  const recentQuestions = questions
    .filter(q => new Date(q.addedAt) > thirtyDaysAgo)
    .length;

  // Category distribution
  const categoryDistribution = {};
  prompts.forEach(p => {
    const catId = p.categoryId || 'uncategorized';
    categoryDistribution[catId] = (categoryDistribution[catId] || 0) + 1;
  });
  questions.forEach(q => {
    const catId = q.categoryId || 'uncategorized';
    categoryDistribution[catId] = (categoryDistribution[catId] || 0) + 1;
  });

  // Map category IDs to names
  const categories = team.categories || [];
  const categoryStats = Object.entries(categoryDistribution).map(([id, count]) => {
    const cat = categories.find(c => c.id === id);
    return {
      id,
      name: cat?.name || 'Uncategorized',
      color: cat?.color || '#9CA3AF',
      count,
    };
  }).sort((a, b) => b.count - a.count);

  // Workflow usage
  const sharedWorkflows = workflows.filter(w => w.sharedWith === 'team').length;
  const privateWorkflows = workflows.filter(w => w.sharedWith === 'private').length;

  return {
    overview: {
      totalMembers: members.length,
      totalPrompts: prompts.length,
      totalQuestions: questions.length,
      totalWorkflows: workflows.length,
      totalCategories: categories.length,
    },
    trends: {
      promptsAdded30d: recentPrompts,
      questionsAdded30d: recentQuestions,
      activitiesThisWeek: weekActivities.length,
      activitiesThisMonth: recentActivities.length,
    },
    activityByType,
    topContributors,
    categoryStats,
    workflowStats: {
      shared: sharedWorkflows,
      private: privateWorkflows,
      total: workflows.length,
    },
    generatedAt: now.toISOString(),
  };
}

// Helper functions to log specific activity types
const logMemberJoined = (teamId, actor, memberName) =>
  logActivity(teamId, {
    type: ActivityTypes.MEMBER_JOINED,
    actorId: actor.id,
    actorName: actor.name || actor.email,
    targetName: memberName,
  });

const logMemberLeft = (teamId, actor, memberName) =>
  logActivity(teamId, {
    type: ActivityTypes.MEMBER_LEFT,
    actorId: actor.id,
    actorName: actor.name || actor.email,
    targetName: memberName,
  });

const logMemberInvited = (teamId, actor, email, role) =>
  logActivity(teamId, {
    type: ActivityTypes.MEMBER_INVITED,
    actorId: actor.id,
    actorName: actor.name || actor.email,
    targetName: email,
    metadata: { role },
  });

const logPromptAdded = (teamId, actor, promptTitle) =>
  logActivity(teamId, {
    type: ActivityTypes.PROMPT_ADDED,
    actorId: actor.id,
    actorName: actor.name || actor.email,
    targetName: promptTitle,
  });

const logPromptRemoved = (teamId, actor, promptTitle) =>
  logActivity(teamId, {
    type: ActivityTypes.PROMPT_REMOVED,
    actorId: actor.id,
    actorName: actor.name || actor.email,
    targetName: promptTitle,
  });

const logQuestionAdded = (teamId, actor, question) =>
  logActivity(teamId, {
    type: ActivityTypes.QUESTION_ADDED,
    actorId: actor.id,
    actorName: actor.name || actor.email,
    targetName: question.substring(0, 50) + (question.length > 50 ? '...' : ''),
  });

const logQuestionRemoved = (teamId, actor, question) =>
  logActivity(teamId, {
    type: ActivityTypes.QUESTION_REMOVED,
    actorId: actor.id,
    actorName: actor.name || actor.email,
    targetName: question.substring(0, 50) + (question.length > 50 ? '...' : ''),
  });

const logWorkflowCreated = (teamId, actor, workflowName) =>
  logActivity(teamId, {
    type: ActivityTypes.WORKFLOW_CREATED,
    actorId: actor.id,
    actorName: actor.name || actor.email,
    targetName: workflowName,
  });

const logWorkflowDeleted = (teamId, actor, workflowName) =>
  logActivity(teamId, {
    type: ActivityTypes.WORKFLOW_DELETED,
    actorId: actor.id,
    actorName: actor.name || actor.email,
    targetName: workflowName,
  });

const logPromptTagged = (teamId, actor, promptTitle, taggedUserName) =>
  logActivity(teamId, {
    type: ActivityTypes.PROMPT_TAGGED,
    actorId: actor.id,
    actorName: actor.name || actor.email,
    targetName: promptTitle,
    metadata: { taggedUser: taggedUserName },
  });

const logCategoryCreated = (teamId, actor, categoryName) =>
  logActivity(teamId, {
    type: ActivityTypes.CATEGORY_CREATED,
    actorId: actor.id,
    actorName: actor.name || actor.email,
    targetName: categoryName,
  });

module.exports = {
  ActivityTypes,
  logActivity,
  getActivityFeed,
  getUnreadCount,
  markAsRead,
  getTeamAnalytics,
  // Helper functions
  logMemberJoined,
  logMemberLeft,
  logMemberInvited,
  logPromptAdded,
  logPromptRemoved,
  logQuestionAdded,
  logQuestionRemoved,
  logWorkflowCreated,
  logWorkflowDeleted,
  logPromptTagged,
  logCategoryCreated,
};
