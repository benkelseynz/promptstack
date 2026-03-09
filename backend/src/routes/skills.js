const express = require('express');
const router = express.Router();

const { optionalAuth, authenticate } = require('../middleware/auth');
const {
  searchSkills,
  getSkillById,
  getSkillCategories,
  applySkillPremiumGating
} = require('../services/skillsIndex');
const { AppError } = require('../middleware/errorHandler');

// GET /api/skills - Search/browse library skills
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const query = req.query;
    const userTier = req.user?.tier || 'free';

    const results = searchSkills(query);

    const gatedSkills = results.skills.map(skill =>
      applySkillPremiumGating(skill, userTier)
    );

    res.json({
      skills: gatedSkills,
      total: results.total,
      page: results.page,
      limit: results.limit,
      totalPages: results.totalPages
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/skills/categories - Get skill categories
router.get('/categories', async (req, res, next) => {
  try {
    const categories = getSkillCategories();
    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

// GET /api/skills/:id - Get single skill
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userTier = req.user?.tier || 'free';

    const skill = getSkillById(id);

    if (!skill) {
      throw new AppError('Skill not found', 404);
    }

    const gatedSkill = applySkillPremiumGating(skill, userTier);

    res.json({ skill: gatedSkill });
  } catch (error) {
    next(error);
  }
});

// GET /api/skills/:id/download - Download skill as Markdown file
router.get('/:id/download', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userTier = req.user?.tier || 'free';

    const skill = getSkillById(id);

    if (!skill) {
      throw new AppError('Skill not found', 404);
    }

    // Check premium access
    if (skill.access === 'premium' && userTier === 'free') {
      throw new AppError('Premium subscription required to download this skill', 403);
    }

    // Generate clean filename
    const filename = skill.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    // Build markdown with frontmatter
    const frontmatter = [
      '---',
      `name: ${skill.title}`,
      `description: ${skill.preview || ''}`,
      `tags: [${(skill.tags || []).join(', ')}]`,
      `version: "1.0"`,
      '---',
      ''
    ].join('\n');

    const markdown = frontmatter + skill.content;

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.md"`);
    res.send(markdown);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
