/**
 * Bootstraps the UI: only today's note is editable; debounced save and save on tab leave.
 */

import {
  loadNotes,
  saveDay,
  isExtensionContextValid,
} from "./storage.js";
import { renderMarkdownToHtml } from "./renderer.js";
import { initFormatToolbar } from "./format-toolbar.js";
import { exportSingleMarkdownFile } from "./export-md.js";
import { downloadNotesAsZip } from "./zip-notes.js";
import { mountMiniCalendar } from "./mini-calendar.js";

const DEBOUNCE_MS = 450;
const LS_HISTORY_COLLAPSED = "dailyNoteHistoryCollapsed";
/** @see js/theme-boot.js — must match localStorage key */
const LS_THEME = "dailyNoteColorScheme";
const SEARCH_DEBOUNCE_MS = 120;

/** Shortcuts: Ctrl+Shift+… / ⌘⇧… — uses ev.code (KeyY / KeyG) for stable keyboard layout */
const TITLE_SUFFIX_THEME = " (Ctrl+Shift+Y · ⌘⇧Y)";
const TITLE_SUFFIX_SEARCH = " (Ctrl+Shift+G · ⌘⇧G)";

const ICON_TOOLBAR_MOON = `<svg class="toolbar-btn__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

const ICON_TOOLBAR_SUN = `<svg class="toolbar-btn__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;

const ICON_CHEVRON_UP = `<svg class="toolbar-btn__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>`;

const ICON_CHEVRON_DOWN = `<svg class="toolbar-btn__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;

const ICON_EXPORT_DOWNLOAD = `<svg class="note-export-btn__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;

/** Listener registered to reload when tab becomes visible after dead extension context. */
let reloadWhenVisibleScheduled = false;

/**
 * After reloading the extension on chrome://extensions, the old new tab page may still run
 * but chrome.storage / runtime is invalid — refresh the tab (F5).
 * When the tab is hidden (visibilitychange / save on tab switch), avoid reload() immediately
 * — defer until the tab is visible again to avoid odd warnings/stacks on chrome://extensions.
 * @param {unknown} [err]
 * @param {{ suppressReload?: boolean }} [opts] suppressReload: during unload (pagehide/beforeunload), do not reload.
 * @returns {boolean} true if the extension context is treated as dead (handled or reload scheduled).
 */
function reloadIfExtensionContextDead(err, opts = {}) {
  const suppressReload = opts.suppressReload === true;
  const text =
    err == null
      ? ""
      : typeof err === "string"
        ? err
        : String(
            /** @type {{ message?: unknown }} */ (err).message ?? err
          );
  const dead =
    !isExtensionContextValid() ||
    /context invalidated|extension has been updated|receiving end does not exist/i.test(
      text
    );
  if (!dead) {
    return false;
  }

  if (suppressReload) {
    return true;
  }

  if (document.hidden) {
    if (!reloadWhenVisibleScheduled) {
      reloadWhenVisibleScheduled = true;
      document.addEventListener("visibilitychange", onVisibleMaybeReload);
    }
    return true;
  }

  console.warn(
    "Extension was reloaded — refresh this tab to save and load normally."
  );
  window.location.reload();
  return true;
}

function onVisibleMaybeReload() {
  if (document.visibilityState !== "visible") {
    return;
  }
  document.removeEventListener("visibilitychange", onVisibleMaybeReload);
  reloadWhenVisibleScheduled = false;
  if (!isExtensionContextValid()) {
    console.warn(
      "Extension was reloaded — refresh this tab to save and load normally."
    );
    window.location.reload();
  }
}

/** @returns {string} YYYY-MM-DD in local time */
function getLocalDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function compareDateKeys(a, b) {
  return a.localeCompare(b);
}

/**
 * @param {Record<string, string>} notes
 * @param {string} todayKey
 * @returns {string[]}
 */
function pastDateKeys(notes, todayKey) {
  return Object.keys(notes)
    .filter((k) => k < todayKey)
    .filter((k) => String(notes[k] ?? "").trim() !== "")
    .sort(compareDateKeys);
}

/**
 * @param {string} dateKey
 * @param {string} text
 * @param {string} query
 */
