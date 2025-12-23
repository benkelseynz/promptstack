require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./routes/auth');
const libraryRoutes = require('./routes/library');
const userRoutes = require('./routes/user');
const configRoutes = require('./routes/config');
const { globalRateLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const { initSearchIndex, watchForChanges } = require('./services/searchIndex');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));
app.use(globalRateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/user', userRoutes);
app.use('/api/config', configRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Initialise search index and start server
async function startServer() {
  try {
    await initSearchIndex();
    
    if (process.env.NODE_ENV === 'development') {
      watchForChanges();
    }
    
    app.listen(PORT, () => {
      console.log(`PromptStack API running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
