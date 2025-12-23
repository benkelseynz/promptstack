const { z } = require('zod');

// Auth schemas
const signupSchema = z.object({
  email: z.string()
    .email('Please provide a valid email address')
    .max(255, 'Email must be less than 255 characters')
    .transform(val => val.toLowerCase().trim()),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim()
});

const loginSchema = z.object({
  email: z.string()
    .email('Please provide a valid email address')
    .transform(val => val.toLowerCase().trim()),
  password: z.string()
    .min(1, 'Password is required')
});

const resendVerificationSchema = z.object({
  email: z.string()
    .email('Please provide a valid email address')
    .transform(val => val.toLowerCase().trim())
});

// User prompt schemas
const createPromptSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim(),
  content: z.string()
    .min(1, 'Content is required')
    .max(10000, 'Content must be less than 10000 characters'),
  keywords: z.array(z.string().max(50)).max(20).optional().default([]),
  industry: z.string().max(100).optional().default('general'),
  role: z.string().max(100).optional().default('General')
});

const updatePromptSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim()
    .optional(),
  content: z.string()
    .min(1, 'Content is required')
    .max(10000, 'Content must be less than 10000 characters')
    .optional(),
  keywords: z.array(z.string().max(50)).max(20).optional(),
  industry: z.string().max(100).optional(),
  role: z.string().max(100).optional()
});

// Search/filter schemas
const searchQuerySchema = z.object({
  q: z.string().max(200).optional(),
  industry: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  role: z.string().max(100).optional(),
  access: z.enum(['free', 'premium', 'all']).optional().default('all'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20)
});

// ID parameter schema
const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format')
});

// Validate middleware factory
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const dataSource = source === 'body' ? req.body : 
                        source === 'query' ? req.query : 
                        req.params;
      
      const validated = schema.parse(dataSource);
      
      if (source === 'body') req.body = validated;
      else if (source === 'query') req.validatedQuery = validated;
      else req.validatedParams = validated;
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  signupSchema,
  loginSchema,
  resendVerificationSchema,
  createPromptSchema,
  updatePromptSchema,
  searchQuerySchema,
  idParamSchema,
  validate
};
