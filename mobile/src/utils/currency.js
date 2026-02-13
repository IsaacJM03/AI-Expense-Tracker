/**
 * Shared currency formatting utility.
 * Maps currency codes to symbols and provides a single
 * formatCurrency(amount, currencyCode) used across all screens.
 */

const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  KES: 'KSh',
  UGX: 'USh',
  TZS: 'TSh',
  NGN: '₦',
  ZAR: 'R',
  GHS: 'GH₵',
  ETB: 'Br',
  RWF: 'RF',
  INR: '₹',
  JPY: '¥',
  CNY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  BRL: 'R$',
  AED: 'د.إ',
  SAR: '﷼',
  EGP: 'E£',
};

/**
 * Format an amount with the correct currency symbol.
 * @param {number|string} amount
 * @param {string} currencyCode – e.g. 'UGX', 'KES', 'USD'
 * @returns {string} e.g. "USh 12,500"
 */
export function formatCurrency(amount, currencyCode = 'KES') {
  const num = parseFloat(amount) || 0;
  const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;
  return `${symbol} ${num.toLocaleString()}`;
}

export { CURRENCY_SYMBOLS };
