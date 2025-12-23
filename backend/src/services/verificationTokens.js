const crypto = require('crypto');
const path = require('path');
const {
  DATA_DIR,
  atomicWrite,
  readJsonFile,
  ensureDirectories
} = require('./fileStorage');

const TOKENS_FILE = path.join(DATA_DIR, '_verification_tokens.json');
const TOKEN_EXPIRY_HOURS = 24;

// Generate cryptographically secure token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Hash token for storage
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Load tokens store
async function loadTokens() {
  await ensureDirectories();
  const tokens = await readJsonFile(TOKENS_FILE);
  return tokens || {};
}

// Save tokens store
async function saveTokens(tokens) {
  await atomicWrite(TOKENS_FILE, tokens);
}

// Create verification token
async function createVerificationToken(userId, email) {
  const token = generateToken();
  const hashedToken = hashToken(token);
  
  const tokens = await loadTokens();
  
  // Remove any existing tokens for this user
  for (const key of Object.keys(tokens)) {
    if (tokens[key].userId === userId) {
      delete tokens[key];
    }
  }
  
  // Add new token
  tokens[hashedToken] = {
    userId,
    email,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()
  };
  
  await saveTokens(tokens);
  
  // Return unhashed token to send in email
  return token;
}

// Verify and consume token
async function verifyToken(token) {
  const hashedToken = hashToken(token);
  const tokens = await loadTokens();
  
  const tokenData = tokens[hashedToken];
  
  if (!tokenData) {
    return { valid: false, error: 'Invalid verification token' };
  }
  
  // Check expiry
  if (new Date(tokenData.expiresAt) < new Date()) {
    // Remove expired token
    delete tokens[hashedToken];
    await saveTokens(tokens);
    return { valid: false, error: 'Verification token has expired' };
  }
  
  // Token is valid - consume it (one-time use)
  const { userId, email } = tokenData;
  delete tokens[hashedToken];
  await saveTokens(tokens);
  
  return { valid: true, userId, email };
}

// Clean up expired tokens
async function cleanupExpiredTokens() {
  const tokens = await loadTokens();
  const now = new Date();
  let changed = false;
  
  for (const key of Object.keys(tokens)) {
    if (new Date(tokens[key].expiresAt) < now) {
      delete tokens[key];
      changed = true;
    }
  }
  
  if (changed) {
    await saveTokens(tokens);
  }
}

// Check if user has pending verification
async function hasPendingVerification(userId) {
  const tokens = await loadTokens();
  
  for (const tokenData of Object.values(tokens)) {
    if (tokenData.userId === userId && new Date(tokenData.expiresAt) > new Date()) {
      return true;
    }
  }
  
  return false;
}

module.exports = {
  createVerificationToken,
  verifyToken,
  cleanupExpiredTokens,
  hasPendingVerification
};
