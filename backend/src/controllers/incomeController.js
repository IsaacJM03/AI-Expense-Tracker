const Income = require('../models/Income');

async function createIncome(req, res, next) {
  try {
    const { amount, sourceName, description, incomeDate, isRecurring, recurrenceInterval } = req.body;
    const income = await Income.create({
      userId: req.user.id,
      amount,
      sourceName,
      description,
      incomeDate,
      isRecurring,
      recurrenceInterval,
    });
    res.status(201).json({ income });
  } catch (err) {
    next(err);
  }
}

async function getIncomes(req, res, next) {
  try {
    const { limit, offset } = req.query;
    const incomes = await Income.findByUser(req.user.id, {
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
    });
    res.json({ incomes, count: incomes.length });
  } catch (err) {
    next(err);
  }
}

async function getIncome(req, res, next) {
  try {
    const income = await Income.findById(req.params.id, req.user.id);
    if (!income) {
      return res.status(404).json({ error: 'Income not found' });
    }
    res.json({ income });
  } catch (err) {
    next(err);
  }
}

async function updateIncome(req, res, next) {
  try {
    const income = await Income.update(req.params.id, req.user.id, req.body);
    if (!income) {
      return res.status(404).json({ error: 'Income not found' });
    }
    res.json({ income });
  } catch (err) {
    next(err);
  }
}

async function deleteIncome(req, res, next) {
  try {
    const deleted = await Income.delete(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Income not found' });
    }
    res.json({ message: 'Income deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createIncome, getIncomes, getIncome, updateIncome, deleteIncome };
