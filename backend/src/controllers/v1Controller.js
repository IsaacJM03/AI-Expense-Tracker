const { exportExpensesCSV, exportIncomesCSV, exportFullReport } = require('../services/dataExport');
const { getSupportedCurrencies, convert } = require('../services/currency');
const { getFullSeasonalAnalysis } = require('../services/ai/seasonalAnalysis');
const { parseReceiptText } = require('../services/ai/ocrParser');
const Expense = require('../models/Expense');
const Category = require('../models/Category');
const { categorizeExpense } = require('../services/ai/categorization');

// Data Export
async function exportExpenses(req, res, next) {
  try {
    const { startDate, endDate, format } = req.query;
    const csv = await exportExpensesCSV(req.user.id, { startDate, endDate });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="expenses-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

async function exportIncomes(req, res, next) {
  try {
    const csv = await exportIncomesCSV(req.user.id);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="incomes-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

async function exportAll(req, res, next) {
  try {
    const report = await exportFullReport(req.user.id);
    res.json(report);
  } catch (err) {
    next(err);
  }
}

// Currency
async function getCurrencies(req, res, next) {
  try {
    const currencies = getSupportedCurrencies();
    res.json({ currencies });
  } catch (err) {
    next(err);
  }
}

async function convertCurrency(req, res, next) {
  try {
    const { amount, from, to } = req.query;
    if (!amount || !from || !to) {
      return res.status(400).json({ error: 'amount, from, and to parameters are required' });
    }
    const result = convert(parseFloat(amount), from.toUpperCase(), to.toUpperCase());
    res.json({
      original: { amount: parseFloat(amount), currency: from.toUpperCase() },
      converted: { amount: result, currency: to.toUpperCase() },
    });
  } catch (err) {
    next(err);
  }
}

// Seasonal Analysis
async function getSeasonalAnalysis(req, res, next) {
  try {
    const analysis = await getFullSeasonalAnalysis(req.user.id);
    res.json(analysis);
  } catch (err) {
    next(err);
  }
}

// OCR Receipt Processing
async function processReceipt(req, res, next) {
  try {
    const { ocrText, imageBase64 } = req.body;

    if (!ocrText) {
      return res.status(400).json({ error: 'ocrText is required. Send the OCR-extracted text from the receipt image.' });
    }

    const parsed = parseReceiptText(ocrText);

    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error, parsed });
    }

    // Auto-categorize based on merchant
    let categoryId = null;
    let confidence = parsed.data.confidence;

    if (parsed.data.merchant) {
      const catResult = await categorizeExpense(req.user.id, null, parsed.data.merchant);
      const categories = await Category.findByUser(req.user.id);
      const matched = categories.find(c => c.name === catResult.category);
      if (matched) {
        categoryId = matched.id;
        confidence = Math.max(confidence, catResult.confidence);
      }
    }

    // Create expense from OCR data
    const expense = await Expense.create({
      userId: req.user.id,
      categoryId,
      amount: parsed.data.total,
      description: parsed.data.lineItems.length > 0
        ? parsed.data.lineItems.map(i => i.name).join(', ')
        : null,
      merchant: parsed.data.merchant,
      expenseDate: parsed.data.date || new Date(),
      confidenceScore: confidence,
      source: 'ocr',
    });

    // Store raw OCR input
    await Expense.createRawInput({
      expenseId: expense.id,
      ocrRawText: ocrText,
      ocrImageUrl: imageBase64 ? 'base64:stored' : null,
      inputType: 'ocr',
      parsedData: parsed.data,
    });

    res.status(201).json({
      expense,
      parsed: parsed.data,
      needsConfirmation: confidence < 0.8,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  exportExpenses, exportIncomes, exportAll,
  getCurrencies, convertCurrency,
  getSeasonalAnalysis,
  processReceipt,
};
