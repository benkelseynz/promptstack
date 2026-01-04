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

// Default profile structure
// NOTE: A future "Decision-Making Framework" section will be added as Section 7
// with industry-specific dynamic questions. The structure below accommodates
// adding new sections without breaking existing profiles.
function getDefaultProfile() {
  return {
    completed: false,
    completedAt: null,
    sectionsCompleted: [],

    // SECTION 1: Your Role & Responsibilities
    role: {
      title: '',
      company: '',
      companyDescription: '',
      industry: '',
      customIndustry: '',
      primaryResponsibilities: '',
      timeAllocation: '',
      keyStakeholders: ''
    },

    // SECTION 2: Communication Style
    communication: {
      phrasesToAvoid: '',
      formalityLevel: '',
      tonePreference: '',
      petPeeves: ''
    },

    // SECTION 3: Writing Style
    writingStyle: {
      emailStyle: '',
      reportStyle: '',
      generalNotes: ''
    },

    // SECTION 4: Working Style & Workflow
    workingStyle: {
      informationPreference: [],
      informationPreferenceNotes: '',
      analysisDepth: '',
      decisionMakingStyle: ''
    },

    // SECTION 5: Output Formatting
    formatting: {
      structurePreference: '',
      structurePreferenceNotes: '',
      preferTables: '',
      preferBullets: '',
      preferCharts: '',
      specificRequirements: ''
    },

    // SECTION 6: Personal Context
    personal: {
      background: '',
      frameworks: '',
      additionalContext: '',
      greatCollaboration: ''
    }
  };
}

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
    savedPrompts: [],
    profile: getDefaultProfile()
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

// Get user by Stripe customer ID
async function getUserByStripeCustomerId(stripeCustomerId) {
  try {
    const files = await listFiles(USERS_DIR);
    const userFiles = files.filter(f => f.endsWith('.json') && !f.startsWith('_'));

    for (const file of userFiles) {
      const filePath = path.join(USERS_DIR, file);
      const userData = await readJsonFile(filePath);
      if (userData && userData.stripeCustomerId === stripeCustomerId) {
        return userData;
      }
    }
    return null;
  } catch (error) {
    console.error('Error finding user by Stripe customer ID:', error);
    return null;
  }
}

// Get all users (for admin/search purposes)
async function getAllUsers() {
  try {
    const files = await listFiles(USERS_DIR);
    const userFiles = files.filter(f => f.endsWith('.json') && !f.startsWith('_'));

    const users = [];
    for (const file of userFiles) {
      const filePath = path.join(USERS_DIR, file);
      const userData = await readJsonFile(filePath);
      if (userData) {
        const { passwordHash, ...safeUser } = userData;
        users.push(safeUser);
      }
    }
    return users;
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
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

// Section names for validation
const PROFILE_SECTIONS = ['role', 'communication', 'writingStyle', 'workingStyle', 'formatting', 'personal'];

// Required fields for core sections (1-3) to consider profile "completed"
const CORE_SECTION_REQUIRED_FIELDS = {
  role: ['title', 'company', 'industry', 'primaryResponsibilities'],
  communication: ['formalityLevel'],
  writingStyle: ['emailStyle']
};

// Get user profile
async function getUserProfile(userId) {
  const userData = await getUserById(userId);

  if (!userData) {
    return null;
  }

  // Ensure profile exists (for existing users who don't have one)
  if (!userData.profile) {
    userData.profile = getDefaultProfile();
    const userFilePath = getUserFilePath(userId);
    await atomicWrite(userFilePath, userData);
  }

  return userData.profile;
}

// Update a specific profile section
async function updateUserProfile(userId, section, data) {
  if (!PROFILE_SECTIONS.includes(section)) {
    return { error: 'Invalid section' };
  }

  const userData = await getUserById(userId);

  if (!userData) {
    return { error: 'User not found' };
  }

  // Ensure profile exists
  if (!userData.profile) {
    userData.profile = getDefaultProfile();
  }

  // Update the specific section
  userData.profile[section] = {
    ...userData.profile[section],
    ...data
  };

  // Track completed sections
  if (!userData.profile.sectionsCompleted.includes(section)) {
    userData.profile.sectionsCompleted.push(section);
  }

  // Check if core sections (1-3) are complete
  const coreSectionsComplete = ['role', 'communication', 'writingStyle'].every(sec => {
    if (!userData.profile.sectionsCompleted.includes(sec)) return false;

    const requiredFields = CORE_SECTION_REQUIRED_FIELDS[sec] || [];
    return requiredFields.every(field => {
      const value = userData.profile[sec][field];
      return value && value.toString().trim().length > 0;
    });
  });

  if (coreSectionsComplete && !userData.profile.completed) {
    userData.profile.completed = true;
    userData.profile.completedAt = new Date().toISOString();
  }

  userData.updatedAt = new Date().toISOString();

  const userFilePath = getUserFilePath(userId);
  await atomicWrite(userFilePath, userData);

  return { profile: userData.profile };
}

// Get profile completion status
async function getProfileCompletionStatus(userId) {
  const userData = await getUserById(userId);

  if (!userData) {
    return null;
  }

  // Ensure profile exists
  if (!userData.profile) {
    return {
      completed: false,
      completedAt: null,
      sectionsCompleted: [],
      sections: PROFILE_SECTIONS.map(section => ({
        name: section,
        completed: false,
        isCore: ['role', 'communication', 'writingStyle'].includes(section)
      })),
      completionPercentage: 0
    };
  }

  const profile = userData.profile;

  // Calculate completion status for each section
  const sections = PROFILE_SECTIONS.map(section => {
    const isCore = ['role', 'communication', 'writingStyle'].includes(section);
    const isCompleted = profile.sectionsCompleted.includes(section);

    return {
      name: section,
      completed: isCompleted,
      isCore
    };
  });

  const completedCount = sections.filter(s => s.completed).length;
  const completionPercentage = Math.round((completedCount / PROFILE_SECTIONS.length) * 100);

  return {
    completed: profile.completed,
    completedAt: profile.completedAt,
    sectionsCompleted: profile.sectionsCompleted,
    sections,
    completionPercentage
  };
}

module.exports = {
  createUser,
  getUserById,
  getUserByEmail,
  getUserByStripeCustomerId,
  getAllUsers,
  updateUser,
  verifyPassword,
  markEmailVerified,
  getSafeUserData,
  addCustomPrompt,
  updateCustomPrompt,
  deleteCustomPrompt,
  getUserCustomPrompts,
  saveLibraryPrompt,
  removeSavedPrompt,
  getUserProfile,
  updateUserProfile,
  getProfileCompletionStatus,
  getDefaultProfile,
  PROFILE_SECTIONS
};
