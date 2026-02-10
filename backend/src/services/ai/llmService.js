/**
 * LLM Integration Service
 *
 * Multi-provider AI service:
 *   - Google Gemini (free tier — primary)
 *   - OpenAI (paid — fallback)
 *
 * Used for:
 *   - Complex expense parsing (ambiguous free-text)
 *   - Natural language insight generation
 *   - Smart category suggestions
 *   - Financial advice with context
 *
 * Falls back to rule-based logic when API is unavailable.
 */

const config = require('../../config');

// ─── Provider Config ─────────────────────────────────────────
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'openai';

// Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// OpenAI (fallback)
const LLM_API_URL = process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions';
const LLM_API_KEY = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '';
const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4o';
const OPENAI_ORG_ID = process.env.OPENAI_ORG_ID || '';

function isLLMConfigured() {
  if (LLM_PROVIDER === 'gemini') return !!GEMINI_API_KEY;
  return !!LLM_API_KEY;
}

function getProviderInfo() {
  if (LLM_PROVIDER === 'gemini' && GEMINI_API_KEY) {
    return { provider: 'gemini', model: GEMINI_MODEL };
  }
  if (LLM_API_KEY) {
    return { provider: 'openai', model: LLM_MODEL };
  }
  return { provider: null, model: null };
}

// ─── Gemini Call ─────────────────────────────────────────────
async function callGemini(systemPrompt, userMessage, options = {}) {
  const model = options.model || GEMINI_MODEL;
  const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    generationConfig: {
      temperature: options.temperature || 0.3,
      maxOutputTokens: options.maxTokens || 500,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.error?.message || `Gemini HTTP ${response.status}`;
    console.error('Gemini error:', msg);
    return { success: false, error: msg, fallback: true };
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!content) return { success: false, error: 'Empty Gemini response', fallback: true };

  return { success: true, content, provider: 'gemini', usage: data.usageMetadata };
}

