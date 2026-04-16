/**
 * Thanh định dạng cố định trong khung soạn (Markdown).
 * Lưu vùng chọn trước khi blur bằng pointerdown capture trên thanh công cụ.
 */

/**
 * @param {HTMLTextAreaElement} textarea
 * @param {HTMLElement} toolbarRoot
 * @returns {{ hide: () => void }}
 */
export function initFormatToolbar(textarea, toolbarRoot) {
  /** @type {{ s: number, e: number } | null} */
  let savedRange = null;

  function captureSelectionNow() {
    savedRange = {
      s: textarea.selectionStart,
      e: textarea.selectionEnd,
    };
  }

  toolbarRoot.innerHTML = `
    <div class="format-toolbar__inner">
      <span class="format-toolbar__sep" aria-hidden="true"></span>
      ${btn("bold", "In đậm **", iconBold())}
      ${btn("italic", "Nghiêng *", iconItalic())}
      ${btn("underline", "Gạch chân <u>", iconUnderline())}
      <span class="format-toolbar__sep" aria-hidden="true"></span>
      ${btn("ol", "Danh sách đánh số", iconOl())}
      ${btn("ul", "Danh sách gạch đầu", iconUl())}
      ${btn("task", "Danh sách checkbox (GFM)", iconTask())}
      ${btn("outdent", "Giảm thụt", iconOutdent())}
      ${btn("indent", "Tăng thụt", iconIndent())}
      <span class="format-toolbar__sep" aria-hidden="true"></span>
      ${btn("newline", "Xuống dòng", iconNewline())}
    </div>
  `;

  /** Giữ selection trước khi nút cướp focus (capture). */
  toolbarRoot.addEventListener(
    "pointerdown",
    () => {
      if (!textarea.hidden && document.activeElement === textarea) {
        captureSelectionNow();
      }
    },
    true
  );

  toolbarRoot.addEventListener("mousedown", (e) => {
    if ((/** @type {HTMLElement} */ (e.target)).closest("[data-format]")) {
      e.preventDefault();
    }
  });

  toolbarRoot.addEventListener("click", (e) => {
    const t = /** @type {HTMLElement | null} */ (e.target);
    const btnEl = t?.closest?.("[data-format]");
    if (!btnEl) return;
    const action = btnEl.getAttribute("data-format");
    if (!action) return;
    if (!textarea.hidden) {
      textarea.focus();
      if (savedRange) {
        textarea.setSelectionRange(savedRange.s, savedRange.e);
      }
    }
    applyAction(action);
    savedRange = {
      s: textarea.selectionStart,
      e: textarea.selectionEnd,
    };
  });

  function rangeOrLive() {
    if (savedRange && !textarea.hidden) {
      const s = savedRange.s;
      const e = savedRange.e;
      return { s: Math.min(s, e), e: Math.max(s, e) };
    }
    const s = textarea.selectionStart;
    const e = textarea.selectionEnd;
    return { s: Math.min(s, e), e: Math.max(s, e) };
  }

  function applyWrap(before, after) {
    const v = textarea.value;
    let { s, e } = rangeOrLive();
    const mid = v.slice(s, e);
    let next;
    let ns;
    let ne;
    if (s === e) {
      const ins = before + after;
      next = v.slice(0, s) + ins + v.slice(e);
      textarea.value = next;
      const inner = before.length;
      ns = s + inner;
      ne = s + inner;
    } else {
      next = v.slice(0, s) + before + mid + after + v.slice(e);
      textarea.value = next;
      ns = s + before.length;
      ne = ns + mid.length;
    }
    textarea.focus();
    textarea.setSelectionRange(ns, ne);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function lineBoundsForRange(v, s, e) {
    const start = v.lastIndexOf("\n", s - 1) + 1;
    const endNl = v.indexOf("\n", Math.max(e - 1, 0));
    const end = endNl === -1 ? v.length : endNl;
    return { start, end };
  }

  function applyListOrdered() {
    const v = textarea.value;
    let { s, e } = rangeOrLive();
    const { start, end } = lineBoundsForRange(v, s, e);
    const block = v.slice(start, end);
    const lines = block.split("\n");
    const stripped = lines.map((line) =>
      line
        .replace(/^\s*\d+\.\s+/, "")
        .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/, "")
        .replace(/^\s*[-*+]\s+/, "")
    );
    const nextLines = stripped.map((line, i) => `${i + 1}. ${line}`);
    const next = v.slice(0, start) + nextLines.join("\n") + v.slice(end);
    textarea.value = next;
    const delta = next.length - v.length;
    const ns = s;
    const ne = e + delta;
    textarea.focus();
    textarea.setSelectionRange(ns, ne);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function applyListBullet() {
    const v = textarea.value;
    let { s, e } = rangeOrLive();
    const { start, end } = lineBoundsForRange(v, s, e);
    const block = v.slice(start, end);
    const lines = block.split("\n");
    const stripped = lines.map((line) =>
      line
        .replace(/^\s*\d+\.\s+/, "")
        .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/, "")
        .replace(/^\s*[-*+]\s+/, "")
    );
    const nextLines = stripped.map((line) => `- ${line}`);
    const next = v.slice(0, start) + nextLines.join("\n") + v.slice(end);
    textarea.value = next;
    const delta = next.length - v.length;
    textarea.focus();
    textarea.setSelectionRange(s, e + delta);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function applyListTask() {
    const v = textarea.value;
    let { s, e } = rangeOrLive();
    const { start, end } = lineBoundsForRange(v, s, e);
    const block = v.slice(start, end);
    const lines = block.split("\n");
    const stripped = lines.map((line) =>
      line
        .replace(/^\s*\d+\.\s+/, "")
        .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/, "")
        .replace(/^\s*[-*+]\s+/, "")
    );
    const nextLines = stripped.map((line) => `- [ ] ${line}`);
    const next = v.slice(0, start) + nextLines.join("\n") + v.slice(end);
    textarea.value = next;
    const delta = next.length - v.length;
    textarea.focus();
    textarea.setSelectionRange(s, e + delta);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function applyIndent(dir) {
    const v = textarea.value;
    let { s, e } = rangeOrLive();
    const { start, end } = lineBoundsForRange(v, s, e);
    const block = v.slice(start, end);
    const lines = block.split("\n");
    const nextLines = lines.map((line) => {
      if (dir > 0) {
        return "  " + line;
      }
      if (line.startsWith("  ")) {
        return line.slice(2);
      }
      if (line.startsWith("\t")) {
        return line.slice(1);
      }
      return line;
    });
    const next = v.slice(0, start) + nextLines.join("\n") + v.slice(end);
    textarea.value = next;
    const d = next.length - v.length;
    textarea.focus();
    textarea.setSelectionRange(s, e + d);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function applyNewline() {
    const v = textarea.value;
    let { s, e } = rangeOrLive();
    const ins = "\n";
    const next = v.slice(0, s) + ins + v.slice(e);
    textarea.value = next;
    const pos = s + ins.length;
    textarea.focus();
    textarea.setSelectionRange(pos, pos);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function applyAction(action) {
    switch (action) {
      case "bold":
        applyWrap("**", "**");
        break;
      case "italic":
        applyWrap("_", "_");
        break;
      case "underline":
        applyWrap("<u>", "</u>");
        break;
      case "ol":
        applyListOrdered();
        break;
      case "ul":
        applyListBullet();
        break;
      case "task":
        applyListTask();
        break;
      case "indent":
        applyIndent(1);
        break;
      case "outdent":
        applyIndent(-1);
        break;
      case "newline":
        applyNewline();
        break;
      default:
        break;
    }
  }

  return {
    hide() {},
  };
}

function btn(id, title, iconHtml) {
  return `<button type="button" class="format-toolbar__btn" data-format="${id}" title="${escapeAttr(
    title
  )}" aria-label="${escapeAttr(title)}">${iconHtml}</button>`;
}

function escapeAttr(s) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function iconBold() {
  return `<span class="format-toolbar__glyph format-toolbar__glyph--text" aria-hidden="true">B</span>`;
}
function iconItalic() {
  return `<span class="format-toolbar__glyph format-toolbar__glyph--italic" aria-hidden="true">I</span>`;
}
function iconUnderline() {
  return `<span class="format-toolbar__glyph format-toolbar__glyph--text" aria-hidden="true"><u>U</u></span>`;
}
function iconOl() {
  return `<span class="format-toolbar__glyph format-toolbar__glyph--list" aria-hidden="true">1≡</span>`;
}
function iconUl() {
  return `<span class="format-toolbar__glyph format-toolbar__glyph--list" aria-hidden="true">•≡</span>`;
}
function iconTask() {
  return `<span class="format-toolbar__glyph format-toolbar__glyph--task" aria-hidden="true">☐</span>`;
}
function iconOutdent() {
  return `<span class="format-toolbar__glyph" aria-hidden="true">⇤</span>`;
}
function iconIndent() {
  return `<span class="format-toolbar__glyph" aria-hidden="true">⇥</span>`;
}
function iconNewline() {
  return `<span class="format-toolbar__glyph" aria-hidden="true">↵</span>`;
}
