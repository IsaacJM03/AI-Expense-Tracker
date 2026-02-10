const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const {
  exportExpenses, exportIncomes, exportAll,
  getCurrencies, convertCurrency,
  getSeasonalAnalysis,
  processReceipt,
  smartParse,
  smartCategorize,
  smartInsights,
  aiStatus,
} = require('../controllers/v1Controller');

const router = express.Router();

// Currency endpoints (public - no auth needed for rates)
router.get('/currencies', getCurrencies);
router.get('/currencies/convert', convertCurrency);

// AI status (public)
router.get('/ai/status', aiStatus);

// All below require authentication
router.use(authenticate);

// Data export
router.get('/export/expenses', exportExpenses);
router.get('/export/incomes', exportIncomes);
router.get('/export/all', exportAll);

// Seasonal analysis
router.get('/analytics/seasonal', getSeasonalAnalysis);

// OCR receipt processing
router.post('/ocr/receipt', [
  body('ocrText').notEmpty().withMessage('OCR text is required'),
  validate,
], processReceipt);

// LLM-powered endpoints
router.post('/ai/parse', [
  body('text').notEmpty().withMessage('Expense text is required'),
  validate,
], smartParse);

router.post('/ai/categorize', [
  body('description').notEmpty().withMessage('Description is required'),
  validate,
], smartCategorize);

router.get('/ai/insights', smartInsights);

module.exports = router;
