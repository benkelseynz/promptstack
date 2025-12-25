const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const { optionalAuth } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

// Load questions data
let questionsData = null;

function loadQuestionsData() {
  if (questionsData) return questionsData;

  const filePath = path.join(__dirname, '../../data/questions/follow-ups.json');
  const fileContent = fs.readFileSync(filePath, 'utf8');
  questionsData = JSON.parse(fileContent);
  return questionsData;
}

// Apply premium gating to a question based on user tier
function applyQuestionGating(question, userTier) {
  const isPremium = question.access === 'premium';
  const hasPremiumAccess = userTier === 'professional' || userTier === 'enterprise';

  return {
    ...question,
    isLocked: isPremium && !hasPremiumAccess,
  };
}

// GET /api/questions
// Returns all categories and questions with optional filtering
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const data = loadQuestionsData();
    const userTier = req.user?.tier || 'free';
    const { category, q, access } = req.query;

    let filteredQuestions = [...data.questions];

    // Filter by category
    if (category && category !== 'all') {
      filteredQuestions = filteredQuestions.filter(
        (question) => question.category === category
      );
    }

    // Filter by search query (searches question text and tags)
    if (q) {
      const searchLower = q.toLowerCase();
      filteredQuestions = filteredQuestions.filter(
        (question) =>
          question.question.toLowerCase().includes(searchLower) ||
          question.tags.some((tag) => tag.toLowerCase().includes(searchLower)) ||
          question.context.toLowerCase().includes(searchLower)
      );
    }

    // Filter by access level
    if (access && access !== 'all') {
      filteredQuestions = filteredQuestions.filter(
        (question) => question.access === access
      );
    }

    // Apply premium gating to each question
    const gatedQuestions = filteredQuestions.map((question) =>
      applyQuestionGating(question, userTier)
    );

    res.json({
      categories: data.categories,
      questions: gatedQuestions,
      total: gatedQuestions.length,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/questions/:id
// Returns a single question by ID
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = loadQuestionsData();
    const userTier = req.user?.tier || 'free';

    const question = data.questions.find((q) => q.id === id);

    if (!question) {
      throw new AppError('Question not found', 404);
    }

    const gatedQuestion = applyQuestionGating(question, userTier);

    res.json({
      question: gatedQuestion,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
