import { showToast } from './ui.js';
import { getCurrentLang } from './i18n.js';

/**
 * Share text via native share API or clipboard.
 * @param {string} text - The text to share
 * @param {object} toastMessages - Translated toast messages
 * @param {string} toastMessages.copied - Message when copied to clipboard
 * @param {string} toastMessages.failed - Message when copy fails
 */
export async function share(text, { copied, failed } = {}) {
  const lang = getCurrentLang();
  const url = lang && lang !== 'en'
    ? `https://notagain.one?lang=${lang}`
    : 'https://notagain.one';

  if (navigator.share) {
    try {
      await navigator.share({ text, url });
      return;
    } catch {
      // User cancelled or not supported — fall through to clipboard
    }
  }

  try {
    // Replace base URL in text with lang-aware URL for clipboard
    const clipboardText = text.replace('notagain.one', url.replace('https://', ''));
    await navigator.clipboard.writeText(clipboardText);
    showToast(copied || 'Copied to clipboard! 📋');
  } catch {
    showToast(failed || 'Could not copy. Try again!');
  }
}