function noteMatchesSearch(dateKey, text, query) {
  const n = query.trim().toLowerCase();
  if (!n) {
    return true;
  }
  const t = String(text ?? "");
  return dateKey.toLowerCase().includes(n) || t.toLowerCase().includes(n);
}

/** @returns {boolean} */
function isEffectiveDarkTheme() {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark") {
    return true;
  }
  if (attr === "light") {
    return false;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function updateThemeToggleUi() {
  if (!els.btnThemeToggle) {
    return;
  }
  const dark = isEffectiveDarkTheme();
  els.btnThemeToggle.innerHTML = dark ? ICON_TOOLBAR_SUN : ICON_TOOLBAR_MOON;
  els.btnThemeToggle.title = `${
    dark ? "Switch to light theme" : "Switch to dark theme"
  }${TITLE_SUFFIX_THEME}`;
  els.btnThemeToggle.setAttribute(
    "aria-label",
    dark ? "Switch to light theme" : "Switch to dark theme"
  );
  els.btnThemeToggle.setAttribute("aria-pressed", dark ? "true" : "false");
}

function initThemeFromStorage() {
  try {
    const v = localStorage.getItem(LS_THEME);
    if (v === "light" || v === "dark") {
      document.documentElement.setAttribute("data-theme", v);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    updateThemeToggleUi();
  } catch {
    document.documentElement.removeAttribute("data-theme");
    try {
      updateThemeToggleUi();
    } catch {
      /* ignore — do not block tab init */
    }
  }
}

function toggleManualTheme() {
  const dark = isEffectiveDarkTheme();
  try {
    if (dark) {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem(LS_THEME, "light");
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem(LS_THEME, "dark");
    }
  } catch {
    document.documentElement.setAttribute("data-theme", dark ? "light" : "dark");
  }
  updateThemeToggleUi();
}

const els = {
  metaLine: /** @type {HTMLElement} */ (document.getElementById("meta-line")),
  historyPanel: /** @type {HTMLElement} */ (
    document.getElementById("history-panel")
  ),
  historyBody: /** @type {HTMLElement} */ (
    document.getElementById("history-body")
  ),
  legacyEntries: /** @type {HTMLElement} */ (
    document.getElementById("legacy-entries")
  ),
  todayHeading: /** @type {HTMLElement} */ (
    document.getElementById("today-heading")
  ),
  todayEditorShell: /** @type {HTMLElement} */ (
    document.getElementById("today-editor-shell")
  ),
  todayEditorChrome: /** @type {HTMLElement | null} */ (
    document.getElementById("today-editor-chrome")
  ),
  formatToolbar: /** @type {HTMLElement | null} */ (
    document.getElementById("format-toolbar")
  ),
  todayEditor: /** @type {HTMLTextAreaElement} */ (
    document.getElementById("today-editor")
  ),
  todayRendered: /** @type {HTMLElement} */ (
    document.getElementById("today-rendered")
  ),
  btnHistoryToggle: /** @type {HTMLButtonElement | null} */ (
    document.getElementById("btn-history-toggle")
  ),
  btnExportToday: /** @type {HTMLButtonElement | null} */ (
    document.getElementById("btn-export-today")
  ),
  btnThemeToggle: /** @type {HTMLButtonElement | null} */ (
    document.getElementById("btn-theme-toggle")
  ),
  btnExportAllZip: /** @type {HTMLButtonElement | null} */ (
    document.getElementById("btn-export-all-zip")
  ),
  btnSearchToggle: /** @type {HTMLButtonElement | null} */ (
    document.getElementById("btn-search-toggle")
  ),
  headerSearchRow: /** @type {HTMLElement | null} */ (
    document.getElementById("header-search-row")
  ),
  noteSearch: /** @type {HTMLInputElement | null} */ (
    document.getElementById("note-search")
  ),
  searchHint: /** @type {HTMLElement | null} */ (
    document.getElementById("search-hint")
  ),
  todaySection: /** @type {HTMLElement | null} */ (
    document.getElementById("today-section")
  ),
  btnCalendarToggle: /** @type {HTMLButtonElement | null} */ (
    document.getElementById("btn-calendar-toggle")
  ),
  calendarPopover: /** @type {HTMLElement | null} */ (
    document.getElementById("calendar-popover")
  ),
  miniCalendarRoot: /** @type {HTMLElement | null} */ (
    document.getElementById("mini-calendar-root")
  ),
  wordStatsCount: /** @type {HTMLElement | null} */ (
    document.getElementById("word-stats-count")
  ),
  wordStatsRead: /** @type {HTMLElement | null} */ (
    document.getElementById("word-stats-read")
  ),
};

/** @returns {boolean} true when history list is collapsed */
function loadHistoryCollapsedPreference() {
  try {
    return localStorage.getItem(LS_HISTORY_COLLAPSED) === "1";
  } catch {
    return false;
  }
}

function saveHistoryCollapsedPreference(collapsed) {
  try {
    localStorage.setItem(LS_HISTORY_COLLAPSED, collapsed ? "1" : "0");
  } catch {
    /* ignore */
  }
}

let historyCollapsed = loadHistoryCollapsedPreference();
/** Search box is open (shown after clicking the search icon). */
let searchPanelOpen = false;

function applyHistoryCollapsedToDom() {
  if (!els.historyBody || !els.btnHistoryToggle) {
    return;
  }
  const q = (els.noteSearch?.value ?? "").trim();
  const forceExpand = searchPanelOpen && q.length > 0;
  els.historyBody.classList.toggle("history-body--collapsed", historyCollapsed);
  els.historyBody.classList.toggle("history-body--force-expand", forceExpand);
  const visuallyExpanded = !historyCollapsed || forceExpand;
  els.btnHistoryToggle.setAttribute(
    "aria-expanded",
    visuallyExpanded ? "true" : "false"
  );
  els.btnHistoryToggle.innerHTML = visuallyExpanded
    ? ICON_CHEVRON_UP
    : ICON_CHEVRON_DOWN;
  const historyLabel = visuallyExpanded ? "Collapse history" : "Expand history";
  els.btnHistoryToggle.title = historyLabel;
  els.btnHistoryToggle.setAttribute("aria-label", historyLabel);
}

function toggleHistoryPanel() {
  historyCollapsed = !historyCollapsed;
  saveHistoryCollapsedPreference(historyCollapsed);
  applyHistoryCollapsedToDom();
}

let currentTodayKey = getLocalDateKey();
let notesCache = {};
let saveTimer = null;
let pendingText = null;
let searchDebounceTimer = null;

/** @type {{ refresh: () => void } | null} */
let miniCalendarApi = null;

/** Calendar popover open (closes on Escape / outside click / date pick). */
let calendarPopoverOpen = false;

/**
 * Word count by whitespace (plain Markdown).
 * @param {string} s
 */
function countWords(s) {
  const t = String(s ?? "").trim();
  if (!t) {
    return 0;
  }
  return t.split(/\s+/).length;
}

/**
 * Estimated reading time (~200 words per minute).
 * @param {number} words
 */
function readingMinutesFromWords(words) {
  if (words <= 0) {
    return 0;
  }
  return Math.max(1, Math.ceil(words / 200));
}

function updateWordStats() {
  const raw = els.todayEditor.value;
  const words = countWords(raw);
  const mins = readingMinutesFromWords(words);
  if (els.wordStatsCount) {
    els.wordStatsCount.textContent = words.toLocaleString("en-US");
  }
  if (els.wordStatsRead) {
    els.wordStatsRead.textContent = mins.toLocaleString("en-US");
  }
}

function closeCalendarPopover() {
  if (!calendarPopoverOpen) {
    return;
  }
  calendarPopoverOpen = false;
  if (els.calendarPopover) {
    els.calendarPopover.hidden = true;
  }
  if (els.btnCalendarToggle) {
    els.btnCalendarToggle.setAttribute("aria-expanded", "false");
    els.btnCalendarToggle.title =
      "Month calendar — click a day to scroll to that note";
    els.btnCalendarToggle.setAttribute("aria-label", "Open month calendar");
  }
}

function openCalendarPopover() {
  if (!els.calendarPopover || !els.btnCalendarToggle) {
    return;
  }
  calendarPopoverOpen = true;
  els.calendarPopover.hidden = false;
  els.btnCalendarToggle.setAttribute("aria-expanded", "true");
  els.btnCalendarToggle.title = "Close month calendar";
  els.btnCalendarToggle.setAttribute("aria-label", "Close month calendar");
  miniCalendarApi?.refresh();
}

function toggleCalendarPopover() {
  if (calendarPopoverOpen) {
    closeCalendarPopover();
  } else {
    openCalendarPopover();
  }
}

/**
 * @param {MouseEvent} ev
 */
function onDocumentPointerDownCalendar(ev) {
  if (!calendarPopoverOpen) {
    return;
  }
  const t = ev.target;
  if (!(t instanceof Node)) {
    return;
  }
  if (els.calendarPopover?.contains(t)) {
    return;
  }
  if (els.btnCalendarToggle?.contains(t)) {
    return;
  }
  closeCalendarPopover();
}

/**
 * @param {KeyboardEvent} ev
 */
function onDocumentKeydownCalendarEscape(ev) {
  if (ev.key !== "Escape" || !calendarPopoverOpen) {
    return;
  }
  ev.preventDefault();
  closeCalendarPopover();
}

function getMergedNotesSnapshot() {
  const merged = { ...notesCache };
  merged[currentTodayKey] = els.todayEditor.value;
  return merged;
}

function updateZipAllButtonState() {
  if (!els.btnExportAllZip) {
    return;
  }
  const merged = getMergedNotesSnapshot();
  let n = 0;
  for (const k of Object.keys(merged)) {
    if (
      /^\d{4}-\d{2}-\d{2}$/.test(k) &&
      String(merged[k] ?? "").trim() !== ""
    ) {
      n += 1;
    }
  }
  els.btnExportAllZip.disabled = n === 0;
}

/**
 * @param {string} dateKey YYYY-MM-DD
 */
function scrollToDateKey(dateKey) {
  if (dateKey > currentTodayKey) {
    return;
  }
  if (dateKey === currentTodayKey) {
    els.todaySection?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const article = els.legacyEntries.querySelector(
    `article[data-date="${dateKey}"]`
  );
  if (article) {
    historyCollapsed = false;
    saveHistoryCollapsedPreference(false);
    applyHistoryCollapsedToDom();
    requestAnimationFrame(() => {
      article.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return;
  }
  if (!els.historyPanel.hidden) {
    historyCollapsed = false;
    saveHistoryCollapsedPreference(false);
    applyHistoryCollapsedToDom();
    els.historyPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function exportAllNotesZip() {
  if (!isExtensionContextValid()) {
    reloadIfExtensionContextDead();
    return;
  }
  try {
    await flushSave();
    const merged = getMergedNotesSnapshot();
    const stamp = getLocalDateKey().replace(/-/g, "");
    if (!downloadNotesAsZip(merged, `daily-notes-${stamp}`)) {
      window.alert("No notes to include in the ZIP.");
    }
  } catch (err) {
    if (reloadIfExtensionContextDead(err)) {
      return;
    }
    window.alert("Could not create the ZIP file.");
  }
}

function setMeta() {
  const now = new Date();
  const opts = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  els.metaLine.textContent = `${now.toLocaleDateString("en-US", opts)} · ${currentTodayKey}`;
}

function renderLegacy() {
  const past = pastDateKeys(notesCache, currentTodayKey);
  const hasLegacy = past.length > 0;
  const q = (els.noteSearch?.value ?? "").trim();
  const pastFiltered =
    !q ? past : past.filter((k) => noteMatchesSearch(k, notesCache[k] ?? "", q));

  const todayText = notesCache[currentTodayKey] ?? els.todayEditor.value ?? "";
  const todayMatch = Boolean(q && noteMatchesSearch(currentTodayKey, todayText, q));

  if (els.todaySection) {
    els.todaySection.classList.toggle("today-section--search-hit", todayMatch);
  }

  if (els.searchHint) {
    if (!q || !searchPanelOpen) {
      els.searchHint.hidden = true;
      els.searchHint.textContent = "";
    } else {
      els.searchHint.hidden = false;
      const nLegacy = pastFiltered.length;
      if (todayMatch && nLegacy > 0) {
        els.searchHint.textContent = `Match in today’s note (above). ${nLegacy} day(s) in history match.`;
      } else if (todayMatch && nLegacy === 0) {
        els.searchHint.textContent =
          "Only today’s note (above) matches.";
      } else if (!todayMatch && nLegacy > 0) {
        els.searchHint.textContent = `${nLegacy} day(s) in history match.`;
      } else {
        els.searchHint.textContent = "No results.";
      }
    }
  }

  els.historyPanel.hidden = !hasLegacy;
  if (els.btnHistoryToggle) {
    els.btnHistoryToggle.disabled = !hasLegacy;
  }

  els.legacyEntries.replaceChildren();

  if (q && hasLegacy && pastFiltered.length === 0) {
    const empty = document.createElement("p");
    empty.className = "hint legacy-search-empty";
    empty.textContent =
      "No history days match this search.";
    els.legacyEntries.append(empty);
  }

  for (const dateKey of pastFiltered) {
    const text = notesCache[dateKey];
    if (text == null || String(text).trim() === "") continue;

    const article = document.createElement("article");
    article.className = "legacy-day";
    article.setAttribute("data-date", dateKey);

    const headerRow = document.createElement("div");
    headerRow.className = "legacy-day-header";

    const h = document.createElement("h3");
    h.className = "legacy-day-title";
    h.textContent = dateKey;

    const exportBtn = document.createElement("button");
    exportBtn.type = "button";
    exportBtn.className = "note-export-btn note-export-btn--icon";
    exportBtn.innerHTML = ICON_EXPORT_DOWNLOAD;
    exportBtn.setAttribute("title", `Download ${dateKey}.md`);
    exportBtn.setAttribute("aria-label", `Export note ${dateKey} as Markdown`);
    exportBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!exportSingleMarkdownFile(dateKey, text)) {
        window.alert("Nothing to export.");
      }
    });

    headerRow.append(h, exportBtn);

    const body = document.createElement("div");
    body.className = "markdown-body";
    body.setAttribute("tabindex", "0");
    body.setAttribute("aria-readonly", "true");
    body.innerHTML = renderMarkdownToHtml(text);

    article.append(headerRow, body);
    els.legacyEntries.append(article);
  }

  applyHistoryCollapsedToDom();
  miniCalendarApi?.refresh();
  updateZipAllButtonState();
}

function scheduleSearchRerender() {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }
  searchDebounceTimer = window.setTimeout(() => {
    searchDebounceTimer = null;
    renderLegacy();
  }, SEARCH_DEBOUNCE_MS);
}

function flushSearchRerender() {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = null;
  }
  renderLegacy();
}

function openSearchPanel() {
  searchPanelOpen = true;
  if (els.headerSearchRow) {
    els.headerSearchRow.hidden = false;
  }
  if (els.btnSearchToggle) {
    els.btnSearchToggle.setAttribute("aria-expanded", "true");
    els.btnSearchToggle.title = `Close search${TITLE_SUFFIX_SEARCH}`;
    els.btnSearchToggle.setAttribute("aria-label", "Close search");
  }
  flushSearchRerender();
  window.setTimeout(() => els.noteSearch?.focus(), 0);
}

function closeSearchPanel() {
  searchPanelOpen = false;
  if (els.headerSearchRow) {
    els.headerSearchRow.hidden = true;
  }
  if (els.noteSearch) {
    els.noteSearch.value = "";
  }
  if (els.btnSearchToggle) {
    els.btnSearchToggle.setAttribute("aria-expanded", "false");
    els.btnSearchToggle.title = `Search notes${TITLE_SUFFIX_SEARCH}`;
    els.btnSearchToggle.setAttribute("aria-label", "Search notes");
  }
  flushSearchRerender();
}

function toggleSearchPanel() {
  if (searchPanelOpen) {
    closeSearchPanel();
  } else {
    openSearchPanel();
  }
}

/**
 * Shortcuts: Ctrl/Cmd+Shift+Y toggles theme, Ctrl/Cmd+Shift+G toggles search.
 * @param {KeyboardEvent} ev
 */
function onGlobalShortcut(ev) {
  const mod = ev.ctrlKey || ev.metaKey;
  if (!mod || !ev.shiftKey) {
    return;
  }
  if (ev.code === "KeyY") {
    ev.preventDefault();
    toggleManualTheme();
    if (!els.todayEditor.hidden) {
      els.todayEditor.focus();
    }
    return;
  }
  if (ev.code === "KeyG") {
    ev.preventDefault();
    const wasOpen = searchPanelOpen;
    toggleSearchPanel();
    if (wasOpen && !searchPanelOpen && !els.todayEditor.hidden) {
      els.todayEditor.focus();
    }
    return;
  }
}

/** @param {{ focus?: boolean }} [opts] */
function showEditor(opts = {}) {
  const focus = opts.focus !== false;
  if (els.todayEditorChrome) {
    els.todayEditorChrome.hidden = false;
  }
  els.todayRendered.hidden = true;
  els.todayEditor.hidden = false;
  if (focus) {
    els.todayEditor.focus();
    const len = els.todayEditor.value.length;
    els.todayEditor.setSelectionRange(len, len);
  }
  updateWordStats();
}

/** @param {{ focus?: boolean }} [opts] */
function showRendered(opts = {}) {
  const focus = opts.focus === true;
  if (els.todayEditorChrome) {
    els.todayEditorChrome.hidden = true;
  }
  const raw = els.todayEditor.value;
  els.todayRendered.innerHTML = renderMarkdownToHtml(raw);
  els.todayEditor.hidden = true;
  els.todayRendered.hidden = false;
  if (focus) {
    els.todayRendered.focus();
  }
  updateWordStats();
}

function applyTodayEditor() {
  const text = notesCache[currentTodayKey] ?? "";
  els.todayEditor.value = text;
  els.todayHeading.textContent = `Today · ${currentTodayKey}`;
  if (String(text).trim() === "") {
    showEditor({ focus: false });
  } else {
    showRendered({ focus: false });
  }
}

function scheduleSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = window.setTimeout(() => {
    saveTimer = null;
    flushSave();
  }, DEBOUNCE_MS);
}

/** @param {{ suppressReload?: boolean }} [opts] */
function flushSave(opts = {}) {
  const suppressReload = opts.suppressReload === true;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!isExtensionContextValid()) {
    reloadIfExtensionContextDead(undefined, { suppressReload });
    return Promise.resolve();
  }
  const text = pendingText !== null ? pendingText : els.todayEditor.value;
  pendingText = null;
  notesCache[currentTodayKey] = text;
  return saveDay(currentTodayKey, text).catch((err) => {
    if (reloadIfExtensionContextDead(err, { suppressReload })) {
      return;
    }
    console.error("Save failed:", err);
  });
}

