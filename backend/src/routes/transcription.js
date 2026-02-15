const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const OpenAI = require('openai');
const { authenticate } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

// Configuration
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB - OpenAI limit
const TARGET_AUDIO_BITRATE = '128k';
const SUPPORTED_FORMATS = ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm'];
const TRANSCRIPTION_MODEL = 'gpt-4o-transcribe';

// Ensure temp directory exists
const TEMP_DIR = path.join(__dirname, '../../temp/audio');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `${uniqueId}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept audio files
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  const mimeOk = file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/');
  const extOk = SUPPORTED_FORMATS.includes(ext) || ext === '';

  if (mimeOk || extOk) {
    cb(null, true);
  } else {
    cb(new AppError(`Unsupported file format. Supported formats: ${SUPPORTED_FORMATS.join(', ')}`, 400), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

// Initialise OpenAI client
const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new AppError('OpenAI API key not configured', 500);
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
};

// Helper to clean up temp file
const cleanupFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('Failed to cleanup temp file:', err);
  }
};

// Helper to get file size in MB
const getFileSizeMB = (filePath) => {
  const stats = fs.statSync(filePath);
  return stats.size / (1024 * 1024);
};

// Transcribe audio file using OpenAI
const transcribeAudio = async (filePath, prompt = '') => {
  const openai = getOpenAIClient();

  const fileSize = getFileSizeMB(filePath);
  console.log(`Transcribing audio file: ${path.basename(filePath)} (${fileSize.toFixed(2)} MB)`);

  // For files under 25MB, transcribe directly
  if (fileSize <= 25) {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: TRANSCRIPTION_MODEL,
      response_format: 'text',
      prompt: prompt || 'The following is a recording from a New Zealand professional describing what they need help with. Transcribe accurately, preserving the natural flow of speech.'
    });

    return transcription;
  }

  // For larger files, we would need to chunk - but this is unlikely for voice recordings
  // The user mentioned recordings should be under 14 mins, which is well under 25MB
  // If needed, implement chunking here using ffmpeg or similar
  throw new AppError('Audio file too large. Please record in shorter segments (under 14 minutes).', 400);
};

// POST /api/transcription/upload
// Upload and transcribe audio file
router.post('/upload', authenticate, upload.single('audio'), async (req, res, next) => {
  let filePath = null;

  try {
    if (!req.file) {
      throw new AppError('No audio file provided', 400);
    }

    filePath = req.file.path;
    const fileId = path.basename(filePath, path.extname(filePath));

    console.log(`Processing audio upload from user ${req.user.id}: ${fileId}`);

    // Transcribe the audio
    const transcription = await transcribeAudio(filePath);

    // Clean up the temp file immediately after transcription
    cleanupFile(filePath);
    filePath = null;

    res.json({
      success: true,
      fileId,
      transcription: transcription,
      message: 'Audio transcribed successfully'
    });

  } catch (error) {
    // Clean up on error
    if (filePath) {
      cleanupFile(filePath);
    }

    // Handle multer errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`, 400));
    }

    // Handle OpenAI errors
    if (error.status === 400 || error.code === 'invalid_api_key') {
      return next(new AppError('Transcription failed. Please try again.', 400));
    }

    next(error);
  }
});

// POST /api/transcription/append
// Upload additional audio and append to existing transcription
router.post('/append', authenticate, upload.single('audio'), async (req, res, next) => {
  let filePath = null;

  try {
    if (!req.file) {
      throw new AppError('No audio file provided', 400);
    }

    const { existingTranscription } = req.body;

    filePath = req.file.path;
    const fileId = path.basename(filePath, path.extname(filePath));

    console.log(`Processing audio append from user ${req.user.id}: ${fileId}`);

    // Use the end of the existing transcription as context for better continuity
    const contextPrompt = existingTranscription
      ? `Previous transcription context: "${existingTranscription.slice(-200)}". Continue transcribing the following audio naturally.`
      : '';

    // Transcribe the new audio
    const newTranscription = await transcribeAudio(filePath, contextPrompt);

    // Clean up the temp file
    cleanupFile(filePath);
    filePath = null;

    // Combine transcriptions - continue naturally from existing text
    let combinedTranscription = newTranscription;
    if (existingTranscription) {
      const trimmedExisting = existingTranscription.trimEnd();
      const endsWithPunctuation = /[.!?]$/.test(trimmedExisting);
      combinedTranscription = endsWithPunctuation
        ? `${trimmedExisting} ${newTranscription}`
        : `${trimmedExisting}. ${newTranscription}`;
    }

    res.json({
      success: true,
      fileId,
      transcription: combinedTranscription,
      newSegment: newTranscription,
      message: 'Audio appended successfully'
    });

  } catch (error) {
    if (filePath) {
      cleanupFile(filePath);
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`, 400));
    }

    next(error);
  }
});

// Cleanup old temp files periodically (files older than 1 hour)
const cleanupOldTempFiles = () => {
  try {
    if (!fs.existsSync(TEMP_DIR)) return;

    const files = fs.readdirSync(TEMP_DIR);
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    files.forEach(file => {
      const filePath = path.join(TEMP_DIR, file);
      const stats = fs.statSync(filePath);

      if (stats.mtimeMs < oneHourAgo) {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up old temp file: ${file}`);
      }
    });
  } catch (err) {
    console.error('Error cleaning up temp files:', err);
  }
};

// Run cleanup every 30 minutes
setInterval(cleanupOldTempFiles, 30 * 60 * 1000);

// Run initial cleanup on startup
cleanupOldTempFiles();

module.exports = router;
