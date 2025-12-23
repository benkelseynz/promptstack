const rateLimit = require('express-rate-limit');

// Global rate limiter
const globalRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict rate limiter for auth endpoints
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5,
  message: {
    error: 'Too many authentication attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

// Even stricter limiter for signup to prevent abuse
const signupRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    error: 'Too many signup attempts. Please try again in an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for resend verification
const resendRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 2,
  message: {
    error: 'Please wait before requesting another verification email.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  globalRateLimiter,
  authRateLimiter,
  signupRateLimiter,
  resendRateLimiter
};
