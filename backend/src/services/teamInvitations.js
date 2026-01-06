const { v4: uuidv4 } = require('uuid');
const path = require('path');
const {
  TEAMS_DIR,
  atomicWrite,
  readJsonFile,
  ensureDirectories
} = require('./fileStorage');
const { getTeamById } = require('./teamStorage');
const { getUserByEmail, getUserById } = require('./userStorage');

const INVITATIONS_FILE = path.join(TEAMS_DIR, '_invitations.json');
const INVITATION_EXPIRY_DAYS = 7;

// Load invitations store
async function loadInvitations() {
  await ensureDirectories();
  const invitations = await readJsonFile(INVITATIONS_FILE);
  return invitations || {};
}

// Save invitations store
async function saveInvitations(invitations) {
  await atomicWrite(INVITATIONS_FILE, invitations);
}

// Create team invitation
async function createInvitation({ teamId, email, invitedById, role = 'member' }) {
  // Verify team exists
  const team = await getTeamById(teamId);
  if (!team) {
    return { error: 'Team not found' };
  }

  // Get inviter info
  const inviter = await getUserById(invitedById);
  if (!inviter) {
    return { error: 'Inviter not found' };
  }

  // Check if email is already a team member
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    const isMember = team.members.some(m => m.userId === existingUser.id);
    if (isMember) {
      return { error: 'This user is already a member of the team' };
    }
  }

  const invitations = await loadInvitations();

  // Check for existing pending invitation for this email and team
  for (const [id, inv] of Object.entries(invitations)) {
    if (inv.teamId === teamId && inv.email.toLowerCase() === email.toLowerCase() && !inv.used) {
      if (new Date(inv.expiresAt) > new Date()) {
        return { error: 'An invitation has already been sent to this email' };
      }
      // Remove expired invitation
      delete invitations[id];
    }
  }

  const invitationId = uuidv4();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const invitation = {
    id: invitationId,
    teamId,
    teamName: team.name,
    teamCode: team.code,
    email: email.toLowerCase(),
    invitedBy: invitedById,
    invitedByName: inviter.name || inviter.email,
    invitedByEmail: inviter.email,
    role,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    used: false
  };

  invitations[invitationId] = invitation;
  await saveInvitations(invitations);

  return { invitation };
}

// Get invitation by ID
async function getInvitationById(invitationId) {
  const invitations = await loadInvitations();
  return invitations[invitationId] || null;
}

// Get pending invitations for a team
async function getTeamInvitations(teamId) {
  const invitations = await loadInvitations();
  const now = new Date();

  // Get team to check existing members
  const team = await getTeamById(teamId);
  const memberEmails = team ? team.members.map(m => m.email.toLowerCase()) : [];

  return Object.values(invitations)
    .filter(inv =>
      inv.teamId === teamId &&
      !inv.used &&
      new Date(inv.expiresAt) > now &&
      // Filter out invitations for users who are already team members
      !memberEmails.includes(inv.email.toLowerCase())
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// Get pending invitations for an email
async function getInvitationsForEmail(email) {
  const invitations = await loadInvitations();
  const now = new Date();

  return Object.values(invitations)
    .filter(inv =>
      inv.email.toLowerCase() === email.toLowerCase() &&
      !inv.used &&
      new Date(inv.expiresAt) > now
    );
}

// Cancel/delete an invitation
async function cancelInvitation(invitationId, requesterId) {
  const invitations = await loadInvitations();
  const invitation = invitations[invitationId];

  if (!invitation) {
    return { error: 'Invitation not found' };
  }

  // Verify requester has permission (must be team owner/admin or the inviter)
  const team = await getTeamById(invitation.teamId);
  if (!team) {
    return { error: 'Team not found' };
  }

  const requesterMember = team.members.find(m => m.userId === requesterId);
  const hasPermission =
    requesterMember?.role === 'owner' ||
    requesterMember?.role === 'admin' ||
    invitation.invitedBy === requesterId;

  if (!hasPermission) {
    return { error: 'You do not have permission to cancel this invitation' };
  }

  delete invitations[invitationId];
  await saveInvitations(invitations);

  return { success: true };
}

// Mark invitation as used (when user joins)
async function markInvitationUsed(invitationId) {
  const invitations = await loadInvitations();
  const invitation = invitations[invitationId];

  if (invitation) {
    invitation.used = true;
    invitation.usedAt = new Date().toISOString();
    await saveInvitations(invitations);
  }
}

// Clean up expired invitations
async function cleanupExpiredInvitations() {
  const invitations = await loadInvitations();
  const now = new Date();
  let changed = false;

  for (const [id, inv] of Object.entries(invitations)) {
    // Remove expired or used invitations older than 30 days
    const isExpired = new Date(inv.expiresAt) < now;
    const isOldUsed = inv.used && (now - new Date(inv.usedAt)) > 30 * 24 * 60 * 60 * 1000;

    if (isExpired || isOldUsed) {
      delete invitations[id];
      changed = true;
    }
  }

  if (changed) {
    await saveInvitations(invitations);
  }
}

module.exports = {
  createInvitation,
  getInvitationById,
  getTeamInvitations,
  getInvitationsForEmail,
  cancelInvitation,
  markInvitationUsed,
  cleanupExpiredInvitations,
  INVITATION_EXPIRY_DAYS
};
