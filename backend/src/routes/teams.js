const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const { authenticate } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const {
  createTeam,
  getTeamById,
  getTeamDetails,
  getUserTeams,
  joinTeam,
  leaveTeam,
  isTeamMember,
  getUserTeamRole,
  hasAdminPermission,
  isOwner,
  validateTeamCode,
  MAX_TEAM_MEMBERS
} = require('../services/teamStorage');
const {
  createInvitation,
  getTeamInvitations,
  cancelInvitation
} = require('../services/teamInvitations');
const { sendTeamInvitationEmail } = require('../services/email');
const {
  getTeamFilePath,
  atomicWrite,
  readJsonFile
} = require('../services/fileStorage');
const {
  getActivityFeed,
  getUnreadCount,
  markAsRead,
  getTeamAnalytics,
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
} = require('../services/activityLogger');
const { getUserDisplayName } = require('../utils/user');

// All routes require authentication
router.use(authenticate);

// Middleware to check enterprise tier
const requireEnterprise = (req, res, next) => {
  if (req.user?.tier !== 'enterprise') {
    throw new AppError('Enterprise subscription required for team features', 403);
  }
  next();
};

// Apply enterprise check to all team routes
router.use(requireEnterprise);

// =====================
// Team Management Routes
// =====================

// POST /api/teams - Create a new team
router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      throw new AppError('Team name must be at least 2 characters', 400);
    }

    if (name.trim().length > 100) {
      throw new AppError('Team name must be 100 characters or less', 400);
    }

    const result = await createTeam({
      name: name.trim(),
      ownerId: req.user.id
    });

    if (result.error) {
      throw new AppError(result.error, 400);
    }

    res.status(201).json({
      message: 'Team created successfully',
      team: result.team
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/teams/my - Get user's teams
router.get('/my', async (req, res, next) => {
  try {
    const teams = await getUserTeams(req.user.id);

    res.json({
      teams,
      total: teams.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/teams/validate/:code - Validate a team code
router.get('/validate/:code', async (req, res, next) => {
  try {
    const { code } = req.params;

    if (!code || code.length < 9) {
      throw new AppError('Invalid team code format', 400);
    }

    const result = await validateTeamCode(code);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/teams/join - Join a team with code
router.post('/join', async (req, res, next) => {
  try {
    const { teamName, teamCode } = req.body;

    if (!teamName || typeof teamName !== 'string' || teamName.trim().length < 2) {
      throw new AppError('Team name is required', 400);
    }

    if (!teamCode || typeof teamCode !== 'string' || teamCode.length < 9) {
      throw new AppError('Valid team code is required', 400);
    }

    const result = await joinTeam({
      userId: req.user.id,
      teamName: teamName.trim(),
      teamCode: teamCode.toUpperCase()
    });

    if (result.error) {
      throw new AppError(result.error, 400);
    }

    // Log activity
    await logMemberJoined(result.team.id, req.user, getUserDisplayName(req.user));

    res.json({
      message: 'Successfully joined team',
      team: result.team
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/teams/leave/:id - Leave a team
router.post('/leave/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Log activity before leaving (so we still have access)
    await logMemberLeft(id, req.user, getUserDisplayName(req.user));

    const result = await leaveTeam(req.user.id, id);

    if (result.error) {
      throw new AppError(result.error, 400);
    }

    res.json({
      message: 'Successfully left team'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/teams/:id - Get team details
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify user is a member
    const isMember = await isTeamMember(req.user.id, id);
    if (!isMember) {
      throw new AppError('You are not a member of this team', 403);
    }

    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    const role = await getUserTeamRole(req.user.id, id);

    res.json({
      team: getTeamDetails(team),
      role,
      maxMembers: MAX_TEAM_MEMBERS
    });
  } catch (error) {
    next(error);
  }
});

// =====================
// Invitation Routes
// =====================

// POST /api/teams/:id/invite - Send invitation
router.post('/:id/invite', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, role = 'member' } = req.body;

    // Validate email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      throw new AppError('Valid email address is required', 400);
    }

    // Validate role
    if (!['admin', 'member'].includes(role)) {
      throw new AppError('Role must be "admin" or "member"', 400);
    }

    // Verify user is admin or owner
    const userRole = await getUserTeamRole(req.user.id, id);
    if (!hasAdminPermission(userRole)) {
      throw new AppError('Only team owners and admins can send invitations', 403);
    }

    // Check team size
    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    if (team.members.length >= MAX_TEAM_MEMBERS) {
      throw new AppError(`Team has reached the maximum of ${MAX_TEAM_MEMBERS} members`, 400);
    }

    // Create invitation
    const result = await createInvitation({
      teamId: id,
      email: email.toLowerCase(),
      invitedById: req.user.id,
      role
    });

    if (result.error) {
      throw new AppError(result.error, 400);
    }

    // Send invitation email
    try {
      await sendTeamInvitationEmail(result.invitation);
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Don't fail the request, invitation is still created
    }

    // Log activity
    await logMemberInvited(id, req.user, email.toLowerCase(), role);

    res.status(201).json({
      message: 'Invitation sent successfully',
      invitation: {
        id: result.invitation.id,
        email: result.invitation.email,
        role: result.invitation.role,
        expiresAt: result.invitation.expiresAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/teams/:id/invitations - List pending invitations
router.get('/:id/invitations', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify user is admin or owner
    const userRole = await getUserTeamRole(req.user.id, id);
    if (!hasAdminPermission(userRole)) {
      throw new AppError('Only team owners and admins can view invitations', 403);
    }

    const invitations = await getTeamInvitations(id);

    res.json({
      invitations: invitations.map(inv => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        invitedByName: inv.invitedByName,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt
      })),
      total: invitations.length
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/teams/:id/invitations/:invitationId - Cancel invitation
router.delete('/:id/invitations/:invitationId', async (req, res, next) => {
  try {
    const { id, invitationId } = req.params;

    // Verify user is a member first
    const isMember = await isTeamMember(req.user.id, id);
    if (!isMember) {
      throw new AppError('You are not a member of this team', 403);
    }

    const result = await cancelInvitation(invitationId, req.user.id);

    if (result.error) {
      throw new AppError(result.error, 400);
    }

    res.json({
      message: 'Invitation cancelled'
    });
  } catch (error) {
    next(error);
  }
});

// =====================
// Member Management Routes
// =====================

// PATCH /api/teams/:id/members/:userId - Update member role
router.patch('/:id/members/:userId', async (req, res, next) => {
  try {
    const { id, userId } = req.params;
    const { role } = req.body;

    // Validate role
    if (!['admin', 'member'].includes(role)) {
      throw new AppError('Role must be "admin" or "member"', 400);
    }

    // Verify requester is owner
    const requesterRole = await getUserTeamRole(req.user.id, id);
    if (!isOwner(requesterRole)) {
      throw new AppError('Only team owners can change member roles', 403);
    }

    // Cannot change own role
    if (userId === req.user.id) {
      throw new AppError('You cannot change your own role', 400);
    }

    // Get team and update member
    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    const memberIndex = team.members.findIndex(m => m.userId === userId);
    if (memberIndex === -1) {
      throw new AppError('Member not found', 404);
    }

    // Cannot change owner's role
    if (team.members[memberIndex].role === 'owner') {
      throw new AppError('Cannot change the team owner\'s role', 400);
    }

    // Update role
    team.members[memberIndex].role = role;
    team.updatedAt = new Date().toISOString();

    // Add activity
    team.activity.unshift({
      id: uuidv4(),
      type: 'member_role_changed',
      actorId: req.user.id,
      targetId: userId,
      targetName: team.members[memberIndex].name,
      metadata: { newRole: role },
      createdAt: new Date().toISOString()
    });

    // Save team
    const teamFilePath = getTeamFilePath(id);
    await atomicWrite(teamFilePath, team);

    res.json({
      message: 'Member role updated',
      member: {
        userId: team.members[memberIndex].userId,
        name: team.members[memberIndex].name,
        email: team.members[memberIndex].email,
        role: team.members[memberIndex].role
      }
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/teams/:id/members/:userId - Remove member
router.delete('/:id/members/:userId', async (req, res, next) => {
  try {
    const { id, userId } = req.params;

    // Verify requester has permission
    const requesterRole = await getUserTeamRole(req.user.id, id);
    if (!hasAdminPermission(requesterRole)) {
      throw new AppError('Only team owners and admins can remove members', 403);
    }

    // Cannot remove self via this endpoint (use leave instead)
    if (userId === req.user.id) {
      throw new AppError('Use the leave endpoint to remove yourself from the team', 400);
    }

    // Get team
    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    const memberIndex = team.members.findIndex(m => m.userId === userId);
    if (memberIndex === -1) {
      throw new AppError('Member not found', 404);
    }

    const member = team.members[memberIndex];

    // Cannot remove owner
    if (member.role === 'owner') {
      throw new AppError('Cannot remove the team owner', 400);
    }

    // Only owner can remove admins
    if (member.role === 'admin' && !isOwner(requesterRole)) {
      throw new AppError('Only the team owner can remove admins', 403);
    }

    // Remove member
    team.members.splice(memberIndex, 1);
    team.updatedAt = new Date().toISOString();

    // Add activity
    team.activity.unshift({
      id: uuidv4(),
      type: 'member_removed',
      actorId: req.user.id,
      targetId: userId,
      targetName: member.name,
      createdAt: new Date().toISOString()
    });

    // Save team
    const teamFilePath = getTeamFilePath(id);
    await atomicWrite(teamFilePath, team);

    // Also remove team membership from user
    const { removeTeamMembershipFromUser } = require('../services/teamStorage');
    await removeTeamMembershipFromUser(userId, id);

    res.json({
      message: 'Member removed from team'
    });
  } catch (error) {
    next(error);
  }
});

// =====================
// Category Routes
// =====================

// Default category colors
const CATEGORY_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

// GET /api/teams/:id/categories - List categories
router.get('/:id/categories', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify user is a member
    const isMember = await isTeamMember(req.user.id, id);
    if (!isMember) {
      throw new AppError('You are not a member of this team', 403);
    }

    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    res.json({
      categories: team.categories || [],
      total: (team.categories || []).length
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/teams/:id/categories - Create category
router.post('/:id/categories', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length < 1) {
      throw new AppError('Category name is required', 400);
    }

    if (name.trim().length > 50) {
      throw new AppError('Category name must be 50 characters or less', 400);
    }

    // Verify user is a member
    const isMember = await isTeamMember(req.user.id, id);
    if (!isMember) {
      throw new AppError('You are not a member of this team', 403);
    }

    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    // Initialize categories if needed
    if (!team.categories) {
      team.categories = [];
    }

    // Check for duplicate name
    const exists = team.categories.some(
      c => c.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (exists) {
      throw new AppError('A category with this name already exists', 400);
    }

    // Create category
    const category = {
      id: uuidv4(),
      name: name.trim(),
      color: color || CATEGORY_COLORS[team.categories.length % CATEGORY_COLORS.length],
      createdBy: req.user.id,
      createdAt: new Date().toISOString()
    };

    team.categories.push(category);
    team.updatedAt = new Date().toISOString();

    // Save team
    const teamFilePath = getTeamFilePath(id);
    await atomicWrite(teamFilePath, team);

    // Log activity
    await logCategoryCreated(id, req.user, category.name);

    res.status(201).json({
      message: 'Category created',
      category
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/teams/:id/categories/:catId - Update category
router.patch('/:id/categories/:catId', async (req, res, next) => {
  try {
    const { id, catId } = req.params;
    const { name, color } = req.body;

    // Verify user is a member
    const isMember = await isTeamMember(req.user.id, id);
    if (!isMember) {
      throw new AppError('You are not a member of this team', 403);
    }

    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    const categoryIndex = (team.categories || []).findIndex(c => c.id === catId);
    if (categoryIndex === -1) {
      throw new AppError('Category not found', 404);
    }

    // Update fields
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 1) {
        throw new AppError('Category name is required', 400);
      }
      if (name.trim().length > 50) {
        throw new AppError('Category name must be 50 characters or less', 400);
      }
      // Check for duplicate
      const exists = team.categories.some(
        (c, i) => i !== categoryIndex && c.name.toLowerCase() === name.trim().toLowerCase()
      );
      if (exists) {
        throw new AppError('A category with this name already exists', 400);
      }
      team.categories[categoryIndex].name = name.trim();
    }

    if (color !== undefined) {
      team.categories[categoryIndex].color = color;
    }

    team.categories[categoryIndex].updatedAt = new Date().toISOString();
    team.updatedAt = new Date().toISOString();

    // Save team
    const teamFilePath = getTeamFilePath(id);
    await atomicWrite(teamFilePath, team);

    res.json({
      message: 'Category updated',
      category: team.categories[categoryIndex]
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/teams/:id/categories/:catId - Delete category
router.delete('/:id/categories/:catId', async (req, res, next) => {
  try {
    const { id, catId } = req.params;

    // Verify user is admin or owner
    const userRole = await getUserTeamRole(req.user.id, id);
    if (!hasAdminPermission(userRole)) {
      throw new AppError('Only team owners and admins can delete categories', 403);
    }

    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    const categoryIndex = (team.categories || []).findIndex(c => c.id === catId);
    if (categoryIndex === -1) {
      throw new AppError('Category not found', 404);
    }

    const categoryName = team.categories[categoryIndex].name;

    // Remove category
    team.categories.splice(categoryIndex, 1);

    // Remove category from all prompts
    if (team.prompts) {
      team.prompts.forEach(p => {
        if (p.categoryId === catId) {
          p.categoryId = null;
        }
      });
    }

    team.updatedAt = new Date().toISOString();

    // Add activity
    team.activity.unshift({
      id: uuidv4(),
      type: 'category_deleted',
      actorId: req.user.id,
      metadata: { categoryName },
      createdAt: new Date().toISOString()
    });

    // Save team
    const teamFilePath = getTeamFilePath(id);
    await atomicWrite(teamFilePath, team);

    res.json({
      message: 'Category deleted'
    });
  } catch (error) {
    next(error);
  }
});

// =====================
// Team Prompts Routes
// =====================

// GET /api/teams/:id/prompts - List team prompts
router.get('/:id/prompts', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category, q } = req.query;

    // Verify user is a member
    const isMember = await isTeamMember(req.user.id, id);
    if (!isMember) {
      throw new AppError('You are not a member of this team', 403);
    }

    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    let prompts = team.prompts || [];

    // Filter by category
    if (category) {
      if (category === 'uncategorized') {
        prompts = prompts.filter(p => !p.categoryId);
      } else {
        prompts = prompts.filter(p => p.categoryId === category);
      }
    }

    // Search filter
    if (q) {
      const searchLower = q.toLowerCase();
      prompts = prompts.filter(p =>
        p.title.toLowerCase().includes(searchLower) ||
        p.content.toLowerCase().includes(searchLower) ||
        (p.keywords || []).some(k => k.toLowerCase().includes(searchLower))
      );
    }

    // Sort by most recent first
    prompts.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));

    res.json({
      prompts,
      total: prompts.length,
      categories: team.categories || []
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/teams/:id/prompts - Add prompt to team
router.post('/:id/prompts', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      sourceType,
      sourceId,
      title,
      content,
      categoryId,
      keywords,
      industry,
      role,
      notes
    } = req.body;

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim().length < 1) {
      throw new AppError('Prompt title is required', 400);
    }

    if (!content || typeof content !== 'string' || content.trim().length < 1) {
      throw new AppError('Prompt content is required', 400);
    }

    // Verify user is a member
    const isMember = await isTeamMember(req.user.id, id);
    if (!isMember) {
      throw new AppError('You are not a member of this team', 403);
    }

    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    // Initialize prompts if needed
    if (!team.prompts) {
      team.prompts = [];
    }

    // Validate category if provided
    if (categoryId) {
      const categoryExists = (team.categories || []).some(c => c.id === categoryId);
      if (!categoryExists) {
        throw new AppError('Category not found', 404);
      }
    }

    // Check for duplicate if from library
    if (sourceType === 'library' && sourceId) {
      const exists = team.prompts.some(p => p.sourceType === 'library' && p.sourceId === sourceId);
      if (exists) {
        throw new AppError('This prompt has already been added to the team', 400);
      }
    }

    // Create team prompt
    const teamPrompt = {
      id: uuidv4(),
      sourceType: sourceType || 'custom',
      sourceId: sourceId || null,
      title: title.trim(),
      content: content.trim(),
      categoryId: categoryId || null,
      keywords: keywords || [],
      industry: industry || null,
      role: role || null,
      notes: notes || '',
      addedBy: req.user.id,
      addedByName: getUserDisplayName(req.user),
      addedAt: new Date().toISOString(),
      tags: []
    };

    team.prompts.push(teamPrompt);
    team.updatedAt = new Date().toISOString();

    // Save team
    const teamFilePath = getTeamFilePath(id);
    await atomicWrite(teamFilePath, team);

    // Log activity
    await logPromptAdded(id, req.user, teamPrompt.title);

    res.status(201).json({
      message: 'Prompt added to team',
      prompt: teamPrompt
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/teams/:id/prompts/:promptId - Update team prompt
router.patch('/:id/prompts/:promptId', async (req, res, next) => {
  try {
    const { id, promptId } = req.params;
    const { title, content, categoryId, keywords, notes, sourceType } = req.body;

    // Verify user is a member
    const isMember = await isTeamMember(req.user.id, id);
    if (!isMember) {
      throw new AppError('You are not a member of this team', 403);
    }

    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    const promptIndex = (team.prompts || []).findIndex(p => p.id === promptId);
    if (promptIndex === -1) {
      throw new AppError('Prompt not found', 404);
    }

    const prompt = team.prompts[promptIndex];

    // Update fields
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length < 1) {
        throw new AppError('Prompt title is required', 400);
      }
      prompt.title = title.trim();
    }

    if (content !== undefined) {
      if (typeof content !== 'string' || content.trim().length < 1) {
        throw new AppError('Prompt content is required', 400);
      }
      prompt.content = content.trim();
    }

    if (categoryId !== undefined) {
      if (categoryId !== null) {
        const categoryExists = (team.categories || []).some(c => c.id === categoryId);
        if (!categoryExists) {
          throw new AppError('Category not found', 404);
        }
      }
      prompt.categoryId = categoryId;
    }

    if (keywords !== undefined) {
      prompt.keywords = keywords;
    }

    if (notes !== undefined) {
      prompt.notes = notes;
    }

    // Allow converting library prompts to custom when edited
    if (sourceType === 'custom' && prompt.sourceType === 'library') {
      prompt.sourceType = 'custom';
      prompt.sourceId = null;
    }

    prompt.updatedAt = new Date().toISOString();
    prompt.updatedBy = req.user.id;
    team.updatedAt = new Date().toISOString();

    // Save team
    const teamFilePath = getTeamFilePath(id);
    await atomicWrite(teamFilePath, team);

    res.json({
      message: 'Prompt updated',
      prompt
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/teams/:id/prompts/:promptId - Remove prompt from team
router.delete('/:id/prompts/:promptId', async (req, res, next) => {
  try {
    const { id, promptId } = req.params;

    // Verify user is a member
    const isMember = await isTeamMember(req.user.id, id);
    if (!isMember) {
      throw new AppError('You are not a member of this team', 403);
    }

    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    const promptIndex = (team.prompts || []).findIndex(p => p.id === promptId);
    if (promptIndex === -1) {
      throw new AppError('Prompt not found', 404);
    }

    const prompt = team.prompts[promptIndex];

    // Only the person who added it or admins can remove
    const userRole = await getUserTeamRole(req.user.id, id);
    if (prompt.addedBy !== req.user.id && !hasAdminPermission(userRole)) {
      throw new AppError('You can only remove prompts you added', 403);
    }

    // Remove prompt
    team.prompts.splice(promptIndex, 1);
    team.updatedAt = new Date().toISOString();

    // Add activity
    team.activity.unshift({
      id: uuidv4(),
      type: 'prompt_removed',
      actorId: req.user.id,
      metadata: { promptTitle: prompt.title },
      createdAt: new Date().toISOString()
    });

    // Save team
    const teamFilePath = getTeamFilePath(id);
    await atomicWrite(teamFilePath, team);

    res.json({
      message: 'Prompt removed from team'
    });
  } catch (error) {
    next(error);
  }
});

// =====================
// Tagging Routes
// =====================

// POST /api/teams/:id/prompts/:promptId/tags - Tag a user on a prompt
router.post('/:id/prompts/:promptId/tags', async (req, res, next) => {
  try {
    const { id, promptId } = req.params;
    const { userId, message } = req.body;

    if (!userId) {
      throw new AppError('User ID is required', 400);
    }

    // Verify requester is a member
    const isMember = await isTeamMember(req.user.id, id);
    if (!isMember) {
      throw new AppError('You are not a member of this team', 403);
    }

    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    // Verify target user is a team member
    const targetMember = team.members.find(m => m.userId === userId);
    if (!targetMember) {
      throw new AppError('Target user is not a member of this team', 400);
    }

    // Can't tag yourself
    if (userId === req.user.id) {
      throw new AppError('You cannot tag yourself', 400);
    }

    // Find prompt
    const promptIndex = (team.prompts || []).findIndex(p => p.id === promptId);
    if (promptIndex === -1) {
      throw new AppError('Prompt not found', 404);
    }

    const prompt = team.prompts[promptIndex];

    // Initialize tags array if needed
    if (!prompt.tags) {
      prompt.tags = [];
    }

    // Check if already tagged
    const existingTag = prompt.tags.find(t => t.userId === userId);
    if (existingTag) {
      throw new AppError('This user has already been tagged on this prompt', 400);
    }

    // Get tagger info
    const taggerMember = team.members.find(m => m.userId === req.user.id);

    // Add tag
    const tag = {
      userId,
      taggedBy: req.user.id,
      taggedByName: taggerMember?.name || taggerMember?.email || 'Unknown',
      message: message || '',
      createdAt: new Date().toISOString(),
      seen: false
    };

    prompt.tags.push(tag);
    team.updatedAt = new Date().toISOString();

    // Save team
    const teamFilePath = getTeamFilePath(id);
    await atomicWrite(teamFilePath, team);

    // Log activity
    await logPromptTagged(id, req.user, prompt.title, targetMember.name || targetMember.email);

    res.status(201).json({
      message: 'User tagged successfully',
      tag
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/teams/:id/prompts/:promptId/tags/:userId - Remove tag
router.delete('/:id/prompts/:promptId/tags/:userId', async (req, res, next) => {
  try {
    const { id, promptId, userId } = req.params;

    // Verify requester is a member
    const isMember = await isTeamMember(req.user.id, id);
    if (!isMember) {
      throw new AppError('You are not a member of this team', 403);
    }

    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    // Find prompt
    const promptIndex = (team.prompts || []).findIndex(p => p.id === promptId);
    if (promptIndex === -1) {
      throw new AppError('Prompt not found', 404);
    }

    const prompt = team.prompts[promptIndex];

    // Find tag
    const tagIndex = (prompt.tags || []).findIndex(t => t.userId === userId);
    if (tagIndex === -1) {
      throw new AppError('Tag not found', 404);
    }

    const tag = prompt.tags[tagIndex];

    // Only the tagger, the tagged user, or admins can remove the tag
    const userRole = await getUserTeamRole(req.user.id, id);
    if (tag.taggedBy !== req.user.id && tag.userId !== req.user.id && !hasAdminPermission(userRole)) {
      throw new AppError('You do not have permission to remove this tag', 403);
    }

    // Remove tag
    prompt.tags.splice(tagIndex, 1);
    team.updatedAt = new Date().toISOString();

    // Save team
    const teamFilePath = getTeamFilePath(id);
    await atomicWrite(teamFilePath, team);

    res.json({
      message: 'Tag removed'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/teams/:id/prompts/for-me - Get prompts tagged to current user
router.get('/:id/prompts/for-me', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify user is a member
    const isMember = await isTeamMember(req.user.id, id);
    if (!isMember) {
      throw new AppError('You are not a member of this team', 403);
    }

    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    // Find all prompts where current user is tagged
    const taggedPrompts = (team.prompts || [])
      .filter(p => (p.tags || []).some(t => t.userId === req.user.id))
      .map(p => {
        const tag = p.tags.find(t => t.userId === req.user.id);
        return {
          ...p,
          tagInfo: tag
        };
      })
      .sort((a, b) => new Date(b.tagInfo.createdAt) - new Date(a.tagInfo.createdAt));

    // Count unseen
    const unseenCount = taggedPrompts.filter(p => !p.tagInfo.seen).length;

    res.json({
      prompts: taggedPrompts,
      total: taggedPrompts.length,
      unseenCount,
      categories: team.categories || []
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/teams/:id/prompts/:promptId/tags/:userId/seen - Mark tag as seen
router.post('/:id/prompts/:promptId/tags/:userId/seen', async (req, res, next) => {
  try {
    const { id, promptId, userId } = req.params;

    // Verify the current user is the tagged user
    if (userId !== req.user.id) {
      throw new AppError('You can only mark your own tags as seen', 403);
    }

    // Verify user is a member
    const isMember = await isTeamMember(req.user.id, id);
    if (!isMember) {
      throw new AppError('You are not a member of this team', 403);
    }

    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    // Find prompt
    const promptIndex = (team.prompts || []).findIndex(p => p.id === promptId);
    if (promptIndex === -1) {
      throw new AppError('Prompt not found', 404);
    }

    const prompt = team.prompts[promptIndex];

    // Find tag
    const tagIndex = (prompt.tags || []).findIndex(t => t.userId === userId);
    if (tagIndex === -1) {
      throw new AppError('Tag not found', 404);
    }

    // Mark as seen
    prompt.tags[tagIndex].seen = true;
    prompt.tags[tagIndex].seenAt = new Date().toISOString();
    team.updatedAt = new Date().toISOString();

    // Save team
    const teamFilePath = getTeamFilePath(id);
    await atomicWrite(teamFilePath, team);

    res.json({
      message: 'Tag marked as seen'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/teams/:id/prompts/for-me/count - Get count of unseen tagged prompts
router.get('/:id/prompts/for-me/count', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify user is a member
    const isMember = await isTeamMember(req.user.id, id);
    if (!isMember) {
      throw new AppError('You are not a member of this team', 403);
    }

    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    // Count unseen tags
    let unseenCount = 0;
    (team.prompts || []).forEach(p => {
      (p.tags || []).forEach(t => {
        if (t.userId === req.user.id && !t.seen) {
          unseenCount++;
        }
      });
    });

    res.json({
      unseenCount
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// TEAM QUESTIONS ROUTES
// ==========================================

// POST /api/teams/:id/questions - Add question to team
router.post('/:id/questions', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sourceType = 'library', sourceId, question, context, categoryId, tags: questionTags, notes } = req.body;

    // Verify user is a member
    const isMember = await isTeamMember(req.user.id, id);
    if (!isMember) {
      throw new AppError('You are not a member of this team', 403);
    }

    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    // Validate required fields
    if (!question) {
      throw new AppError('Question text is required', 400);
    }

    // If library question, check it's not already added
    if (sourceType === 'library' && sourceId) {
      const existingQuestion = (team.questions || []).find(
        q => q.sourceType === 'library' && q.sourceId === sourceId
      );
      if (existingQuestion) {
        throw new AppError('This question has already been added to the team', 400);
      }
    }

    // Validate category if provided
    if (categoryId) {
      const categoryExists = (team.categories || []).some(c => c.id === categoryId);
      if (!categoryExists) {
        throw new AppError('Category not found', 404);
      }
    }

    // Initialize questions array if needed
    if (!team.questions) {
      team.questions = [];
    }

    // Create the team question
    const newQuestion = {
      id: uuidv4(),
      sourceType,
      sourceId: sourceType === 'library' ? sourceId : undefined,
      question,
      context: context || '',
      categoryId: categoryId || null,
      tags: questionTags || [],
      addedBy: req.user.id,
      addedByName: getUserDisplayName(req.user),
      addedAt: new Date().toISOString(),
      notes: notes || '',
      memberTags: [] // Tags to teammates
    };

    team.questions.push(newQuestion);
    team.updatedAt = new Date().toISOString();

    // Save team
    const teamFilePath = getTeamFilePath(id);
    await atomicWrite(teamFilePath, team);

    // Log activity
    await logQuestionAdded(id, req.user, question);

    res.status(201).json({
      message: 'Question added to team',
      question: newQuestion
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/teams/:id/questions - List team questions
router.get('/:id/questions', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category, q } = req.query;

    // Verify user is a member
    const isMember = await isTeamMember(req.user.id, id);
    if (!isMember) {
      throw new AppError('You are not a member of this team', 403);
    }

    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    let questions = team.questions || [];

    // Filter by category
    if (category) {
      if (category === 'uncategorized') {
        questions = questions.filter(q => !q.categoryId);
      } else {
        questions = questions.filter(q => q.categoryId === category);
      }
    }

    // Search filter
    if (q) {
      const searchLower = q.toLowerCase();
      questions = questions.filter(question =>
        question.question.toLowerCase().includes(searchLower) ||
        (question.context && question.context.toLowerCase().includes(searchLower)) ||
        (question.tags && question.tags.some(tag => tag.toLowerCase().includes(searchLower)))
      );
    }

    // Sort by most recent
    questions.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));

    res.json({
      questions,
      total: questions.length,
      categories: team.categories || []
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/teams/:id/questions/:qId - Remove question from team
router.delete('/:id/questions/:qId', async (req, res, next) => {
  try {
    const { id, qId } = req.params;

    // Verify user is a member
    const isMember = await isTeamMember(req.user.id, id);
    if (!isMember) {
      throw new AppError('You are not a member of this team', 403);
    }

    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    const questionIndex = (team.questions || []).findIndex(q => q.id === qId);
    if (questionIndex === -1) {
      throw new AppError('Question not found', 404);
    }

    const question = team.questions[questionIndex];

    // Check permission - admins can delete any, others only their own
    const member = team.members.find(m => m.userId === req.user.id);
    const isAdmin = member && (member.role === 'owner' || member.role === 'admin');
    if (!isAdmin && question.addedBy !== req.user.id) {
      throw new AppError('You can only remove questions you added', 403);
    }

    // Remove the question
    team.questions.splice(questionIndex, 1);
    team.updatedAt = new Date().toISOString();

    // Save team
    const teamFilePath = getTeamFilePath(id);
    await atomicWrite(teamFilePath, team);

    res.json({
      message: 'Question removed from team'
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/teams/:id/questions/:qId - Update question (content, category, notes)
router.patch('/:id/questions/:qId', async (req, res, next) => {
  try {
    const { id, qId } = req.params;
    const { question: questionText, categoryId, notes, context, tags, sourceType } = req.body;

    // Verify user is a member
    const isMember = await isTeamMember(req.user.id, id);
    if (!isMember) {
      throw new AppError('You are not a member of this team', 403);
    }

    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    const question = (team.questions || []).find(q => q.id === qId);
    if (!question) {
      throw new AppError('Question not found', 404);
    }

    // Validate category if provided
    if (categoryId !== undefined && categoryId !== null) {
      const categoryExists = (team.categories || []).some(c => c.id === categoryId);
      if (!categoryExists) {
        throw new AppError('Category not found', 404);
      }
    }

    // Update fields
    if (questionText !== undefined) {
      if (typeof questionText !== 'string' || questionText.trim().length < 1) {
        throw new AppError('Question text is required', 400);
      }
      question.question = questionText.trim();
    }

    if (categoryId !== undefined) {
      question.categoryId = categoryId;
    }
    if (notes !== undefined) {
      question.notes = notes;
    }
    if (context !== undefined) {
      question.context = context || '';
    }
    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        throw new AppError('Tags must be an array', 400);
      }
      question.tags = tags;
    }

    // Allow converting library questions to custom when edited
    if (sourceType === 'custom' && question.sourceType === 'library') {
      question.sourceType = 'custom';
      question.sourceId = null;
    }
    question.updatedAt = new Date().toISOString();
    team.updatedAt = new Date().toISOString();

    // Save team
    const teamFilePath = getTeamFilePath(id);
    await atomicWrite(teamFilePath, team);

    res.json({
      message: 'Question updated',
      question
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// NOTES ROUTES
// ==========================================

// PATCH /api/teams/:id/prompts/:promptId/notes - Update prompt notes
router.patch('/:id/prompts/:promptId/notes', async (req, res, next) => {
  try {
    const { id, promptId } = req.params;
    const { notes } = req.body;

    // Verify user is a member
    const isMember = await isTeamMember(req.user.id, id);
    if (!isMember) {
      throw new AppError('You are not a member of this team', 403);
    }

    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    const prompt = (team.prompts || []).find(p => p.id === promptId);
    if (!prompt) {
      throw new AppError('Prompt not found', 404);
    }

    // Update notes
    prompt.notes = notes || '';
    prompt.notesUpdatedBy = req.user.id;
    prompt.notesUpdatedByName = getUserDisplayName(req.user);
    prompt.notesUpdatedAt = new Date().toISOString();
    team.updatedAt = new Date().toISOString();

    // Save team
    const teamFilePath = getTeamFilePath(id);
    await atomicWrite(teamFilePath, team);

    res.json({
      message: 'Notes updated',
      prompt
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/teams/:id/questions/:qId/notes - Update question notes
router.patch('/:id/questions/:qId/notes', async (req, res, next) => {
  try {
    const { id, qId } = req.params;
    const { notes } = req.body;

    // Verify user is a member
    const isMember = await isTeamMember(req.user.id, id);
    if (!isMember) {
      throw new AppError('You are not a member of this team', 403);
    }

    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    const question = (team.questions || []).find(q => q.id === qId);
    if (!question) {
      throw new AppError('Question not found', 404);
    }

    // Update notes
    question.notes = notes || '';
    question.notesUpdatedBy = req.user.id;
    question.notesUpdatedByName = getUserDisplayName(req.user);
    question.notesUpdatedAt = new Date().toISOString();
    team.updatedAt = new Date().toISOString();

    // Save team
    const teamFilePath = getTeamFilePath(id);
    await atomicWrite(teamFilePath, team);

    res.json({
      message: 'Notes updated',
      question
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// WORKFLOW ROUTES
// ==========================================

// GET /api/teams/:id/workflows - List team workflows
router.get('/:id/workflows', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category, q } = req.query;

    // Verify user is a member
    const isMember = await isTeamMember(req.user.id, id);
    if (!isMember) {
      throw new AppError('You are not a member of this team', 403);
    }

    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    // Filter workflows - show all team workflows and user's private ones
    let workflows = (team.workflows || []).filter(
      w => w.sharedWith === 'team' || w.createdBy === req.user.id
    );

    // Filter by category
    if (category) {
      if (category === 'uncategorized') {
        workflows = workflows.filter(w => !w.categoryId);
      } else {
        workflows = workflows.filter(w => w.categoryId === category);
      }
    }

    // Filter by search query (name and description only)
    if (q) {
      const searchLower = q.toLowerCase();
      workflows = workflows.filter(w =>
        w.name.toLowerCase().includes(searchLower) ||
        (w.description && w.description.toLowerCase().includes(searchLower))
      );
    }

    // Sort by most recent
    workflows.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

    const memberNameById = new Map(
      (team.members || []).map(member => [
        member.userId,
        member.name || member.email || ''
      ])
    );

    const workflowsWithNames = workflows.map(workflow => ({
      ...workflow,
      createdByName: memberNameById.get(workflow.createdBy) || workflow.createdByName || ''
    }));

    res.json({
      workflows: workflowsWithNames,
      categories: team.categories || [],
      total: workflows.length
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/teams/:id/workflows - Create workflow
router.post('/:id/workflows', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, sharedWith = 'team', categoryId } = req.body;

    // Verify user is a member
    const isMember = await isTeamMember(req.user.id, id);
    if (!isMember) {
      throw new AppError('You are not a member of this team', 403);
    }

    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    // Validate required fields
    if (!name || !name.trim()) {
      throw new AppError('Workflow name is required', 400);
    }

    // Validate categoryId if provided
    if (categoryId) {
      const categoryExists = (team.categories || []).some(c => c.id === categoryId);
      if (!categoryExists) {
        throw new AppError('Invalid category', 400);
      }
    }

    // Initialize workflows array if needed
    if (!team.workflows) {
      team.workflows = [];
    }

    // Create the workflow
    const newWorkflow = {
      id: uuidv4(),
      name: name.trim(),
      description: description || '',
      categoryId: categoryId || null,
      createdBy: req.user.id,
      createdByName: getUserDisplayName(req.user),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps: [],
      sharedWith // 'team' or 'private'
    };

    team.workflows.push(newWorkflow);
    team.updatedAt = new Date().toISOString();

    // Save team
    const teamFilePath = getTeamFilePath(id);
    await atomicWrite(teamFilePath, team);

    // Log activity (only for team-shared workflows)
    if (sharedWith === 'team') {
      await logWorkflowCreated(id, req.user, newWorkflow.name);
    }

    res.status(201).json({
      message: 'Workflow created',
      workflow: newWorkflow
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/teams/:id/workflows/:wfId - Get single workflow
router.get('/:id/workflows/:wfId', async (req, res, next) => {
  try {
    const { id, wfId } = req.params;

    // Verify user is a member
    const isMember = await isTeamMember(req.user.id, id);
    if (!isMember) {
      throw new AppError('You are not a member of this team', 403);
    }

    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    const workflow = (team.workflows || []).find(w => w.id === wfId);
    if (!workflow) {
      throw new AppError('Workflow not found', 404);
    }

    // Check access
    if (workflow.sharedWith === 'private' && workflow.createdBy !== req.user.id) {
      throw new AppError('You do not have access to this workflow', 403);
    }

    // Determine if user can edit this workflow
    const member = team.members.find(m => m.userId === req.user.id);
    const isAdmin = member && (member.role === 'owner' || member.role === 'admin');
    const canEdit = workflow.createdBy === req.user.id || isAdmin;

    const memberNameById = new Map(
      (team.members || []).map(member => [
        member.userId,
        member.name || member.email || ''
      ])
    );

    res.json({
      workflow: {
        ...workflow,
        createdByName: memberNameById.get(workflow.createdBy) || workflow.createdByName || ''
      },
      canEdit
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/teams/:id/workflows/:wfId - Update workflow
router.patch('/:id/workflows/:wfId', async (req, res, next) => {
  try {
    const { id, wfId } = req.params;
    const { name, description, sharedWith, categoryId } = req.body;

    // Verify user is a member
    const isMember = await isTeamMember(req.user.id, id);
    if (!isMember) {
      throw new AppError('You are not a member of this team', 403);
    }

    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    const workflow = (team.workflows || []).find(w => w.id === wfId);
    if (!workflow) {
      throw new AppError('Workflow not found', 404);
    }

    // Only creator can edit
    if (workflow.createdBy !== req.user.id) {
      const member = team.members.find(m => m.userId === req.user.id);
      const isAdmin = member && (member.role === 'owner' || member.role === 'admin');
      if (!isAdmin) {
        throw new AppError('Only the workflow creator or admins can edit', 403);
      }
    }

    // Validate categoryId if provided
    if (categoryId !== undefined && categoryId !== null) {
      const categoryExists = (team.categories || []).some(c => c.id === categoryId);
      if (!categoryExists) {
        throw new AppError('Invalid category', 400);
      }
    }

    // Update fields
    if (name !== undefined) {
      workflow.name = name.trim();
    }
    if (description !== undefined) {
      workflow.description = description;
    }
    if (sharedWith !== undefined) {
      workflow.sharedWith = sharedWith;
    }
    if (categoryId !== undefined) {
      workflow.categoryId = categoryId;
    }
    workflow.updatedAt = new Date().toISOString();
    team.updatedAt = new Date().toISOString();

    // Save team
    const teamFilePath = getTeamFilePath(id);
    await atomicWrite(teamFilePath, team);

    res.json({
      message: 'Workflow updated',
      workflow
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/teams/:id/workflows/:wfId - Delete workflow
router.delete('/:id/workflows/:wfId', async (req, res, next) => {
  try {
    const { id, wfId } = req.params;

    // Verify user is a member
    const isMember = await isTeamMember(req.user.id, id);
    if (!isMember) {
      throw new AppError('You are not a member of this team', 403);
    }

    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    const workflowIndex = (team.workflows || []).findIndex(w => w.id === wfId);
    if (workflowIndex === -1) {
      throw new AppError('Workflow not found', 404);
    }

    const workflow = team.workflows[workflowIndex];

    // Only creator or admins can delete
    if (workflow.createdBy !== req.user.id) {
      const member = team.members.find(m => m.userId === req.user.id);
      const isAdmin = member && (member.role === 'owner' || member.role === 'admin');
      if (!isAdmin) {
        throw new AppError('Only the workflow creator or admins can delete', 403);
      }
    }

    // Remove workflow
    team.workflows.splice(workflowIndex, 1);
    team.updatedAt = new Date().toISOString();

    // Save team
    const teamFilePath = getTeamFilePath(id);
    await atomicWrite(teamFilePath, team);

    res.json({
      message: 'Workflow deleted'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/teams/:id/workflows/:wfId/steps - Add step to workflow
router.post('/:id/workflows/:wfId/steps', async (req, res, next) => {
  try {
    const { id, wfId } = req.params;
    const { type, title, content, files, instruction } = req.body;

    // Verify user is a member
    const isMember = await isTeamMember(req.user.id, id);
    if (!isMember) {
      throw new AppError('You are not a member of this team', 403);
    }

    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    const workflow = (team.workflows || []).find(w => w.id === wfId);
    if (!workflow) {
      throw new AppError('Workflow not found', 404);
    }

    // Check edit permission
    if (workflow.createdBy !== req.user.id) {
      const member = team.members.find(m => m.userId === req.user.id);
      const isAdmin = member && (member.role === 'owner' || member.role === 'admin');
      if (!isAdmin) {
        throw new AppError('Only the workflow creator or admins can edit', 403);
      }
    }

    // Validate type
    if (!['prompt', 'instruction'].includes(type)) {
      throw new AppError('Step type must be "prompt" or "instruction"', 400);
    }

    // Validate content based on type
    if (type === 'prompt') {
      if (!title || typeof title !== 'string' || !title.trim()) {
        throw new AppError('Prompt title is required', 400);
      }
      if (!content || typeof content !== 'string' || !content.trim()) {
        throw new AppError('Prompt content is required', 400);
      }
    } else {
      if (!instruction || typeof instruction !== 'string' || !instruction.trim()) {
        throw new AppError('Instruction text is required', 400);
      }
    }

    // Create step based on type
    const newStep = {
      id: uuidv4(),
      order: workflow.steps.length + 1,
      type,
    };

    if (type === 'prompt') {
      newStep.title = title.trim();
      newStep.content = content.trim();
      newStep.files = Array.isArray(files) ? files.filter(f => f && f.trim()) : [];
    } else {
      newStep.instruction = instruction.trim();
    }

    workflow.steps.push(newStep);
    workflow.updatedAt = new Date().toISOString();
    team.updatedAt = new Date().toISOString();

    // Save team
    const teamFilePath = getTeamFilePath(id);
    await atomicWrite(teamFilePath, team);

    res.status(201).json({
      message: 'Step added',
      step: newStep,
      workflow
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/teams/:id/workflows/:wfId/steps/:stepId - Update step
router.patch('/:id/workflows/:wfId/steps/:stepId', async (req, res, next) => {
  try {
    const { id, wfId, stepId } = req.params;
    const { title, content, files, instruction } = req.body;

    // Verify user is a member
    const isMember = await isTeamMember(req.user.id, id);
    if (!isMember) {
      throw new AppError('You are not a member of this team', 403);
    }

    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    const workflow = (team.workflows || []).find(w => w.id === wfId);
    if (!workflow) {
      throw new AppError('Workflow not found', 404);
    }

    // Check edit permission
    if (workflow.createdBy !== req.user.id) {
      const member = team.members.find(m => m.userId === req.user.id);
      const isAdmin = member && (member.role === 'owner' || member.role === 'admin');
      if (!isAdmin) {
        throw new AppError('Only the workflow creator or admins can edit', 403);
      }
    }

    const step = workflow.steps.find(s => s.id === stepId);
    if (!step) {
      throw new AppError('Step not found', 404);
    }

    // Update fields based on step type
    if (step.type === 'prompt') {
      if (title !== undefined) {
        if (!title || !title.trim()) {
          throw new AppError('Prompt title is required', 400);
        }
        step.title = title.trim();
      }
      if (content !== undefined) {
        if (!content || !content.trim()) {
          throw new AppError('Prompt content is required', 400);
        }
        step.content = content.trim();
      }
      if (files !== undefined) {
        step.files = Array.isArray(files) ? files.filter(f => f && f.trim()) : [];
      }
    } else if (step.type === 'instruction') {
      if (instruction !== undefined) {
        if (!instruction || !instruction.trim()) {
          throw new AppError('Instruction text is required', 400);
        }
        step.instruction = instruction.trim();
      }
    }

    workflow.updatedAt = new Date().toISOString();
    team.updatedAt = new Date().toISOString();

    // Save team
    const teamFilePath = getTeamFilePath(id);
    await atomicWrite(teamFilePath, team);

    res.json({
      message: 'Step updated',
      step,
      workflow
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/teams/:id/workflows/:wfId/steps/:stepId - Remove step
router.delete('/:id/workflows/:wfId/steps/:stepId', async (req, res, next) => {
  try {
    const { id, wfId, stepId } = req.params;

    // Verify user is a member
    const isMember = await isTeamMember(req.user.id, id);
    if (!isMember) {
      throw new AppError('You are not a member of this team', 403);
    }

    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    const workflow = (team.workflows || []).find(w => w.id === wfId);
    if (!workflow) {
      throw new AppError('Workflow not found', 404);
    }

    // Check edit permission
    if (workflow.createdBy !== req.user.id) {
      const member = team.members.find(m => m.userId === req.user.id);
      const isAdmin = member && (member.role === 'owner' || member.role === 'admin');
      if (!isAdmin) {
        throw new AppError('Only the workflow creator or admins can edit', 403);
      }
    }

    const stepIndex = workflow.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) {
      throw new AppError('Step not found', 404);
    }

    // Remove step
    workflow.steps.splice(stepIndex, 1);

    // Reorder remaining steps
    workflow.steps.forEach((step, index) => {
      step.order = index + 1;
    });

    workflow.updatedAt = new Date().toISOString();
    team.updatedAt = new Date().toISOString();

    // Save team
    const teamFilePath = getTeamFilePath(id);
    await atomicWrite(teamFilePath, team);

    res.json({
      message: 'Step removed',
      workflow
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/teams/:id/workflows/:wfId/reorder - Reorder steps
router.post('/:id/workflows/:wfId/reorder', async (req, res, next) => {
  try {
    const { id, wfId } = req.params;
    const { stepIds } = req.body;

    // Verify user is a member
    const isMember = await isTeamMember(req.user.id, id);
    if (!isMember) {
      throw new AppError('You are not a member of this team', 403);
    }

    const team = await getTeamById(id);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    const workflow = (team.workflows || []).find(w => w.id === wfId);
    if (!workflow) {
      throw new AppError('Workflow not found', 404);
    }

    // Check edit permission
    if (workflow.createdBy !== req.user.id) {
      const member = team.members.find(m => m.userId === req.user.id);
      const isAdmin = member && (member.role === 'owner' || member.role === 'admin');
      if (!isAdmin) {
        throw new AppError('Only the workflow creator or admins can edit', 403);
      }
    }

    // Validate stepIds
    if (!Array.isArray(stepIds)) {
      throw new AppError('stepIds must be an array', 400);
    }

    // Verify all step IDs exist
    const existingIds = new Set(workflow.steps.map(s => s.id));
    for (const stepId of stepIds) {
      if (!existingIds.has(stepId)) {
        throw new AppError(`Step ${stepId} not found`, 404);
      }
    }

    // Reorder steps
    const reorderedSteps = stepIds.map((stepId, index) => {
      const step = workflow.steps.find(s => s.id === stepId);
      return { ...step, order: index + 1 };
    });

    workflow.steps = reorderedSteps;
    workflow.updatedAt = new Date().toISOString();
    team.updatedAt = new Date().toISOString();

    // Save team
    const teamFilePath = getTeamFilePath(id);
    await atomicWrite(teamFilePath, team);

    res.json({
      message: 'Steps reordered',
      workflow
    });
  } catch (error) {
    next(error);
  }
});

// =====================
// Activity Feed Routes
// =====================

// GET /api/teams/:id/activity - Get team activity feed
router.get('/:id/activity', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0, type } = req.query;

    // Verify membership
    if (!await isTeamMember(req.user.id, id)) {
      throw new AppError('You are not a member of this team', 403);
    }

    const feed = await getActivityFeed(id, {
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      type: type || undefined,
    });

    res.json(feed);
  } catch (error) {
    next(error);
  }
});

// GET /api/teams/:id/activity/unread - Get unread activity count
router.get('/:id/activity/unread', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify membership
    if (!await isTeamMember(req.user.id, id)) {
      throw new AppError('You are not a member of this team', 403);
    }

    const count = await getUnreadCount(id, req.user.id);

    res.json({ count });
  } catch (error) {
    next(error);
  }
});

// POST /api/teams/:id/activity/mark-read - Mark activities as read
router.post('/:id/activity/mark-read', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { activityIds } = req.body;

    // Verify membership
    if (!await isTeamMember(req.user.id, id)) {
      throw new AppError('You are not a member of this team', 403);
    }

    const markedCount = await markAsRead(id, req.user.id, activityIds || null);

    res.json({
      message: 'Activities marked as read',
      markedCount,
    });
  } catch (error) {
    next(error);
  }
});

// =====================
// Analytics Routes
// =====================

// GET /api/teams/:id/analytics - Get team analytics
router.get('/:id/analytics', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify membership
    if (!await isTeamMember(req.user.id, id)) {
      throw new AppError('You are not a member of this team', 403);
    }

    const analytics = await getTeamAnalytics(id);

    res.json(analytics);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
