const { ZodError } = require('zod');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid authentication token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Authentication token has expired'
    });
  }

  // Operational errors
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.message
    });
  }

  // Unknown errors
  console.error('Unexpected error:', err);
  return res.status(500).json({
    error: 'An unexpected error occurred. Please try again later.'
  });
};

module.exports = {
  AppError,
  errorHandler
};
