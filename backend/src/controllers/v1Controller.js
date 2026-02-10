const { exportExpensesCSV, exportIncomesCSV, exportFullReport } = require('../services/dataExport');
const { getSupportedCurrencies, convert } = require('../services/currency');
const { getFullSeasonalAnalysis } = require('../services/ai/seasonalAnalysis');
const { parseReceiptText } = require('../services/ai/ocrParser');
const { parseExpense } = require('../services/ai/expenseParser');
const { generateInsights } = require('../services/ai/insights');
const Expense = require('../models/Expense');
const Category = require('../models/Category');
const { categorizeExpense } = require('../services/ai/categorization');
const {
  isLLMConfigured,
  parseExpenseWithLLM,
  predictCategoryWithLLM,
  generateInsightsWithLLM,
  cleanOCRWithLLM,
} = require('../services/ai/llmService');

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

// OCR Receipt Processing (with LLM fallback)
async function processReceipt(req, res, next) {
  try {
    const { ocrText, imageBase64 } = req.body;

    if (!ocrText) {
      return res.status(400).json({ error: 'ocrText is required. Send the OCR-extracted text from the receipt image.' });
    }

    // Try LLM-enhanced OCR parsing first
    let parsed;
    let parseSource = 'rule-based';

    if (isLLMConfigured()) {
      const llmResult = await cleanOCRWithLLM(ocrText);
      if (llmResult.success) {
        parsed = {
          success: true,
          data: {
            merchant: llmResult.parsed.merchant,
            total: llmResult.parsed.total,
            date: llmResult.parsed.date,
            lineItems: llmResult.parsed.lineItems || [],
            confidence: llmResult.parsed.confidence || 0.85,
          },
        };
        parseSource = 'llm';
      }
    }

    // Fallback to rule-based parser
    if (!parsed) {
      parsed = parseReceiptText(ocrText);
    }

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
      parseSource,
      needsConfirmation: confidence < 0.8,
    });
  } catch (err) {
    next(err);
  }
}

// LLM-powered smart parsing
async function smartParse(req, res, next) {
  try {
    const { text } = req.body;

    // Try LLM first
    if (isLLMConfigured()) {
      const llmResult = await parseExpenseWithLLM(text);
      if (llmResult.success) {
        return res.json({
          ...llmResult.parsed,
          source: 'llm',
        });
      }
    }

    // Fallback to rule-based
    const parsed = parseExpense(text);
    res.json({
      ...parsed,
      source: 'rule-based',
    });
  } catch (err) {
    next(err);
  }
}

// LLM-powered smart categorization
async function smartCategorize(req, res, next) {
  try {
    const { description, merchant } = req.body;

    // Try LLM first
    if (isLLMConfigured()) {
      const llmResult = await predictCategoryWithLLM(description, merchant);
      if (llmResult.success) {
        return res.json({
          category: llmResult.category,
          confidence: llmResult.confidence,
          reasoning: llmResult.reasoning,
          source: 'llm',
        });
      }
    }

    // Fallback to rule-based
    const result = await categorizeExpense(req.user.id, description, merchant);
    res.json({
      ...result,
      source: result.method,
    });
  } catch (err) {
    next(err);
  }
}

// LLM-powered smart insights
async function smartInsights(req, res, next) {
  try {
    // Try LLM first for enhanced insights
    if (isLLMConfigured()) {
      // Build anonymized spending profile for LLM (no PII)
      const ruleBasedInsights = await generateInsights(req.user.id);
      const anonymizedData = {
        insights: (ruleBasedInsights || []).map(i => ({
          title: i.title,
          type: i.type,
        })),
      };
      const llmResult = await generateInsightsWithLLM(anonymizedData);

      if (llmResult.success) {
        return res.json({
          insights: llmResult.insights,
          source: 'llm',
        });
      }
    }

    // Fallback to rule-based
    const insights = await generateInsights(req.user.id);
    res.json({
      insights,
      source: 'rule-based',
    });
  } catch (err) {
    next(err);
  }
}

// AI status endpoint
async function aiStatus(req, res) {
  res.json({
    llmConfigured: isLLMConfigured(),
    features: {
      smartParse: true,
      smartCategorize: true,
      smartInsights: true,
      ocrEnhanced: true,
    },
    model: isLLMConfigured() ? (process.env.LLM_MODEL || 'gpt-4o') : null,
    fallback: 'rule-based',
  });
}

module.exports = {
  exportExpenses, exportIncomes, exportAll,
  getCurrencies, convertCurrency,
  getSeasonalAnalysis,
  processReceipt,
  smartParse, smartCategorize, smartInsights,
  aiStatus,
};
