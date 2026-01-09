const { v4: uuidv4 } = require('uuid');
const path = require('path');
const crypto = require('crypto');
const {
  TEAMS_DIR,
  ensureDirectories,
  getTeamFilePath,
  getTeamCodesIndexPath,
  atomicWrite,
  readJsonFile,
  listFiles
} = require('./fileStorage');
const { getUserById, updateUser } = require('./userStorage');
const { getUserDisplayName } = require('../utils/user');

const MAX_TEAM_MEMBERS = 50;

// Generate a unique team code (format: XXXX-XXXX)
function generateTeamCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars: I, O, 0, 1
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Load team codes index
async function loadTeamCodesIndex() {
  const indexPath = getTeamCodesIndexPath();
  const index = await readJsonFile(indexPath);
  return index || {};
}

// Save team codes index
async function saveTeamCodesIndex(index) {
  const indexPath = getTeamCodesIndexPath();
  await atomicWrite(indexPath, index);
}

// Get team by code
async function getTeamByCode(code) {
  const codesIndex = await loadTeamCodesIndex();
  const teamId = codesIndex[code.toUpperCase()];

  if (!teamId) {
    return null;
  }

  return getTeamById(teamId);
}

// Create a new team
async function createTeam({ name, ownerId }) {
  await ensureDirectories();

  // Verify owner exists and is enterprise tier
  const owner = await getUserById(ownerId);
  if (!owner) {
    return { error: 'User not found' };
  }
  if (owner.tier !== 'enterprise') {
    return { error: 'Enterprise subscription required to create teams' };
  }

  // Generate unique team code
  const codesIndex = await loadTeamCodesIndex();
  let code;
  do {
    code = generateTeamCode();
  } while (codesIndex[code]); // Ensure uniqueness

  const teamId = uuidv4();
  const now = new Date().toISOString();

  const teamData = {
    id: teamId,
    name: name.trim(),
    code,
    ownerId,
    createdAt: now,
    updatedAt: now,
    settings: {
      allowMemberInvites: false,
      requireApproval: false,
      defaultRole: 'member'
    },
    members: [
      {
        userId: ownerId,
        email: owner.email,
        name: getUserDisplayName(owner),
        role: 'owner',
        joinedAt: now,
        invitedBy: null
      }
    ],
    categories: [],
    prompts: [],
    questions: [],
    workflows: [],
    activity: [
      {
        id: uuidv4(),
        type: 'member_joined',
        actorId: ownerId,
        actorName: getUserDisplayName(owner),
        metadata: { role: 'owner', action: 'created_team' },
        createdAt: now
      }
    ]
  };

  // Save team file
  const teamFilePath = getTeamFilePath(teamId);
  await atomicWrite(teamFilePath, teamData);

  // Update codes index
  codesIndex[code] = teamId;
  await saveTeamCodesIndex(codesIndex);

  // Add team membership to user
  await addTeamMembershipToUser(ownerId, {
    teamId,
    teamName: name.trim(),
    role: 'owner',
    joinedAt: now
  });

  return { team: getTeamSummary(teamData, 'owner') };
}

// Get team by ID
async function getTeamById(teamId) {
  const teamFilePath = getTeamFilePath(teamId);
  return readJsonFile(teamFilePath);
}

