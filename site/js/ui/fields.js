// The form's building blocks: number, text, select, check and moment fields, list cards, sections.
// Each field registers a syncer, which puts the plan's value on screen, and its path in FIELDS,
// for the "edited" marks.
import { personById, yearOf } from "../engine.js";
import * as store from "../store.js";
import { el, getPath, setPath } from "./dom.js";
import { helpBtn } from "./messages.js";
import { moveControls } from "./reorder.js";
import { changed } from "./run.js";
import { base, fmt, settings, state } from "./state.js";

export const syncers = [];
export const invalid = new Set();

// Every form field, for the "edited" marks and summaries: { path, label, show, node }.
export const FIELDS = [];
export const groups = [];

// kind: money (whole amounts in the plan's currency), pct (a fraction, shown in %), int, year, num.
// `setting: true` edits the viewer's settings instead of the plan (no "edited" marks).
export function numberField({
  path,
  label,
  kind = "money",
  unit: u,
  hint,
  slider,
  help,
  what,
  min,
  max,
  setting = false,
  onchange,
}) {
  const target = () => (setting ? settings : state);
  const toShow = (v) => {
    if (v == null || Number.isNaN(v)) return "";
    if (kind === "pct") return String(Math.round(v * 10000) / 100).replace(".", fmt.decimal);
    if (kind === "money") return fmt.num(v);
    if (kind === "num") return String(v).replace(".", fmt.decimal);
    return String(v);
  };
  const fromShow = (s) => {
    const n = fmt.parse(s, kind === "money" ? "money" : kind === "pct" ? "pct" : "num");
    if (Number.isNaN(n)) return NaN;
    return kind === "pct" ? n / 100 : kind === "int" || kind === "year" ? Math.round(n) : n;
  };
  const unitText = () => u ?? (kind === "pct" ? "%" : kind === "money" ? state.currency : "");
  const id = `f-${path.replace(/\./g, "-")}`;
  const input = el("input", {
    type: "text",
    inputmode: kind === "int" || kind === "year" ? "numeric" : "decimal",
    id,
    "aria-label": label,
  });
  const unitEl = el("span", { class: "unit" });
  const box = el("div", { class: "input" }, input, unitEl);
  const hintEl = hint ? el("div", { class: "hint" }) : null;
  const bad = (v) => Number.isNaN(v) || (min != null && v < min) || (max != null && v > max);
  let range = null;
  const scale = kind === "pct" ? 100 : 1;
  // A slider scaled on a value (the spending's: 2.5 times less to 2.5 times more) is scaled on
  // `anchor`, not on its own current value: rescaling as it moves would shift the scale under the
  // finger, and after every release the thumb would jump away from where it was let go. The anchor
  // moves only when the slider is let go at either end (more room that way), when a value is
  // typed, or when the value, set from elsewhere, is off the scale. And never while a finger or
  // the mouse holds the slider: focus can't tell, as touch screens and Safari don't focus a slider
  // being dragged.
  let holding = false;
  let anchor = getPath(target(), path);
  const setRange = () => {
    if (!range || holding) return;
    const s = typeof slider === "function" ? slider(anchor) : slider;
    range.min = s.min;
    range.max = s.max;
    range.step = s.step ?? 1;
  };
  const settle = () => {
    if (!range || holding) return;
    const v = getPath(target(), path);
    if (v * scale >= Number(range.max) || v * scale <= Number(range.min)) anchor = v;
    setRange();
    range.value = v * scale;
  };
  if (slider) {
    range = el("input", { type: "range", "aria-label": `${label} slider` });
    range.addEventListener("pointerdown", () => {
      holding = true;
      const end = () => {
        window.removeEventListener("pointerup", end, true);
        window.removeEventListener("pointercancel", end, true);
        holding = false;
        settle();
      };
      window.addEventListener("pointerup", end, true);
      window.addEventListener("pointercancel", end, true);
    });
    range.addEventListener("input", () => {
      const v = Number(range.value) / scale;
      const prev = getPath(target(), path);
      setPath(target(), path, v);
      input.value = toShow(v);
      box.classList.remove("invalid");
      invalid.delete(path);
      onchange?.(v, prev);
      changed();
    });
    range.addEventListener("change", settle); // keys; after a drag, `end` does it
  }
  input.addEventListener("input", () => {
    const v = fromShow(input.value);
    box.classList.toggle("invalid", bad(v));
    if (bad(v)) {
      invalid.add(path);
      return;
    }
    invalid.delete(path);
    const prev = getPath(target(), path);
    setPath(target(), path, v);
    if (range) range.value = v * scale;
    onchange?.(v, prev);
    changed();
  });
  input.addEventListener("blur", () => {
    if (invalid.has(path)) return;
    const v = getPath(target(), path);
    input.value = toShow(v);
    if (!range) return;
    anchor = v; // typed: the scale centres on it
    setRange();
    range.value = v * scale;
  });
  syncers.push(() => {
    const v = getPath(target(), path);
    if (document.activeElement !== input && !invalid.has(path)) input.value = toShow(v);
    unitEl.textContent = unitText();
    unitEl.hidden = !unitText();
    if (range) {
      if (
        !holding &&
        range.max !== "" &&
        (v * scale > Number(range.max) || v * scale < Number(range.min))
      )
        anchor = v;
      setRange();
      range.value = v * scale;
    }
    if (hintEl) hintEl.textContent = typeof hint === "function" ? hint(v) : hint;
  });
  const head = el(
    "div",
    { class: "field-head" },
    el("label", { for: id }, el("span", { text: label })),
    helpBtn(help ?? path),
  );
  const node = el("div", { class: "field" }, head, range, box, hintEl);
  if (!setting) {
    FIELDS.push({
      path,
      label: what ?? label,
      node,
      show: (v) =>
        kind === "money"
          ? fmt.money(v)
          : `${toShow(v)}${unitText() === "%" ? "%" : unitText() ? ` ${unitText()}` : ""}`,
    });
  }
  return node;
}

