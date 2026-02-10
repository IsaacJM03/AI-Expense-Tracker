const { parseReceiptText } = require('../src/services/ai/ocrParser');
const { convert, formatCurrency, getSupportedCurrencies, EXCHANGE_RATES } = require('../src/services/currency');
const { exportExpensesCSV, exportIncomesCSV } = require('../src/services/dataExport');

describe('OCR Receipt Parser', () => {
  test('parses receipt with total and merchant', () => {
    const text = `Java House
2024-01-15
Coffee    350
Sandwich  500
Total: 850`;
    const result = parseReceiptText(text);
    expect(result.success).toBe(true);
    expect(result.data.total).toBe(850);
    expect(result.data.merchant).toBe('Java House');
    expect(result.data.lineItems).toHaveLength(2);
  });

  test('extracts line items', () => {
    const text = `Restaurant ABC
Burger  450
Fries   200
Drink   150
Total: 800`;
    const result = parseReceiptText(text);
    expect(result.success).toBe(true);
    expect(result.data.lineItems).toHaveLength(3);
    expect(result.data.lineItems[0].name).toBe('Burger');
    expect(result.data.lineItems[0].amount).toBe(450);
  });

  test('parses KES amount format', () => {
    const text = `Shop XYZ
Item 1  1,500
Total: KES 1,500`;
    const result = parseReceiptText(text);
    expect(result.success).toBe(true);
    expect(result.data.total).toBe(1500);
  });

  test('parses date from receipt', () => {
    const text = `Store ABC
2024-03-15
Total: 500`;
    const result = parseReceiptText(text);
    expect(result.success).toBe(true);
    expect(result.data.date).toContain('2024');
  });

  test('fails on empty input', () => {
    const result = parseReceiptText('');
    expect(result.success).toBe(false);
  });

  test('fails on null input', () => {
    const result = parseReceiptText(null);
    expect(result.success).toBe(false);
  });

  test('sums line items when no total found', () => {
    const text = `Random Store
Apple  100
Bread  200
Milk   300`;
    const result = parseReceiptText(text);
    expect(result.success).toBe(true);
    expect(result.data.total).toBe(600);
  });

  test('calculates confidence correctly', () => {
    const text = `Merchant Name
2024-01-01
Item  100
Total: 100`;
    const result = parseReceiptText(text);
    expect(result.data.confidence).toBeGreaterThanOrEqual(0.6);
  });
});

describe('Currency Service', () => {
  test('converts USD to KES', () => {
    const result = convert(100, 'USD', 'KES');
    expect(result).toBe(EXCHANGE_RATES.KES * 100);
  });

  test('converts KES to USD', () => {
    const result = convert(15350, 'KES', 'USD');
    expect(result).toBe(100);
  });

  test('same currency returns same amount', () => {
    expect(convert(500, 'KES', 'KES')).toBe(500);
  });

  test('throws on unsupported currency', () => {
    expect(() => convert(100, 'XYZ', 'USD')).toThrow('Unsupported currency');
  });

  test('formats currency with symbol', () => {
    const result = formatCurrency(1500, 'KES');
    expect(result).toContain('KSh');
    expect(result).toContain('1,500');
  });

  test('formats USD with dollar sign', () => {
    const result = formatCurrency(100, 'USD');
    expect(result).toContain('$');
  });

  test('getSupportedCurrencies returns array', () => {
    const currencies = getSupportedCurrencies();
    expect(Array.isArray(currencies)).toBe(true);
    expect(currencies.length).toBeGreaterThan(10);
    expect(currencies[0]).toHaveProperty('code');
    expect(currencies[0]).toHaveProperty('symbol');
    expect(currencies[0]).toHaveProperty('rate');
  });

  test('all currencies have valid rates', () => {
    const currencies = getSupportedCurrencies();
    currencies.forEach(c => {
      expect(c.rate).toBeGreaterThan(0);
      expect(typeof c.code).toBe('string');
      expect(c.code.length).toBe(3);
    });
  });
});

describe('Data Export Service', () => {
  // These need a database connection, so we test the escapeCSV logic indirectly
  test('export functions are defined', () => {
    expect(typeof exportExpensesCSV).toBe('function');
    expect(typeof exportIncomesCSV).toBe('function');
  });
});

