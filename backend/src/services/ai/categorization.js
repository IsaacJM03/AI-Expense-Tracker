/**
 * Categorization Service (Rule-based + ML-ready)
 *
 * Auto-categorizes expenses using:
 *   1. Keyword matching (rule-based)
 *   2. Merchant history (database lookup)
 *   3. User behavior patterns (historical data)
 *   4. LLM fallback for ambiguous cases (future)
 *
 * Learns from user corrections over time by tracking
 * category overrides and adjusting confidence.
 */

const db = require('../../config/database');
const { KEYWORD_CATEGORY_MAP } = require('./expenseParser');

async function categorizeExpense(userId, description, merchant) {
  let category = null;
  let confidence = 0;
  let method = 'unknown';

  // Method 1: Merchant history - highest confidence
  if (merchant) {
    const history = await db.query(
      `SELECT c.name, COUNT(*) as count FROM expenses e
       JOIN categories c ON e.category_id = c.id
       WHERE e.user_id = ? AND e.merchant = ?
       GROUP BY c.name ORDER BY count DESC LIMIT 1`,
      [userId, merchant]
    );
    if (history.length > 0) {
      category = history[0].name;
      confidence = 0.95;
      method = 'merchant_history';
    }
  }

  // Method 2: Description keyword matching
  if (!category && description) {
    const words = description.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (KEYWORD_CATEGORY_MAP[word]) {
        category = KEYWORD_CATEGORY_MAP[word];
        confidence = 0.75;
        method = 'keyword';
        break;
      }
    }
  }

  // Method 3: User behavior pattern - similar descriptions
  if (!category && description) {
    const similar = await db.query(
      `SELECT c.name, COUNT(*) as count FROM expenses e
       JOIN categories c ON e.category_id = c.id
       WHERE e.user_id = ? AND e.description LIKE ?
       GROUP BY c.name ORDER BY count DESC LIMIT 1`,
      [userId, `%${description.substring(0, 20)}%`]
    );
    if (similar.length > 0) {
      category = similar[0].name;
      confidence = 0.7;
      method = 'behavior_pattern';
    }
  }

  // Fallback
  if (!category) {
    category = 'Other';
    confidence = 0.3;
    method = 'default';
  }

  return { category, confidence, method };
}

async function recordCorrection(userId, expenseId, oldCategoryId, newCategoryId) {
  // Future: Store corrections for ML training
  // For now, just update the expense
  await db.query(
    'UPDATE expenses SET category_id = ?, confidence_score = 1.0 WHERE id = ? AND user_id = ?',
    [newCategoryId, expenseId, userId]
  );
  return { success: true };
}

module.exports = { categorizeExpense, recordCorrection };
