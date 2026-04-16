/**
 * Áp data-theme trước khi stylesheet tải, để tab mới khớp theme đã lưu
 * (sau khi người dùng đổi theme trong tab trước đó).
 * Khóa phải trùng LS_THEME trong editor.js.
 */
(function () {
  try {
    var v = localStorage.getItem("dailyNoteColorScheme");
    if (v === "light" || v === "dark") {
      document.documentElement.setAttribute("data-theme", v);
    }
  } catch (e) {
    /* bỏ qua — ví dụ localStorage không khả dụng */
  }
})();
