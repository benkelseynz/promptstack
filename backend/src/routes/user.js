const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const { authenticate, requireVerified } = require('../middleware/auth');
const {
  getUserCustomPrompts,
  addCustomPrompt,
  updateCustomPrompt,
  deleteCustomPrompt,
  getSavedPromptEntries,
  updateSavedPromptCategory,
  saveLibraryPrompt,
  removeSavedPrompt,
  getUserProfile,
  updateUserProfile,
  getProfileCompletionStatus,
  // Saved questions
  saveLibraryQuestion,
  removeSavedQuestion,
  getSavedQuestionEntries,
  updateSavedQuestionCategory,
  // Custom questions
  addCustomQuestion,
  updateCustomQuestion,
  deleteCustomQuestion,
  getUserCustomQuestions
} = require('../services/userStorage');
const workflowStorage = require('../services/workflowStorage');
const { getPromptById, applyPremiumGating } = require('../services/searchIndex');

// Load questions data for saved questions functionality
let questionsData = null;
function loadQuestionsData() {
  if (questionsData) return questionsData;
  const filePath = path.join(__dirname, '../../data/questions/follow-ups.json');
  const fileContent = fs.readFileSync(filePath, 'utf8');
  questionsData = JSON.parse(fileContent);
  return questionsData;
}

function getQuestionById(questionId) {
  const data = loadQuestionsData();
  return data.questions.find(q => q.id === questionId);
}

function applyQuestionGating(question, userTier) {
  const isPremium = question.access === 'premium';
  const hasPremiumAccess = userTier === 'professional' || userTier === 'enterprise';
  const isLocked = isPremium && !hasPremiumAccess;

  function truncateToWords(text, wordCount) {
    const words = text.split(/\s+/);
    if (words.length <= wordCount) return text;
    return words.slice(0, wordCount).join(' ') + '...';
  }

  return {
    ...question,
    question: isLocked ? truncateToWords(question.question, 3) : question.question,
    isLocked,
  };
}

