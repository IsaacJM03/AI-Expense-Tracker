const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { createIncome, getIncomes, getIncome, updateIncome, deleteIncome } = require('../controllers/incomeController');

const router = express.Router();

router.use(authenticate);

router.post('/', [
  body('amount').isNumeric().withMessage('Amount is required'),
  body('sourceName').notEmpty().withMessage('Source name is required'),
  body('incomeDate').optional().isISO8601(),
  validate,
], createIncome);

router.get('/', getIncomes);
router.get('/:id', getIncome);
router.put('/:id', updateIncome);
router.delete('/:id', deleteIncome);

module.exports = router;