describe('V1 API Routes', () => {
  const request = require('supertest');
  const app = require('../src/app');

  test('GET /api/v1/currencies returns supported currencies', async () => {
    const res = await request(app).get('/api/v1/currencies');
    expect(res.status).toBe(200);
    expect(res.body.currencies).toBeDefined();
    expect(Array.isArray(res.body.currencies)).toBe(true);
    expect(res.body.currencies.length).toBeGreaterThan(10);
  });

  test('GET /api/v1/currencies/convert converts amounts', async () => {
    const res = await request(app).get('/api/v1/currencies/convert?amount=100&from=USD&to=KES');
    expect(res.status).toBe(200);
    expect(res.body.original.amount).toBe(100);
    expect(res.body.original.currency).toBe('USD');
    expect(res.body.converted.currency).toBe('KES');
    expect(res.body.converted.amount).toBeGreaterThan(0);
  });

  test('GET /api/v1/currencies/convert validates params', async () => {
    const res = await request(app).get('/api/v1/currencies/convert');
    expect(res.status).toBe(400);
  });

  test('GET /api/v1/export/expenses without auth returns 401', async () => {
    const res = await request(app).get('/api/v1/export/expenses');
    expect(res.status).toBe(401);
  });

  test('GET /api/v1/export/incomes without auth returns 401', async () => {
    const res = await request(app).get('/api/v1/export/incomes');
    expect(res.status).toBe(401);
  });

  test('GET /api/v1/analytics/seasonal without auth returns 401', async () => {
    const res = await request(app).get('/api/v1/analytics/seasonal');
    expect(res.status).toBe(401);
  });

  test('POST /api/v1/ocr/receipt without auth returns 401', async () => {
    const res = await request(app).post('/api/v1/ocr/receipt').send({ ocrText: 'test' });
    expect(res.status).toBe(401);
  });

  test('GET /api/v1/ai/status returns AI configuration', async () => {
    const res = await request(app).get('/api/v1/ai/status');
    expect(res.status).toBe(200);
    expect(res.body.features).toBeDefined();
    expect(res.body.features.smartParse).toBe(true);
    expect(res.body.features.smartCategorize).toBe(true);
    expect(res.body.features.smartInsights).toBe(true);
    expect(res.body.fallback).toBe('rule-based');
  });

  test('POST /api/v1/ai/parse without auth returns 401', async () => {
    const res = await request(app).post('/api/v1/ai/parse').send({ text: '2000 lunch' });
    expect(res.status).toBe(401);
  });

  test('POST /api/v1/ai/categorize without auth returns 401', async () => {
    const res = await request(app).post('/api/v1/ai/categorize').send({ description: 'lunch' });
    expect(res.status).toBe(401);
  });

  test('GET /api/v1/ai/insights without auth returns 401', async () => {
    const res = await request(app).get('/api/v1/ai/insights');
    expect(res.status).toBe(401);
  });
});

describe('LLM Service', () => {
  const {
    isLLMConfigured,
    parseExpenseWithLLM,
    predictCategoryWithLLM,
    generateInsightsWithLLM,
    cleanOCRWithLLM,
  } = require('../src/services/ai/llmService');

  test('isLLMConfigured returns false when no API key set', () => {
    expect(isLLMConfigured()).toBe(false);
  });

  test('parseExpenseWithLLM returns fallback when not configured', async () => {
    const result = await parseExpenseWithLLM('2000 lunch');
    expect(result.success).toBe(false);
    expect(result.fallback).toBe(true);
  });

  test('predictCategoryWithLLM returns fallback when not configured', async () => {
    const result = await predictCategoryWithLLM('lunch', 'Java House');
    expect(result.success).toBe(false);
    expect(result.fallback).toBe(true);
  });

  test('generateInsightsWithLLM returns fallback when not configured', async () => {
    const result = await generateInsightsWithLLM({ totalSpent: 50000 });
    expect(result.success).toBe(false);
    expect(result.fallback).toBe(true);
  });

  test('cleanOCRWithLLM returns fallback when not configured', async () => {
    const result = await cleanOCRWithLLM('Java House\nCoffee 350\nTotal: 350');
    expect(result.success).toBe(false);
    expect(result.fallback).toBe(true);
  });
});
