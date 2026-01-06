const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../../data');
const USERS_DIR = path.join(DATA_DIR, 'users');
const INDUSTRIES_DIR = path.join(DATA_DIR, 'industries');
const TEAMS_DIR = path.join(DATA_DIR, 'teams');
const WORKFLOWS_DIR = path.join(DATA_DIR, 'workflows');

// Ensure directories exist
async function ensureDirectories() {
  const dirs = [DATA_DIR, USERS_DIR, INDUSTRIES_DIR, TEAMS_DIR, WORKFLOWS_DIR];
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }
}

// Safe filename validation - only allow UUIDs
function isValidUserId(id) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// Get safe file path for user data
function getUserFilePath(userId) {
  if (!isValidUserId(userId)) {
    throw new Error('Invalid user ID format');
  }
  return path.join(USERS_DIR, `${userId}.json`);
}

// Get safe file path for team data
function getTeamFilePath(teamId) {
  if (!isValidUserId(teamId)) { // Teams also use UUID format
    throw new Error('Invalid team ID format');
  }
  return path.join(TEAMS_DIR, `${teamId}.json`);
}

// Get path for team codes index
function getTeamCodesIndexPath() {
  return path.join(TEAMS_DIR, '_codes.json');
}

// Get safe file path for workflow data
function getWorkflowFilePath(workflowId) {
  if (!isValidUserId(workflowId)) { // Workflows also use UUID format
    throw new Error('Invalid workflow ID format');
  }
  return path.join(WORKFLOWS_DIR, `${workflowId}.json`);
}

// Atomic write - write to temp file then rename
async function atomicWrite(filePath, data) {
  const tempPath = `${filePath}.${crypto.randomBytes(8).toString('hex')}.tmp`;
  
  try {
    const jsonData = JSON.stringify(data, null, 2);
    await fs.writeFile(tempPath, jsonData, 'utf8');
    await fs.rename(tempPath, filePath);
  } catch (error) {
    // Clean up temp file if it exists
    try {
      await fs.unlink(tempPath);
    } catch (unlinkError) {
      // Ignore unlink errors
    }
    throw error;
  }
}

// Read JSON file safely
async function readJsonFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

// Check if file exists
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// List files in directory
async function listFiles(dirPath, extension = '.json') {
  try {
    const files = await fs.readdir(dirPath);
    return files.filter(f => f.endsWith(extension));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// Delete file safely
async function deleteFile(filePath) {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

module.exports = {
  DATA_DIR,
  USERS_DIR,
  INDUSTRIES_DIR,
  TEAMS_DIR,
  WORKFLOWS_DIR,
  ensureDirectories,
  isValidUserId,
  getUserFilePath,
  getTeamFilePath,
  getTeamCodesIndexPath,
  getWorkflowFilePath,
  atomicWrite,
  readJsonFile,
  fileExists,
  listFiles,
  deleteFile
};
