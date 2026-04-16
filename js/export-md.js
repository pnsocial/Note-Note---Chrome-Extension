/**
 * Xuất một ghi chú ra file .md (tên = YYYY-MM-DD.md).
 */

/**
 * @param {string} filename
 * @param {string} text
 */
function triggerDownload(filename, text) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * @param {string} dateKey YYYY-MM-DD
 * @param {string} text nội dung Markdown
 * @returns {boolean} false nếu nội dung rỗng (không tải file)
 */
export function exportSingleMarkdownFile(dateKey, text) {
  if (String(text ?? "").trim() === "") {
    return false;
  }
  triggerDownload(`${dateKey}.md`, text);
  return true;
}
