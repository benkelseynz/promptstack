const express = require('express');
const router = express.Router();

const { authenticate, requireVerified } = require('../middleware/auth');
const { 
  getUserCustomPrompts,
  addCustomPrompt,
  updateCustomPrompt,
  deleteCustomPrompt,
  saveLibraryPrompt,
  removeSavedPrompt,
  getUserById
} = require('../services/userStorage');
const { getPromptById, applyPremiumGating } = require('../services/searchIndex');
const { 
  validate, 
  createPromptSchema, 
  updatePromptSchema,
  idParamSchema 
} = require('../schemas/validation');
const { AppError } = require('../middleware/errorHandler');

// All routes require authentication
router.use(authenticate);

// GET /api/user/prompts - List user's custom prompts
router.get('/prompts', async (req, res, next) => {
  try {
    const prompts = await getUserCustomPrompts(req.user.id);
    
    res.json({
      prompts,
      total: prompts.length
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/user/prompts - Create custom prompt
router.post('/prompts', validate(createPromptSchema), async (req, res, next) => {
  try {
    const { title, content, keywords } = req.body;
    
    const prompt = await addCustomPrompt(req.user.id, {
      title,
      content,
      keywords
    });
    
    if (!prompt) {
      throw new AppError('Failed to create prompt', 500);
    }
    
    res.status(201).json({
      message: 'Prompt created successfully',
      prompt
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/user/prompts/:id - Update custom prompt
router.put('/prompts/:id', validate(updatePromptSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const prompt = await updateCustomPrompt(req.user.id, id, updates);
    
    if (!prompt) {
      throw new AppError('Prompt not found', 404);
    }
    
    res.json({
      message: 'Prompt updated successfully',
      prompt
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/user/prompts/:id - Delete custom prompt
router.delete('/prompts/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const deleted = await deleteCustomPrompt(req.user.id, id);
    
    if (!deleted) {
      throw new AppError('Prompt not found', 404);
    }
    
    res.json({
      message: 'Prompt deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/user/saved - List saved library prompts
router.get('/saved', async (req, res, next) => {
  try {
    const userData = await getUserById(req.user.id);
    const savedIds = userData?.savedPrompts || [];
    const userTier = req.user?.tier || 'free';
    
    // Get full prompt data for saved prompts
    const savedPrompts = savedIds
      .map(id => getPromptById(id))
      .filter(Boolean)
      .map(prompt => applyPremiumGating(prompt, userTier));
    
    res.json({
      prompts: savedPrompts,
      total: savedPrompts.length
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/user/saved/:id - Save a library prompt
router.post('/saved/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Verify prompt exists
    const prompt = getPromptById(id);
    if (!prompt) {
      throw new AppError('Prompt not found', 404);
    }
    
    const savedPrompts = await saveLibraryPrompt(req.user.id, id);
    
    res.json({
      message: 'Prompt saved successfully',
      savedCount: savedPrompts.length
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/user/saved/:id - Remove saved library prompt
router.delete('/saved/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const savedPrompts = await removeSavedPrompt(req.user.id, id);
    
    res.json({
      message: 'Prompt removed from saved',
      savedCount: savedPrompts.length
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