// ─── OpenAI Call ─────────────────────────────────────────────
async function callOpenAI(systemPrompt, userMessage, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${LLM_API_KEY}`,
  };
  if (OPENAI_ORG_ID) headers['OpenAI-Organization'] = OPENAI_ORG_ID;

  const body = {
    model: options.model || LLM_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: options.temperature || 0.3,
    max_tokens: options.maxTokens || 500,
  };

  const response = await fetch(LLM_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.error?.message || `OpenAI HTTP ${response.status}`;
    console.error('OpenAI error:', msg);
    return { success: false, error: msg, fallback: true };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  return { success: true, content, provider: 'openai', usage: data.usage };
}

// ─── Unified Entry Point ─────────────────────────────────────
async function callLLM(systemPrompt, userMessage, options = {}) {
  if (!isLLMConfigured()) {
    return { success: false, error: 'LLM not configured', fallback: true };
  }

  try {
    // Primary: Gemini
    if (LLM_PROVIDER === 'gemini' && GEMINI_API_KEY) {
      const result = await callGemini(systemPrompt, userMessage, options);
      if (result.success) return result;
      // Fallback to OpenAI if Gemini fails
      if (LLM_API_KEY) {
        console.log('Gemini failed, trying OpenAI fallback...');
        return await callOpenAI(systemPrompt, userMessage, options);
      }
      return result;
    }

    // Primary: OpenAI
    if (LLM_API_KEY) {
      const result = await callOpenAI(systemPrompt, userMessage, options);
      if (result.success) return result;
      // Fallback to Gemini if OpenAI fails
      if (GEMINI_API_KEY) {
        console.log('OpenAI failed, trying Gemini fallback...');
        return await callGemini(systemPrompt, userMessage, options);
      }
      return result;
    }

    return { success: false, error: 'No LLM provider available', fallback: true };
  } catch (error) {
    console.error('LLM call failed:', error.message);
    return { success: false, error: error.message, fallback: true };
  }
}

/**
 * Parse complex/ambiguous expense text using LLM.
 * Falls back to rule-based parser if LLM unavailable.
 */
async function parseExpenseWithLLM(text) {
  const systemPrompt = `You are a financial data extraction assistant. Parse the user's expense description and return a JSON object with these fields:
- amount (number, required): The expense amount. Convert shorthand like "5k" to 5000.
- category (string): One of: "Food & Dining", "Transport", "Shopping", "Entertainment", "Health", "Education", "Utilities", "Housing", "Personal Care", "Other"
- description (string): A clean description of the expense
- merchant (string or null): Merchant name if identifiable
- confidence (number 0-1): How confident you are in the parsing

Return ONLY valid JSON, no markdown or explanation.`;

  const result = await callLLM(systemPrompt, text, { temperature: 0.1 });

  if (!result.success) {
    return { success: false, fallback: true };
  }

  try {
    const cleaned = result.content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      success: true,
      parsed: {
        amount: parsed.amount,
        category: parsed.category || 'Other',
        description: parsed.description || text,
        merchant: parsed.merchant || null,
        confidence: parsed.confidence || 0.8,
      },
      source: 'llm',
    };
  } catch (parseError) {
    return { success: false, fallback: true, error: 'Failed to parse LLM response' };
  }
}

/**
 * Generate natural language financial insights using LLM.
 */
async function generateInsightsWithLLM(spendingData) {
  const systemPrompt = `You are a personal finance advisor. Given the user's spending data, generate 3-5 actionable, specific insights. Be direct and practical — not generic.

Bad: "Save more money"
Good: "Your food spending increased 23% this week — cooking at home 2 more days saves ~3,000/week"

Return a JSON array of objects with: { "title": "...", "description": "...", "type": "warning|tip|achievement" }
Return ONLY valid JSON, no markdown.`;

  const userMessage = JSON.stringify(spendingData);
  const result = await callLLM(systemPrompt, userMessage, { temperature: 0.5, maxTokens: 800 });

  if (!result.success) {
    return { success: false, fallback: true };
  }

  try {
    const cleaned = result.content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const insights = JSON.parse(cleaned);
    return { success: true, insights, source: 'llm' };
  } catch (parseError) {
    return { success: false, fallback: true };
  }
}

/**
 * Predict expense category using LLM for ambiguous cases.
 */
async function predictCategoryWithLLM(description, merchant, recentCategories) {
  const systemPrompt = `You are an expense categorization system. Given an expense description and optional merchant, predict the most likely category.

Available categories: Food & Dining, Transport, Shopping, Entertainment, Health, Education, Utilities, Housing, Personal Care, Other

Return ONLY a JSON object: { "category": "...", "confidence": 0.0-1.0, "reasoning": "..." }`;

  const userMessage = JSON.stringify({
    description,
    merchant,
    recentCategories: recentCategories?.slice(0, 5),
  });

  const result = await callLLM(systemPrompt, userMessage, { temperature: 0.1 });

  if (!result.success) {
    return { success: false, fallback: true };
  }

  try {
    const cleaned = result.content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const prediction = JSON.parse(cleaned);
    return { success: true, ...prediction, source: 'llm' };
  } catch (parseError) {
    return { success: false, fallback: true };
  }
}

/**
 * Generate personalized financial recommendations using LLM.
 */
async function generateRecommendationsWithLLM(financialProfile) {
  const systemPrompt = `You are a personal finance advisor. Based on the user's financial profile, generate 2-4 specific, actionable recommendations.

Each recommendation should be practical and quantified where possible.

Bad: "You should save more"
Good: "Move 5,000 to savings every Monday — based on your surplus of 22,000/month this builds to 60,000 in 3 months"

Return a JSON array: [{ "title": "...", "description": "...", "potentialSavings": number|null, "priority": "high|medium|low" }]
Return ONLY valid JSON.`;

  const result = await callLLM(systemPrompt, JSON.stringify(financialProfile), {
    temperature: 0.4,
    maxTokens: 800,
  });

  if (!result.success) {
    return { success: false, fallback: true };
  }

  try {
    const cleaned = result.content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const recommendations = JSON.parse(cleaned);
    return { success: true, recommendations, source: 'llm' };
  } catch (parseError) {
    return { success: false, fallback: true };
  }
}

/**
 * Clean and structure OCR text using LLM.
 */
async function cleanOCRWithLLM(rawOCRText) {
  const systemPrompt = `You are a receipt parsing assistant. Given raw OCR text from a receipt, extract structured data.

Return ONLY a JSON object:
{
  "merchant": "store name or null",
  "date": "YYYY-MM-DD or null",
  "total": number,
  "lineItems": [{ "name": "item", "amount": number }],
  "currency": "KES|USD|etc",
  "confidence": 0.0-1.0
}`;

  const result = await callLLM(systemPrompt, rawOCRText, { temperature: 0.1, maxTokens: 600 });

  if (!result.success) {
    return { success: false, fallback: true };
  }

  try {
    const cleaned = result.content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return { success: true, parsed, source: 'llm' };
  } catch (parseError) {
    return { success: false, fallback: true };
  }
}

module.exports = {
  isLLMConfigured,
  getProviderInfo,
  callLLM,
  parseExpenseWithLLM,
  generateInsightsWithLLM,
  predictCategoryWithLLM,
  generateRecommendationsWithLLM,
  cleanOCRWithLLM,
};
