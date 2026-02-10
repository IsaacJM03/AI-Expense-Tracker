/**
 * Multi-Currency Support Service
 *
 * Provides currency conversion and management for expenses
 * tracked in different currencies.
 *
 * Uses a static rate table for offline-first support.
 * Production: integrate with a live exchange rate API (e.g., Open Exchange Rates).
 */

// Static exchange rates relative to USD (for offline fallback)
const EXCHANGE_RATES = {
  USD: 1.0,
  KES: 153.50,
  EUR: 0.92,
  GBP: 0.79,
  NGN: 1550.00,
  ZAR: 18.20,
  GHS: 15.50,
  TZS: 2690.00,
  UGX: 3780.00,
  INR: 83.50,
  JPY: 149.80,
  CNY: 7.24,
  CAD: 1.36,
  AUD: 1.54,
  BRL: 4.97,
};

const CURRENCY_SYMBOLS = {
  USD: '$', KES: 'KSh', EUR: '€', GBP: '£', NGN: '₦',
  ZAR: 'R', GHS: '₵', TZS: 'TSh', UGX: 'USh', INR: '₹',
  JPY: '¥', CNY: '¥', CAD: 'C$', AUD: 'A$', BRL: 'R$',
};

const CURRENCY_INFO = Object.keys(EXCHANGE_RATES).map(code => ({
  code,
  symbol: CURRENCY_SYMBOLS[code] || code,
  rate: EXCHANGE_RATES[code],
}));

function convert(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return amount;

  const fromRate = EXCHANGE_RATES[fromCurrency];
  const toRate = EXCHANGE_RATES[toCurrency];

  if (!fromRate || !toRate) {
    throw new Error(`Unsupported currency: ${!fromRate ? fromCurrency : toCurrency}`);
  }

  // Convert to USD first, then to target
  const usdAmount = amount / fromRate;
  return Math.round(usdAmount * toRate * 100) / 100;
}

function formatCurrency(amount, currencyCode) {
  const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;
  return `${symbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getSupportedCurrencies() {
  return CURRENCY_INFO;
}

module.exports = {
  convert,
  formatCurrency,
  getSupportedCurrencies,
  EXCHANGE_RATES,
  CURRENCY_SYMBOLS,
};
