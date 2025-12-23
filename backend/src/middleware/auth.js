const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');
const { getUserById } = require('../services/userStorage');

const authenticate = async (req, res, next) => {
  try {
    // Get token from cookie or Authorization header
    let token = req.cookies?.token;
    
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from storage
    const user = await getUserById(decoded.userId);
    
    if (!user) {
      throw new AppError('User not found', 401);
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      tier: user.tier || 'free',
      createdAt: user.createdAt
    };

    next();
  } catch (error) {
    if (error.isOperational) {
      return next(error);
    }
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(error);
    }
    next(new AppError('Authentication failed', 401));
  }
};

// Optional auth - doesn't fail if no token, just doesn't set user
const optionalAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.token;
    
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await getUserById(decoded.userId);
      
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          tier: user.tier || 'free',
          createdAt: user.createdAt
        };
      }
    }

    next();
  } catch (error) {
    // Silently continue without auth
    next();
  }
};

// Require email verification
const requireVerified = (req, res, next) => {
  if (!req.user?.emailVerified) {
    return next(new AppError('Email verification required', 403));
  }
  next();
};

module.exports = {
  authenticate,
  optionalAuth,
  requireVerified
};
