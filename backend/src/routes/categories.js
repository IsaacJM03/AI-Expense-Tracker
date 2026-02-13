const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');

const router = express.Router();

router.use(authenticate);

router.get('/', getCategories);

router.post('/', [
  body('name').notEmpty().withMessage('Category name is required'),
  body('icon').optional().isString(),
  body('color').optional().isString(),
  validate,
], createCategory);

router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

module.exports = router;
