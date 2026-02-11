const { exportExpensesCSV, exportIncomesCSV, exportFullReport } = require('../services/dataExport');
const { getSupportedCurrencies, convert } = require('../services/currency');
const { getFullSeasonalAnalysis } = require('../services/ai/seasonalAnalysis');
const { parseReceiptText } = require('../services/ai/ocrParser');
const { parseExpense } = require('../services/ai/expenseParser');
const { generateInsights } = require('../services/ai/insights');
const Expense = require('../models/Expense');
const Category = require('../models/Category');
const { categorizeExpense } = require('../services/ai/categorization');
const fs = require('fs');
const path = require('path');
const { extractTextFromImage } = require('../services/ocr');
const {
  isLLMConfigured,
  getProviderInfo,
  parseExpenseWithLLM,
  predictCategoryWithLLM,
  generateInsightsWithLLM,
  callLLM,
  cleanOCRWithLLM,
} = require('../services/ai/llmService');
const db = require('../config/database');
const { getEndOfMonthForecast, getSafeToSpend } = require('../services/ai/forecasting');

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

// Assistant permission endpoints
async function getAssistantPermission(req, res, next) {
  try {
    const rows = await db.query('SELECT assistant_permission, assistant_permission_granted_at FROM users WHERE id = ?', [req.user.id]);
    const row = rows && rows[0] ? rows[0] : { assistant_permission: false, assistant_permission_granted_at: null };
    res.json({ assistantPermission: !!row.assistant_permission, grantedAt: row.assistant_permission_granted_at });
  } catch (err) {
    next(err);
  }
}

async function grantAssistantPermission(req, res, next) {
  try {
    await db.query('UPDATE users SET assistant_permission = TRUE, assistant_permission_granted_at = NOW() WHERE id = ?', [req.user.id]);
    res.json({ message: 'Assistant access granted', assistantPermission: true });
  } catch (err) {
    next(err);
  }
}

