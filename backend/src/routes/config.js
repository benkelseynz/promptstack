const express = require('express');
const path = require('path');
const router = express.Router();

const { readJsonFile } = require('../services/fileStorage');
const { AppError } = require('../middleware/errorHandler');

const CONFIG_DIR = path.join(__dirname, '../../config');

// GET /api/config/pricing
router.get('/pricing', async (req, res, next) => {
  try {
    const pricingPath = path.join(CONFIG_DIR, 'pricing.json');
    const pricing = await readJsonFile(pricingPath);
    
    if (!pricing) {
      throw new AppError('Pricing configuration not found', 500);
    }
    
    res.json(pricing);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
