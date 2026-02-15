const { GoogleGenAI } = require('@google/genai');
const { AppError } = require('../middleware/errorHandler');

// Initialise Gemini client lazily
let aiClient = null;

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new AppError('Gemini API key not configured', 500);
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3-pro-preview';

const DEFAULT_CONFIG = {
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 4096,
};

/**
 * Generate text content (non-streaming).
 * Returns the full response text.
 */
async function generateContent({ prompt, systemInstruction, config = {}, model }) {
  const ai = getClient();
  const maxRetries = 3;
  const baseDelay = 1000;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: model || DEFAULT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction || undefined,
          ...DEFAULT_CONFIG,
          ...config,
        },
      });

      return response.text;
    } catch (error) {
      const status = error.status || error.code;

      // Don't retry client errors
      if (status === 400 || status === 403 || status === 404) {
        console.error(`Gemini API error (${status}):`, error.message);
        throw new AppError(
          status === 403 ? 'Gemini API key is invalid' :
          status === 404 ? 'Gemini model not found' :
          'Invalid request to Gemini API',
          status === 403 || status === 404 ? 500 : 400
        );
      }

      // Safety filter blocks
      if (error.message?.includes('SAFETY') || error.message?.includes('blocked')) {
        throw new AppError('Content was filtered by safety policies. Please rephrase your request.', 400);
      }

      // Retry on rate limits and server errors
      if ((status === 429 || status >= 500) && attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`Gemini API error ${status}. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Final attempt failed
      if (attempt === maxRetries - 1) {
        console.error('Gemini API failed after retries:', error.message);
        throw new AppError('AI generation failed. Please try again.', 502);
      }

      // Unknown error - retry
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Generate text content with streaming.
 * Returns an async iterable of text chunks.
 */
async function generateContentStream({ prompt, systemInstruction, config = {}, model }) {
  const ai = getClient();

  try {
    const response = await ai.models.generateContentStream({
      model: model || DEFAULT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || undefined,
        ...DEFAULT_CONFIG,
        ...config,
      },
    });

    return response;
  } catch (error) {
    const status = error.status || error.code;

    if (status === 403) {
      throw new AppError('Gemini API key is invalid', 500);
    }
    if (status === 404) {
      throw new AppError('Gemini model not found', 500);
    }
    if (error.message?.includes('SAFETY') || error.message?.includes('blocked')) {
      throw new AppError('Content was filtered by safety policies. Please rephrase your request.', 400);
    }

    console.error('Gemini streaming error:', error.message);
    throw new AppError('AI generation failed. Please try again.', 502);
  }
}

module.exports = { generateContent, generateContentStream };
