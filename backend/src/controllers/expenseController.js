const Expense = require('../models/Expense');
const Category = require('../models/Category');
const { parseExpenseText } = require('../services/ai/expenseParser');
const { categorizeExpense } = require('../services/ai/categorization');

async function createExpense(req, res, next) {
  try {
    const { amount, description, merchant, categoryId, expenseDate, paymentMethod, isRecurring, source } = req.body;

    // If categoryId not provided, auto-categorize
    let resolvedCategoryId = categoryId;
    let confidence = 1.0;

    if (!resolvedCategoryId && (description || merchant)) {
      const result = await categorizeExpense(req.user.id, description, merchant);
      // Find category by name
      const categories = await Category.findByUser(req.user.id);
      const matched = categories.find(c => c.name === result.category);
      if (matched) {
        resolvedCategoryId = matched.id;
        confidence = result.confidence;
      }
    }

    const expense = await Expense.create({
      userId: req.user.id,
      categoryId: resolvedCategoryId,
      amount,
      description,
      merchant,
      expenseDate: expenseDate || new Date(),
      paymentMethod,
      isRecurring,
      confidenceScore: confidence,
      source: source || 'manual',
    });

    res.status(201).json({ expense });
  } catch (err) {
    next(err);
  }
}

async function quickEntry(req, res, next) {
  try {
    const { text } = req.body;
    const parsed = parseExpenseText(text);

    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error, parsed });
    }

    // Find matching category
    const categories = await Category.findByUser(req.user.id);
    const matched = categories.find(c => c.name === parsed.data.category);

    const expense = await Expense.create({
      userId: req.user.id,
      categoryId: matched?.id || null,
      amount: parsed.data.amount,
      description: parsed.data.description,
      expenseDate: new Date(),
      confidenceScore: parsed.data.confidence,
      source: 'quick_entry',
    });

    // Store raw input
    await Expense.createRawInput({
      expenseId: expense.id,
      rawText: text,
      inputType: 'text',
      parsedData: parsed.data,
    });

    res.status(201).json({ expense, parsed: parsed.data });
  } catch (err) {
    next(err);
  }
}

async function getExpenses(req, res, next) {
  try {
    const { limit, offset, startDate, endDate, categoryId } = req.query;
    const expenses = await Expense.findByUser(req.user.id, {
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
      startDate,
      endDate,
      categoryId,
    });
    res.json({ expenses, count: expenses.length });
  } catch (err) {
    next(err);
  }
}

async function getExpense(req, res, next) {
  try {
    const expense = await Expense.findById(req.params.id, req.user.id);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ expense });
  } catch (err) {
    next(err);
  }
}

async function updateExpense(req, res, next) {
  try {
    const expense = await Expense.update(req.params.id, req.user.id, req.body);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ expense });
  } catch (err) {
    next(err);
  }
}

async function deleteExpense(req, res, next) {
  try {
    const deleted = await Expense.delete(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    next(err);
  }
}

async function getSummary(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = endDate || now.toISOString().split('T')[0];

    const summary = await Expense.getSummary(req.user.id, start, end);
    const monthlyTotals = await Expense.getMonthlyTotals(req.user.id);
    res.json({ summary, monthlyTotals });
  } catch (err) {
    next(err);
  }
}

module.exports = { createExpense, quickEntry, getExpenses, getExpense, updateExpense, deleteExpense, getSummary };
