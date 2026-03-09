const express = require('express');
const { z } = require('zod');
const { authenticate } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const {
  generatePromptStream,
  improvePromptStream,
  refinePromptStream,
  analyseInputs,
  analyseExistingPrompt,
  scorePromptQuality,
  scorePromptWithAI,
} = require('../services/promptBuilder');

const router = express.Router();

// Valid model IDs (must match frontend)
const VALID_MODELS = [
  'gpt-5.2', 'gpt-5.1', 'gpt-4o',
  'claude-opus-4.5', 'claude-sonnet-4.5', 'claude-haiku-4.5',
  'grok-4', 'grok-4.1-fast',
  'gemini-3-pro', 'gemini-3-flash', 'gemini-2.5-pro',
  'deepseek-v3', 'mistral-large', 'dont-know',
];

// Valid goal categories
const VALID_GOALS = [
  'communication', 'analysis', 'ideation',
  'documentation', 'research', 'quick-task',
];

// Valid refinement types
const VALID_REFINEMENTS = ['shorter', 'detailed', 'tone', 'examples'];

// Shared inputs schema
const inputsSchema = z.object({
  // Form fields
  role: z.string().optional(),
  customRole: z.string().optional(),
  task: z.string().optional(),
  context: z.string().optional(),
  outputFormat: z.string().optional(),
  customFormat: z.string().optional(),
  examples: z.string().optional(),
  constraints: z.string().optional(),
  thinkingMode: z.boolean().optional(),
  creativity: z.number().min(0).max(100).optional(),
  // Freeform field
  freeformInput: z.string().optional(),
});

// Refinement answer schema
const refinementAnswerSchema = z.object({
  questionId: z.string(),
  question: z.string(),
  answer: z.string(),
});

// Validation schemas
const generateSchema = z.object({
  type: z.enum(['form', 'freeform']),
  modelId: z.string().refine(v => VALID_MODELS.includes(v), 'Invalid model'),
  goalCategory: z.string().refine(v => VALID_GOALS.includes(v), 'Invalid goal category'),
  inputs: inputsSchema,
  refinementAnswers: z.array(refinementAnswerSchema).optional(),
});

const analyseSchema = z.object({
  type: z.enum(['form', 'freeform']),
  modelId: z.string().refine(v => VALID_MODELS.includes(v), 'Invalid model'),
  goalCategory: z.string().refine(v => VALID_GOALS.includes(v), 'Invalid goal category'),
  inputs: inputsSchema,
});

const improveSchema = z.object({
  existingPrompt: z.string().min(1, 'Existing prompt is required').max(10000),
  modelId: z.string().refine(v => VALID_MODELS.includes(v), 'Invalid model'),
  goalCategory: z.string().refine(v => VALID_GOALS.includes(v), 'Invalid goal category'),
  diagnosisContext: z.object({
    diagnosis: z.array(z.object({
      dimension: z.string(),
      issue: z.string(),
      suggestion: z.string(),
    })).optional(),
    answers: z.array(refinementAnswerSchema).optional(),
  }).optional(),
});

const analyseExistingSchema = z.object({
  existingPrompt: z.string().min(1, 'Existing prompt is required').max(10000),
  modelId: z.string().refine(v => VALID_MODELS.includes(v), 'Invalid model'),
  goalCategory: z.string().refine(v => VALID_GOALS.includes(v), 'Invalid goal category'),
});

const refineSchema = z.object({
  currentPrompt: z.string().min(1, 'Current prompt is required').max(10000),
  refinementType: z.string().optional(),
  customInstruction: z.string().max(2000).optional(),
  modelId: z.string().refine(v => VALID_MODELS.includes(v), 'Invalid model'),
}).refine(
  data => data.refinementType || data.customInstruction,
  'Either refinementType or customInstruction is required'
);

const scoreSchema = z.object({
  promptText: z.string().min(1, 'Prompt text is required').max(10000),
  modelId: z.string().refine(v => VALID_MODELS.includes(v), 'Invalid model'),
  goalCategory: z.string().refine(v => VALID_GOALS.includes(v), 'Invalid goal category'),
});

/**
 * Helper to stream a Gemini response as SSE to the client.
 * Sends chunks as they arrive, then a final event with quality score.
 */
