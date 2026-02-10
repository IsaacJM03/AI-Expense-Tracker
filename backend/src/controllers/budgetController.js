const Budget = require('../models/Budget');

async function createBudget(req, res, next) {
  try {
    const { categoryId, amount, period, startDate, endDate, isAdaptive } = req.body;
    const budget = await Budget.create({
      userId: req.user.id,
      categoryId,
      amount,
      period,
      startDate,
      endDate,
      isAdaptive,
    });
    res.status(201).json({ budget });
  } catch (err) {
    next(err);
  }
}

async function getBudgets(req, res, next) {
  try {
    const budgets = await Budget.findByUser(req.user.id);
    res.json({ budgets });
  } catch (err) {
    next(err);
  }
}

async function getActiveBudgets(req, res, next) {
  try {
    const budgets = await Budget.getActiveForUser(req.user.id);
    res.json({ budgets });
  } catch (err) {
    next(err);
  }
}

async function updateBudget(req, res, next) {
  try {
    const budget = await Budget.update(req.params.id, req.user.id, req.body);
    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    res.json({ budget });
  } catch (err) {
    next(err);
  }
}

async function deleteBudget(req, res, next) {
  try {
    const deleted = await Budget.delete(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    res.json({ message: 'Budget deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createBudget, getBudgets, getActiveBudgets, updateBudget, deleteBudget };
