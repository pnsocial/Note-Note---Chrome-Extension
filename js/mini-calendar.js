/**
 * Small month calendar: dot on days with notes; click a day ≤ today to scroll to that entry.
 */

/**
 * @param {HTMLElement} container
 * @param {{
 *   getTodayKey: () => string,
 *   getNotes: () => Record<string, string>,
 *   onPickDate: (dateKey: string) => void,
 * }} api
 */
export function mountMiniCalendar(container, api) {
  let viewYear = new Date().getFullYear();
  let viewMonth = new Date().getMonth();

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function daysInMonth(y, m) {
    return new Date(y, m + 1, 0).getDate();
  }

  function hasNote(notes, dk) {
    return String(notes[dk] ?? "").trim() !== "";
  }

  function render() {
    const y = viewYear;
    const m = viewMonth;
    const notes = api.getNotes();
    const todayKey = api.getTodayKey();

    const firstDow = new Date(y, m, 1).getDay();
    const monday0 = (firstDow + 6) % 7;
    const dim = daysInMonth(y, m);
    const monthTitle = new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(new Date(y, m, 1));

    container.replaceChildren();
    const root = document.createElement("div");
    root.className = "mini-cal";

    const nav = document.createElement("div");
    nav.className = "mini-cal__nav";
    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "mini-cal__nav-btn";
    prev.setAttribute("aria-label", "Previous month");
    prev.textContent = "‹";
    prev.addEventListener("click", () => {
      if (viewMonth === 0) {
        viewMonth = 11;
        viewYear -= 1;
      } else {
        viewMonth -= 1;
      }
      render();
    });
    const title = document.createElement("span");
    title.className = "mini-cal__title";
    title.textContent = monthTitle;
    const next = document.createElement("button");
    next.type = "button";
    next.className = "mini-cal__nav-btn";
    next.setAttribute("aria-label", "Next month");
    next.textContent = "›";
    next.addEventListener("click", () => {
      if (viewMonth === 11) {
        viewMonth = 0;
        viewYear += 1;
      } else {
        viewMonth += 1;
      }
      render();
    });
    nav.append(prev, title, next);
    root.append(nav);

    const wk = document.createElement("div");
    wk.className = "mini-cal__weekdays";
    for (const lbl of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
      const s = document.createElement("span");
      s.textContent = lbl;
      wk.append(s);
    }
    root.append(wk);

    const grid = document.createElement("div");
    grid.className = "mini-cal__grid";

    for (let i = 0; i < monday0; i++) {
      const empty = document.createElement("span");
      empty.className = "mini-cal__cell mini-cal__cell--empty";
      grid.append(empty);
    }

    for (let d = 1; d <= dim; d++) {
      const dk = `${y}-${pad2(m + 1)}-${pad2(d)}`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mini-cal__cell mini-cal__day";
      btn.dataset.date = dk;
      btn.setAttribute("aria-label", dk);
      btn.append(document.createTextNode(String(d)));
      if (dk === todayKey) {
        btn.classList.add("mini-cal__day--today");
      }
      if (hasNote(notes, dk)) {
        btn.classList.add("mini-cal__day--has-note");
        const dot = document.createElement("span");
        dot.className = "mini-cal__dot";
        dot.setAttribute("aria-hidden", "true");
        btn.append(dot);
      }
      if (dk > todayKey) {
        btn.classList.add("mini-cal__day--future");
        btn.disabled = true;
      } else {
        btn.addEventListener("click", () => {
          api.onPickDate(dk);
        });
      }
      grid.append(btn);
    }
    root.append(grid);
    container.append(root);
  }

  render();
  return { refresh: render };
}
