/**
 * OCR Service — Tesseract.js-based text extraction from receipt images
 *
 * Extracts text from uploaded images using Tesseract.js (runs entirely
 * in Node without any native binaries). A persistent worker is lazily
 * initialised on the first call and reused for subsequent requests to
 * avoid repeated model downloads, cutting per-image latency to ~1-3 s
 * for typical receipt photos.
 *
 * Supports JPEG, PNG, WebP, and BMP inputs. HEIC/HEIF should be
 * converted before passing in (multer delivers JPEG in most cases).
 */

const Tesseract = require('tesseract.js');
const path = require('path');

let worker = null;

/**
 * Lazily create and cache a Tesseract worker.
 * The trained-data file is downloaded once and cached locally.
 */
async function getWorker() {
  if (worker) return worker;

  worker = await Tesseract.createWorker('eng', Tesseract.OEM.DEFAULT, {
    // Cache language data in the project so subsequent starts are fast
    cachePath: path.join(__dirname, '../../.tesseract-cache'),
  });

  return worker;
}

/**
 * Extract text from an image file on disk.
 *
 * @param {string} imagePath — absolute path to the image file
 * @returns {Promise<{ text: string, confidence: number }>}
 */
async function extractTextFromImage(imagePath) {
  const w = await getWorker();
  const { data } = await w.recognize(imagePath);

  return {
    text: (data.text || '').trim(),
    confidence: Math.round(data.confidence) / 100, // 0-1 range
  };
}

/**
 * Extract text from a Base-64-encoded image buffer.
 *
 * @param {string} base64 — raw base64 string (no data-uri prefix)
 * @param {string} [mimeType='image/jpeg']
 * @returns {Promise<{ text: string, confidence: number }>}
 */
async function extractTextFromBase64(base64, mimeType = 'image/jpeg') {
  const buffer = Buffer.from(base64, 'base64');
  const w = await getWorker();
  const { data } = await w.recognize(buffer);

  return {
    text: (data.text || '').trim(),
    confidence: Math.round(data.confidence) / 100,
  };
}

module.exports = { extractTextFromImage, extractTextFromBase64 };