export function textField({ path, label, what, help, oncommit, placeholder }) {
  const id = `f-${path.replace(/\./g, "-")}`;
  const input = el("input", { type: "text", id, maxlength: 60, placeholder, "aria-label": label });
  input.addEventListener("input", () => {
    setPath(state, path, input.value);
    changed();
  });
  input.addEventListener("change", () => {
    const v = input.value.trim() || getPath(base.values, path) || placeholder || label;
    setPath(state, path, v);
    input.value = v;
    changed();
    oncommit?.();
  });
  syncers.push(() => {
    if (document.activeElement !== input) input.value = getPath(state, path) ?? "";
  });
  const head = el(
    "div",
    { class: "field-head" },
    el("label", { for: id, text: label }),
    help ? helpBtn(help) : null,
  );
  const node = el("div", { class: "field" }, head, el("div", { class: "input" }, input));
  FIELDS.push({ path, label: what ?? label, node, show: (v) => `“${v}”` });
  return node;
}

export function selectField({
  path,
  label,
  options,
  hint,
  onchange,
  help,
  what,
  show,
  setting = false,
}) {
  const target = () => (setting ? settings : state);
  const id = `f-${path.replace(/\./g, "-")}`;
  const sel = el("select", { id, "aria-label": label });
  let key = "";
  const fill = () => {
    const opts = options();
    const k = JSON.stringify(opts);
    if (k === key) return;
    key = k;
    sel.replaceChildren(...opts.map(([v, t]) => el("option", { value: v, text: t })));
  };
  sel.addEventListener("change", () => {
    if (onchange) onchange(sel.value);
    else setPath(target(), path, sel.value);
    changed();
  });
  const hintEl = hint ? el("div", { class: "hint" }) : null;
  syncers.push(() => {
    fill();
    const v = getPath(target(), path);
    sel.value = String(show ? show.toKey(v) : (v ?? ""));
    if (hintEl) hintEl.textContent = typeof hint === "function" ? hint() : hint;
  });
  const head = el(
    "div",
    { class: "field-head" },
    el("label", { for: id, text: label }),
    helpBtn(help ?? path),
  );
  const node = el("div", { class: "field" }, head, el("div", { class: "input" }, sel), hintEl);
  if (!setting) {
    const optionText = (v) =>
      options().find(([o]) => o === String(show ? show.toKey(v) : (v ?? "")))?.[1];
    FIELDS.push({ path, label: what ?? label, node, show: show?.text ?? optionText });
  }
  return node;
}

export function checkField({ path, label, what, help }) {
  const id = `f-${path.replace(/\./g, "-")}`;
  const box = el("input", { type: "checkbox", id });
  box.addEventListener("change", () => {
    setPath(state, path, box.checked);
    changed();
  });
  syncers.push(() => {
    box.checked = Boolean(getPath(state, path));
  });
  const node = el(
    "div",
    { class: "field check" },
    el(
      "div",
      { class: "field-head" },
      el("label", { for: id }, box, el("span", { text: label })),
      helpBtn(help),
    ),
  );
  FIELDS.push({ path, label: what ?? label, node, show: (v) => (v ? "yes" : "no") });
  return node;
}