// Update team data
async function updateTeam(teamId, updates) {
  const team = await getTeamById(teamId);
  if (!team) {
    return null;
  }

  const updatedTeam = {
    ...team,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const teamFilePath = getTeamFilePath(teamId);
  await atomicWrite(teamFilePath, updatedTeam);

  return updatedTeam;
}

// Get team summary (safe data for listings)
function getTeamSummary(teamData, userRole) {
  return {
    id: teamData.id,
    name: teamData.name,
    code: teamData.code,
    role: userRole,
    memberCount: teamData.members.length,
    createdAt: teamData.createdAt
  };
}

// Get full team details (for team members)
function getTeamDetails(teamData) {
  return {
    id: teamData.id,
    name: teamData.name,
    code: teamData.code,
    ownerId: teamData.ownerId,
    createdAt: teamData.createdAt,
    updatedAt: teamData.updatedAt,
    memberCount: teamData.members.length,
    members: teamData.members.map(m => ({
      userId: m.userId,
      email: m.email,
      name: m.name,
      role: m.role,
      joinedAt: m.joinedAt
    })),
    categories: teamData.categories,
    prompts: teamData.prompts || [],
    questions: teamData.questions || [],
    settings: teamData.settings
  };
}

// Add team membership to user record
async function addTeamMembershipToUser(userId, membership) {
  const user = await getUserById(userId);
  if (!user) return null;

  const teamMemberships = user.teamMemberships || [];

  // Check if already a member
  const existingIndex = teamMemberships.findIndex(m => m.teamId === membership.teamId);
  if (existingIndex >= 0) {
    teamMemberships[existingIndex] = membership;
  } else {
    teamMemberships.push(membership);
  }

  await updateUser(userId, { teamMemberships });
  return teamMemberships;
}

// Remove team membership from user record
async function removeTeamMembershipFromUser(userId, teamId) {
  const user = await getUserById(userId);
  if (!user) return null;

  const teamMemberships = (user.teamMemberships || []).filter(m => m.teamId !== teamId);
  await updateUser(userId, { teamMemberships });
  return teamMemberships;
}

// Get user's teams
async function getUserTeams(userId) {
  const user = await getUserById(userId);
  if (!user) return [];

  const memberships = user.teamMemberships || [];
  const teams = [];

  for (const membership of memberships) {
    const team = await getTeamById(membership.teamId);
    if (team) {
      teams.push({
        ...getTeamSummary(team, membership.role),
        joinedAt: membership.joinedAt
      });
    }
  }

  return teams;
}

// Join a team with code
async function joinTeam({ userId, teamName, teamCode }) {
  // Verify user exists and is enterprise tier
  const user = await getUserById(userId);
  if (!user) {
    return { error: 'User not found' };
  }
  if (user.tier !== 'enterprise') {
    return { error: 'Enterprise subscription required to join teams' };
  }

  // Find team by code
  const team = await getTeamByCode(teamCode);
  if (!team) {
    return { error: 'Invalid team code' };
  }

  // Verify team name matches (case-insensitive)
  if (team.name.toLowerCase() !== teamName.trim().toLowerCase()) {
    return { error: 'Team name does not match the code' };
  }

  // Check if already a member
  const existingMember = team.members.find(m => m.userId === userId);
  if (existingMember) {
    return { error: 'You are already a member of this team' };
  }

  // Check team size limit
  if (team.members.length >= MAX_TEAM_MEMBERS) {
    return { error: `Team has reached the maximum of ${MAX_TEAM_MEMBERS} members` };
  }

  const now = new Date().toISOString();

  // Add member to team
  team.members.push({
    userId,
    email: user.email,
    name: getUserDisplayName(user),
    role: team.settings.defaultRole || 'member',
    joinedAt: now,
    invitedBy: null // Self-joined with code
  });

  // Add activity
  team.activity.unshift({
    id: uuidv4(),
    type: 'member_joined',
    actorId: userId,
    actorName: getUserDisplayName(user),
    metadata: { role: 'member' },
    createdAt: now
  });

  team.updatedAt = now;

  // Save team
  const teamFilePath = getTeamFilePath(team.id);
  await atomicWrite(teamFilePath, team);

  // Add team membership to user
  await addTeamMembershipToUser(userId, {
    teamId: team.id,
    teamName: team.name,
    role: team.settings.defaultRole || 'member',
    joinedAt: now
  });

  return { team: getTeamSummary(team, 'member') };
}

// Leave a team
async function leaveTeam(userId, teamId) {
  const team = await getTeamById(teamId);
  if (!team) {
    return { error: 'Team not found' };
  }

  const memberIndex = team.members.findIndex(m => m.userId === userId);
  if (memberIndex === -1) {
    return { error: 'You are not a member of this team' };
  }

  const member = team.members[memberIndex];

  // Owners cannot leave - they must transfer ownership or delete team
  if (member.role === 'owner') {
    return { error: 'Team owners cannot leave. Transfer ownership or delete the team instead.' };
  }

  const now = new Date().toISOString();

  // Remove member from team
  team.members.splice(memberIndex, 1);

  // Add activity
  team.activity.unshift({
    id: uuidv4(),
    type: 'member_left',
    actorId: userId,
    actorName: member.name,
    createdAt: now
  });

  team.updatedAt = now;

  // Save team
  const teamFilePath = getTeamFilePath(team.id);
  await atomicWrite(teamFilePath, team);

  // Remove team membership from user
  await removeTeamMembershipFromUser(userId, teamId);

  return { success: true };
}

// Check if user is team member
async function isTeamMember(userId, teamId) {
  const team = await getTeamById(teamId);
  if (!team) return false;
  return team.members.some(m => m.userId === userId);
}

// Get user's role in team
async function getUserTeamRole(userId, teamId) {
  const team = await getTeamById(teamId);
  if (!team) return null;
  const member = team.members.find(m => m.userId === userId);
  return member?.role || null;
}

// Check if user has admin+ permissions
function hasAdminPermission(role) {
  return role === 'owner' || role === 'admin';
}

// Check if user is owner
function isOwner(role) {
  return role === 'owner';
}

// Validate team code format
async function validateTeamCode(code) {
  const team = await getTeamByCode(code);
  return {
    valid: !!team,
    teamName: team?.name || null
  };
}

module.exports = {
  createTeam,
  getTeamById,
  getTeamByCode,
  getTeamSummary,
  getTeamDetails,
  updateTeam,
  getUserTeams,
  joinTeam,
  leaveTeam,
  isTeamMember,
  getUserTeamRole,
  hasAdminPermission,
  isOwner,
  validateTeamCode,
  addTeamMembershipToUser,
  removeTeamMembershipFromUser,
  MAX_TEAM_MEMBERS
};
