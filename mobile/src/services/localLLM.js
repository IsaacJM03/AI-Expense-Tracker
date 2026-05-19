/**
 * On-device LLM service using llama.rn (llama.cpp bindings).
 * Model: Qwen 2.5 1.5B Instruct (Q4_K_M, ~0.9 GB)
 *
 * The model is downloaded once to DocumentDirectory and persists across
 * app launches. No data leaves the device at inference time.
 */

import { initLlama } from 'llama.rn';
import * as FileSystem from 'expo-file-system/legacy';

const MODEL_FILENAME = 'qwen2.5-1.5b-instruct-q4_k_m.gguf';

// HuggingFace public GGUF — no auth required
const MODEL_URL =
  'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf';

export const MODEL_PATH = FileSystem.documentDirectory + MODEL_FILENAME;

// Singleton context — stays loaded after first init so re-opening chat is instant
let _context = null;
let _activeDownload = null;

// ─── Model file helpers ──────────────────────────────────────────────────────

export async function isModelDownloaded() {
  try {
    const info = await FileSystem.getInfoAsync(MODEL_PATH, { size: true });
    // Sanity-check: the real file should be > 800 MB
    return info.exists && (info.size ?? 0) > 800_000_000;
  } catch {
    return false;
  }
}

/**
 * Download the GGUF model to DocumentDirectory.
 * @param {(progress: number) => void} onProgress - 0.0 → 1.0
 * @returns {Promise<string>} local file URI when complete
 */
export async function downloadModel(onProgress) {
  if (_activeDownload) {
    throw new Error('Download already in progress');
  }

  const task = FileSystem.createDownloadResumable(
    MODEL_URL,
    MODEL_PATH,
    {},
    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      if (totalBytesExpectedToWrite > 0) {
        onProgress?.(totalBytesWritten / totalBytesExpectedToWrite);
      }
    }
  );

  _activeDownload = task;
  try {
    const result = await task.downloadAsync();
    _activeDownload = null;
    if (!result?.uri) throw new Error('Download produced no file');
    return result.uri;
  } catch (err) {
    _activeDownload = null;
    // Clean up any partial file so next attempt starts fresh
    try { await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true }); } catch {}
    throw err;
  }
}

export async function cancelDownload() {
  if (_activeDownload) {
    await _activeDownload.pauseAsync();
    _activeDownload = null;
    try { await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true }); } catch {}
  }
}

// ─── Context management ──────────────────────────────────────────────────────

/**
 * Initialize (or return existing) llama context.
 * Throws if model is not downloaded.
 */
export async function getContext() {
  if (_context) return _context;

  const downloaded = await isModelDownloaded();
  if (!downloaded) throw new Error('Model not downloaded. Download it first.');

  _context = await initLlama({
    model: MODEL_PATH,
    n_ctx: 2048,
    n_batch: 512,
    n_threads: 4,
    n_gpu_layers: 1,    // GPU acceleration where supported
    use_mlock: false,
  });

  return _context;
}

export async function releaseContext() {
  if (_context) {
    await _context.release();
    _context = null;
  }
}

// ─── Inference ───────────────────────────────────────────────────────────────

/**
 * Chat with the on-device model.
 *
 * @param {{ role: 'user'|'assistant', content: string }[]} history - prior turns
 * @param {object|null} financialSnapshot - optional data for system context
 * @returns {Promise<string>} assistant reply
 */
export async function chat(history, financialSnapshot) {
  const ctx = await getContext();

  const result = await ctx.completion({
    messages: [
      { role: 'system', content: buildSystemPrompt(financialSnapshot) },
      ...history,
    ],
    n_predict: 350,
    temperature: 0.7,
    top_p: 0.9,
    min_p: 0.05,
    stop: ['<|im_end|>', '</s>', '<|endoftext|>'],
  });

  return result.text.trim();
}

function buildSystemPrompt(data) {
  let prompt =
    'You are a personal finance assistant inside a mobile expense tracker app. ' +
    'Give concise, practical, specific advice — keep answers under 3 sentences unless detail is needed. ' +
    'Always use the currency the user mentions; default to KES.';

  if (!data) return prompt;

  prompt += '\n\nUser financial snapshot:';
  if (data.totalSpent != null)
    prompt += `\n- Spent this month: ${data.currency ?? 'KES'} ${Math.round(data.totalSpent).toLocaleString()}`;
  if (data.income != null)
    prompt += `\n- Income this month: ${data.currency ?? 'KES'} ${Math.round(data.income).toLocaleString()}`;
  if (data.topCategory)
    prompt += `\n- Biggest spending category: ${data.topCategory}`;
  if (data.transactionCount)
    prompt += `\n- Transactions this month: ${data.transactionCount}`;
  if (data.daysRemaining != null)
    prompt += `\n- Days remaining in month: ${data.daysRemaining}`;

  return prompt;
}