async function refreshFromStorage() {
  try {
    notesCache = await loadNotes();
  } catch (err) {
    if (reloadIfExtensionContextDead(err)) {
      return;
    }
    console.error("Failed to load data:", err);
    notesCache = {};
  }
  setMeta();
  renderLegacy();
  applyTodayEditor();
}

function onEditorInput() {
  pendingText = els.todayEditor.value;
  notesCache[currentTodayKey] = pendingText;
  scheduleSave();
  miniCalendarApi?.refresh();
  updateZipAllButtonState();
  updateWordStats();
  if (searchPanelOpen && els.noteSearch?.value.trim()) {
    scheduleSearchRerender();
  }
}

function onTodayShellFocusOut(ev) {
  const rt = /** @type {Node | null} */ (ev.relatedTarget);
  if (rt && els.todayEditorShell.contains(rt)) {
    return;
  }
  window.setTimeout(() => {
    const ae = document.activeElement;
    if (ae && els.todayEditorShell.contains(ae)) {
      return;
    }
    void flushSave();
    if (!els.todayEditor.hidden) {
      showRendered({ focus: false });
    }
  }, 10);
}

function onRenderedMouseDown(e) {
  e.preventDefault();
  showEditor({ focus: true });
}

async function exportTodayNote() {
  if (!isExtensionContextValid()) {
    reloadIfExtensionContextDead();
    return;
  }
  try {
    await flushSave();
    const raw = notesCache[currentTodayKey] ?? els.todayEditor.value;
    if (!exportSingleMarkdownFile(currentTodayKey, raw)) {
      window.alert("Today’s note is empty — nothing to download.");
    }
  } catch (err) {
    if (reloadIfExtensionContextDead(err)) {
      return;
    }
    console.error("Export failed:", err);
    window.alert("Could not export the file. Try again later.");
  }
}

