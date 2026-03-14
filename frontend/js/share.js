import { showToast } from './ui.js';

/**
 * Share text via native share API or clipboard.
 * @param {string} text - The text to share
 * @param {object} toastMessages - Translated toast messages
 * @param {string} toastMessages.copied - Message when copied to clipboard
 * @param {string} toastMessages.failed - Message when copy fails
 */
export async function share(text, { copied, failed } = {}) {
  if (navigator.share) {
    try {
      await navigator.share({ text, url: 'https://notagain.one' });
      return;
    } catch {
      // User cancelled or not supported — fall through to clipboard
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    showToast(copied || 'Copied to clipboard! 📋');
  } catch {
    showToast(failed || 'Could not copy. Try again!');
  }
}