async function revokeAssistantPermission(req, res, next) {
  try {
    await db.query('UPDATE users SET assistant_permission = FALSE, assistant_permission_granted_at = NULL WHERE id = ?', [req.user.id]);
    res.json({ message: 'Assistant access revoked', assistantPermission: false });
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

// Simple chat endpoint for interactive assistant in the app (MVP)
async function chatWithLLM(req, res, next) {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') return res.status(400).json({ error: 'message is required' });

    // If LLM is configured, prefer the LLM-powered flow (with optional sanitized context).
    if (isLLMConfigured()) {
      const systemPrompt = `You are the ExpenseTracker assistant. Answer user questions concisely about personal finances, budgets, incomes, forecasts and expenses. If the user asks about their specific data, be cautious and suggest they grant permission to fetch detailed numbers. Keep responses short and actionable.`;

      const needsData = /\b(my|mine|me|show me|what is my|how much|balance|income|expenses|safe to spend|forecast|budget|recent transactions)\b/i.test(message);
      let extraContext = '';
      let includedUserData = false;

      if (needsData) {
        try {
          // Check whether the user has granted assistant permission
          const rows = await db.query('SELECT assistant_permission FROM users WHERE id = ?', [req.user.id]);
          const hasPermission = rows && rows[0] && rows[0].assistant_permission;
          if (hasPermission) {
            const forecast = await getEndOfMonthForecast(req.user.id);
            const safe = await getSafeToSpend(req.user.id);
            const recentRows = await Expense.findByUser(req.user.id, { limit: 5 });

            const recent = (recentRows || []).map(r => ({ date: r.expense_date, amount: Number(r.amount), category: r.category_name || null, merchant: r.merchant || null }));

            const sanitized = {
              forecast: {
                currentSpend: forecast.currentSpend,
                projectedTotal: forecast.projectedTotal,
                income: forecast.income,
                projectedBalance: forecast.projectedBalance,
                daysRemaining: forecast.daysRemaining,
              },
              safeToSpend: safe,
              recentTransactions: recent,
            };

            extraContext = `\n\n-- User Financial Summary (sanitized) --\n${JSON.stringify(sanitized)}\n-- End Summary --\n`;
            includedUserData = true;
          }
        } catch (e) {
          console.log('Could not fetch user data for chat context:', e.message);
        }
      }

      const prompt = systemPrompt + extraContext;
      const result = await callLLM(prompt, message, { temperature: 0.3, maxTokens: 600 });
      if (!result.success) return res.status(502).json({ error: result.error || 'AI provider error' });

      return res.json({ reply: result.content, provider: result.provider, model: result.model, includedUserData });
    }

    // FALLBACK: LLM not configured — perform a rule-based, data-backed response
    try {
      // fetch user's preferred currency
      const userRows = await db.query('SELECT currency FROM users WHERE id = ?', [req.user.id]);
      const userCurrency = (userRows && userRows[0] && userRows[0].currency) ? userRows[0].currency : 'KES';

      // simple symbol map for common currencies
      const SYMBOLS = {
        USD: '$', EUR: '€', GBP: '£', KES: 'KSh', UGX: 'USh', TZS: 'TSh', NGN: '₦', ZAR: 'R', INR: '₹', JPY: '¥', CNY: '¥'
      };
      const symbol = SYMBOLS[userCurrency] || userCurrency;
      const fmt = (amt) => `${symbol} ${Number(amt).toLocaleString()}`;

      const q = message.toLowerCase();
      if (/safe to spend|safe per day|safe to spend this month|what can i spend/.test(q)) {
        const safe = await getSafeToSpend(req.user.id);
        const reply = `Safe to spend: ${fmt(safe.totalRemaining)} total remaining — ${fmt(safe.safePerDay)} per day for the next ${safe.daysRemaining} days.`;
        return res.json({ reply, provider: 'fallback', model: 'rule-based', includedUserData: true });
      }

      if (/forecast|projected balance|projected|project balance|projected balance/.test(q)) {
        const forecast = await getEndOfMonthForecast(req.user.id);
        const reply = `Projected total spent: ${fmt(forecast.projectedTotal)}. Income this month: ${fmt(forecast.income)}. Projected balance: ${fmt(forecast.projectedBalance)}.`;
        return res.json({ reply, provider: 'fallback', model: 'rule-based', includedUserData: true });
      }

      if (/recent transactions|recent expenses|recent purchases|last 5|last 5 transactions/.test(q)) {
        const recentRows = await Expense.findByUser(req.user.id, { limit: 5 });
        const recent = (recentRows || []).map(r => `${r.expense_date.split(' ')[0]}: ${r.merchant || r.description || 'expense'} — ${fmt(r.amount)}`).join('\n');
        const reply = recent.length ? `Recent transactions:\n${recent}` : 'No recent transactions found.';
        return res.json({ reply, provider: 'fallback', model: 'rule-based', includedUserData: true });
      }

      // Default fallback help text
      const defaultReply = `I can fetch your forecast, safe-to-spend, and recent transactions. Try: "What's my safe to spend?", "Show my forecast", or "Show recent transactions".`;
      return res.json({ reply: defaultReply, provider: 'fallback', model: 'rule-based', includedUserData: false });
    } catch (e) {
      return res.status(500).json({ error: 'Fallback handler failed', details: e.message });
    }
  } catch (err) {
    next(err);
  }
}

// AI status endpoint
async function aiStatus(req, res) {
  const info = getProviderInfo();
  res.json({
    llmConfigured: isLLMConfigured(),
    provider: info.provider,
    model: info.model,
    features: {
      smartParse: true,
      smartCategorize: true,
      smartInsights: true,
      ocrEnhanced: true,
      imageUpload: true,
    },
    fallback: 'rule-based',
  });
}

// Receipt image upload + OCR processing
async function processReceiptImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No receipt image uploaded. Send a file with field name "receipt".' });
    }

    const filePath = req.file.path;
    const fileUrl = `/uploads/${req.file.filename}`;

    // Read file as base64 for potential LLM vision processing
    const imageBuffer = fs.readFileSync(filePath);
    const imageBase64 = imageBuffer.toString('base64');
    const mimeType = req.file.mimetype || 'image/jpeg';

    let ocrText = '';
    let parsed;
    let parseSource = 'image-upload';

    // If LLM is configured, try vision-based extraction
    if (isLLMConfigured()) {
      try {
        const llmResult = await cleanOCRWithLLM(
          `[IMAGE RECEIPT: base64 data provided, mime=${mimeType}]\nPlease extract all text from this receipt image and parse it.`,
          imageBase64
        );
        if (llmResult.success) {
          parsed = {
            success: true,
            data: {
              merchant: llmResult.parsed.merchant,
              total: llmResult.parsed.total,
              date: llmResult.parsed.date,
              lineItems: llmResult.parsed.lineItems || [],
              confidence: llmResult.parsed.confidence || 0.75,
            },
          };
          parseSource = 'llm-vision';
        }
      } catch (llmErr) {
        console.log('LLM vision OCR failed, falling back:', llmErr.message);
      }
    }

    // Tesseract.js OCR — extract text from the uploaded image
    if (!parsed) {
      try {
        console.log('Running Tesseract OCR on', filePath);
        const ocrResult = await extractTextFromImage(filePath);

        if (ocrResult.text && ocrResult.text.length > 10) {
          ocrText = ocrResult.text;

          // If LLM is available, clean the raw OCR text for better parsing
          if (isLLMConfigured()) {
            try {
              const llmCleaned = await cleanOCRWithLLM(ocrText);
              if (llmCleaned.success) {
                parsed = {
                  success: true,
                  data: {
                    merchant: llmCleaned.parsed.merchant,
                    total: llmCleaned.parsed.total,
                    date: llmCleaned.parsed.date,
                    lineItems: llmCleaned.parsed.lineItems || [],
                    confidence: llmCleaned.parsed.confidence || 0.7,
                  },
                };
                parseSource = 'tesseract+llm';
              }
            } catch (e) {
              console.log('LLM cleaning of OCR text failed:', e.message);
            }
          }

          // Fallback to rule-based parser on the raw OCR text
          if (!parsed) {
            parsed = parseReceiptText(ocrText);
            if (parsed.success) {
              // Adjust confidence based on Tesseract's own confidence
              parsed.data.confidence = Math.min(parsed.data.confidence, ocrResult.confidence);
              parseSource = 'tesseract';
            }
          }
        } else {
          console.log('Tesseract returned insufficient text:', ocrResult.text?.length || 0, 'chars');
        }
      } catch (ocrErr) {
        console.log('Tesseract OCR failed:', ocrErr.message);
      }
    }

    // If also sent ocrText in body (e.g. client-side OCR), use that as fallback
    if (!parsed && req.body.ocrText) {
      ocrText = req.body.ocrText;
      parsed = parseReceiptText(ocrText);
      parseSource = 'client-ocr';
    }

    // Final fallback: return the image stored, ask user to paste text
    if (!parsed || !parsed.success) {
      return res.status(200).json({
        imageUrl: fileUrl,
        imageStored: true,
        parsed: null,
        parseSource: 'none',
        message: 'Image saved. Automatic text extraction is not available — please paste the receipt text manually.',
        needsManualEntry: true,
      });
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

    // Create expense
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
      source: 'ocr-image',
    });

    // Store raw input
    await Expense.createRawInput({
      expenseId: expense.id,
      ocrRawText: ocrText || '[image-uploaded]',
      ocrImageUrl: fileUrl,
      inputType: 'ocr-image',
      parsedData: parsed.data,
    });

    res.status(201).json({
      expense,
      parsed: parsed.data,
      parseSource,
      imageUrl: fileUrl,
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
  processReceiptImage,
  smartParse, smartCategorize, smartInsights,
  aiStatus,
  chatWithLLM,
  getAssistantPermission, grantAssistantPermission, revokeAssistantPermission,
};
