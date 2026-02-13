/**
 * Expense Parser Service (Rule-based + LLM-ready)
 *
 * Parses free-text expense entries like:
 *   "2000 lunch" → { amount: 2000, category: 'Food & Dining', description: 'lunch' }
 *   "5k transport" → { amount: 5000, category: 'Transport' }
 *   "🍔 8000" → { amount: 8000, category: 'Food & Dining' }
 *
 * What is rule-based: Amount extraction, emoji mapping, keyword matching
 * What uses LLM: Complex descriptions, ambiguous entries (future integration)
 */

const EMOJI_CATEGORY_MAP = {
  '🍔': 'Food & Dining', '🍕': 'Food & Dining', '🍜': 'Food & Dining',
  '🍛': 'Food & Dining', '☕': 'Food & Dining', '🍺': 'Food & Dining',
  '🍷': 'Food & Dining', '🍱': 'Food & Dining', '🥤': 'Food & Dining',
  '🚕': 'Transport', '🚗': 'Transport', '🚌': 'Transport',
  '🚇': 'Transport', '⛽': 'Transport', '✈️': 'Transport',
  '🏠': 'Housing', '💡': 'Housing', '🔌': 'Housing',
  '🛍️': 'Shopping', '👕': 'Shopping', '👟': 'Shopping',
  '🎬': 'Entertainment', '🎮': 'Entertainment', '🎵': 'Entertainment',
  '💊': 'Health', '🏥': 'Health', '💪': 'Health',
  '📚': 'Education', '✏️': 'Education',
  '💰': 'Savings', '🏦': 'Savings',
  '💇': 'Personal', '🎁': 'Personal',
};

const KEYWORD_CATEGORY_MAP = {
  'lunch': 'Food & Dining', 'dinner': 'Food & Dining', 'breakfast': 'Food & Dining',
  'food': 'Food & Dining', 'eat': 'Food & Dining', 'restaurant': 'Food & Dining',
  'coffee': 'Food & Dining', 'snack': 'Food & Dining', 'groceries': 'Food & Dining',
  'grocery': 'Food & Dining', 'meal': 'Food & Dining', 'pizza': 'Food & Dining',
  'burger': 'Food & Dining', 'drinks': 'Food & Dining', 'beer': 'Food & Dining',
  'transport': 'Transport', 'taxi': 'Transport', 'uber': 'Transport',
  'bolt': 'Transport', 'fuel': 'Transport', 'petrol': 'Transport',
  'bus': 'Transport', 'matatu': 'Transport', 'fare': 'Transport',
  'parking': 'Transport', 'ride': 'Transport',
  'rent': 'Housing', 'electricity': 'Housing', 'water': 'Housing',
  'wifi': 'Housing', 'internet': 'Housing', 'gas': 'Housing',
  'airtime': 'Housing', 'utility': 'Housing',
  'clothes': 'Shopping', 'shoes': 'Shopping', 'shopping': 'Shopping',
  'phone': 'Shopping', 'electronics': 'Shopping',
  'movie': 'Entertainment', 'netflix': 'Entertainment', 'game': 'Entertainment',
  'spotify': 'Entertainment', 'subscription': 'Entertainment',
  'gym': 'Health', 'doctor': 'Health', 'medicine': 'Health',
  'hospital': 'Health', 'pharmacy': 'Health',
  'book': 'Education', 'course': 'Education', 'school': 'Education',
  'tuition': 'Education', 'fees': 'Education',
  'haircut': 'Personal', 'salon': 'Personal', 'gift': 'Personal',
  'charity': 'Personal', 'donation': 'Personal',
  'savings': 'Savings', 'invest': 'Savings',
};

function parseExpenseText(text) {
  if (!text || typeof text !== 'string') {
    return { success: false, error: 'Empty input' };
  }

  const input = text.trim();
  let amount = null;
  let category = null;
  let description = '';
  let confidence = 0.5;

  // Step 1: Check for emoji category
  for (const [emoji, cat] of Object.entries(EMOJI_CATEGORY_MAP)) {
    if (input.includes(emoji)) {
      category = cat;
      confidence = 0.9;
      break;
    }
  }

  // Step 2: Extract amount
  // Pattern: "5k", "5K", "5,000", "5000", "5.5k"
  const amountPatterns = [
    /(\d+(?:\.\d+)?)\s*k\b/i,           // 5k, 5.5k
    /(\d{1,3}(?:,\d{3})+(?:\.\d+)?)/,   // 5,000 or 5,000.50
    /(\d+(?:\.\d+)?)/,                    // plain number
  ];

  for (const pattern of amountPatterns) {
    const match = input.match(pattern);
    if (match) {
      let rawAmount = match[1].replace(/,/g, '');
      amount = parseFloat(rawAmount);
      if (pattern === amountPatterns[0]) {
        amount *= 1000;
      }
      break;
    }
  }

  if (amount === null) {
    return { success: false, error: 'Could not parse amount' };
  }

  // Step 3: Extract description (everything that's not the amount or emoji)
  description = input
    .replace(/(\d+(?:\.\d+)?)\s*k?\b/gi, '')
    .replace(/[,]/g, '')
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .trim();

  // Step 4: Keyword-based category detection (if no emoji found)
  if (!category) {
    const words = description.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (KEYWORD_CATEGORY_MAP[word]) {
        category = KEYWORD_CATEGORY_MAP[word];
        confidence = 0.75;
        break;
      }
    }
  }

  if (!category) {
    category = 'Other';
    confidence = 0.3;
  }

  return {
    success: true,
    data: {
      amount,
      category,
      description: description || null,
      confidence,
      source: 'quick_entry',
    },
  };
}

module.exports = { parseExpenseText, EMOJI_CATEGORY_MAP, KEYWORD_CATEGORY_MAP };
