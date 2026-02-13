/**
 * LLM Integration Service
 *
 * Multi-provider AI service with cascading fallbacks:
 *   1. Google Gemini 2.5 Flash (primary — 5 RPM)
 *   2. Google Gemini 2.5 Flash Lite (free fallback — 10 RPM)
 *   3. Groq Llama 3.3 70B (free fallback — 30 RPM)
 *
 * Uses the same Gemini API key for all Google models.
 * Falls back to rule-based logic when all APIs are unavailable.
 */

const config = require('../../config');

// ─── Provider Config ─────────────────────────────────────────
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'gemini';

// Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Gemini fallback chain
const GEMINI_FALLBACK_MODELS = [
  'gemini-2.5-flash-lite',  // 10 RPM, 250K TPM — lightweight, fast
];

// Groq (free Llama inference — 30 RPM, 14,400 RPD)
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ─── Rate Limit Tracking ─────────────────────────────────────
// Track per-model failures to avoid hammering rate-limited models
const modelCooldowns = new Map();
const COOLDOWN_MS = 60_000; // 1 minute cooldown after a rate limit hit

function isModelCoolingDown(model) {
  const until = modelCooldowns.get(model);
  if (!until) return false;
  if (Date.now() > until) {
    modelCooldowns.delete(model);
    return false;
  }
  return true;
}

function setCooldown(model, durationMs = COOLDOWN_MS) {
  modelCooldowns.set(model, Date.now() + durationMs);
}

function isLLMConfigured() {
  return !!(GEMINI_API_KEY || GROQ_API_KEY);
}

function getProviderInfo() {
  const providers = [];
  if (GEMINI_API_KEY) {
    providers.push({ provider: 'gemini', model: GEMINI_MODEL, fallbacks: GEMINI_FALLBACK_MODELS });
  }
  if (GROQ_API_KEY) {
    providers.push({ provider: 'groq', model: GROQ_MODEL, fallbacks: [] });
  }
  return { primary: providers[0] || { provider: null, model: null }, all: providers };
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
    signal: AbortSignal.timeout(15_000), // 15s timeout
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.error?.message || `Gemini HTTP ${response.status}`;
    const isRateLimit = response.status === 429 || msg.toLowerCase().includes('rate');
    if (isRateLimit) {
      console.warn(`⚠️  ${model} rate limited — cooling down 60s`);
      setCooldown(model);
    }
    console.error(`Gemini [${model}] error:`, msg);
    return { success: false, error: msg, fallback: true, rateLimited: isRateLimit };
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!content) return { success: false, error: 'Empty Gemini response', fallback: true };

  return { success: true, content, provider: 'gemini', model, usage: data.usageMetadata };
}

// ─── Groq (Llama) Call ───────────────────────────────────────
async function callGroq(systemPrompt, userMessage, options = {}) {
  const model = options.model || GROQ_MODEL;

  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: options.temperature || 0.3,
    max_tokens: options.maxTokens || 500,
  };

  const response = await fetch(GROQ_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.error?.message || `Groq HTTP ${response.status}`;
    const isRateLimit = response.status === 429;
    if (isRateLimit) {
      const retryAfter = response.headers.get('retry-after');
      const cooldownMs = retryAfter ? parseInt(retryAfter) * 1000 : COOLDOWN_MS;
      console.warn(`⚠️  Groq ${model} rate limited — cooling down ${cooldownMs / 1000}s`);
      setCooldown(`groq:${model}`, cooldownMs);
    }
    console.error(`Groq [${model}] error:`, msg);
    return { success: false, error: msg, fallback: true, rateLimited: isRateLimit };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return { success: false, error: 'Empty Groq response', fallback: true };

  return { success: true, content, provider: 'groq', model, usage: data.usage };
}

// ─── Unified Entry Point with Cascading Fallback ─────────────
async function callLLM(systemPrompt, userMessage, options = {}) {
  if (!isLLMConfigured()) {
    return { success: false, error: 'LLM not configured', fallback: true };
  }

  const errors = [];

  try {
    // ── Step 1: Try primary Gemini model ──
    if (GEMINI_API_KEY) {
      const primaryModel = options.model || GEMINI_MODEL;

      if (!isModelCoolingDown(primaryModel)) {
        console.log(`🤖 Trying ${primaryModel}...`);
        const result = await callGemini(systemPrompt, userMessage, { ...options, model: primaryModel });
        if (result.success) return result;
        errors.push(`${primaryModel}: ${result.error}`);
      } else {
        console.log(`⏳ ${primaryModel} is cooling down, skipping`);
      }

      // ── Step 2: Try Gemini fallback models ──
      for (const fallbackModel of GEMINI_FALLBACK_MODELS) {
        if (isModelCoolingDown(fallbackModel)) {
          console.log(`⏳ ${fallbackModel} is cooling down, skipping`);
          continue;
        }

        console.log(`🔄 Falling back to ${fallbackModel}...`);
        const result = await callGemini(systemPrompt, userMessage, { ...options, model: fallbackModel });
        if (result.success) return result;
        errors.push(`${fallbackModel}: ${result.error}`);
      }
    }

    // ── Step 3: Groq Llama (free, 30 RPM) ──
    if (GROQ_API_KEY && !isModelCoolingDown(`groq:${GROQ_MODEL}`)) {
      console.log(`🦙 Falling back to Groq ${GROQ_MODEL}...`);
      const result = await callGroq(systemPrompt, userMessage, options);
      if (result.success) return result;
      errors.push(`groq/${GROQ_MODEL}: ${result.error}`);
    } else if (GROQ_API_KEY) {
      console.log(`⏳ Groq ${GROQ_MODEL} cooling down, skipping`);
    }

    return {
      success: false,
      error: `All providers failed: ${errors.join(' | ')}`,
      fallback: true,
    };
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
      model: result.model,
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
    return { success: true, insights, source: 'llm', model: result.model };
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
    return { success: true, ...prediction, source: 'llm', model: result.model };
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
    return { success: true, recommendations, source: 'llm', model: result.model };
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
    return { success: true, parsed, source: 'llm', model: result.model };
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
