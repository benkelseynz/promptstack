const { v4: uuidv4 } = require('uuid');
const path = require('path');
const {
  WORKFLOWS_DIR,
  getWorkflowFilePath,
  atomicWrite,
  readJsonFile,
  listFiles,
  deleteFile,
} = require('./fileStorage');

// Get categories file path for a user
function getCategoriesFilePath(userId) {
  return path.join(WORKFLOWS_DIR, `_categories_${userId}.json`);
}

// Load categories for a user
async function loadCategories(userId) {
  const filePath = getCategoriesFilePath(userId);
  const data = await readJsonFile(filePath);
  return data || [];
}

// Save categories for a user
async function saveCategories(userId, categories) {
  const filePath = getCategoriesFilePath(userId);
  await atomicWrite(filePath, categories);
}

// Get all workflow categories for a user
async function getWorkflowCategories(userId) {
  return await loadCategories(userId);
}

// Create a new workflow category
async function createWorkflowCategory(userId, name, color = '#6366f1') {
  const categories = await loadCategories(userId);

  const category = {
    id: uuidv4(),
    name,
    color,
    createdAt: new Date().toISOString(),
  };

  categories.push(category);
  await saveCategories(userId, categories);
  return category;
}

// Update a workflow category
async function updateWorkflowCategory(userId, categoryId, updates) {
  const categories = await loadCategories(userId);
  const index = categories.findIndex(c => c.id === categoryId);

  if (index === -1) {
    throw new Error('Category not found');
  }

  if (updates.name !== undefined) categories[index].name = updates.name;
  if (updates.color !== undefined) categories[index].color = updates.color;

  await saveCategories(userId, categories);
  return categories[index];
}

// Delete a workflow category
async function deleteWorkflowCategory(userId, categoryId) {
  const categories = await loadCategories(userId);
  const index = categories.findIndex(c => c.id === categoryId);

  if (index === -1) {
    throw new Error('Category not found');
  }

  categories.splice(index, 1);
  await saveCategories(userId, categories);

  // Remove categoryId from workflows with this category
  const workflows = await getWorkflowsByUserId(userId);
  for (const workflow of workflows) {
    if (workflow.categoryId === categoryId) {
      await updateWorkflow(workflow.id, { categoryId: null });
    }
  }

  return true;
}

// Create a new personal workflow
async function createWorkflow(userId, name, description = '', categoryId = null) {
  const workflow = {
    id: uuidv4(),
    name,
    description,
    categoryId,
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    steps: [],
  };

  const filePath = getWorkflowFilePath(workflow.id);
  await atomicWrite(filePath, workflow);
  return workflow;
}

// Get a workflow by ID
async function getWorkflowById(workflowId) {
  const filePath = getWorkflowFilePath(workflowId);
  return await readJsonFile(filePath);
}

// Get all workflows for a user with optional filtering
async function getWorkflowsByUserId(userId, options = {}) {
  const { category, q } = options;
  const files = await listFiles(WORKFLOWS_DIR, '.json');
  let workflows = [];

  for (const file of files) {
    if (file.startsWith('_')) continue; // Skip index files

    const workflowId = file.replace('.json', '');
    const workflow = await getWorkflowById(workflowId);

    if (workflow && workflow.userId === userId) {
      workflows.push(workflow);
    }
  }

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

  // Sort by updatedAt descending
  workflows.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return workflows;
}

// Update a workflow
async function updateWorkflow(workflowId, updates) {
  const workflow = await getWorkflowById(workflowId);
  if (!workflow) {
    throw new Error('Workflow not found');
  }

  const updatedWorkflow = {
    ...workflow,
    ...updates,
    id: workflow.id, // Prevent ID from being changed
    userId: workflow.userId, // Prevent owner from being changed
    createdAt: workflow.createdAt, // Preserve creation date
    updatedAt: new Date().toISOString(),
  };

  const filePath = getWorkflowFilePath(workflowId);
  await atomicWrite(filePath, updatedWorkflow);
  return updatedWorkflow;
}

