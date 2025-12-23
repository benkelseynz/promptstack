const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const path = require('path');
const {
  USERS_DIR,
  ensureDirectories,
  getUserFilePath,
  atomicWrite,
  readJsonFile,
  fileExists,
  listFiles
} = require('./fileStorage');

const BCRYPT_ROUNDS = 12;

// Email to ID mapping file
const EMAIL_INDEX_PATH = path.join(USERS_DIR, '_email_index.json');

// Load email index
async function loadEmailIndex() {
  const index = await readJsonFile(EMAIL_INDEX_PATH);
  return index || {};
}

// Save email index
async function saveEmailIndex(index) {
  await atomicWrite(EMAIL_INDEX_PATH, index);
}

// Create new user
async function createUser({ email, password, name }) {
  await ensureDirectories();
  
  // Check if email already exists
  const emailIndex = await loadEmailIndex();
  if (emailIndex[email]) {
    return { error: 'Email already registered' };
  }

  const userId = uuidv4();
  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
  
  const userData = {
    id: userId,
    email,
    name,
    passwordHash: hashedPassword,
    emailVerified: false,
    tier: 'free',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    customPrompts: [],
    savedPrompts: []
  };

  // Save user file
  const userFilePath = getUserFilePath(userId);
  await atomicWrite(userFilePath, userData);

  // Update email index
  emailIndex[email] = userId;
  await saveEmailIndex(emailIndex);

  // Return user without sensitive data
  const { passwordHash, ...safeUser } = userData;
  return { user: safeUser };
}

// Get user by ID
async function getUserById(userId) {
  const userFilePath = getUserFilePath(userId);
  const userData = await readJsonFile(userFilePath);
  return userData;
}

// Get user by email
async function getUserByEmail(email) {
  const emailIndex = await loadEmailIndex();
  const userId = emailIndex[email.toLowerCase()];
  
  if (!userId) {
    return null;
  }

  return getUserById(userId);
}

// Update user
async function updateUser(userId, updates) {
  const userData = await getUserById(userId);
  
  if (!userData) {
    return null;
  }

  const updatedUser = {
    ...userData,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  const userFilePath = getUserFilePath(userId);
  await atomicWrite(userFilePath, updatedUser);

  const { passwordHash, ...safeUser } = updatedUser;
  return safeUser;
}

// Verify password
async function verifyPassword(user, password) {
  return bcrypt.compare(password, user.passwordHash);
}

// Mark email as verified
async function markEmailVerified(userId) {
  return updateUser(userId, { emailVerified: true });
}

// Get safe user data (without password)
function getSafeUserData(userData) {
  if (!userData) return null;
  const { passwordHash, ...safeUser } = userData;
  return safeUser;
}

// Add custom prompt
async function addCustomPrompt(userId, promptData) {
  const userData = await getUserById(userId);
  
  if (!userData) {
    return null;
  }

  const newPrompt = {
    id: uuidv4(),
    ...promptData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  userData.customPrompts = userData.customPrompts || [];
  userData.customPrompts.push(newPrompt);

  const userFilePath = getUserFilePath(userId);
  await atomicWrite(userFilePath, userData);

  return newPrompt;
}

// Update custom prompt
async function updateCustomPrompt(userId, promptId, updates) {
  const userData = await getUserById(userId);
  
  if (!userData) {
    return null;
  }

  const promptIndex = userData.customPrompts?.findIndex(p => p.id === promptId);
  
  if (promptIndex === -1 || promptIndex === undefined) {
    return null;
  }

  userData.customPrompts[promptIndex] = {
    ...userData.customPrompts[promptIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  const userFilePath = getUserFilePath(userId);
  await atomicWrite(userFilePath, userData);

  return userData.customPrompts[promptIndex];
}

// Delete custom prompt
async function deleteCustomPrompt(userId, promptId) {
  const userData = await getUserById(userId);
  
  if (!userData) {
    return false;
  }

  const promptIndex = userData.customPrompts?.findIndex(p => p.id === promptId);
  
  if (promptIndex === -1 || promptIndex === undefined) {
    return false;
  }

  userData.customPrompts.splice(promptIndex, 1);

  const userFilePath = getUserFilePath(userId);
  await atomicWrite(userFilePath, userData);

  return true;
}

// Get user custom prompts
async function getUserCustomPrompts(userId) {
  const userData = await getUserById(userId);
  return userData?.customPrompts || [];
}

// Save library prompt reference
async function saveLibraryPrompt(userId, promptId) {
  const userData = await getUserById(userId);
  
  if (!userData) {
    return null;
  }

  userData.savedPrompts = userData.savedPrompts || [];
  
  if (!userData.savedPrompts.includes(promptId)) {
    userData.savedPrompts.push(promptId);
    
    const userFilePath = getUserFilePath(userId);
    await atomicWrite(userFilePath, userData);
  }

  return userData.savedPrompts;
}

// Remove saved library prompt
async function removeSavedPrompt(userId, promptId) {
  const userData = await getUserById(userId);
  
  if (!userData) {
    return null;
  }

  userData.savedPrompts = userData.savedPrompts || [];
  userData.savedPrompts = userData.savedPrompts.filter(id => id !== promptId);

  const userFilePath = getUserFilePath(userId);
  await atomicWrite(userFilePath, userData);

  return userData.savedPrompts;
}

module.exports = {
  createUser,
  getUserById,
  getUserByEmail,
  updateUser,
  verifyPassword,
  markEmailVerified,
  getSafeUserData,
  addCustomPrompt,
  updateCustomPrompt,
  deleteCustomPrompt,
  getUserCustomPrompts,
  saveLibraryPrompt,
  removeSavedPrompt
};
