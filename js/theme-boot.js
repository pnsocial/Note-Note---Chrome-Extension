/**
 * Apply data-theme before stylesheet loads so the new tab matches the saved theme
 * (after the user changed theme in a previous tab).
 * Key must match LS_THEME in editor.js.
 */
(function () {
  try {
    var v = localStorage.getItem("dailyNoteColorScheme");
    if (v === "light" || v === "dark") {
      document.documentElement.setAttribute("data-theme", v);
    }
  } catch (e) {
    /* ignore e.g. localStorage unavailable */
  }
})();
