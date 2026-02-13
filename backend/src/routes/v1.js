const express = require('express');
const { body } = require('express-validator');
const multer = require('multer');
const path = require('path');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const {
  exportExpenses, exportIncomes, exportAll,
  getCurrencies, convertCurrency,
  getSeasonalAnalysis,
  processReceipt,
  processReceiptImage,
  smartParse,
  smartCategorize,
  smartInsights,
  aiStatus,
  chatWithLLM,
} = require('../controllers/v1Controller');

const router = express.Router();

// Configure multer for receipt image uploads
const uploadsDir = path.join(__dirname, '../../uploads');
if (!require('fs').existsSync(uploadsDir)) {
  require('fs').mkdirSync(uploadsDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `receipt-${req.user?.id || 'anon'}-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|heic|heif|webp|gif|pdf/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext || mime) return cb(null, true);
    cb(new Error('Only image files (JPEG, PNG, HEIC, WebP) and PDFs are allowed'));
  },
});

// Currency endpoints (public - no auth needed for rates)
router.get('/currencies', getCurrencies);
router.get('/currencies/convert', convertCurrency);

// AI status (public)
router.get('/ai/status', aiStatus);

// AI status (public)
router.get('/ai/status', aiStatus);

// All below require authentication
router.use(authenticate);

// Assistant permission management
const { getAssistantPermission, grantAssistantPermission, revokeAssistantPermission } = require('../controllers/v1Controller');
router.get('/ai/permission', getAssistantPermission);
router.post('/ai/permission/grant', grantAssistantPermission);
router.post('/ai/permission/revoke', revokeAssistantPermission);

// Chat endpoint for interactive assistant (requires auth)
router.post('/ai/chat', chatWithLLM);

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

// OCR receipt image upload
router.post('/ocr/receipt/upload', upload.single('receipt'), processReceiptImage);

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
