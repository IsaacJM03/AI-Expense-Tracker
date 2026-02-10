const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { createBudget, getBudgets, getActiveBudgets, updateBudget, deleteBudget } = require('../controllers/budgetController');

const router = express.Router();

router.use(authenticate);

router.post('/', [
  body('amount').isNumeric().withMessage('Budget amount is required'),
  body('startDate').isISO8601().withMessage('Start date is required'),
  body('period').optional().isIn(['weekly', 'monthly', 'quarterly', 'yearly']),
  validate,
], createBudget);

router.get('/', getBudgets);
router.get('/active', getActiveBudgets);
router.put('/:id', updateBudget);
router.delete('/:id', deleteBudget);

module.exports = router;