// A moment: a calendar year, an age of someone, or years after the FIRE start (or never).
function describeWhen(w) {
  if (!w) return "never";
  if (w.kind === "fire")
    return w.value === 0 ? "at the FIRE start" : `${w.value} years after the FIRE start`;
  if (w.kind === "age") return `when ${personById(state, w.person).name} turns ${w.value}`;
  return `in ${w.value}`;
}
export function whenField({ path, label, what, never = false }) {
  const id = `f-${path.replace(/\./g, "-")}`;
  const sel = el("select", { id, "aria-label": `${label}: how` });
  const input = el("input", {
    type: "text",
    inputmode: "numeric",
    "aria-label": `${label}: value`,
  });
  const unitEl = el("span", { class: "unit" });
  const valueBox = el("div", { class: "input" }, input, unitEl);
  const keyOf = (w) => (!w ? "never" : w.kind === "age" ? `age:${w.person}` : w.kind);
  let optKey = "";
  const fill = () => {
    const opts = [
      ...(never ? [["never", "Never"]] : []),
      ["fire", "FIRE start +"],
      ["year", "In the year"],
      ...state.people.map((p) => [`age:${p.id}`, `When ${p.name} turns`]),
    ];
    const k = JSON.stringify(opts);
    if (k === optKey) return;
    optKey = k;
    sel.replaceChildren(...opts.map(([v, t]) => el("option", { value: v, text: t })));
  };
  sel.addEventListener("change", () => {
    const old = getPath(state, path);
    const year = yearOf(state, old) ?? state.fire_year + 10; // keep the same year where possible
    let next = null;
    if (sel.value === "fire") next = { kind: "fire", value: Math.max(0, year - state.fire_year) };
    else if (sel.value === "year") next = { kind: "year", value: year };
    else if (sel.value.startsWith("age:")) {
      const person = sel.value.slice(4);
      next = {
        kind: "age",
        person,
        value: Math.max(0, year - personById(state, person).birth_year),
      };
    }
    setPath(state, path, next);
    invalid.delete(path);
    changed();
  });
  input.addEventListener("input", () => {
    const v = Math.round(fmt.parse(input.value, "num"));
    const w = getPath(state, path);
    const ok = Number.isFinite(v) && v >= 0 && (w?.kind !== "year" || (v >= 1900 && v <= 2300));
    valueBox.classList.toggle("invalid", !ok);
    if (!ok) {
      invalid.add(path);
      return;
    }
    invalid.delete(path);
    setPath(state, path, { ...w, value: v });
    changed();
  });
  input.addEventListener("blur", () => {
    if (!invalid.has(path)) syncNow();
  });
  const syncNow = () => {
    fill();
    const w = getPath(state, path);
    sel.value = keyOf(w);
    valueBox.classList.toggle("hidden", !w);
    if (w && document.activeElement !== input && !invalid.has(path)) input.value = String(w.value);
    unitEl.textContent = w?.kind === "fire" ? "years" : "";
  };
  const hintEl = el("div", { class: "hint" });
  syncers.push(syncNow, () => {
    const w = getPath(state, path);
    const y = yearOf(state, w);
    if (y == null) {
      hintEl.textContent = "";
      return;
    }
    const line = getPath(state, path.split(".").slice(0, -1).join("."));
    const from = yearOf(state, line.from);
    const stopsFirst = path.endsWith(".to") && y <= from;
    hintEl.textContent = stopsFirst
      ? `${y}: before it starts (${from}), so it never pays`
      : `${y} · ${ages(y)}`;
    hintEl.classList.toggle("warn", stopsFirst);
  });
  const head = el(
    "div",
    { class: "field-head" },
    el("label", { for: id, text: label }),
    helpBtn("income.when"),
  );
  const node = el(
    "div",
    { class: "field" },
    head,
    el("div", { class: "when" }, el("div", { class: "input" }, sel), valueBox),
    hintEl,
  );
  FIELDS.push({ path, label: what ?? label, node, show: describeWhen, deep: true });
  return node;
}

// A list item: a card with a title and a remove button and, when the list has others, the grip and
// buttons that move it (reorder.js). `key` is the item's id.
export function itemCard({ title, key, move, onremove, removeLabel }, ...fields) {
  const t = el("span", { class: "item-title" });
  syncers.push(() => {
    t.textContent = title();
  });
  const { grip = null, buttons = null } = move ? moveControls({ ...move, name: title() }) : {};
  return el(
    "div",
    { class: "item", "data-key": key },
    el(
      "div",
      { class: "item-head" },
      grip,
      t,
      el(
        "span",
        { class: "item-actions" },
        buttons,
        onremove
          ? el(
              "button",
              {
                type: "button",
                class: "btn quiet small",
                "aria-label": removeLabel,
                title: removeLabel,
                onclick: onremove,
              },
              "Remove",
            )
          : null,
      ),
    ),
    ...fields,
  );
}
export const row2 = (...kids) => el("div", { class: "row2" }, ...kids);
export function addButtons(...buttons) {
  return el(
    "div",
    { class: "add-row" },
    ...buttons.map(([text, onclick, disabled]) =>
      el("button", { type: "button", class: "btn", onclick, disabled }, text),
    ),
  );
}

// Every section starts in its default state; opening or closing one is remembered in this browser.
export function group(title, open, ...fields) {
  const list = typeof open === "object" ? open.list : null;
  if (typeof open === "object") open = open.open;
  const remembered = store.loadGroups()[title];
  const d = el(
    "details",
    { class: "group", open: remembered ?? open },
    el("summary", {}, el("span", { class: "group-title", text: title })),
    el("div", { class: "fields" }, ...fields),
  );
  if (list) d.dataset.list = list;
  groups.push(d);
  d.addEventListener("toggle", () => {
    const g = store.loadGroups();
    g[title] = d.open;
    store.saveGroups(g);
  });
  return d;
}

export const ages = (year) =>
  state.people.map((x) => `${x.name} ${year - x.birth_year}`).join(" · ");

export function syncAll() {
  for (const s of syncers) s();
}
