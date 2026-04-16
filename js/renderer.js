/**
 * Markdown → safe HTML (marked + DOMPurify).
 * Requires: js/marked.min.js, js/purify.min.js (globals: marked, DOMPurify).
 */

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const marked = globalThis.marked;
  if (!marked) {
    throw new Error("marked is not loaded (globalThis.marked).");
  }
  marked.setOptions({
    gfm: true,
    breaks: true,
  });
  configured = true;
}

/**
 * @param {string} markdown
 * @returns {string} Sanitized HTML
 */
export function renderMarkdownToHtml(markdown) {
  ensureConfigured();
  const marked = globalThis.marked;
  const DOMPurify = globalThis.DOMPurify;
  if (!DOMPurify) {
    throw new Error("DOMPurify is not loaded (globalThis.DOMPurify).");
  }
  const raw = marked.parse(markdown || "", { async: false });
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
    ADD_TAGS: ["u"],
    ADD_ATTR: ["class", "id", "start"],
  });
}
