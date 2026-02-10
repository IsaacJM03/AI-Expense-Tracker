const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const {
  createExpense, quickEntry, getExpenses, getExpense,
  updateExpense, deleteExpense, getSummary,
} = require('../controllers/expenseController');

const router = express.Router();

router.use(authenticate);

router.post('/', [
  body('amount').isNumeric().withMessage('Amount is required and must be numeric'),
  body('description').optional().isString(),
  body('merchant').optional().isString(),
  body('expenseDate').optional().isISO8601(),
  validate,
], createExpense);

router.post('/quick', [
  body('text').notEmpty().withMessage('Text input is required'),
  validate,
], quickEntry);

router.get('/', getExpenses);
router.get('/summary', getSummary);
router.get('/:id', getExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

module.exports = router;
