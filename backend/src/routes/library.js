const express = require('express');
const router = express.Router();

const { optionalAuth } = require('../middleware/auth');
const { 
  searchPrompts, 
  getPromptById, 
  getIndustries,
  getAllRoles,
  getAllCategories,
  applyPremiumGating 
} = require('../services/searchIndex');
const { validate, searchQuerySchema, idParamSchema } = require('../schemas/validation');
const { AppError } = require('../middleware/errorHandler');

// GET /api/library/industries
router.get('/industries', async (req, res, next) => {
  try {
    const industries = getIndustries();
    
    res.json({
      industries,
      total: industries.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/library/filters
router.get('/filters', async (req, res, next) => {
  try {
    const industries = getIndustries();
    const roles = getAllRoles();
    const categories = getAllCategories();
    
    res.json({
      industries: industries.map(i => ({ id: i.id, name: i.name })),
      roles,
      categories,
      accessLevels: ['all', 'free', 'premium']
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/library/prompts
router.get('/prompts', optionalAuth, validate(searchQuerySchema, 'query'), async (req, res, next) => {
  try {
    const query = req.validatedQuery || req.query;
    const userTier = req.user?.tier || 'free';
    
    const results = searchPrompts(query);
    
    // Apply premium gating to each prompt
    const gatedPrompts = results.prompts.map(prompt => 
      applyPremiumGating(prompt, userTier)
    );
    
    res.json({
      prompts: gatedPrompts,
      total: results.total,
      page: results.page,
      limit: results.limit,
      totalPages: results.totalPages
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/library/prompts/:id
router.get('/prompts/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userTier = req.user?.tier || 'free';
    
    const prompt = getPromptById(id);
    
    if (!prompt) {
      throw new AppError('Prompt not found', 404);
    }
    
    const gatedPrompt = applyPremiumGating(prompt, userTier);
    
    res.json({
      prompt: gatedPrompt
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
