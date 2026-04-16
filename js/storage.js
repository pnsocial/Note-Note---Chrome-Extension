/**
 * Per-day notes in chrome.storage.local.
 * Each key is YYYY-MM-DD (browser local time).
 */

const STORAGE_KEY = "dailyMarkdownNotesV1";

/** @returns {boolean} false after extension reload / uninstall — chrome APIs unavailable */
export function isExtensionContextValid() {
  try {
    return Boolean(chrome?.runtime?.id);
  } catch {
    return false;
  }
}

/**
 * @returns {Promise<Record<string, string>>}
 */
export function loadNotes() {
  if (!isExtensionContextValid()) {
    return Promise.reject(
      new Error("Extension context invalidated.")
    );
  }
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      const raw = result[STORAGE_KEY];
      if (!raw || typeof raw !== "object") {
        resolve({});
        return;
      }
      resolve(raw);
    });
  });
}

/**
 * Overwrite one day’s content (plain Markdown string).
 * @param {string} dateKey YYYY-MM-DD
 * @param {string} text
 */
export function saveDay(dateKey, text) {
  if (!isExtensionContextValid()) {
    return Promise.reject(
      new Error("Extension context invalidated.")
    );
  }
  return loadNotes().then((notes) => {
    notes[dateKey] = text;
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [STORAGE_KEY]: notes }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  });
}
