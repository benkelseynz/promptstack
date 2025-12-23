const { extractPlaceholders, generatePreview, applyPremiumGating } = require('../src/services/searchIndex');
const { verifyToken, createVerificationToken } = require('../src/services/verificationTokens');

// Mock file storage for tests
jest.mock('../src/services/fileStorage', () => ({
  DATA_DIR: '/tmp/test-data',
  ensureDirectories: jest.fn(),
  atomicWrite: jest.fn(),
  readJsonFile: jest.fn()
}));

describe('Placeholder Parsing', () => {
  test('extracts single placeholder', () => {
    const content = 'Hello [Name], welcome!';
    const placeholders = extractPlaceholders(content);
    expect(placeholders).toEqual(['Name']);
  });

  test('extracts multiple placeholders', () => {
    const content = 'Dear [Name], your order [Order ID] from [Company Name] is ready.';
    const placeholders = extractPlaceholders(content);
    expect(placeholders).toEqual(['Name', 'Order ID', 'Company Name']);
  });

  test('handles duplicate placeholders', () => {
    const content = '[Name] said hello to [Name] again.';
    const placeholders = extractPlaceholders(content);
    expect(placeholders).toEqual(['Name']);
  });

  test('handles no placeholders', () => {
    const content = 'This is plain text with no placeholders.';
    const placeholders = extractPlaceholders(content);
    expect(placeholders).toEqual([]);
  });

  test('handles empty content', () => {
    const placeholders = extractPlaceholders('');
    expect(placeholders).toEqual([]);
  });

  test('handles complex placeholder names', () => {
    const content = '[Company Name] at [Street Address Line 1] in [City/Town]';
    const placeholders = extractPlaceholders(content);
    expect(placeholders).toEqual(['Company Name', 'Street Address Line 1', 'City/Town']);
  });
});

describe('Preview Generation', () => {
  test('returns full content if under limit', () => {
    const content = 'Short content';
    const preview = generatePreview(content, 150);
    expect(preview).toBe('Short content');
  });

  test('truncates and adds ellipsis for long content', () => {
    const content = 'This is a very long piece of content that exceeds the maximum length limit and should be truncated with an ellipsis at the end.';
    const preview = generatePreview(content, 50);
    expect(preview.length).toBeLessThanOrEqual(53); // 50 + '...'
    expect(preview.endsWith('...')).toBe(true);
  });

  test('handles exact length content', () => {
    const content = 'Exactly fifty characters long for this test here!';
    const preview = generatePreview(content, 50);
    expect(preview).toBe(content);
  });
});

describe('Premium Gating', () => {
  const freePrompt = {
    id: 'test-free',
    title: 'Free Prompt',
    content: 'This is the full content of a free prompt.',
    preview: 'This is the preview...',
    access: 'free',
    keywords: ['test']
  };

  const premiumPrompt = {
    id: 'test-premium',
    title: 'Premium Prompt',
    content: 'This is the full content of a premium prompt with secrets.',
    preview: 'This is the preview...',
    access: 'premium',
    keywords: ['test', 'premium']
  };

  test('returns full content for free prompts regardless of tier', () => {
    const result = applyPremiumGating(freePrompt, 'free');
    expect(result.content).toBe(freePrompt.content);
    expect(result.isLocked).toBe(false);
  });

  test('returns preview only for premium prompts with free tier', () => {
    const result = applyPremiumGating(premiumPrompt, 'free');
    expect(result.content).toBeUndefined();
    expect(result.preview).toBe(premiumPrompt.preview);
    expect(result.isLocked).toBe(true);
  });

  test('returns full content for premium prompts with paid tier', () => {
    const result = applyPremiumGating(premiumPrompt, 'professional');
    expect(result.content).toBe(premiumPrompt.content);
    expect(result.isLocked).toBe(false);
  });

  test('returns full content for premium prompts with enterprise tier', () => {
    const result = applyPremiumGating(premiumPrompt, 'enterprise');
    expect(result.content).toBe(premiumPrompt.content);
    expect(result.isLocked).toBe(false);
  });

  test('handles null prompt', () => {
    const result = applyPremiumGating(null, 'free');
    expect(result).toBeNull();
  });

  test('preserves metadata in gated response', () => {
    const result = applyPremiumGating(premiumPrompt, 'free');
    expect(result.id).toBe(premiumPrompt.id);
    expect(result.title).toBe(premiumPrompt.title);
    expect(result.keywords).toEqual(premiumPrompt.keywords);
    expect(result.access).toBe('premium');
  });
});

describe('Token Verification', () => {
  const { readJsonFile, atomicWrite } = require('../src/services/fileStorage');
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns invalid for non-existent token', async () => {
    readJsonFile.mockResolvedValue({});
    
    const result = await verifyToken('nonexistent-token');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid verification token');
  });

  test('returns invalid for expired token', async () => {
    const expiredDate = new Date(Date.now() - 1000).toISOString();
    const tokenHash = require('crypto').createHash('sha256').update('test-token').digest('hex');
    
    readJsonFile.mockResolvedValue({
      [tokenHash]: {
        userId: 'user-123',
        email: 'test@example.com',
        expiresAt: expiredDate
      }
    });
    
    const result = await verifyToken('test-token');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Verification token has expired');
  });

  test('returns valid and consumes token on success', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const tokenHash = require('crypto').createHash('sha256').update('valid-token').digest('hex');
    
    readJsonFile.mockResolvedValue({
      [tokenHash]: {
        userId: 'user-123',
        email: 'test@example.com',
        expiresAt: futureDate
      }
    });
    
    const result = await verifyToken('valid-token');
    expect(result.valid).toBe(true);
    expect(result.userId).toBe('user-123');
    expect(result.email).toBe('test@example.com');
    
    // Verify token was consumed (atomicWrite called without the token)
    expect(atomicWrite).toHaveBeenCalled();
  });
});

// Run tests
if (require.main === module) {
  console.log('Running tests...');
}
