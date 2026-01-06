const express = require('express');
const router = express.Router();
const { authenticate, requirePremium } = require('../middleware/auth');
const workflowStorage = require('../services/workflowStorage');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    Error.captureStackTrace(this, this.constructor);
  }
}

// All routes require authentication and premium subscription
router.use(authenticate);
router.use(requirePremium);

// GET /api/workflows/categories - Get user's workflow categories
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await workflowStorage.getWorkflowCategories(req.user.id);
    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

// POST /api/workflows/categories - Create a new category
router.post('/categories', async (req, res, next) => {
  try {
    const { name, color } = req.body;

    if (!name || !name.trim()) {
      throw new AppError('Category name is required', 400);
    }

    const category = await workflowStorage.createWorkflowCategory(
      req.user.id,
      name.trim(),
      color || '#6366f1'
    );

    res.status(201).json({ category });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/workflows/categories/:categoryId - Update a category
router.patch('/categories/:categoryId', async (req, res, next) => {
  try {
    const { name, color } = req.body;
    const updates = {};

    if (name !== undefined) {
      if (!name.trim()) {
        throw new AppError('Category name cannot be empty', 400);
      }
      updates.name = name.trim();
    }

    if (color !== undefined) {
      updates.color = color;
    }

    const category = await workflowStorage.updateWorkflowCategory(
      req.user.id,
      req.params.categoryId,
      updates
    );

    res.json({ category });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/workflows/categories/:categoryId - Delete a category
router.delete('/categories/:categoryId', async (req, res, next) => {
  try {
    await workflowStorage.deleteWorkflowCategory(req.user.id, req.params.categoryId);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /api/workflows - Get all user's workflows with optional filtering
router.get('/', async (req, res, next) => {
  try {
    const { category, q } = req.query;
    const workflows = await workflowStorage.getWorkflowsByUserId(req.user.id, { category, q });
    const categories = await workflowStorage.getWorkflowCategories(req.user.id);
    res.json({ workflows, categories });
  } catch (error) {
    next(error);
  }
});

// POST /api/workflows - Create a new workflow
router.post('/', async (req, res, next) => {
  try {
    const { name, description, categoryId } = req.body;

    if (!name || !name.trim()) {
      throw new AppError('Workflow name is required', 400);
    }

    const workflow = await workflowStorage.createWorkflow(
      req.user.id,
      name.trim(),
      description?.trim() || '',
      categoryId || null
    );

    res.status(201).json({ workflow });
  } catch (error) {
    next(error);
  }
});

// GET /api/workflows/:id - Get a specific workflow
router.get('/:id', async (req, res, next) => {
  try {
    const workflow = await workflowStorage.getWorkflowById(req.params.id);

    if (!workflow) {
      throw new AppError('Workflow not found', 404);
    }

    // Verify ownership
    if (workflow.userId !== req.user.id) {
      throw new AppError('You do not have access to this workflow', 403);
    }

    res.json({ workflow });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/workflows/:id - Update a workflow
router.patch('/:id', async (req, res, next) => {
  try {
    const workflow = await workflowStorage.getWorkflowById(req.params.id);

    if (!workflow) {
      throw new AppError('Workflow not found', 404);
    }

    // Verify ownership
    if (workflow.userId !== req.user.id) {
      throw new AppError('You do not have permission to edit this workflow', 403);
    }

    const { name, description, categoryId } = req.body;
    const updates = {};

    if (name !== undefined) {
      if (!name.trim()) {
        throw new AppError('Workflow name cannot be empty', 400);
      }
      updates.name = name.trim();
    }

    if (description !== undefined) {
      updates.description = description.trim();
    }

    if (categoryId !== undefined) {
      updates.categoryId = categoryId;
    }

    const updatedWorkflow = await workflowStorage.updateWorkflow(req.params.id, updates);
    res.json({ workflow: updatedWorkflow });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/workflows/:id - Delete a workflow
router.delete('/:id', async (req, res, next) => {
  try {
    const workflow = await workflowStorage.getWorkflowById(req.params.id);

    if (!workflow) {
      throw new AppError('Workflow not found', 404);
    }

    // Verify ownership
    if (workflow.userId !== req.user.id) {
      throw new AppError('You do not have permission to delete this workflow', 403);
    }

    await workflowStorage.deleteWorkflow(req.params.id);
    res.json({ message: 'Workflow deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/workflows/:id/steps - Add a step to a workflow
router.post('/:id/steps', async (req, res, next) => {
  try {
    const workflow = await workflowStorage.getWorkflowById(req.params.id);

    if (!workflow) {
      throw new AppError('Workflow not found', 404);
    }

    // Verify ownership
    if (workflow.userId !== req.user.id) {
      throw new AppError('You do not have permission to edit this workflow', 403);
    }

    const { type, title, content, files, instruction } = req.body;

    if (!type || !['prompt', 'instruction'].includes(type)) {
      throw new AppError('Step type must be "prompt" or "instruction"', 400);
    }

    if (type === 'prompt') {
      if (!title || !title.trim()) {
        throw new AppError('Prompt title is required', 400);
      }
      if (!content || !content.trim()) {
        throw new AppError('Prompt content is required', 400);
      }
    } else if (type === 'instruction') {
      if (!instruction || !instruction.trim()) {
        throw new AppError('Instruction text is required', 400);
      }
    }

    const stepData = {
      type,
      ...(type === 'prompt' ? {
        title: title.trim(),
        content: content.trim(),
        files: Array.isArray(files) ? files.filter(f => f.trim()) : [],
      } : {
        instruction: instruction.trim(),
      }),
    };

    const step = await workflowStorage.addWorkflowStep(req.params.id, stepData);
    res.status(201).json({ step });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/workflows/:id/steps/:stepId - Update a step
router.patch('/:id/steps/:stepId', async (req, res, next) => {
  try {
    const workflow = await workflowStorage.getWorkflowById(req.params.id);

    if (!workflow) {
      throw new AppError('Workflow not found', 404);
    }

    // Verify ownership
    if (workflow.userId !== req.user.id) {
      throw new AppError('You do not have permission to edit this workflow', 403);
    }

    const step = workflow.steps.find(s => s.id === req.params.stepId);
    if (!step) {
      throw new AppError('Step not found', 404);
    }

    const { title, content, files, instruction } = req.body;
    const updates = {};

    if (step.type === 'prompt') {
      if (title !== undefined) updates.title = title.trim();
      if (content !== undefined) updates.content = content.trim();
      if (files !== undefined) updates.files = Array.isArray(files) ? files.filter(f => f.trim()) : [];
    } else if (step.type === 'instruction') {
      if (instruction !== undefined) updates.instruction = instruction.trim();
    }

    const updatedStep = await workflowStorage.updateWorkflowStep(req.params.id, req.params.stepId, updates);
    res.json({ step: updatedStep });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/workflows/:id/steps/:stepId - Delete a step
router.delete('/:id/steps/:stepId', async (req, res, next) => {
  try {
    const workflow = await workflowStorage.getWorkflowById(req.params.id);

    if (!workflow) {
      throw new AppError('Workflow not found', 404);
    }

    // Verify ownership
    if (workflow.userId !== req.user.id) {
      throw new AppError('You do not have permission to edit this workflow', 403);
    }

    const step = workflow.steps.find(s => s.id === req.params.stepId);
    if (!step) {
      throw new AppError('Step not found', 404);
    }

    await workflowStorage.deleteWorkflowStep(req.params.id, req.params.stepId);
    res.json({ message: 'Step deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/workflows/:id/reorder - Reorder workflow steps
router.post('/:id/reorder', async (req, res, next) => {
  try {
    const workflow = await workflowStorage.getWorkflowById(req.params.id);

    if (!workflow) {
      throw new AppError('Workflow not found', 404);
    }

    // Verify ownership
    if (workflow.userId !== req.user.id) {
      throw new AppError('You do not have permission to edit this workflow', 403);
    }

    const { stepIds } = req.body;

    if (!Array.isArray(stepIds)) {
      throw new AppError('stepIds must be an array', 400);
    }

    const steps = await workflowStorage.reorderWorkflowSteps(req.params.id, stepIds);
    res.json({ steps });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
