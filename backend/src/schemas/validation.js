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

// Profile section parameter schema
const profileSectionParamSchema = z.object({
  section: z.enum(['role', 'communication', 'writingStyle', 'workingStyle', 'formatting', 'personal'], {
    errorMap: () => ({ message: 'Invalid profile section' })
  })
});

// Profile section schemas
const profileRoleSchema = z.object({
  title: z.string().max(200, 'Title must be less than 200 characters').optional().default(''),
  company: z.string().max(200, 'Company must be less than 200 characters').optional().default(''),
  companyDescription: z.string().max(2000, 'Company description must be less than 2000 characters').optional().default(''),
  industry: z.string().max(100, 'Industry must be less than 100 characters').optional().default(''),
  customIndustry: z.string().max(100, 'Custom industry must be less than 100 characters').optional().default(''),
  primaryResponsibilities: z.string().max(2000, 'Primary responsibilities must be less than 2000 characters').optional().default(''),
  timeAllocation: z.string().max(500, 'Time allocation must be less than 500 characters').optional().default(''),
  keyStakeholders: z.string().max(1000, 'Key stakeholders must be less than 1000 characters').optional().default('')
});

const profileCommunicationSchema = z.object({
  phrasesToAvoid: z.string().max(2000, 'Phrases to avoid must be less than 2000 characters').optional().default(''),
  formalityLevel: z.string().max(100, 'Formality level must be less than 100 characters').optional().default(''),
  tonePreference: z.string().max(1000, 'Tone preference must be less than 1000 characters').optional().default(''),
  petPeeves: z.string().max(1000, 'Pet peeves must be less than 1000 characters').optional().default('')
});

const profileWritingStyleSchema = z.object({
  emailStyle: z.string().max(2000, 'Email style must be less than 2000 characters').optional().default(''),
  reportStyle: z.string().max(2000, 'Report style must be less than 2000 characters').optional().default(''),
  generalNotes: z.string().max(1000, 'General notes must be less than 1000 characters').optional().default('')
});

const profileWorkingStyleSchema = z.object({
  informationPreference: z.array(z.string().max(100)).max(10).optional().default([]),
  informationPreferenceNotes: z.string().max(1000, 'Notes must be less than 1000 characters').optional().default(''),
  analysisDepth: z.string().max(100, 'Analysis depth must be less than 100 characters').optional().default(''),
  decisionMakingStyle: z.string().max(1000, 'Decision making style must be less than 1000 characters').optional().default('')
});

const profileFormattingSchema = z.object({
  structurePreference: z.string().max(200, 'Structure preference must be less than 200 characters').optional().default(''),
  structurePreferenceNotes: z.string().max(1000, 'Notes must be less than 1000 characters').optional().default(''),
  preferTables: z.string().max(20).optional().default(''),
  preferBullets: z.string().max(20).optional().default(''),
  preferCharts: z.string().max(20).optional().default(''),
  specificRequirements: z.string().max(2000, 'Specific requirements must be less than 2000 characters').optional().default('')
});

const profilePersonalSchema = z.object({
  background: z.string().max(2000, 'Background must be less than 2000 characters').optional().default(''),
  frameworks: z.string().max(2000, 'Frameworks must be less than 2000 characters').optional().default(''),
  additionalContext: z.string().max(2000, 'Additional context must be less than 2000 characters').optional().default(''),
  greatCollaboration: z.string().max(2000, 'Great collaboration must be less than 2000 characters').optional().default('')
});

// Map section names to their schemas
const profileSectionSchemas = {
  role: profileRoleSchema,
  communication: profileCommunicationSchema,
  writingStyle: profileWritingStyleSchema,
  workingStyle: profileWorkingStyleSchema,
  formatting: profileFormattingSchema,
  personal: profilePersonalSchema
};

// Validate profile section middleware
const validateProfileSection = (req, res, next) => {
  try {
    const { section } = req.params;
    const schema = profileSectionSchemas[section];

    if (!schema) {
      return res.status(400).json({ error: 'Invalid profile section' });
    }

    const validated = schema.parse(req.body);
    req.body = validated;
    next();
  } catch (error) {
    next(error);
  }
};

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
  profileSectionParamSchema,
  profileSectionSchemas,
  validateProfileSection,
  validate
};