async function streamToSSE(res, streamPromise, req) {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Handle client disconnect
  let clientDisconnected = false;
  req.on('close', () => {
    clientDisconnected = true;
  });

  let fullText = '';

  try {
    const stream = await streamPromise;

    for await (const chunk of stream) {
      if (clientDisconnected) break;

      const text = chunk.text;
      if (text) {
        fullText += text;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    // Send quality score with the final event
    const qualityScore = scorePromptQuality(fullText);
    res.write(`data: ${JSON.stringify({ done: true, fullText, qualityScore })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Stream error:', error.message);

    if (!clientDisconnected) {
      const errorMessage = error.isOperational
        ? error.message
        : 'AI generation failed. Please try again.';
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.end();
    }
  }
}

// POST /api/builder/analyse
// Analyse user inputs and return targeted follow-up questions (non-streaming JSON)
router.post('/analyse', authenticate, async (req, res, next) => {
  try {
    const validated = analyseSchema.parse(req.body);

    // Validate that required fields exist for the given type
    if (validated.type === 'form' && !validated.inputs.task) {
      throw new AppError('Task description is required for analysis', 400);
    }
    if (validated.type === 'freeform' && !validated.inputs.freeformInput) {
      throw new AppError('Freeform input is required for analysis', 400);
    }

    const result = await analyseInputs({
      type: validated.type,
      inputs: validated.inputs,
      modelId: validated.modelId,
      goalCategory: validated.goalCategory,
      userId: req.user.id,
    });

    res.json(result);
  } catch (error) {
    if (error.name === 'ZodError' || error.isOperational) {
      return next(error);
    }
    next(error);
  }
});

// POST /api/builder/analyse-existing
// Analyse an existing prompt and return diagnosis + optional questions (non-streaming JSON)
router.post('/analyse-existing', authenticate, async (req, res, next) => {
  try {
    const validated = analyseExistingSchema.parse(req.body);

    const result = await analyseExistingPrompt({
      existingPrompt: validated.existingPrompt,
      modelId: validated.modelId,
      goalCategory: validated.goalCategory,
      userId: req.user.id,
    });

    res.json(result);
  } catch (error) {
    if (error.name === 'ZodError' || error.isOperational) {
      return next(error);
    }
    next(error);
  }
});

// POST /api/builder/generate
// Generate a prompt from form or freeform inputs (streaming SSE)
router.post('/generate', authenticate, async (req, res, next) => {
  try {
    const validated = generateSchema.parse(req.body);

    // Validate that required fields exist for the given type
    if (validated.type === 'form' && !validated.inputs.task) {
      throw new AppError('Task description is required for form-based generation', 400);
    }
    if (validated.type === 'freeform' && !validated.inputs.freeformInput) {
      throw new AppError('Freeform input is required for audio/text-based generation', 400);
    }

    const streamPromise = generatePromptStream({
      type: validated.type,
      inputs: validated.inputs,
      modelId: validated.modelId,
      goalCategory: validated.goalCategory,
      userId: req.user.id,
      refinementAnswers: validated.refinementAnswers,
    });

    await streamToSSE(res, streamPromise, req);
  } catch (error) {
    // For validation errors, send as regular JSON (not SSE)
    if (error.name === 'ZodError' || error.isOperational) {
      return next(error);
    }
    next(error);
  }
});

// POST /api/builder/improve
// Improve an existing prompt (streaming SSE)
router.post('/improve', authenticate, async (req, res, next) => {
  try {
    const validated = improveSchema.parse(req.body);

    const streamPromise = improvePromptStream({
      existingPrompt: validated.existingPrompt,
      modelId: validated.modelId,
      goalCategory: validated.goalCategory,
      userId: req.user.id,
      diagnosisContext: validated.diagnosisContext,
    });

    await streamToSSE(res, streamPromise, req);
  } catch (error) {
    if (error.name === 'ZodError' || error.isOperational) {
      return next(error);
    }
    next(error);
  }
});

// POST /api/builder/score
// Score a prompt using AI-based rubric evaluation (non-streaming JSON)
router.post('/score', authenticate, async (req, res, next) => {
  try {
    const validated = scoreSchema.parse(req.body);

    const result = await scorePromptWithAI({
      promptText: validated.promptText,
      modelId: validated.modelId,
      goalCategory: validated.goalCategory,
    });

    res.json(result);
  } catch (error) {
    if (error.name === 'ZodError' || error.isOperational) {
      return next(error);
    }
    next(error);
  }
});

// POST /api/builder/refine
// Refine a generated prompt (streaming SSE)
router.post('/refine', authenticate, async (req, res, next) => {
  try {
    const validated = refineSchema.parse(req.body);

    const streamPromise = refinePromptStream({
      currentPrompt: validated.currentPrompt,
      refinementType: validated.refinementType,
      customInstruction: validated.customInstruction,
      modelId: validated.modelId,
    });

    await streamToSSE(res, streamPromise, req);
  } catch (error) {
    if (error.name === 'ZodError' || error.isOperational) {
      return next(error);
    }
    next(error);
  }
});

module.exports = router;