// Delete a workflow
async function deleteWorkflow(workflowId) {
  const filePath = getWorkflowFilePath(workflowId);
  return await deleteFile(filePath);
}

// Add a step to a workflow
async function addWorkflowStep(workflowId, stepData) {
  const workflow = await getWorkflowById(workflowId);
  if (!workflow) {
    throw new Error('Workflow not found');
  }

  const step = {
    id: uuidv4(),
    order: workflow.steps.length + 1,
    type: stepData.type,
    ...(stepData.type === 'prompt' ? {
      title: stepData.title || '',
      content: stepData.content || '',
      files: stepData.files || [],
    } : {
      instruction: stepData.instruction || '',
    }),
  };

  workflow.steps.push(step);
  workflow.updatedAt = new Date().toISOString();

  const filePath = getWorkflowFilePath(workflowId);
  await atomicWrite(filePath, workflow);
  return step;
}

// Update a workflow step
async function updateWorkflowStep(workflowId, stepId, updates) {
  const workflow = await getWorkflowById(workflowId);
  if (!workflow) {
    throw new Error('Workflow not found');
  }

  const stepIndex = workflow.steps.findIndex(s => s.id === stepId);
  if (stepIndex === -1) {
    throw new Error('Step not found');
  }

  const step = workflow.steps[stepIndex];

  // Update based on step type
  if (step.type === 'prompt') {
    if (updates.title !== undefined) step.title = updates.title;
    if (updates.content !== undefined) step.content = updates.content;
    if (updates.files !== undefined) step.files = updates.files;
  } else if (step.type === 'instruction') {
    if (updates.instruction !== undefined) step.instruction = updates.instruction;
  }

  workflow.steps[stepIndex] = step;
  workflow.updatedAt = new Date().toISOString();

  const filePath = getWorkflowFilePath(workflowId);
  await atomicWrite(filePath, workflow);
  return step;
}

// Delete a workflow step
async function deleteWorkflowStep(workflowId, stepId) {
  const workflow = await getWorkflowById(workflowId);
  if (!workflow) {
    throw new Error('Workflow not found');
  }

  const stepIndex = workflow.steps.findIndex(s => s.id === stepId);
  if (stepIndex === -1) {
    throw new Error('Step not found');
  }

  workflow.steps.splice(stepIndex, 1);

  // Reorder remaining steps
  workflow.steps.forEach((step, index) => {
    step.order = index + 1;
  });

  workflow.updatedAt = new Date().toISOString();

  const filePath = getWorkflowFilePath(workflowId);
  await atomicWrite(filePath, workflow);
  return true;
}

// Reorder workflow steps
async function reorderWorkflowSteps(workflowId, stepIds) {
  const workflow = await getWorkflowById(workflowId);
  if (!workflow) {
    throw new Error('Workflow not found');
  }

  // Verify all step IDs exist
  const existingIds = new Set(workflow.steps.map(s => s.id));
  for (const id of stepIds) {
    if (!existingIds.has(id)) {
      throw new Error('Invalid step ID in order');
    }
  }

  // Create new ordered steps array
  const stepsMap = new Map(workflow.steps.map(s => [s.id, s]));
  workflow.steps = stepIds.map((id, index) => {
    const step = stepsMap.get(id);
    step.order = index + 1;
    return step;
  });

  workflow.updatedAt = new Date().toISOString();

  const filePath = getWorkflowFilePath(workflowId);
  await atomicWrite(filePath, workflow);
  return workflow.steps;
}

module.exports = {
  createWorkflow,
  getWorkflowById,
  getWorkflowsByUserId,
  updateWorkflow,
  deleteWorkflow,
  addWorkflowStep,
  updateWorkflowStep,
  deleteWorkflowStep,
  reorderWorkflowSteps,
  // Category functions
  getWorkflowCategories,
  createWorkflowCategory,
  updateWorkflowCategory,
  deleteWorkflowCategory,
};