async function validatePersonalCategory(userId, categoryId) {
  if (!categoryId) {
    return null;
  }

  const categories = await workflowStorage.getWorkflowCategories(userId);
  const exists = categories.some((c) => c.id === categoryId);
  if (!exists) {
    throw new AppError('Invalid category', 400);
  }
  return categoryId;
}
const {
  validate,
  createPromptSchema,
  updatePromptSchema,
  idParamSchema,
  profileSectionParamSchema,
  validateProfileSection
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
    const { title, content, keywords, categoryId } = req.body;
    const validatedCategoryId = await validatePersonalCategory(req.user.id, categoryId);
    
    const prompt = await addCustomPrompt(req.user.id, {
      title,
      content,
      keywords,
      categoryId: validatedCategoryId
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
    const updates = { ...req.body };

    if (updates.categoryId !== undefined) {
      updates.categoryId = await validatePersonalCategory(req.user.id, updates.categoryId);
    }
    
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
    const savedEntries = await getSavedPromptEntries(req.user.id);
    const userTier = req.user?.tier || 'free';
    
    // Get full prompt data for saved prompts
    const savedPrompts = savedEntries
      .map(entry => ({
        entry,
        prompt: getPromptById(entry.id)
      }))
      .filter(item => item.prompt)
      .map(({ entry, prompt }) => {
        const gated = applyPremiumGating(prompt, userTier);
        if (!gated) return null;
        return {
          ...gated,
          categoryId: entry.categoryId || null
        };
      })
      .filter(Boolean)
    
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

// PATCH /api/user/saved/:id/category - Update saved prompt category
router.patch('/saved/:id/category', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { categoryId } = req.body;

    const validatedCategoryId = await validatePersonalCategory(req.user.id, categoryId);
    const entry = await updateSavedPromptCategory(req.user.id, id, validatedCategoryId);

    if (!entry) {
      throw new AppError('Saved prompt not found', 404);
    }

    res.json({
      message: 'Saved prompt category updated',
      categoryId: entry.categoryId
    });
  } catch (error) {
    next(error);
  }
});

// =====================
// Saved Questions Routes
// =====================

// GET /api/user/saved-questions - List saved library questions
router.get('/saved-questions', async (req, res, next) => {
  try {
    const savedEntries = await getSavedQuestionEntries(req.user.id);
    const userTier = req.user?.tier || 'free';

    // Get full question data for saved questions
    const savedQuestions = savedEntries
      .map(entry => ({
        entry,
        question: getQuestionById(entry.id)
      }))
      .filter(item => item.question)
      .map(({ entry, question }) => {
        const gated = applyQuestionGating(question, userTier);
        return {
          ...gated,
          categoryId: entry.categoryId || null
        };
      })
      .filter(Boolean)

    res.json({
      questions: savedQuestions,
      total: savedQuestions.length
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/user/saved-questions/:id - Save a library question
router.post('/saved-questions/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify question exists
    const question = getQuestionById(id);
    if (!question) {
      throw new AppError('Question not found', 404);
    }

    const savedQuestions = await saveLibraryQuestion(req.user.id, id);

    res.json({
      message: 'Question saved successfully',
      savedCount: savedQuestions.length
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/user/saved-questions/:id - Remove saved library question
router.delete('/saved-questions/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const savedQuestions = await removeSavedQuestion(req.user.id, id);

    res.json({
      message: 'Question removed from saved',
      savedCount: savedQuestions.length
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/user/saved-questions/:id/category - Update saved question category
router.patch('/saved-questions/:id/category', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { categoryId } = req.body;

    const validatedCategoryId = await validatePersonalCategory(req.user.id, categoryId);
    const entry = await updateSavedQuestionCategory(req.user.id, id, validatedCategoryId);

    if (!entry) {
      throw new AppError('Saved question not found', 404);
    }

    res.json({
      message: 'Saved question category updated',
      categoryId: entry.categoryId
    });
  } catch (error) {
    next(error);
  }
});

// =====================
// Custom Questions Routes
// =====================

// GET /api/user/questions - List user's custom questions
router.get('/questions', async (req, res, next) => {
  try {
    const questions = await getUserCustomQuestions(req.user.id);

    res.json({
      questions,
      total: questions.length
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/user/questions - Create custom question
router.post('/questions', async (req, res, next) => {
  try {
    const { question, context, category, tags, categoryId } = req.body;
    const validatedCategoryId = await validatePersonalCategory(req.user.id, categoryId);

    if (!question || !question.trim()) {
      throw new AppError('Question text is required', 400);
    }

    const newQuestion = await addCustomQuestion(req.user.id, {
      question: question.trim(),
      context: context?.trim() || '',
      category: category || 'custom',
      tags: tags || [],
      categoryId: validatedCategoryId
    });

    if (!newQuestion) {
      throw new AppError('Failed to create question', 500);
    }

    res.status(201).json({
      message: 'Question created successfully',
      question: newQuestion
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/user/questions/:id - Update custom question
router.put('/questions/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.categoryId !== undefined) {
      updates.categoryId = await validatePersonalCategory(req.user.id, updates.categoryId);
    }

    const question = await updateCustomQuestion(req.user.id, id, updates);

    if (!question) {
      throw new AppError('Question not found', 404);
    }

    res.json({
      message: 'Question updated successfully',
      question
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/user/questions/:id - Delete custom question
router.delete('/questions/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await deleteCustomQuestion(req.user.id, id);

    if (!deleted) {
      throw new AppError('Question not found', 404);
    }

    res.json({
      message: 'Question deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// =====================
// Profile Routes
// =====================

// GET /api/user/profile - Get full user profile
router.get('/profile', async (req, res, next) => {
  try {
    const profile = await getUserProfile(req.user.id);

    if (!profile) {
      throw new AppError('Profile not found', 404);
    }

    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

// GET /api/user/profile/status - Get profile completion status
router.get('/profile/status', async (req, res, next) => {
  try {
    const status = await getProfileCompletionStatus(req.user.id);

    if (!status) {
      throw new AppError('Profile not found', 404);
    }

    res.json(status);
  } catch (error) {
    next(error);
  }
});

// PUT /api/user/profile/:section - Update a specific profile section
router.put(
  '/profile/:section',
  validate(profileSectionParamSchema, 'params'),
  validateProfileSection,
  async (req, res, next) => {
    try {
      const { section } = req.params;
      const data = req.body;

      const result = await updateUserProfile(req.user.id, section, data);

      if (result.error) {
        throw new AppError(result.error, 400);
      }

      res.json({
        message: `${section} section updated successfully`,
        profile: result.profile
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