function checkMidnightRollover() {
  const next = getLocalDateKey();
  if (next !== currentTodayKey) {
    flushSave()
      .catch((err) => {
        reloadIfExtensionContextDead(err);
      })
      .finally(() => {
        if (!isExtensionContextValid()) {
          return;
        }
        currentTodayKey = next;
        pendingText = null;
        void refreshFromStorage();
      });
  }
}

function init() {
  initThemeFromStorage();

  if (els.btnThemeToggle) {
    els.btnThemeToggle.addEventListener("click", () => {
      toggleManualTheme();
    });
  }

  const colorSchemeMq = window.matchMedia("(prefers-color-scheme: dark)");
  colorSchemeMq.addEventListener("change", () => {
    if (!document.documentElement.hasAttribute("data-theme")) {
      updateThemeToggleUi();
    }
  });

  if (els.btnExportAllZip) {
    els.btnExportAllZip.addEventListener("click", () => {
      void exportAllNotesZip();
    });
  }

  if (els.miniCalendarRoot) {
    miniCalendarApi = mountMiniCalendar(els.miniCalendarRoot, {
      getTodayKey: () => currentTodayKey,
      getNotes: () => notesCache,
      onPickDate: (dk) => {
        scrollToDateKey(dk);
        closeCalendarPopover();
      },
    });
  }

  if (els.btnCalendarToggle) {
    els.btnCalendarToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleCalendarPopover();
    });
  }

  document.addEventListener("mousedown", onDocumentPointerDownCalendar, true);
  document.addEventListener(
    "keydown",
    onDocumentKeydownCalendarEscape,
    true
  );

  if (els.btnSearchToggle) {
    els.btnSearchToggle.title = `Search notes${TITLE_SUFFIX_SEARCH}`;
    els.btnSearchToggle.addEventListener("click", () => {
      toggleSearchPanel();
    });
  }

  if (els.noteSearch) {
    els.noteSearch.addEventListener("input", () => {
      scheduleSearchRerender();
    });
    els.noteSearch.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        closeSearchPanel();
      }
    });
  }

  els.todayEditor.addEventListener("input", onEditorInput);
  els.todayEditorShell.addEventListener("focusout", onTodayShellFocusOut);
  els.todayRendered.addEventListener("mousedown", onRenderedMouseDown);

  if (els.btnHistoryToggle) {
    els.btnHistoryToggle.addEventListener("click", () => {
      if (els.btnHistoryToggle.disabled) {
        return;
      }
      toggleHistoryPanel();
    });
  }

  if (els.btnExportToday) {
    els.btnExportToday.addEventListener("click", () => {
      void exportTodayNote();
    });
  }

  applyHistoryCollapsedToDom();

  if (els.formatToolbar) {
    initFormatToolbar(els.todayEditor, els.formatToolbar);
  }

  document.addEventListener("keydown", onGlobalShortcut, true);

  window.addEventListener("pagehide", () => {
    void flushSave({ suppressReload: true });
  });

  window.addEventListener("beforeunload", () => {
    void flushSave({ suppressReload: true });
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      void flushSave();
    }
  });

  window.setInterval(checkMidnightRollover, 60 * 1000);

  refreshFromStorage()
    .then(() => {
      const text = els.todayEditor.value;
      if (String(text).trim() === "") {
        showEditor({ focus: true });
      }
      miniCalendarApi?.refresh();
      updateZipAllButtonState();
    })
    .catch((err) => {
      reloadIfExtensionContextDead(err);
    });
}

init();
