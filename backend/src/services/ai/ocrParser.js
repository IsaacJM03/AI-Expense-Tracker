/**
 * OCR Receipt Processing Service
 *
 * Processes receipt images and extracts structured data.
 *
 * Architecture:
 *   1. Receive base64-encoded image
 *   2. Extract text using OCR (Tesseract/Cloud Vision - pluggable)
 *   3. Parse extracted text into structured expense data
 *   4. Return both raw OCR text and parsed result
 *
 * Current implementation: Rule-based text parsing of OCR output.
 * Production: Integrate with Google Cloud Vision API or Tesseract.
 */

const MERCHANT_PATTERNS = [
  /(?:welcome to|thank you for visiting)\s+(.+)/i,
  /^([A-Z][A-Za-z\s&']+(?:Ltd|LLC|Inc|Co|Corp|Restaurant|Cafe|Shop|Store|Market|Supermarket)?)/m,
];

const TOTAL_PATTERNS = [
  /(?:total|grand total|amount due|total due|balance due)[:\s]*(?:KES|KSh|Ksh|USD|\$|€|£)?\s*([\d,]+\.?\d*)/i,
  /(?:KES|KSh|Ksh|USD|\$|€|£)\s*([\d,]+\.?\d*)\s*(?:total)/i,
  /(?:TOTAL)\s+([\d,]+\.?\d*)/,
];

const DATE_PATTERNS = [
  /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/,
  /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
  /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i,
];

const LINE_ITEM_PATTERN = /^(.+?)\s+([\d,]+\.?\d*)\s*$/;

function parseReceiptText(ocrText) {
  if (!ocrText || typeof ocrText !== 'string') {
    return { success: false, error: 'No OCR text provided' };
  }

  const lines = ocrText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let merchant = null;
  let total = null;
  let date = null;
  const lineItems = [];

  // Extract merchant
  for (const pattern of MERCHANT_PATTERNS) {
    for (const line of lines.slice(0, 5)) { // Merchant usually in first 5 lines
      const match = line.match(pattern);
      if (match) {
        merchant = match[1].trim();
        break;
      }
    }
    if (merchant) break;
  }

  // If no pattern matched, use first non-empty line as merchant
  if (!merchant && lines.length > 0) {
    merchant = lines[0];
  }

  // Extract total
  const fullText = ocrText;
  for (const pattern of TOTAL_PATTERNS) {
    const match = fullText.match(pattern);
    if (match) {
      total = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }

  // Extract date
  for (const pattern of DATE_PATTERNS) {
    const match = fullText.match(pattern);
    if (match) {
      const parsed = new Date(match[1]);
      if (!isNaN(parsed.getTime())) {
        date = parsed.toISOString().split('T')[0];
      }
      break;
    }
  }

  // Extract line items
  for (const line of lines) {
    const match = line.match(LINE_ITEM_PATTERN);
    if (match) {
      const itemName = match[1].trim();
      const itemAmount = parseFloat(match[2].replace(/,/g, ''));
      // Skip lines that look like the total
      if (!/total|subtotal|tax|vat|change|cash|card/i.test(itemName) && itemAmount > 0) {
        lineItems.push({ name: itemName, amount: itemAmount });
      }
    }
  }

  // If no total found, sum line items
  if (total === null && lineItems.length > 0) {
    total = lineItems.reduce((sum, item) => sum + item.amount, 0);
  }

  const confidence = calculateConfidence({ merchant, total, date, lineItems });

  return {
    success: total !== null,
    data: {
      merchant,
      total,
      date: date || new Date().toISOString().split('T')[0],
      lineItems,
      confidence,
    },
    error: total === null ? 'Could not extract total amount' : null,
  };
}

function calculateConfidence({ merchant, total, date, lineItems }) {
  let score = 0;
  if (total !== null) score += 0.4;
  if (merchant) score += 0.2;
  if (date) score += 0.2;
  if (lineItems.length > 0) score += 0.2;
  return Math.round(score * 100) / 100;
}

module.exports = { parseReceiptText, MERCHANT_PATTERNS, TOTAL_PATTERNS, DATE_PATTERNS };
