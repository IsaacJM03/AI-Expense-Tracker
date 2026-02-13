const { parseExpenseText, EMOJI_CATEGORY_MAP, KEYWORD_CATEGORY_MAP } = require('../src/services/ai/expenseParser');

describe('Expense Parser', () => {
  describe('parseExpenseText', () => {
    test('parses simple amount + description', () => {
      const result = parseExpenseText('2000 lunch');
      expect(result.success).toBe(true);
      expect(result.data.amount).toBe(2000);
      expect(result.data.category).toBe('Food & Dining');
      expect(result.data.confidence).toBeGreaterThan(0.5);
    });

    test('parses "k" shorthand (5k)', () => {
      const result = parseExpenseText('5k transport');
      expect(result.success).toBe(true);
      expect(result.data.amount).toBe(5000);
      expect(result.data.category).toBe('Transport');
    });

    test('parses emoji input (🍔 8000)', () => {
      const result = parseExpenseText('🍔 8000');
      expect(result.success).toBe(true);
      expect(result.data.amount).toBe(8000);
      expect(result.data.category).toBe('Food & Dining');
      expect(result.data.confidence).toBe(0.9);
    });

    test('parses emoji transport (🚕 4000)', () => {
      const result = parseExpenseText('🚕 4000');
      expect(result.success).toBe(true);
      expect(result.data.amount).toBe(4000);
      expect(result.data.category).toBe('Transport');
    });

    test('parses comma-separated amounts (5,000)', () => {
      const result = parseExpenseText('5,000 groceries');
      expect(result.success).toBe(true);
      expect(result.data.amount).toBe(5000);
      expect(result.data.category).toBe('Food & Dining');
    });

    test('parses decimal k amounts (2.5k)', () => {
      const result = parseExpenseText('2.5k taxi');
      expect(result.success).toBe(true);
      expect(result.data.amount).toBe(2500);
      expect(result.data.category).toBe('Transport');
    });

    test('returns "Other" for unknown category', () => {
      const result = parseExpenseText('500 misc stuff');
      expect(result.success).toBe(true);
      expect(result.data.amount).toBe(500);
      expect(result.data.category).toBe('Other');
      expect(result.data.confidence).toBe(0.3);
    });

    test('fails on empty input', () => {
      const result = parseExpenseText('');
      expect(result.success).toBe(false);
    });

    test('fails on null input', () => {
      const result = parseExpenseText(null);
      expect(result.success).toBe(false);
    });

    test('fails on input without amount', () => {
      const result = parseExpenseText('lunch');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Could not parse amount');
    });

    test('parses amount-first input', () => {
      const result = parseExpenseText('1500 coffee');
      expect(result.success).toBe(true);
      expect(result.data.amount).toBe(1500);
      expect(result.data.category).toBe('Food & Dining');
    });

    test('sets source to quick_entry', () => {
      const result = parseExpenseText('1000 food');
      expect(result.success).toBe(true);
      expect(result.data.source).toBe('quick_entry');
    });

    test('handles entertainment keywords', () => {
      const result = parseExpenseText('500 movie');
      expect(result.success).toBe(true);
      expect(result.data.category).toBe('Entertainment');
    });

    test('handles health keywords', () => {
      const result = parseExpenseText('3000 doctor');
      expect(result.success).toBe(true);
      expect(result.data.category).toBe('Health');
    });
  });

  describe('EMOJI_CATEGORY_MAP', () => {
    test('has food emojis mapped', () => {
      expect(EMOJI_CATEGORY_MAP['🍔']).toBe('Food & Dining');
      expect(EMOJI_CATEGORY_MAP['🍕']).toBe('Food & Dining');
    });

    test('has transport emojis mapped', () => {
      expect(EMOJI_CATEGORY_MAP['🚕']).toBe('Transport');
      expect(EMOJI_CATEGORY_MAP['🚗']).toBe('Transport');
    });
  });

  describe('KEYWORD_CATEGORY_MAP', () => {
    test('has food keywords', () => {
      expect(KEYWORD_CATEGORY_MAP['lunch']).toBe('Food & Dining');
      expect(KEYWORD_CATEGORY_MAP['dinner']).toBe('Food & Dining');
    });

    test('has transport keywords', () => {
      expect(KEYWORD_CATEGORY_MAP['uber']).toBe('Transport');
      expect(KEYWORD_CATEGORY_MAP['taxi']).toBe('Transport');
    });
  });
});
