const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const {
  createUser,
  getUserByEmail,
  verifyPassword,
  markEmailVerified,
  getSafeUserData,
  getProfileCompletionStatus
} = require('../services/userStorage');
const { 
  createVerificationToken, 
  verifyToken 
} = require('../services/verificationTokens');
const { sendVerificationEmail, sendWelcomeEmail } = require('../services/email');
const { authenticate } = require('../middleware/auth');
const { authRateLimiter, signupRateLimiter, resendRateLimiter } = require('../middleware/rateLimiter');
const { 
  validate, 
  signupSchema, 
  loginSchema, 
  resendVerificationSchema 
} = require('../schemas/validation');
const { AppError } = require('../middleware/errorHandler');

// Generate JWT token
function generateToken(userId) {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// Set auth cookie
function setAuthCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

// POST /api/auth/signup
router.post('/signup', signupRateLimiter, validate(signupSchema), async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    
    const result = await createUser({ email, password, name });
    
    if (result.error) {
      throw new AppError(result.error, 400);
    }
    
    const { user } = result;
    
    // Create verification token
    const verificationToken = await createVerificationToken(user.id, email);
    
    // Send verification email
    const emailResult = await sendVerificationEmail(email, name, verificationToken);
    
    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
    }
    
    // Generate JWT
    const token = generateToken(user.id);
    setAuthCookie(res, token);
    
    res.status(201).json({
      message: 'Account created successfully. Please check your email to verify your account.',
      user: getSafeUserData(user),
      token
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', authRateLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    const user = await getUserByEmail(email);
    
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }
    
    const isValidPassword = await verifyPassword(user, password);
    
    if (!isValidPassword) {
      throw new AppError('Invalid email or password', 401);
    }
    
    const token = generateToken(user.id);
    setAuthCookie(res, token);
    
    res.json({
      message: 'Logged in successfully',
      user: getSafeUserData(user),
      token
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/verify
router.get('/verify', async (req, res, next) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      throw new AppError('Verification token is required', 400);
    }
    
    const result = await verifyToken(token);
    
    if (!result.valid) {
      throw new AppError(result.error, 400);
    }
    
    // Mark user as verified
    const user = await markEmailVerified(result.userId);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Send welcome email
    await sendWelcomeEmail(user.email, user.name);
    
    res.json({
      message: 'Email verified successfully',
      user: getSafeUserData(user)
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', resendRateLimiter, validate(resendVerificationSchema), async (req, res, next) => {
  try {
    const { email } = req.body;
    
    const user = await getUserByEmail(email);
    
    if (!user) {
      // Do not reveal whether email exists
      return res.json({
        message: 'If an account exists with this email, a verification link has been sent.'
      });
    }
    
    if (user.emailVerified) {
      return res.json({
        message: 'Email is already verified.'
      });
    }
    
    // Create new verification token
    const verificationToken = await createVerificationToken(user.id, email);
    
    // Send verification email
    await sendVerificationEmail(email, user.name, verificationToken);
    
    res.json({
      message: 'If an account exists with this email, a verification link has been sent.'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const profileStatus = await getProfileCompletionStatus(req.user.id);

    res.json({
      user: req.user,
      profileStatus: profileStatus || {
        completed: false,
        completedAt: null,
        sectionsCompleted: [],
        sections: [],
        completionPercentage: 0
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
