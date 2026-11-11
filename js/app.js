// The page: the parameter form, the plans kept in this browser, and the charts. The numbers come
// from workers running the model (engine.js, views.js); nothing here talks to a server.
import { RULE_NAMES, endYear, personById, real, yearOf } from "./engine.js";
import { CURRENCIES, LOCALES, currencyName, makeFormat } from "./format.js";
import { GUIDE, HELP } from "./help.js";
import {
  DEFAULT_CURRENCY,
  LIMITS,
  RULE_DEFAULTS,
  bandAround,
  blankPlan,
  differences,
  examplePlan,
  fromNewer,
  newAccount,
  newEvent,
  newIncome,
  newPerson,
  normalize,
  problems,
  same,
  uid,
} from "./plan.js";
import * as store from "./store.js";
import { STRESS_SCENARIOS, niceStep } from "./views.js";

// ---- helpers ---------------------------------------------------------------------------------------
const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) n.append(kid);
  return n;
};
const clone = (o) => JSON.parse(JSON.stringify(o));
const getPath = (obj, path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
const setPath = (obj, path, v) => {
  const keys = path.split(".");
  const last = keys.pop();
  keys.reduce((o, k) => o[k], obj)[last] = v;
};
const isPhone = () => window.matchMedia("(max-width: 960px)").matches;
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
// Plotly reads a few HTML tags in its labels: names typed by people (or in a shared link) go in as text.
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
/** Deep equality for plan values (numbers to 1e-9). */
function eq(a, b) {
  const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
  if (isObj(a) && isObj(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].every((k) => eq(a[k], b[k]));
  }
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => eq(x, b[i]));
  return same(a, b);
}

// ---- state -----------------------------------------------------------------------------------------
let settings = store.loadSettings(); // the viewer's: seed, number of futures, number format
settings.seed = Number.isInteger(settings.seed) && settings.seed >= 0 ? settings.seed % 2 ** 31 : 42;
settings.n_sims = Number.isInteger(settings.n_sims) ? Math.min(Math.max(settings.n_sims, 500), 50_000) : 10_000;
if (typeof settings.locale !== "string") settings.locale = "";
let fmt = makeFormat(settings.locale, DEFAULT_CURRENCY);
let exported = store.loadExported(); // when the plans were last exported to a file, 0 if never
let keepAsked = false;
let plans = []; // the saved plans: [{ id, name, plan, updated, example }]
let base = null; // { id, name, values }: the saved plan the values on screen started from
let state = null; // the plan on screen, unsaved changes included
let unit = "years";
let sim = null;
const explore = { grid: null, safe: null, stress: null };
const syncers = [];
const invalid = new Set();
// Every form field, for the "edited" marks and summaries: { path, label, show, node }.
const FIELDS = [];
const groups = [];
let canStore = true;

const refreshFormat = () => { fmt = makeFormat(settings.locale, state.currency); };
const realOf = (nominal) => real(nominal, state.inflation);
const planById = (id) => plans.find((p) => p.id === id);
const runPlan = () => ({ ...state, seed: settings.seed, n_sims: settings.n_sims });
const today = () => new Date();

// ---- help ("?" buttons and the guide) --------------------------------------------------------------
const helpEntry = (key) => (HELP[key]?.alias ? HELP[HELP[key].alias] : HELP[key]);
function helpBtn(key) {
  const h = helpEntry(key);
  if (!h) return null;
  return el("button", { type: "button", class: "help", "data-help": key, "aria-label": `Explain: ${h.title}`, title: "What is this?" }, "?");
}
function openDialog(title, body, wide = false) {
  $("#help-title").textContent = title;
  const b = $("#help-body");
  b.replaceChildren(...body.filter((x) => x != null && x !== false));
  b.scrollTop = 0;
  const d = $("#help-dialog");
  d.classList.toggle("wide", wide);
  if (!d.open) d.showModal();
  requestAnimationFrame(() => { b.scrollTop = 0; });
}
function entryNodes(h) {
  const div = el("div", { class: "help-entry" });
  div.innerHTML = h.html; // trusted: our own static help.js
  return div;
}
function openHelp(key) {
  const h = helpEntry(key);
  if (!h) return;
  $("#help-body").onscroll = null;
  openDialog(h.title, [entryNodes(h), el("button", { type: "button", class: "btn guide-link", onclick: openGuide }, "Open the full guide")]);
}
function openGuide() {
  const toc = el("nav", { class: "guide-toc", "aria-label": "Guide sections" });
  const content = el("div", { class: "guide-content" });
  const links = [];
  GUIDE.forEach(([title, keys], i) => {
    const id = `guide-${i}`;
    const link = el("button", {
      type: "button", class: "toc-link", "data-target": id,
      onclick: () => document.getElementById(id).scrollIntoView({ behavior: "smooth", block: "start" }),
    }, title);
    links.push(link);
    toc.append(link);
    content.append(el("section", { class: "guide-section", id },
      el("h3", { text: title }),
      el("div", { class: "guide-cards" },
        ...keys.map(helpEntry).filter(Boolean).map((h) => el("article", { class: "guide-item" }, el("h4", { text: h.title }), entryNodes(h))))));
  });
  openDialog("Guide", [el("div", { class: "guide" }, toc, content)], true);
  const body = $("#help-body");
  const mark = () => {
    const top = body.getBoundingClientRect().top + 40;
    let current = links[0];
    for (const l of links) if (document.getElementById(l.dataset.target).getBoundingClientRect().top <= top) current = l;
    links.forEach((l) => l.setAttribute("aria-current", String(l === current)));
  };
  body.onscroll = mark;
  mark();
}

// ---- form ------------------------------------------------------------------------------------------
// kind: money (whole amounts in the plan's currency), pct (a fraction, shown in %), int, year, num.
// `setting: true` edits the viewer's settings instead of the plan (no "edited" marks).
function numberField({ path, label, kind = "money", unit: u, hint, slider, help, what, min, max, setting = false, onchange }) {
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
  const input = el("input", { type: "text", inputmode: kind === "int" || kind === "year" ? "numeric" : "decimal", id, "aria-label": label });
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
    if (bad(v)) { invalid.add(path); return; }
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
      if (!holding && range.max !== "" && (v * scale > Number(range.max) || v * scale < Number(range.min))) anchor = v;
      setRange();
      range.value = v * scale;
    }
    if (hintEl) hintEl.textContent = typeof hint === "function" ? hint(v) : hint;
  });
  const head = el("div", { class: "field-head" }, el("label", { for: id }, el("span", { text: label })), helpBtn(help ?? path));
  const node = el("div", { class: "field" }, head, range, box, hintEl);
  if (!setting) {
    FIELDS.push({ path, label: what ?? label, node, show: (v) => (kind === "money" ? fmt.money(v) : `${toShow(v)}${unitText() === "%" ? "%" : unitText() ? ` ${unitText()}` : ""}`) });
  }
  return node;
}

function textField({ path, label, what, help, oncommit, placeholder }) {
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
  syncers.push(() => { if (document.activeElement !== input) input.value = getPath(state, path) ?? ""; });
  const head = el("div", { class: "field-head" }, el("label", { for: id, text: label }), help ? helpBtn(help) : null);
  const node = el("div", { class: "field" }, head, el("div", { class: "input" }, input));
  FIELDS.push({ path, label: what ?? label, node, show: (v) => `“${v}”` });
  return node;
}

function selectField({ path, label, options, hint, onchange, help, what, show, setting = false }) {
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
    sel.value = String(show ? show.toKey(v) : v ?? "");
    if (hintEl) hintEl.textContent = typeof hint === "function" ? hint() : hint;
  });
  const head = el("div", { class: "field-head" }, el("label", { for: id, text: label }), helpBtn(help ?? path));
  const node = el("div", { class: "field" }, head, el("div", { class: "input" }, sel), hintEl);
  if (!setting) {
    const optionText = (v) => options().find(([o]) => o === String(show ? show.toKey(v) : v ?? ""))?.[1];
    FIELDS.push({ path, label: what ?? label, node, show: show?.text ?? optionText });
  }
  return node;
}

function checkField({ path, label, what, help }) {
  const id = `f-${path.replace(/\./g, "-")}`;
  const box = el("input", { type: "checkbox", id });
  box.addEventListener("change", () => {
    setPath(state, path, box.checked);
    changed();
  });
  syncers.push(() => { box.checked = Boolean(getPath(state, path)); });
  const node = el("div", { class: "field check" }, el("div", { class: "field-head" }, el("label", { for: id }, box, el("span", { text: label })), helpBtn(help)));
  FIELDS.push({ path, label: what ?? label, node, show: (v) => (v ? "yes" : "no") });
  return node;
}

// A moment: a calendar year, an age of someone, or years after the FIRE start (or never).
function describeWhen(w) {
  if (!w) return "never";
  if (w.kind === "fire") return w.value === 0 ? "at the FIRE start" : `${w.value} years after the FIRE start`;
  if (w.kind === "age") return `when ${personById(state, w.person).name} turns ${w.value}`;
  return `in ${w.value}`;
}
function whenField({ path, label, what, never = false }) {
  const id = `f-${path.replace(/\./g, "-")}`;
  const sel = el("select", { id, "aria-label": `${label}: how` });
  const input = el("input", { type: "text", inputmode: "numeric", "aria-label": `${label}: value` });
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
      next = { kind: "age", person, value: Math.max(0, year - personById(state, person).birth_year) };
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
    if (!ok) { invalid.add(path); return; }
    invalid.delete(path);
    setPath(state, path, { ...w, value: v });
    changed();
  });
  input.addEventListener("blur", () => { if (!invalid.has(path)) syncNow(); });
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
    if (y == null) { hintEl.textContent = ""; return; }
    const line = getPath(state, path.split(".").slice(0, -1).join("."));
    const from = yearOf(state, line.from);
    const stopsFirst = path.endsWith(".to") && y <= from;
    hintEl.textContent = stopsFirst ? `${y}: before it starts (${from}), so it never pays` : `${y} · ${ages(y)}`;
    hintEl.classList.toggle("warn", stopsFirst);
  });
  const head = el("div", { class: "field-head" }, el("label", { for: id, text: label }), helpBtn("income.when"));
  const node = el("div", { class: "field" }, head, el("div", { class: "when" }, el("div", { class: "input" }, sel), valueBox), hintEl);
  FIELDS.push({ path, label: what ?? label, node, show: describeWhen, deep: true });
  return node;
}

// A list item: a card with a title and a remove button.
function itemCard({ title, onremove, removeLabel }, ...fields) {
  const t = el("span", { class: "item-title" });
  syncers.push(() => { t.textContent = title(); });
  return el("div", { class: "item" },
    el("div", { class: "item-head" }, t,
      onremove ? el("button", { type: "button", class: "btn quiet small", "aria-label": removeLabel, title: removeLabel, onclick: onremove }, "Remove") : null),
    ...fields);
}
const row2 = (...kids) => el("div", { class: "row2" }, ...kids);
function addButtons(...buttons) {
  return el("div", { class: "add-row" }, ...buttons.map(([text, onclick, disabled]) => el("button", { type: "button", class: "btn", onclick, disabled }, text)));
}

// Every section starts in its default state; opening or closing one is remembered in this browser.
function group(title, open, ...fields) {
  const list = typeof open === "object" ? open.list : null;
  if (typeof open === "object") open = open.open;
  const remembered = store.loadGroups()[title];
  const d = el("details", { class: "group", open: remembered ?? open },
    el("summary", {}, el("span", { class: "group-title", text: title })),
    el("div", { class: "fields" }, ...fields));
  if (list) d.dataset.list = list;
  groups.push(d);
  d.addEventListener("toggle", () => {
    const g = store.loadGroups();
    g[title] = d.open;
    store.saveGroups(g);
  });
  return d;
}

const RULE_HINTS = {
  fixed: "The same real amount every year, whatever the markets do. The classic safe withdrawal rate.",
  guardrails: "Guyton & Klinger: cut spending when the withdrawal rate drifts above where it started by more than the band, raise it when it drifts below. Never below the floor or above the ceiling.",
  vanguard: "Aim at a fixed share of wealth, but change spending by at most +up / −down a year. Never below the floor or above the ceiling.",
  spenddown: "Die with zero: each year, aim at what would leave nothing at the end if the money earned the assumed return, locked accounts and future income included. Change spending by at most +raise / −cut a year, between the floor and the ceiling.",
};
const RULE_SHORT = { fixed: "Fixed", guardrails: "Guardrails", vanguard: "Vanguard", spenddown: "Spend-down" };

function ruleGroup() {
  const seg = el("div", { class: "seg", role: "group", "aria-label": "Spending rule" });
  for (const [k, t] of Object.entries(RULE_SHORT)) {
    seg.append(el("button", { type: "button", "data-kind": k, onclick: () => { state.rule.kind = k; changed(); } }, t));
  }
  const hintEl = el("div", { class: "hint" });
  const ruleHelp = helpBtn("rule.fixed");
  const flexible = row2(
    numberField({ path: "rule.floor", label: "Floor", hint: "costs you can't cut", min: 0 }),
    numberField({ path: "rule.ceiling", label: "Ceiling", hint: "the most you'd spend", min: 0 }));
  const guard = row2(
    numberField({ path: "rule.band", label: "Guardrail band", kind: "pct", min: 0.001, max: 0.99 }),
    numberField({ path: "rule.adjust", label: "Cut / raise by", kind: "pct", min: 0.001, max: 0.99 }));
  const vang = row2(
    numberField({ path: "rule.up", label: "Max raise / yr", kind: "pct", min: 0, max: 0.99 }),
    numberField({ path: "rule.down", label: "Max cut / yr", kind: "pct", min: 0, max: 0.99 }));
  const down = el("div", { class: "stack" },
    numberField({
      path: "rule.assumed_return", label: "Assumed return (real)", kind: "pct", what: "Spend-down assumed return", min: -0.09, max: 0.19,
      hint: (v) => {
        const m = realOf(state.stock_return);
        return v < m ? `Below the stocks' ${fmt.pct(m, 2)} real median: a safety margin.` : `At or above the stocks' ${fmt.pct(m, 2)} real median: more early, more cuts later.`;
      },
    }),
    row2(
      numberField({ path: "rule.max_raise", label: "Max raise / yr", kind: "pct", what: "Spend-down max raise / yr", min: 0, max: 0.99 }),
      numberField({ path: "rule.max_cut", label: "Max cut / yr", kind: "pct", what: "Spend-down max cut / yr", min: 0, max: 1 })));
  const kindField = el("div", { class: "field" }, seg, el("div", { class: "hint-row" }, hintEl, ruleHelp));
  FIELDS.push({ path: "rule.kind", label: "Spending rule", show: (k) => RULE_SHORT[k], node: kindField });
  syncers.push(() => {
    const k = state.rule.kind;
    seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.kind === k)));
    hintEl.textContent = RULE_HINTS[k];
    ruleHelp.dataset.help = `rule.${k}`;
    ruleHelp.setAttribute("aria-label", `Explain: ${helpEntry(`rule.${k}`).title}`);
    flexible.classList.toggle("hidden", k === "fixed");
    guard.classList.toggle("hidden", k !== "guardrails");
    vang.classList.toggle("hidden", k !== "vanguard");
    down.classList.toggle("hidden", k !== "spenddown");
  });
  return group("Spending rule", true, kindField, flexible, guard, vang, down);
}

function stressGroup() {
  const custom = el("input", { type: "text", id: "f-stress-custom", inputmode: "text", placeholder: "-15, -20, -25", "aria-label": "Custom crash, real returns in %" });
  const customBox = el("div", { class: "field" },
    el("div", { class: "field-head" }, el("label", { for: custom.id, text: "Custom crash (real % per year, from the FIRE start)" }), helpBtn("stress-custom")),
    el("div", { class: "input" }, custom, el("span", { class: "unit", text: "%" })));
  const keyOf = (arr) => arr.map((x) => Math.round(x * 1000)).join(",");
  let wantCustom = false;
  custom.addEventListener("input", () => {
    const parts = custom.value.split(/[;\s]+|,(?=\s|-|\d)/).filter(Boolean).map((s) => fmt.parse(s, "pct"));
    const bad = parts.some((x) => Number.isNaN(x) || x < -100);
    custom.parentElement.classList.toggle("invalid", bad);
    if (bad) { invalid.add("stress"); return; }
    invalid.delete("stress");
    state.stress_returns = parts.map((x) => x / 100);
    changed();
  });
  const label = (r) => STRESS_SCENARIOS.find((x) => keyOf(x.returns) === keyOf(r))?.label ?? `custom (${r.map((x) => +(x * 100).toFixed(1)).join(", ")}%)`;
  const sel = selectField({
    path: "stress_returns",
    label: "Force a crash at the FIRE start",
    help: "_stress",
    what: "Crash at the start",
    options: () => [...STRESS_SCENARIOS.map((s, i) => [String(i), s.label]), ["custom", "Custom…"]],
    show: {
      toKey: (r) => {
        const i = STRESS_SCENARIOS.findIndex((s) => keyOf(s.returns) === keyOf(r));
        return wantCustom || i < 0 ? "custom" : String(i);
      },
      text: label,
    },
    hint: "Random markets after it. The stress-test chart runs every scenario anyway.",
    onchange: (v) => {
      wantCustom = v === "custom";
      if (!wantCustom) state.stress_returns = clone(STRESS_SCENARIOS[Number(v)].returns);
    },
  });
  syncers.push(() => {
    const i = STRESS_SCENARIOS.findIndex((s) => keyOf(s.returns) === keyOf(state.stress_returns));
    customBox.classList.toggle("hidden", !(wantCustom || i < 0));
    if (document.activeElement !== custom) custom.value = state.stress_returns.map((x) => String(+(x * 100).toFixed(1)).replace(".", fmt.decimal)).join(", ");
  });
  return group("Stress test", false, sel, customBox);
}

function marketHint(nominal) {
  // Same distribution as the model: median 1+g, standard deviation stock_vol.
  const g = realOf(nominal);
  const u = (1 + Math.sqrt(1 + 4 * (state.stock_vol / (1 + g)) ** 2)) / 2;
  const s = Math.sqrt(Math.log(u));
  const mu = Math.log1p(g);
  const at = (z) => Math.exp(mu + s * z) - 1;
  return `= ${fmt.pct(g, 2)} real median. 2 years in 3 between ${fmt.pct(at(-1))} and +${fmt.pct(at(1))}, 19 in 20 between ${fmt.pct(at(-1.96))} and +${fmt.pct(at(1.96))}.`;
}
// Return and volatility of the rebalanced stock/bond mix, as the model draws it.
function mixStats(w) {
  const ln = (median, sd) => {
    const u = (1 + Math.sqrt(1 + 4 * (sd / median) ** 2)) / 2;
    return { mean: median * Math.sqrt(u), sigma: Math.sqrt(Math.log(u)) };
  };
  const st = ln(1 + realOf(state.stock_return), state.stock_vol);
  const bd = ln(1 + realOf(state.bond_return), state.bond_vol);
  const cov = st.mean * bd.mean * (Math.exp(state.stock_bond_corr * st.sigma * bd.sigma) - 1);
  const mean = w * st.mean + (1 - w) * bd.mean;
  const variance = (w * state.stock_vol) ** 2 + ((1 - w) * state.bond_vol) ** 2 + 2 * w * (1 - w) * cov;
  return { compound: mean / Math.sqrt(1 + variance / mean ** 2) - 1, vol: Math.sqrt(variance) };
}
const mixHint = (w) => {
  const m = mixStats(w);
  return `Mix: ${fmt.pct(m.compound, 2)} real compound, ${fmt.pct(m.vol, 1)} volatility.`;
};

const ages = (year) => state.people.map((x) => `${x.name} ${year - x.birth_year}`).join(" · ");
/**
 * An amount's slider: from 2.5 times less to 2.5 times more than the amount it's anchored on, in
 * round steps. Never 0, which isn't a spending, and the same both ways: let go at either end, it
 * centres on that end, for more room above or below.
 */
const moneySlider = (anchor) => {
  const a = anchor > 0 ? anchor : 1000;
  const step = niceStep((a * 2.5 - a / 2.5) / 250);
  return { min: Math.max(step, Math.floor(a / 2.5 / step) * step), max: Math.ceil((a * 2.5) / step) * step, step };
};

// Guardrails and Vanguard need the spending between the rule's floor and ceiling. A band nobody set
// by hand, the one around the spending, moves with it (not for the spend-down, whose floor is its
// main input and which doesn't use the spending). A band set by hand stays: the slider then keeps
// within it, while the box can still go outside, with the error and its fix.
const bandIsAuto = (spending) => {
  const b = bandAround(spending);
  return same(state.rule.floor, b.floor) && same(state.rule.ceiling, b.ceiling);
};
const bandHolds = () => ["guardrails", "vanguard"].includes(state.rule.kind);
const bandByHand = () => bandHolds() && !bandIsAuto(state.spending) && state.rule.floor < state.rule.ceiling;
function followBand(v, prev) {
  if (state.rule.kind !== "spenddown" && bandIsAuto(prev)) Object.assign(state.rule, bandAround(v));
}
const spendingSlider = (anchor) => {
  if (!bandByHand()) return moneySlider(anchor);
  const { floor, ceiling } = state.rule;
  const step = niceStep((ceiling - floor) / 200);
  const min = Math.ceil(floor / step) * step;
  const max = Math.floor(ceiling / step) * step;
  return max > min ? { min, max, step } : { min: floor, max: ceiling, step: (ceiling - floor) / 200 };
};

function peopleGroup() {
  const cards = state.people.map((x, i) => itemCard(
    {
      title: () => state.people[i]?.name || `Person ${i + 1}`,
      onremove: state.people.length > 1 ? () => removePerson(i) : null,
      removeLabel: `Remove ${x.name}`,
    },
    row2(
      textField({ path: `people.${i}.name`, label: "Name", what: `Person ${i + 1}'s name`, oncommit: rebuild }),
      numberField({ path: `people.${i}.birth_year`, label: "Born", kind: "year", what: `${x.name} born`, help: "people", min: 1900, max: 2100,
        hint: (v) => `age ${state.start_year - v} in ${state.start_year}` })),
  ));
  return group("Household", { open: true, list: "people" },
    selectField({
      path: "currency", label: "Currency",
      options: () => {
        const list = CURRENCIES.includes(state.currency) ? CURRENCIES : [state.currency, ...CURRENCIES];
        return list.map((c) => [c, `${c} · ${currencyName(c, fmt.locale)}`]);
      },
      onchange: (v) => { state.currency = v; refreshFormat(); },
    }),
    ...cards,
    addButtons(["Add person", addPerson, state.people.length >= LIMITS.people]));
}

function accountsGroup() {
  const owners = () => state.people.map((p) => [p.id, p.name]);
  const cards = state.accounts.map((a, i) => {
    const P = `accounts.${i}`;
    const name = () => `“${state.accounts[i]?.name}”`;
    const interest = numberField({ path: `${P}.interest`, label: "Interest (nominal)", kind: "pct", what: `${name()} interest`, help: "account.growth", min: -0.5, max: 1, hint: (v) => `${fmt.pct(realOf(v), 1)} real` });
    syncers.push(() => interest.classList.toggle("hidden", state.accounts[i]?.growth !== "fixed"));
    return itemCard(
      { title: () => state.accounts[i]?.name || "Account", onremove: () => removeItem("accounts", i), removeLabel: `Remove ${a.name}` },
      row2(
        textField({ path: `${P}.name`, label: "Name", what: "Account name", oncommit: rebuild }),
        selectField({ path: `${P}.owner`, label: "Owner", what: `${a.name} owner`, help: "accounts", options: owners })),
      row2(
        numberField({ path: `${P}.balance`, label: "Balance today", what: `${a.name} balance`, help: "accounts", min: 0 }),
        numberField({ path: `${P}.contrib`, label: "Paid in per year", what: `${a.name} paid in per year`, help: "account.contrib", min: 0 })),
      row2(
        selectField({ path: `${P}.growth`, label: "Grows", what: `${a.name} grows`, help: "account.growth", options: () => [["portfolio", "Like the portfolio"], ["fixed", "At a fixed interest"]] }),
        interest),
      row2(
        numberField({ path: `${P}.unlock_age`, label: "Unlocks at age", kind: "int", unit: "years", what: `${a.name} unlocks at`, help: "account.unlock_age", min: 0, max: 125,
          hint: (v) => `in ${personById(state, state.accounts[i]?.owner).birth_year + v}` }),
        numberField({ path: `${P}.tax`, label: "Tax when withdrawn", kind: "pct", what: `${a.name} tax`, help: "account.tax", min: 0, max: 0.9 })),
    );
  });
  return group("Retirement accounts", { open: state.accounts.length > 0, list: "accounts" },
    el("div", { class: "hint-row" }, el("div", { class: "hint", text: "Money you can't reach until an age: it's withdrawn, taxed and added to the portfolio when its owner gets there." }), helpBtn("accounts")),
    ...cards,
    addButtons(["Add account", () => addItem("accounts", newAccount(state)), state.accounts.length >= LIMITS.accounts]));
}

function incomeGroup() {
  const cards = state.income.map((s, i) => {
    const P = `income.${i}`;
    return itemCard(
      { title: () => state.income[i]?.name || "Line", onremove: () => removeItem("income", i), removeLabel: `Remove ${s.name}` },
      row2(
        textField({ path: `${P}.name`, label: "Name", what: "Line name", oncommit: rebuild }),
        numberField({ path: `${P}.amount`, label: "Per year", what: `${s.name} per year`, help: "income",
          hint: (v) => (v >= 0 ? `income, ${fmt.money(v / 12)} a month (negative: a cost)` : `a cost, ${fmt.money(-v / 12)} a month`) })),
      whenField({ path: `${P}.from`, label: "Starts", what: `${s.name} starts` }),
      whenField({ path: `${P}.to`, label: "Stops", what: `${s.name} stops`, never: true }),
      checkField({ path: `${P}.indexed`, label: "Rises with inflation", what: `${s.name} rises with inflation`, help: "income.indexed" }),
    );
  });
  const full = state.income.length >= LIMITS.income;
  return group("Income and costs after stopping", { open: state.income.length > 0, list: "income" },
    el("div", { class: "hint-row" }, el("div", { class: "hint", text: "Pensions, part-time work, rent coming in; or a mortgage, school fees going out. Counted from the FIRE start." }), helpBtn("income")),
    ...cards,
    addButtons(["Add income", () => addItem("income", newIncome(state)), full], ["Add cost", () => addItem("income", newIncome(state, true)), full]));
}

function eventsGroup() {
  const cards = state.events.map((e, i) => itemCard(
    { title: () => state.events[i]?.name || "Event", onremove: () => removeItem("events", i), removeLabel: `Remove ${e.name}` },
    textField({ path: `events.${i}.name`, label: "Name", what: "Event name", oncommit: rebuild }),
    row2(
      numberField({ path: `events.${i}.year`, label: "Year", kind: "year", what: `${e.name} year`, help: "events", min: 1900, max: 2300, hint: (v) => ages(v) }),
      numberField({ path: `events.${i}.amount`, label: "Amount", what: `${e.name} amount`, help: "events",
        hint: (v) => (v >= 0 ? "comes in (negative: goes out)" : "goes out") })),
  ));
  return group("One-off events", { open: state.events.length > 0, list: "events" },
    el("div", { class: "hint-row" }, el("div", { class: "hint", text: "An inheritance, a house sale, a new roof: a single amount in a single year." }), helpBtn("events")),
    ...cards,
    addButtons(["Add event", () => addItem("events", newEvent(state)), state.events.length >= LIMITS.events]));
}

function buildForm() {
  const form = $("#form");
  const focused = document.activeElement?.id;
  form.replaceChildren();
  syncers.length = 0;
  FIELDS.length = 0;
  groups.length = 0;
  const youngest = [...state.people].sort((a, b) => b.birth_year - a.birth_year)[0];

  form.append(group("Plan", true,
    numberField({
      path: "fire_year", label: "FIRE start", kind: "year",
      slider: () => ({ min: state.start_year, max: Math.max(state.start_year + 1, Math.min(endYear(state) - 1, state.start_year + 50)) }),
      hint: (v) => `Ages then: ${ages(v)}`,
    }),
    numberField({
      path: "spending", label: "Spending per year", min: 0, slider: spendingSlider, onchange: followBand,
      hint: (v) => (state.rule.kind === "spenddown"
        ? "Not used by the spend-down, which works out its own. Still the unit of “years of spending” and of the cash cushion."
        : `${fmt.money(v / 12)} a month, today's money, taxes of the FIRE years included${bandByHand()
          ? `. The slider stays within the rule's floor and ceiling, ${fmt.short(state.rule.floor)}–${fmt.short(state.rule.ceiling)}.` : ""}`),
    }),
    row2(
      selectField({ path: "end_person", label: "Must last until", options: () => state.people.map((x) => [x.id, x.name]),
        hint: () => (state.people.length > 1 && state.end_person !== youngest.id ? `${youngest.name} is the youngest.` : "") }),
      numberField({ path: "end_age", label: "turns", kind: "int", unit: "years", min: 1, max: 125, hint: () => `in ${endYear(state)}` }))));

  form.append(ruleGroup());
  form.append(peopleGroup());

  form.append(group("Savings and portfolio", true,
    numberField({ path: "portfolio", label: "Invested today", min: 0 }),
    numberField({ path: "cash", label: "Cash today", min: 0 }),
    numberField({ path: "contrib", label: "Saved per year until the FIRE start", min: 0, hint: (v) => `${fmt.money(v / 12)} a month, into the portfolio` }),
    row2(
      numberField({ path: "contrib_growth", label: "Savings growth", kind: "pct", unit: "%/yr", min: -0.5, max: 0.5, hint: "above inflation" }),
      numberField({ path: "cash_interest", label: "Cash interest", kind: "pct", min: -0.5, max: 1, hint: (v) => `${fmt.pct(realOf(v), 1)} real` })),
    row2(
      numberField({ path: "cash_buffer_years", label: "Cash cushion", kind: "num", unit: "yrs", min: 0, max: 20, hint: "of spending, moved to cash at the start" }),
      numberField({ path: "portfolio_tax", label: "Tax on withdrawals", kind: "pct", min: 0, max: 0.9, help: "portfolio_tax", hint: "from the portfolio" }))));

  form.append(accountsGroup());
  form.append(incomeGroup());
  form.append(eventsGroup());

  form.append(group("Markets", false,
    numberField({ path: "stock_return", label: "Stock return (nominal median)", kind: "pct", min: -0.5, max: 1, slider: { min: 0, max: 12, step: 0.1 }, hint: marketHint }),
    numberField({ path: "stock_vol", label: "Stock volatility (yearly spread)", kind: "pct", min: 0, max: 1, slider: { min: 5, max: 30, step: 0.5 }, hint: "World stocks: about 15–18%. For a calmer portfolio, lower the stock share under Portfolio mix instead." }),
    numberField({ path: "inflation", label: "Inflation", kind: "pct", min: -0.2, max: 1, slider: { min: 0, max: 6, step: 0.1 }, hint: "Turns the nominal inputs into today's money." }),
    selectField({
      path: "fat_tails_df", label: "Extreme years", help: "_tails",
      options: () => [["", "Normal distribution"], ["6", "Fat tails (t, 6)"], ["5", "Fat tails (t, 5)"], ["4", "Very fat tails (t, 4)"]],
      show: { toKey: (v) => (v == null ? "" : String(v)), text: (v) => ({ "": "normal", 6: "fat tails (t, 6)", 5: "fat tails (t, 5)", 4: "very fat tails (t, 4)" })[v ?? ""] },
      hint: "Fat tails make −40% years about 8× more frequent, with calmer ordinary years.",
      onchange: (v) => { state.fat_tails_df = v === "" ? null : Number(v); },
    })));

  form.append(group("Portfolio mix", false,
    numberField({ path: "stock_share", label: "Stock share", kind: "pct", min: 0, max: 1, slider: { min: 0, max: 100, step: 5 }, hint: () => mixHint(state.stock_share) }),
    numberField({ path: "tent_share", label: "Stock share at the FIRE start", kind: "pct", min: 0, max: 1, slider: { min: 0, max: 100, step: 5 },
      hint: () => (state.tent_share < state.stock_share ? `Bond tent. ${mixHint(state.tent_share)}` : "Same as normal: no bond tent.") }),
    row2(
      numberField({ path: "tent_years_before", label: "Years to get there", kind: "int", unit: "yrs", help: "tent_years", min: 0, max: 40 }),
      numberField({ path: "tent_years_after", label: "Years back after", kind: "int", unit: "yrs", help: "tent_years", min: 0, max: 40 })),
    row2(
      numberField({ path: "bond_return", label: "Bond return (nominal)", kind: "pct", min: -0.5, max: 1, hint: (v) => `${fmt.pct(realOf(v), 2)} real` }),
      numberField({ path: "bond_vol", label: "Bond volatility", kind: "pct", min: 0, max: 1 })),
    numberField({ path: "stock_bond_corr", label: "Stock/bond correlation", kind: "num", unit: "", min: -1, max: 1, hint: "0 = independent; −1…1" })));

  form.append(stressGroup());

  form.append(group("Simulation", false,
    row2(
      numberField({ path: "start_year", label: "Balances as of", kind: "year", min: 1900, max: 2200 }),
      numberField({ path: "start_month", label: "… month (1–12)", kind: "int", unit: "", min: 1, max: 12, hint: "Only the rest of that year still grows and saves." })),
    selectField({
      path: "n_sims", label: "Simulated futures", setting: true,
      options: () => {
        const opts = [1000, 5000, 10000, 25000, 50000];
        if (!opts.includes(settings.n_sims)) opts.push(settings.n_sims);
        return opts.sort((a, b) => a - b).map((n) => [String(n), fmt.num(n)]);
      },
      hint: "10,000 is precise to about ±0.4 points. The grid and stress test use fewer for speed.",
      onchange: (v) => { settings.n_sims = Number(v); store.saveSettings(settings); },
    }),
    row2(
      numberField({ path: "seed", label: "Random seed", kind: "int", unit: "", setting: true, min: 0, max: 2 ** 31, onchange: () => store.saveSettings(settings) }),
      selectField({
        path: "locale", label: "Number format", setting: true, options: () => LOCALES,
        onchange: (v) => {
          settings.locale = v;
          store.saveSettings(settings);
          refreshFormat();
          rebuild();
        },
      })),
    addButtons(["New seed", newSeed]),
    el("div", { class: "hint", text: "The seed, the number of futures and the number format belong to this browser, not to a plan: switching plans keeps the same futures." })));

  syncAll();
  renderPlanBar();
  if (focused) document.getElementById(focused)?.focus();
}

function syncAll() {
  for (const s of syncers) s();
}
function rebuild() {
  buildForm();
}

// ---- list edits --------------------------------------------------------------------------------------
function afterAdd(list) {
  rebuild();
  changed();
  const id = `f-${list}-${state[list].length - 1}-name`;
  const input = document.getElementById(id);
  input?.closest(".item")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  input?.focus();
  input?.select();
}
function addItem(list, item) {
  state[list].push(item);
  afterAdd(list);
}
function addPerson() {
  state.people.push(newPerson(state));
  afterAdd("people");
}
function removeItem(list, i) {
  const before = snapshot();
  const [gone] = state[list].splice(i, 1);
  rebuild();
  changed();
  toast(`Removed “${gone.name}”.`, { undo: () => restore(before) });
}
// A person goes with their accounts and the income lines tied to their age.
function removePerson(i) {
  const before = snapshot();
  const [gone] = state.people.splice(i, 1);
  const ownsAccount = (a) => a.owner === gone.id;
  const tied = (s) => s.from?.person === gone.id || s.to?.person === gone.id;
  const nAcc = state.accounts.filter(ownsAccount).length;
  const nInc = state.income.filter(tied).length;
  state.accounts = state.accounts.filter((a) => !ownsAccount(a));
  state.income = state.income.filter((s) => !tied(s));
  if (state.end_person === gone.id) state.end_person = state.people[0].id;
  rebuild();
  changed();
  const also = [nAcc && `${nAcc} account${nAcc > 1 ? "s" : ""}`, nInc && `${nInc} income line${nInc > 1 ? "s" : ""}`].filter(Boolean);
  toast(`Removed ${gone.name}${also.length ? `, with ${also.join(" and ")}` : ""}.`, { undo: () => restore(before) });
}

function newSeed() {
  let seed;
  do seed = 1 + Math.floor(Math.random() * 99_999); while (seed === settings.seed);
  settings.seed = seed;
  store.saveSettings(settings);
  changed();
}

// ---- plans -------------------------------------------------------------------------------------------
// The values on screen always start from a saved plan (`base`); whatever differs from it is an
// unsaved change, kept in this browser so a reload carries on where it was.
const LIST_NAMES = { "people.#": "Household members", "accounts.#": "Retirement accounts", "income.#": "Income and costs", "events.#": "One-off events" };
const MOD_S = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘S" : "Ctrl+S";
const edits = () => differences(base.values, state);

function persistPlans() {
  const ok = store.savePlans(plans);
  if (!ok && canStore) storageProblem();
  if (ok && !keepAsked && plans.some((p) => !p.example)) {
    keepAsked = true; // once per visit: Firefox asks the viewer, the others decide on their own
    store.keepStorage();
  }
}
function persistSession() {
  store.saveSession({ current: base.id, working: state });
}
function storageProblem() {
  canStore = false;
  showNotice("This browser isn't keeping what the page saves (a private window, or storage blocked or full): your plans will be lost when you close it. Use ⋯ → Export plans to keep a copy.");
}

// Undo brings back what was on screen, never an older list of saved plans: a save made after the
// action it undoes must survive.
function snapshot() { return { state: clone(state), base: clone(base) }; }
function restore(snap) {
  state = snap.state;
  base = snap.base;
  refreshFormat();
  reload();
}
function reload() {
  invalid.clear();
  showError("");
  buildForm();
  changed();
}

function useBase(id) {
  const p = planById(id);
  state = clone(p.plan);
  base = { id, name: p.name, values: clone(p.plan) };
  refreshFormat();
  reload();
}
function switchTo(id) {
  const before = snapshot();
  const unsaved = edits().length > 0;
  useBase(id);
  if (unsaved) toast(`Unsaved changes to “${before.base.name}” discarded.`, { undo: () => restore(before) });
}
function revert() {
  const before = snapshot();
  useBase(base.id);
  toast("Changes reverted.", { undo: () => restore(before) });
}
function addPlan(name, plan, extra = {}) {
  const p = { id: uid(), name, plan: clone(plan), updated: Date.now(), ...extra };
  plans.push(p);
  persistPlans();
  return p;
}
function uniqueName(name) {
  let n = name.slice(0, 60);
  for (let i = 2; nameProblem(n); i++) n = `${name.slice(0, 54)} (${i})`;
  return n;
}

function canSave() {
  if (invalid.size) { toast("Some fields aren't valid yet: fix the red ones first.", { error: true }); return false; }
  return true;
}
function saveCurrent() {
  if (!canSave()) return;
  const p = planById(base.id);
  if (!p) { saveAsNew(); return; }
  p.plan = clone(state);
  p.updated = Date.now();
  p.example = false;
  delete p.shared; // changed since it was shared: the sharer's numbers no longer compare
  persistPlans();
  base.values = clone(state);
  persistSession();
  renderPlanBar();
  toast(`Saved “${p.name}”.`);
}
function suggestName() {
  const rule = { fixed: "fixed", guardrails: "guardrails", vanguard: "Vanguard", spenddown: "spend-down" }[state.rule.kind];
  const amount = state.rule.kind === "spenddown" ? `floor ${fmt.short(state.rule.floor)}` : fmt.short(state.spending);
  return uniqueName(`Stop ${state.fire_year}, ${amount}, ${rule}`);
}
function saveAsNew() {
  if (!canSave()) return;
  askName({
    title: "Save as a copy",
    text: planById(base.id) ? `“${base.name}” stays as it was saved.` : "",
    value: suggestName(),
    ok: "Save",
    submit: (name) => {
      const p = addPlan(name, state);
      base = { id: p.id, name: p.name, values: clone(state) };
      persistSession();
      renderPlanBar();
      toast(`Saved as “${p.name}”.`);
    },
  });
}
function renamePlan() {
  const p = planById(base.id);
  askName({
    title: "Rename plan",
    value: p.name,
    ok: "Rename",
    exceptId: p.id,
    submit: (name) => {
      p.name = name;
      base.name = name;
      persistPlans();
      renderPlanBar();
    },
  });
}
function deletePlan() {
  const before = snapshot();
  const p = planById(base.id);
  plans = plans.filter((x) => x.id !== p.id);
  // Never an empty list: the example comes back, until it's needed no more.
  const stand_in = plans.length ? null : addPlan("Example", examplePlan({ currency: state.currency }), { example: true });
  const next = [...plans].sort((a, b) => (b.updated ?? 0) - (a.updated ?? 0))[0];
  persistPlans();
  useBase(next.id);
  toast(`Deleted “${p.name}”.`, {
    undo: () => {
      if (!planById(p.id)) plans.push(p);
      const ex = stand_in && planById(stand_in.id);
      if (ex?.example && eq(ex.plan, stand_in.plan)) plans = plans.filter((x) => x !== ex);
      persistPlans();
      restore(before);
    },
  });
}

function nameProblem(name, exceptId = null) {
  if (!name) return "Give the plan a name.";
  if (name.length > 60) return "Keep the name under 60 characters.";
  const key = name.toLocaleLowerCase();
  const twin = plans.find((x) => x.id !== exceptId && x.name.toLocaleLowerCase() === key);
  return twin ? `There is already a plan called “${twin.name}”.` : "";
}
function askName({ title, text = "", value = "", ok, exceptId = null, submit }) {
  const d = $("#name-dialog");
  const input = $("#name-input");
  const problem = (msg) => {
    $("#name-error").textContent = msg;
    input.parentElement.classList.toggle("invalid", Boolean(msg));
  };
  $("#name-title").textContent = title;
  $("#name-text").textContent = text;
  $("#name-ok").textContent = ok;
  input.value = value;
  problem("");
  input.oninput = () => problem("");
  $("#name-form").onsubmit = (e) => {
    e.preventDefault();
    const name = input.value.trim().replace(/\s+/g, " ");
    const msg = nameProblem(name, exceptId);
    if (msg) { problem(msg); input.focus(); return; }
    submit(name);
    d.close();
  };
  d.showModal();
  input.focus();
  input.select();
}
function confirmBox({ title, text, ok = "OK", cancel = "Cancel" }) {
  return new Promise((resolve) => {
    const d = $("#confirm-dialog");
    $("#confirm-title").textContent = title;
    $("#confirm-text").textContent = text;
    $("#confirm-ok").textContent = ok;
    $("#confirm-cancel").textContent = cancel;
    const done = (v) => { d.onclose = null; d.close(); resolve(v); };
    $("#confirm-ok").onclick = () => done(true);
    $("#confirm-cancel").onclick = () => done(false);
    d.onclose = () => resolve(false);
    d.showModal();
  });
}

// ---- setting up a new plan ---------------------------------------------------------------------------
function openSetup() {
  const now = today();
  const y = now.getFullYear();
  const people = [{ name: "Me", born: y - 35, pension: "", age: 67 }];
  const money = { currency: state?.currency ?? DEFAULT_CURRENCY, portfolio: "", cash: "", contrib: "", spending: "", fire: String(y + 15), name: uniqueName("My plan") };
  const wrap = $("#setup-fields");
  const f = () => makeFormat(settings.locale, money.currency);
  const field = (label, input, hint) => el("label", { class: "setup-field" }, el("span", { text: label }), input, hint ? el("small", { text: hint }) : null);
  const text = (obj, key, attrs = {}) => {
    const i = el("input", { type: "text", value: obj[key] ?? "", ...attrs });
    i.addEventListener("input", () => { obj[key] = i.value; });
    return i;
  };
  const render = () => {
    const cur = el("select", {}, ...CURRENCIES.map((c) => el("option", { value: c, text: `${c} · ${currencyName(c, fmt.locale)}` })));
    cur.value = money.currency;
    cur.addEventListener("change", () => { money.currency = cur.value; render(); });
    const rows = people.map((p, i) => el("div", { class: "setup-person" },
      field("Name", text(p, "name", { maxlength: 40 })),
      field("Born", text(p, "born", { inputmode: "numeric" })),
      field("State pension / yr", text(p, "pension", { inputmode: "decimal", placeholder: "optional" })),
      field("from age", text(p, "age", { inputmode: "numeric" })),
      people.length > 1 ? el("button", { type: "button", class: "btn quiet small", "aria-label": `Remove ${p.name}`, onclick: () => { people.splice(i, 1); render(); } }, "×") : el("span")));
    wrap.replaceChildren(
      el("div", { class: "setup-grid" },
        field("Plan name", text(money, "name", { maxlength: 60 })),
        field("Currency", cur)),
      el("h3", { text: "Who's in the household" }),
      ...rows,
      el("button", { type: "button", class: "btn small", disabled: people.length >= LIMITS.people, title: people.length >= LIMITS.people ? `A plan holds up to ${LIMITS.people} people.` : null, onclick: () => { people.push({ name: `Person ${people.length + 1}`, born: String(y - 35), pension: "", age: 67 }); render(); } }, "Add person"),
      el("h3", { text: "Money" }),
      el("div", { class: "setup-grid" },
        field(`Invested today (${money.currency})`, text(money, "portfolio", { inputmode: "decimal", placeholder: "0" }), "funds, shares: what you could sell"),
        field(`Cash today (${money.currency})`, text(money, "cash", { inputmode: "decimal", placeholder: "0" })),
        field(`Saved per year (${money.currency})`, text(money, "contrib", { inputmode: "decimal", placeholder: "0" }), "until you stop working"),
        field(`Spending per year (${money.currency})`, text(money, "spending", { inputmode: "decimal" }), "once you stop, today's money, taxes included"),
        field("Stop working in", text(money, "fire", { inputmode: "numeric" }), "the FIRE start, a year")),
    );
  };
  render();
  $("#setup-error").textContent = "";
  $("#setup-form").onsubmit = (e) => {
    e.preventDefault();
    const F = f();
    const amount = (s, label, required = false) => {
      if (!String(s).trim()) { if (required) throw new Error(`${label}: enter an amount.`); return 0; }
      const v = F.parse(s, "money");
      if (!(v >= 0)) throw new Error(`${label}: “${s}” isn't an amount.`);
      return v;
    };
    try {
      const plan = blankPlan({ currency: money.currency, today: now });
      plan.people = people.map((p, i) => {
        const born = Math.round(F.parse(p.born, "num"));
        if (!(born >= 1900 && born <= y)) throw new Error(`${p.name || `Person ${i + 1}`}: the birth year should be between 1900 and ${y}.`);
        return { id: uid(), name: p.name.trim() || `Person ${i + 1}`, birth_year: born };
      });
      plan.income = people.flatMap((p, i) => {
        const v = amount(p.pension, `${plan.people[i].name}'s state pension`);
        const age = Math.round(F.parse(p.age, "num"));
        if (!v) return [];
        if (!(age >= 40 && age <= 90)) throw new Error(`${plan.people[i].name}'s state pension: the age should be between 40 and 90.`);
        const name = people.length > 1 ? `State pension (${plan.people[i].name})` : "State pension";
        return [{ id: uid(), name, amount: v, from: { kind: "age", person: plan.people[i].id, value: age }, to: null, indexed: true }];
      });
      plan.end_person = [...plan.people].sort((a, b) => b.birth_year - a.birth_year)[0].id;
      plan.portfolio = amount(money.portfolio, "Invested today");
      plan.cash = amount(money.cash, "Cash today");
      plan.contrib = amount(money.contrib, "Saved per year");
      plan.spending = amount(money.spending, "Spending per year", true);
      if (!(plan.spending > 0)) throw new Error("Spending per year: it has to be more than 0.");
      plan.fire_year = Math.round(F.parse(money.fire, "num"));
      if (!(plan.fire_year >= y && plan.fire_year < endYear(plan))) throw new Error(`Stop working in: a year from ${y} on.`);
      plan.rule = { ...RULE_DEFAULTS, ...bandAround(plan.spending) };
      const name = money.name.trim() || "My plan";
      const msg = nameProblem(name);
      if (msg) throw new Error(msg);
      $("#setup-dialog").close();
      const p = addPlan(name, normalize(plan, { currency: plan.currency, today: now }));
      switchTo(p.id);
      toast(`Created “${p.name}”. Add retirement accounts, income and one-off events in the panel.`);
    } catch (err) {
      $("#setup-error").textContent = err.message;
    }
  };
  $("#setup-dialog").showModal();
}

// ---- share links, files ------------------------------------------------------------------------------
// A password protects the link only as well as it resists guessing: whoever holds a locked link
// can try passwords offline, as fast as their hardware allows. PBKDF2 slows each try; length does
// the rest.
const MIN_PASSWORD = 8;
let shareTurn = 0; // the latest link being made: an older one finishing late is dropped

async function openShare() {
  if (!canSave()) return;
  const name = base.name;
  const plan = clone(state);
  const run = { seed: settings.seed, n_sims: settings.n_sims }; // so they can see the same numbers
  const input = $("#share-url");
  const pw = $("#share-password");
  const note = $("#share-lock-note");
  const copyBtn = $("#share-copy");
  const nativeBtn = $("#share-native");
  let url = "";
  let locked = false;
  let timer = 0;
  const show = (u, placeholder = "") => {
    url = u;
    input.value = u;
    input.placeholder = placeholder;
    copyBtn.disabled = !u;
    nativeBtn.disabled = !u;
  };
  const make = () => {
    const turn = ++shareTurn;
    const password = pw.value;
    const short = password !== "" && [...password].length < MIN_PASSWORD;
    clearTimeout(timer);
    note.classList.toggle("warn", short);
    note.textContent = !password ? "Without one, anyone with the link can open it."
      : short ? `At least ${MIN_PASSWORD} characters. A few unrelated words are best.`
        : "The link opens only with this password, which isn't in the link: send it separately, not in the same message.";
    // Never a link without the lock while a password is being typed: it could be sent by mistake.
    show("", short ? "Finish the password first" : password ? "Locking…" : "");
    if (short) return;
    timer = setTimeout(async () => {
      const code = await store.packPlan(name, plan, { password, run });
      if (turn !== shareTurn) return;
      locked = Boolean(password);
      show(`${location.origin}${location.pathname}#plan=${code}`);
    }, password ? 300 : 0);
  };
  $("#share-lock").hidden = !store.canLock();
  pw.oninput = make;
  pw.onkeydown = (e) => { if (e.key === "Enter") e.preventDefault(); };
  nativeBtn.hidden = typeof navigator.share !== "function";
  // A share sheet often puts the title in the message: a locked plan's name stays out of it.
  nativeBtn.onclick = () => navigator.share({ title: locked ? "FIRE plan" : `FIRE plan: ${name}`, url }).catch(() => {});
  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied.");
    } catch {
      input.select();
      document.execCommand?.("copy");
      toast("Link selected: copy it from the box.");
    }
  };
  pw.value = "";
  make();
  clearTimeout(timer); // the first link, without a password, is made right here
  const turn = shareTurn;
  const code = await store.packPlan(name, plan, { run });
  if (turn === shareTurn) show(`${location.origin}${location.pathname}#plan=${code}`);
  $("#share-dialog").showModal();
  input.select();
}

/** Asks for the password of a locked link: { name, plan }, or null if closed without one. */
function unlockShared(code) {
  return new Promise((resolve, reject) => {
    if (!store.canLock()) {
      reject(new Error("This share link is locked with a password, which this browser can only unlock over https."));
      return;
    }
    const d = $("#unlock-dialog");
    const input = $("#unlock-input");
    const ok = $("#unlock-ok");
    let settled = false;
    const done = (fn, v) => {
      if (settled) return;
      settled = true;
      d.onclose = null;
      d.close();
      fn(v);
    };
    const problem = (msg) => {
      $("#unlock-error").textContent = msg;
      input.parentElement.classList.toggle("invalid", Boolean(msg));
    };
    input.value = "";
    problem("");
    input.oninput = () => problem("");
    $("#unlock-cancel").onclick = () => done(resolve, null);
    d.onclose = () => done(resolve, null); // Escape, or a click outside
    $("#unlock-form").onsubmit = async (e) => {
      e.preventDefault();
      if (ok.disabled) return;
      if (!input.value) { problem("Type the password you were given."); input.focus(); return; }
      ok.disabled = true;
      ok.textContent = "Unlocking…";
      try {
        done(resolve, await store.unpackPlan(code, input.value));
      } catch (err) {
        if (err.code !== "password") done(reject, err);
        else if (!settled) { problem(err.message); input.focus(); input.select(); }
      } finally {
        ok.disabled = false;
        ok.textContent = "Open it";
      }
    };
    d.showModal();
    input.focus();
  });
}

// A link opened while an older copy of the page is still open (a tab left from last week, an
// installed app offline) can't read a newer plan without losing what it doesn't know: reloading
// fetches the new version.
const NEWER = "This plan was made by a newer version of the simulator: reload the page to update it";

async function openSharedLink() {
  const m = /^#plan=([\w-]+)$/.exec(location.hash);
  if (!m) return;
  history.replaceState(null, "", location.pathname + location.search);
  const locked = store.isLocked(m[1]);
  let shared;
  try {
    shared = locked ? await unlockShared(m[1]) : await store.unpackPlan(m[1]);
  } catch (err) {
    toast(err.message, { error: true });
    return;
  }
  if (!shared) return;
  if (fromNewer(shared.plan)) {
    history.replaceState(null, "", `${location.pathname}${location.search}#plan=${m[1]}`); // a reload opens it
    toast(`${NEWER}, and the link opens.`, { error: true });
    return;
  }
  const plan = normalize(shared.plan, { currency: state.currency });
  const name = (typeof shared.name === "string" && shared.name.trim().slice(0, 50)) || "Shared plan";
  // Opened before (a bookmarked link, or the sharer's own browser): go to that copy, no new one.
  const twin = plans.find((x) => eq(x.plan, plan));
  if (twin) {
    const unsaved = edits().length > 0;
    noteRun(twin, shared.run);
    switchTo(twin.id);
    if (!unsaved) toast(`Already saved here as “${twin.name}”: opened it.`);
    return;
  }
  // Typing the password already said yes.
  const yes = locked || await confirmBox({
    title: "Open a shared plan?",
    text: `Someone shared “${name}” with you. It opens as a new plan in this browser; your own plans stay as they are.`,
    ok: "Open it",
    cancel: "Not now",
  });
  if (!yes) return;
  const p = addPlan(uniqueName(name), plan);
  noteRun(p, shared.run);
  switchTo(p.id);
}

// ---- the run a plan was shared with ------------------------------------------------------------------
// A share link says which seed and how many futures the sharer used. Different ones here give
// slightly different numbers, so the plan keeps them and a note says so until the person opening
// it uses the same, dismisses the note, or saves changes to the plan.
const sameRun = (r) => r.seed === settings.seed && r.n_sims === settings.n_sims;
function noteRun(p, run) {
  if (!run || sameRun(run)) return;
  p.shared = run;
  persistPlans();
}
function renderShared() {
  const box = $("#shared-note");
  const run = planById(base.id)?.shared;
  box.hidden = !run || sameRun(run);
  if (box.hidden) return;
  const seed = run.seed !== settings.seed;
  const n = run.n_sims !== settings.n_sims;
  const theirs = [seed && `seed ${run.seed}`, n && `${fmt.num(run.n_sims)} futures`].filter(Boolean).join(" and ");
  const yours = [seed && `seed ${settings.seed}`, n && `${fmt.num(settings.n_sims)} futures`].filter(Boolean).join(" and ");
  $("#shared-text").textContent = `Shared with ${theirs}. With your ${yours}, the numbers can differ a little.`;
}
function forgetRun() {
  const p = planById(base.id);
  if (!p?.shared) return;
  delete p.shared;
  persistPlans();
  renderShared();
}
function useSharedRun() {
  const run = planById(base.id)?.shared;
  if (!run) return;
  settings.seed = run.seed;
  settings.n_sims = run.n_sims;
  store.saveSettings(settings);
  forgetRun();
  changed();
  toast(`Now on seed ${run.seed} and ${fmt.num(run.n_sims)} futures, as shared. Change them under Simulation.`);
}

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = el("a", { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function exportPlans() {
  const f = store.exportFile(plans);
  download(f.name, f.text);
  exported = Date.now();
  store.saveExported(exported);
  renderPlanBar();
  toast(`Exported ${plans.length} plan${plans.length > 1 ? "s" : ""}.${edits().length ? " Unsaved changes aren't in the file: save them first." : ""}`);
}
async function importPlans(file) {
  let items;
  try {
    items = store.readFile(await file.text());
  } catch (err) {
    toast(err.message, { error: true });
    return;
  }
  if (items.some((x) => fromNewer(x.plan))) {
    toast(`${NEWER}, then import the file again.`, { error: true });
    return;
  }
  const added = items.map((x) => addPlan(uniqueName(str(x.name) || "Imported plan"), normalize(x.plan, { currency: state.currency })));
  switchTo(added[0].id);
  toast(`Imported ${added.length} plan${added.length > 1 ? "s" : ""}.`);
}
const str = (v) => (typeof v === "string" ? v.trim().slice(0, 50) : "");

const ACTIONS = {
  new: openSetup,
  "save-as": saveAsNew,
  rename: renamePlan,
  delete: deletePlan,
  share: openShare,
  export: exportPlans,
  import: () => $("#import-file").click(),
};

// ---- plan bar: the picker, its status, the marks on edited fields --------------------------------------
const labelOf = (path) => {
  if (LIST_NAMES[path]) return LIST_NAMES[path];
  let best = null;
  for (const f of FIELDS) if ((path === f.path || path.startsWith(`${f.path}.`)) && (!best || f.path.length > best.path.length)) best = f;
  return best?.label ?? path;
};
let optionsKey = "";
function renderPlanBar() {
  if (!base) return;
  const sel = $("#plan-select");
  const saved = planById(base.id);
  const key = JSON.stringify([base.id, base.name, plans.map((x) => [x.id, x.name])]);
  if (key !== optionsKey) {
    optionsKey = key;
    const opts = [...plans].sort(byName).map((x) => el("option", { value: x.id, text: x.name }));
    if (!saved) opts.unshift(el("option", { value: base.id, text: `${base.name} (not saved)` }));
    sel.replaceChildren(...opts);
    sel.value = base.id;
  }
  const edited = edits();
  for (const f of FIELDS) {
    const a = getPath(state, f.path);
    const b = getPath(base.values, f.path);
    f.node.classList.toggle("edited", !eq(a, b));
  }
  // A section is edited when a field in it is, or when one of its list items was added or removed.
  for (const g of groups) {
    const list = g.dataset.list;
    g.classList.toggle("edited", Boolean(g.querySelector(".field.edited")) || Boolean(list && !eq(state[list], base.values[list])));
  }

  const status = $("#plan-state");
  const saveBtn = $("#plan-save");
  $("#plan-revert").hidden = !edited.length || !saved;
  saveBtn.hidden = !edited.length && saved;
  saveBtn.textContent = saved ? "Save" : "Save as…";
  saveBtn.title = saved ? `Save the changes into “${base.name}” (${MOD_S})` : "Save these values as a plan";
  if (edited.length) {
    status.className = "scenario-state dirty";
    status.textContent = `Edited: ${[...new Set(edited.map(labelOf))].join(", ")}`;
  } else if (!saved) {
    status.className = "scenario-state dirty";
    status.textContent = "This plan was deleted in another tab: save it to keep it.";
  } else {
    status.className = "scenario-state";
    status.textContent = saved.example
      ? "Made-up numbers. Change anything, or set up your own plan (⋯ → New plan)."
      : `Saved in this browser${saved.updated ? `, ${new Intl.DateTimeFormat(fmt.locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(saved.updated))}` : ""}.`;
  }
  status.title = status.textContent;
  const menu = $("#plan-menu");
  menu.querySelector("[data-act=rename]").disabled = !saved;
  menu.querySelector("[data-act=delete]").disabled = !saved;
  menu.querySelector("[data-act=export]").disabled = !plans.length;

  const pill = $("#plan-pill");
  pill.replaceChildren(el("span", { class: "pill-name", text: base.name }));
  if (edited.length) pill.append(el("span", { class: "pill-edited", text: "edited" }));
  pill.setAttribute("aria-label", `Plan: ${base.name}${edited.length ? ", edited" : ""}`);
  $("#welcome").classList.toggle("hidden", !(saved?.example && !settings.welcomeClosed));
  renderBackup();
  renderShared();
}

// Saved plans live in this browser only, and browsers can clear them. Until an exported file holds
// the latest saves, a reminder sits under the plan bar (not when storage doesn't work at all: the
// notice about that says more).
function renderBackup() {
  const own = plans.filter((p) => !p.example);
  const newer = own.filter((p) => (p.updated ?? Infinity) > exported);
  const box = $("#backup");
  box.hidden = !canStore || !newer.length;
  if (box.hidden) return;
  const day = (t) => new Intl.DateTimeFormat(fmt.locale, { dateStyle: "medium" }).format(new Date(t));
  $("#backup-text").textContent = exported
    ? `Saved changes since your last backup (${day(exported)}).`
    : "Your plans are only in this browser. Keep a backup file.";
}

function wireMenu() {
  const btn = $("#plan-more");
  const menu = $("#plan-menu");
  const items = () => [...menu.querySelectorAll("[role=menuitem]:not(:disabled)")];
  const open = () => {
    menu.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    items()[0]?.focus();
  };
  const close = (refocus) => {
    if (menu.hidden) return;
    menu.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    if (refocus) btn.focus();
  };
  btn.addEventListener("click", () => (menu.hidden ? open() : close(false)));
  btn.addEventListener("keydown", (e) => { if (e.key === "ArrowDown") { e.preventDefault(); open(); } });
  menu.addEventListener("keydown", (e) => {
    const list = items();
    const i = list.indexOf(document.activeElement);
    const go = (j) => { e.preventDefault(); list[(j + list.length) % list.length]?.focus(); };
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(list.length - 1);
    else if (e.key === "Escape") { e.preventDefault(); close(true); }
    else if (e.key === "Tab") close(false);
  });
  menu.addEventListener("click", (e) => {
    const item = e.target.closest("[role=menuitem]");
    if (!item || item.disabled) return;
    close(false);
    ACTIONS[item.dataset.act]();
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".menu-wrap")) close(false); });
}

// ---- messages ------------------------------------------------------------------------------------------
let toastTimer = null;
function toast(text, { undo = null, error = false } = {}) {
  const t = $("#toast");
  $("#toast-text").textContent = text;
  const action = $("#toast-action");
  action.hidden = !undo;
  action.onclick = undo ? () => { hideToast(); undo(); } : null;
  t.classList.toggle("error", error);
  t.classList.add("show");
  t.dataset.ms = undo || error ? 10000 : 4500;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, Number(t.dataset.ms));
}
function hideToast() {
  clearTimeout(toastTimer);
  $("#toast").classList.remove("show");
}
function showNotice(msg) {
  const n = $("#notice");
  n.textContent = msg;
  n.classList.toggle("show", Boolean(msg));
}
function showError(msg, fix = null) {
  const e = $("#error");
  $("#error-text").textContent = msg || "";
  const btn = $("#error-fix");
  btn.hidden = !fix;
  if (fix) {
    btn.textContent = fix.label;
    btn.onclick = fix.run;
  }
  e.classList.toggle("show", Boolean(msg));
}

// ---- running the model -----------------------------------------------------------------------------------
// One worker for the main result (one request at a time, the newest waiting), and one per heavier
// view: those restart when the plan changes while they run, so a slider never queues stale work.
const WORKER = new URL("./worker.js", import.meta.url);
let reqId = 0;
const main = { worker: null, busy: false, queued: null, latest: 0 };
const heavy = { grid: { worker: null, id: 0 }, safe: { worker: null, id: 0 }, stress: { worker: null, id: 0 } };
const CARDS = { grid: "c-grid", safe: "c-safe", stress: "c-stress" };
const MAIN_CARDS = ["c-paths", "c-spending", "c-dist"];

function spawnMain() {
  main.worker = new Worker(WORKER, { type: "module" });
  main.worker.onmessage = (e) => {
    main.busy = false;
    const q = main.queued;
    main.queued = null;
    if (q) postMain(q);
    if (e.data.id !== main.latest) return;
    busy(MAIN_CARDS, false);
    if (e.data.error) { showError(`The simulation stopped: ${e.data.error}`); return; }
    sim = { ...e.data.result, ms: e.data.ms };
    renderSim();
  };
  main.worker.onerror = (e) => { main.busy = false; showError(`The simulation couldn't run: ${e.message || "worker error"}`); };
}
function postMain(msg) {
  main.busy = true;
  main.worker.postMessage(msg);
}
function runMain(plan) {
  const msg = { id: ++reqId, task: "main", plan };
  main.latest = msg.id;
  busy(MAIN_CARDS, true);
  if (main.busy) main.queued = msg;
  else postMain(msg);
}
function runHeavy(name, plan) {
  const h = heavy[name];
  if (h.id && h.worker) { h.worker.terminate(); h.worker = null; } // still busy with an older plan
  if (!h.worker) {
    h.worker = new Worker(WORKER, { type: "module" });
    h.worker.onmessage = (e) => {
      if (e.data.id !== h.id) return;
      h.id = 0;
      busy([CARDS[name]], false);
      if (e.data.error) { showError(`The ${name} view stopped: ${e.data.error}`); return; }
      explore[name] = e.data.result;
      RENDER[name]();
    };
    h.worker.onerror = (e) => {
      h.id = 0;
      busy([CARDS[name]], false);
      showError(`The ${name} view couldn't run: ${e.message || "worker error"}`);
    };
  }
  h.id = ++reqId;
  busy([CARDS[name]], true);
  h.worker.postMessage({ id: h.id, task: name, plan });
}

let simTimer = null;
let expTimer = null;
function changed() {
  persistSession();
  syncAll();
  renderPlanBar();
  clearTimeout(simTimer);
  simTimer = setTimeout(runSim, 160);
}
function runSim() {
  if (invalid.size) { showError("Some fields aren't valid yet: fix the red ones."); return; }
  const probs = problems(state, endYear);
  if (probs.length) {
    const r = state.rule;
    const fix = r.kind !== "fixed" && probs.some((p) => p.includes("floor"))
      ? { label: "Set floor and ceiling around this spending", run: () => { Object.assign(state.rule, bandAround(state.spending)); changed(); } }
      : null;
    showError(probs.join(" "), fix);
    return;
  }
  showError("");
  const plan = runPlan();
  runMain(plan);
  clearTimeout(expTimer);
  expTimer = setTimeout(() => { for (const name of Object.keys(heavy)) runHeavy(name, plan); }, 250);
}
function busy(ids, on) {
  for (const id of ids) document.getElementById(id)?.classList.toggle("busy", on);
}

// ---- charts ----------------------------------------------------------------------------------------------
const VIRIDIS = ["#440154", "#414487", "#2a788e", "#22a884", "#7ad151", "#fde725"];
function viridis(t) {
  const x = Math.min(Math.max(t, 0), 1) * (VIRIDIS.length - 1);
  const i = Math.min(Math.floor(x), VIRIDIS.length - 2);
  const f = x - i;
  const a = VIRIDIS[i].match(/\w\w/g).map((h) => parseInt(h, 16));
  const b = VIRIDIS[i + 1].match(/\w\w/g).map((h) => parseInt(h, 16));
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(",")})`;
}
function alpha(hex, a) {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const [r, g, b] = n.match(/\w\w/g).map((x) => parseInt(x, 16));
  return `rgba(${r},${g},${b},${a})`;
}
function layout(extra = {}) {
  const ink = css("--ink");
  const line = css("--line");
  const phone = isPhone();
  const axis = { gridcolor: line, linecolor: line, zerolinecolor: line, tickfont: { color: css("--muted") }, fixedrange: phone };
  return {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: css("--font"), color: ink, size: 12 },
    margin: { l: 58, r: 14, t: 14, b: 44 },
    separators: fmt.plotly,
    hoverlabel: { bgcolor: css("--surface"), bordercolor: line, font: { color: ink, family: css("--font") } },
    legend: { orientation: "h", x: 0, y: -0.16, font: { color: css("--muted"), size: 11 } },
    dragmode: phone ? false : "zoom",
    ...extra,
    xaxis: { ...axis, ...(extra.xaxis || {}) },
    yaxis: { ...axis, ...(extra.yaxis || {}) },
  };
}
const CONFIG = { responsive: true, displaylogo: false, displayModeBar: false, scrollZoom: false };

// Short names for the age rows under the year axis: as short as they can be while still telling
// everyone apart. First letters (A, S); else the initials of each word, numbers kept whole (M, P2,
// P3 for "Me", "Person 2", "Person 3"); else the first three letters; else 1, 2, 3.
function shortNames(people) {
  const tries = [
    (n) => [...n][0] ?? "?",
    (n) => n.split(/\s+/).filter(Boolean).map((w) => (/^\d+$/.test(w) ? w : [...w][0])).join("") || "?",
    (n) => [...n].slice(0, 3).join("") || "?",
  ];
  for (const f of tries) {
    const short = people.map((x) => f(x.name.trim()));
    if (new Set(short).size === short.length) return short;
  }
  return people.map((_, i) => String(i + 1));
}
let measureCtx = null;
const textWidth = (text, px) => {
  measureCtx ??= document.createElement("canvas").getContext("2d");
  measureCtx.font = `${px}px ${css("--font")}`;
  return measureCtx.measureText(text).width;
};
// Every 5 years (or 10, 20 where the labels wouldn't fit), each with the ages that year, two people
// per line. Never tilted (a tilted label runs into the chart's bottom edge), and none so close to
// either end that it would be cut off: `room` is the margin beside the plot on each side.
function yearTicks(years, people, plotWidth, room) {
  const names = shortNames(people);
  const rowsAt = (y) => {
    const parts = people.map((x, i) => (people.length > 1 ? `${names[i]} ${y - x.birth_year}` : `age ${y - x.birth_year}`));
    const rows = [];
    for (let i = 0; i < parts.length; i += 2) rows.push(parts.slice(i, i + 2).join(" · "));
    return rows;
  };
  const last = years[years.length - 1];
  const widest = Math.max(textWidth(String(last), 12), ...rowsAt(last).map((r) => textWidth(r, 10)));
  const span = Math.max(last - years[0], 1);
  const perYear = plotWidth / span;
  const step = [5, 10, 20].find((st) => perYear * st >= widest + 12) ?? 20;
  const fits = (y) => (y - years[0]) * perYear + room.l >= widest / 2 && (last - y) * perYear + room.r >= widest / 2;
  const vals = [];
  for (let y = Math.ceil(years[0] / step) * step; y <= last; y += step) if (fits(y)) vals.push(y);
  const ticktext = vals.map((y) => [String(y), ...rowsAt(y).map((r) => `<span style="font-size:10px">${esc(r)}</span>`)].join("<br>"));
  return { tickvals: vals, ticktext, tickangle: 0, lines: 1 + Math.ceil(people.length / 2) };
}
const signed = (v) => `${v >= 0 ? "+" : "−"}${fmt.short(Math.abs(v))}`;
function milestoneLabel(m) {
  const parts = [];
  const unlocks = {};
  for (const it of m.items) {
    if (it.type === "fire") parts.push("FIRE start");
    else if (it.type === "unlock") (unlocks[it.owner] ??= []).push(it.name);
    else if (it.type === "income") parts.push(`${it.name} ${signed(it.amount)}`);
    else if (it.type === "income-end") parts.push(`${it.name} ends`);
    else if (it.type === "event") parts.push(`${it.name} ${signed(it.amount)}`);
  }
  for (const [owner, names] of Object.entries(unlocks)) parts.push(`${owner}: ${names.join(", ")}`);
  return esc(parts.join(" · "));
}
function milestoneShapes(milestones, labels = true) {
  const faint = css("--faint");
  const shapes = milestones.map((m) => ({ type: "line", x0: m.year, x1: m.year, y0: 0, y1: 1, yref: "paper", line: { color: faint, width: 1, dash: "dot" } }));
  const annotations = labels ? milestones.map((m) => ({
    x: m.year, y: 1, yref: "paper", text: milestoneLabel(m), showarrow: false, textangle: -90,
    xanchor: "left", yanchor: "top", xshift: 2, font: { size: 10, color: css("--muted") },
  })) : [];
  return { shapes, annotations };
}

function renderPaths() {
  const d = sim;
  const byYears = unit === "years";
  const scale = byYears ? state.spending : 1;
  const conv = (a) => a.map((v) => (v == null ? null : v / scale));
  const P = Object.fromEntries(Object.entries(d.percentiles).map(([k, v]) => [k, conv(v)]));
  const ink = css("--ink");
  const bad = css("--bad");
  const show = (v) => (v == null ? "–" : byYears ? `${(v).toFixed(1).replace(".", fmt.decimal)} years` : fmt.short(v));
  const ages = d.years.map((y) => esc(d.people.map((x) => `${x.name} ${y - x.birth_year}`).join(", ")));
  const traces = d.paths.map((p) => ({
    x: d.years, y: conv(p.values), mode: "lines", type: "scatter", hoverinfo: "skip", showlegend: false,
    line: { width: 1, color: p.failed ? bad : viridis(0.08 + 0.9 * p.rank) }, opacity: p.failed ? 0.55 : 0.45,
  }));
  const band = (lo, hi, a, name) => [
    { x: d.years, y: P[lo], customdata: P[lo].map(show), mode: "lines", line: { width: 0 }, hovertemplate: `${lo}th: %{customdata}<extra></extra>`, showlegend: false },
    { x: d.years, y: P[hi], customdata: P[hi].map(show), mode: "lines", line: { width: 0 }, fill: "tonexty", fillcolor: alpha(ink.startsWith("#") ? ink : "#17212b", a), name, hovertemplate: `${hi}th: %{customdata}<extra></extra>` },
  ];
  traces.push(...band("10", "90", 0.08, "80% of futures"));
  traces.push(...band("25", "75", 0.1, "50% of futures"));
  traces.push({ x: d.years, y: P["10"], mode: "lines", line: { color: ink, width: 1.3, dash: "dash" }, name: "10th percentile", hoverinfo: "skip" });
  traces.push({ x: d.years, y: P["50"], customdata: P["50"].map((v, i) => [show(v), ages[i]]), mode: "lines", line: { color: ink, width: 2.6 }, name: "median", hovertemplate: `median: %{customdata[0]}<br><span style="font-size:11px">%{customdata[1]}</span><extra></extra>` });
  // Scale to the middle of the futures: the richest grow without limit and would squash the part
  // of the chart that matters (the lower half, where futures fail). The median stays in view, and
  // the upper band through the first ten FIRE years.
  const top = (a, upto = a.length) => Math.max(1e-9, ...a.slice(0, upto).filter((v) => v != null));
  const ymax = 1.15 * Math.max(top(P["50"]), top(P["75"], d.fire_index + 11));
  const ms = milestoneShapes(d.milestones, !isPhone());
  ms.shapes.push({ type: "line", x0: d.years[0], x1: d.years[d.years.length - 1], y0: 0, y1: 0, line: { color: css("--muted"), width: 1 } });
  const room = { l: 58, r: 14 };
  const { lines, ...ticks } = yearTicks(d.years, d.people, $("#ch-paths").clientWidth - room.l - room.r, room);
  Plotly.react("ch-paths", traces, layout({
    hovermode: "x unified",
    margin: { ...room, t: 40, b: 30 + 14 * lines },
    xaxis: { range: [d.years[0], d.years[d.years.length - 1]], ...ticks, showgrid: false },
    yaxis: { range: [-0.03 * ymax, ymax], tickformat: byYears ? "" : "~s", title: { text: byYears ? "Years of spending" : `Wealth (${state.currency}, today's)`, font: { size: 11, color: css("--muted") } } },
    shapes: ms.shapes,
    annotations: ms.annotations,
    legend: { orientation: "h", x: 0, y: 1.01, yanchor: "bottom", font: { size: 11, color: css("--muted") }, bgcolor: "rgba(0,0,0,0)" },
  }), CONFIG);
}

function renderSpending() {
  const card = $("#c-spending");
  const s = sim.spending;
  card.classList.toggle("hidden", !s);
  if (!s) return;
  const accent = css("--accent");
  const bad = css("--bad");
  const traces = s.paths.map((p) => ({
    x: s.years, y: p.values, mode: "lines", hoverinfo: "skip", showlegend: false,
    line: { width: 1, color: p.failed ? bad : accent }, opacity: 0.3,
  }));
  const cd = (a) => a.map((v) => fmt.money(v));
  traces.push({ x: s.years, y: s.percentiles["10"], customdata: cd(s.percentiles["10"]), mode: "lines", line: { width: 0 }, showlegend: false, hovertemplate: "10th: %{customdata}<extra></extra>" });
  traces.push({ x: s.years, y: s.percentiles["90"], customdata: cd(s.percentiles["90"]), mode: "lines", line: { width: 0 }, fill: "tonexty", fillcolor: alpha(accent, 0.14), name: "80% of lasting futures", hovertemplate: "90th: %{customdata}<extra></extra>" });
  traces.push({ x: s.years, y: s.percentiles["50"], customdata: cd(s.percentiles["50"]), mode: "lines", line: { color: accent, width: 2.6 }, name: "median", hovertemplate: "median: %{customdata}<extra></extra>" });
  const flat = (v, name, dash) => ({ x: [s.years[0], s.years[s.years.length - 1]], y: [v, v], mode: "lines", line: { color: css("--faint"), width: 1, dash }, name, hoverinfo: "skip" });
  const start = sim.summary.first_year ? null : state.spending;
  if (start != null) traces.push(flat(start, "starting spending", "dash"));
  traces.push(flat(s.floor, "floor / ceiling", "dot"), { ...flat(s.ceiling, "", "dot"), showlegend: false });
  Plotly.react("ch-spending", traces, layout({
    hovermode: "x unified",
    xaxis: { range: [s.years[0], s.years[s.years.length - 1]], showgrid: false },
    yaxis: { tickformat: "~s", range: [Math.min(s.floor * 0.9, (start ?? s.floor) * 0.8), s.ceiling * 1.05] },
    margin: { l: 58, r: 14, t: 36, b: 44 },
    legend: { orientation: "h", x: 0, y: 1.01, yanchor: "bottom", font: { size: 11, color: css("--muted") } },
  }), CONFIG);
}

function renderDist() {
  const d = sim;
  const accent = css("--accent");
  const e = d.start_hist.edges;
  const centers = e.slice(0, -1).map((v, i) => (v + e[i + 1]) / 2);
  const median = d.summary.start_median;
  Plotly.react("ch-start", [{
    x: centers, y: d.start_hist.counts.map((c) => c / d.n_sims), customdata: centers.map((c) => fmt.short(c)), type: "bar", marker: { color: alpha(accent, 0.75) },
    hovertemplate: "%{customdata}: %{y:.1%} of futures<extra></extra>",
  }], layout({
    bargap: 0.05,
    xaxis: { tickformat: "~s", title: { text: `${state.currency} in ${state.fire_year}, today's`, font: { size: 11, color: css("--muted") } } },
    yaxis: { tickformat: ".0%" },
    shapes: [{ type: "line", x0: median, x1: median, y0: 0, y1: 1, yref: "paper", line: { color: css("--ink"), width: 2 } }],
    annotations: [{ x: median, y: 1, yref: "paper", text: `median ${esc(fmt.short(median))}`, showarrow: false, xanchor: "left", xshift: 4, yanchor: "top", font: { size: 11 } }],
  }), CONFIG);
  const f = d.fail_hist;
  Plotly.react("ch-fail", [{
    x: f.years, y: f.counts.map((c) => c / d.n_sims), type: "bar", marker: { color: alpha(css("--bad"), 0.8) },
    hovertemplate: "%{x}: %{y:.2%} of futures run out<extra></extra>",
  }], layout({
    bargap: 0.1,
    xaxis: { title: { text: `${fmt.pct(1 - d.summary.success)} of futures run out`, font: { size: 11, color: css("--muted") } } },
    yaxis: { tickformat: ".1%" },
    shapes: milestoneShapes(d.milestones.filter((m) => m.year > state.fire_year), false).shapes,
  }), CONFIG);
}

const ageIn = (year) => {
  const x = personById(state, state.end_person);
  return `${x.name} ${Math.round(year) - x.birth_year}`;
};

function renderHero() {
  const s = sim.summary;
  const big = $("#k-success");
  big.textContent = fmt.pct(s.success);
  big.className = `big ${s.success >= 0.9 ? "good" : s.success >= 0.75 ? "warn" : "bad"}`;
  const rule = sim.rule === "Fixed" ? "fixed spending" : sim.rule.toLowerCase();
  const first = s.first_year;
  $("#k-what").textContent = first
    ? `of ${fmt.num(sim.n_sims)} simulated futures, spending down from ${state.fire_year}: typically ${fmt.money(first.p50)} in the first year, never below ${fmt.money(sim.spending.floor)}.`
    : `of ${fmt.num(sim.n_sims)} simulated futures, spending ${fmt.money(state.spending)} a year from ${state.fire_year} (${rule}).`;
  $("#rail-live").replaceChildren("Money lasts in ", el("strong", { text: fmt.pct(s.success) }), ` · ${sim.ms} ms`);
  const tile = (k, v, sub, help) => el("div", { class: "tile" }, el("span", { class: "k" }, k, " ", helpBtn(help)), el("span", { class: "v", text: v }), sub ? el("span", { class: "s", text: sub }) : null);
  const who = personById(state, state.end_person);
  const failSub = s.fail_median_year
    ? `in those, typically by ${s.fail_median_year} (${ageIn(s.fail_median_year)})${s.bridge_end ? ` · ${fmt.pct(s.fail_in_bridge, 1)} before ${s.bridge_end}` : ""}`
    : "";
  const tiles = [
    tile("Wealth at the FIRE start", fmt.short(s.start_median), `median · 10th pct ${fmt.short(s.start_p10)}`, "result.start"),
    ...(first ? [tile("First-year spending", fmt.money(first.p50),
      first.p90 - first.p10 < 1
        ? "the same in every future: it starts from these balances"
        : `typical · bad 10%: ${fmt.money(first.p10)} · good 10%: ${fmt.money(first.p90)}`, "result.first")] : []),
    tile("Starting withdrawal rate", fmt.pct(s.withdrawal_rate, 2), "of the median wealth", "result.rate"),
    tile("Runs out", s.fail_median_year ? `in ${fmt.pct(1 - s.success)} of futures` : "in no future", failSub, "result.fail"),
    tile(`Wealth when ${who.name} is ${state.end_age}`, fmt.short(s.end_median), `median of all futures · worst 10%: ${fmt.short(s.end_p10)}`, "result.end"),
  ];
  if (s.avg_spending_median != null) {
    tiles.push(
      tile("Average spending", fmt.money(s.avg_spending_median), "median lasting future", "result.flex"),
      tile("Leanest year", fmt.money(s.lowest_p10), "10th percentile", "result.flex"),
      tile("Ever spending at the floor", fmt.pct(s.floor_share), "of lasting futures", "result.flex"),
    );
  }
  $("#tiles").replaceChildren(...tiles);
  const chips = sim.compare.map((c) => el("button", {
    type: "button", class: "chip", "aria-pressed": String(c.kind === state.rule.kind),
    title: c.success == null ? "the spending is outside this rule's floor and ceiling" : c.avg_spending ? `average spending ${fmt.money(c.avg_spending)}` : "same amount every year",
    disabled: c.success == null,
    onclick: () => { state.rule.kind = c.kind; changed(); },
  }, `${c.name} ${c.success == null ? "n/a" : fmt.pct(c.success)}`));
  $("#compare").replaceChildren(el("span", { class: "k" }, "Same plan, other rules: ", helpBtn("result.compare")), ...chips);
  $("#sub").textContent = `${state.currency}, today's money · ${fmt.num(sim.n_sims)} futures · seed ${settings.seed} · until ${sim.years[sim.years.length - 1]}`;
  $("#unit-money").textContent = state.currency;
}

function renderSim() {
  renderHero();
  renderPaths();
  renderSpending();
  renderDist();
}

const GRID_TEXT = {
  spending: {
    title: "When can you stop, at which spending?",
    desc: "How often the money lasts for each FIRE year and spending level, on the same random markets throughout. Around 90% is a common target for a plan you can't easily undo. Tap a cell to try that plan.",
    axis: () => `Spending per year (${state.currency}, today's)`,
    hover: "Stop in %{y}, spend %{x} a year",
  },
  floor: {
    title: "When can you stop, with which floor?",
    desc: "The spend-down works out its own spending, so the columns are its floor: how often the floor could always be paid, for each FIRE year. Same random markets throughout. Tap a cell to try that plan.",
    axis: () => `Floor: the least you'd spend (${state.currency}, today's)`,
    hover: "Stop in %{y}, never below %{x}",
  },
};
function renderGrid() {
  const g = explore.grid;
  if (!g) return;
  const text = GRID_TEXT[g.axis];
  $("#grid-title").textContent = text.title;
  $("#grid-desc").textContent = text.desc;
  const labels = g.values.map((v) => esc(fmt.short(v)));
  const ys = g.fire_years.map(String);
  const cs = [[0, css("--bad")], [0.5, css("--warn")], [1, css("--good")]];
  const shapes = [];
  const mine = g.axis === "floor" ? state.rule.floor : state.spending;
  const j = g.values.findIndex((v) => Math.abs(v - mine) <= g.step / 2);
  const i = g.fire_years.indexOf(state.fire_year);
  if (i >= 0 && j >= 0) shapes.push({ type: "rect", x0: j - 0.5, x1: j + 0.5, y0: i - 0.5, y1: i + 0.5, line: { color: css("--ink"), width: 2.5 } });
  Plotly.react("ch-grid", [{
    type: "heatmap", z: g.success, x: labels, y: ys, zmin: 0.5, zmax: 1, colorscale: cs,
    texttemplate: "%{z:.0%}", textfont: { size: isPhone() ? 9 : 11, color: css("--surface") },
    xgap: 2, ygap: 2, showscale: false,
    hovertemplate: `${text.hover}<br>money lasts in <b>%{z:.1%}</b><extra></extra>`,
  }], layout({
    margin: { l: 52, r: 8, t: 8, b: 48 },
    xaxis: { title: { text: text.axis(), font: { size: 11, color: css("--muted") } }, showgrid: false, fixedrange: true, type: "category" },
    yaxis: { title: { text: "FIRE start", font: { size: 11, color: css("--muted") } }, showgrid: false, fixedrange: true, type: "category" },
    shapes,
    dragmode: false,
  }), CONFIG);
  wireGridClicks();
}

const SAFE_TEXT = {
  safe: {
    title: "Safe spending by FIRE year",
    desc: "The highest yearly spending that lasts in 90% and 95% of futures. Hover for the withdrawal rate it implies (spending ÷ median wealth at the start, retirement accounts included).",
  },
  spenddown: {
    title: "What the spend-down allows, by FIRE year",
    desc: "The first year's spending the spend-down works out if you stop in each year: in a typical future, and when the years until then went badly or well (worst and best 10%). Below the floor you'd still spend the floor, with more risk.",
  },
};
function renderSafe() {
  const s = explore.safe;
  if (!s) return;
  const x = s.map((r) => r.fire_year);
  const spendDown = s.length > 0 && "p50" in s[0];
  const text = SAFE_TEXT[spendDown ? "spenddown" : "safe"];
  $("#safe-title").textContent = text.title;
  $("#safe-desc").textContent = text.desc;
  const line = (key, color, dash, name) => ({
    x, y: s.map((r) => r[key]), customdata: s.map((r) => [r[key] == null ? "–" : fmt.money(r[key]), r[key] ? fmt.pct(r[key] / r.median_start, 2) : "–"]),
    mode: "lines+markers", name, line: { color, width: 2.2, dash }, marker: { size: 6 },
    hovertemplate: `${name}: %{customdata[0]} a year · %{customdata[1]} of median wealth<extra></extra>`,
  });
  const accent = css("--accent");
  const level = (v, name) => ({ x: [x[0], x[x.length - 1]], y: [v, v], mode: "lines", line: { color: css("--faint"), dash: "dash", width: 1 }, name, hoverinfo: "skip" });
  const traces = spendDown
    ? [line("p50", accent, "solid", "typical"), line("p10", accent, "dot", "bad 10%"), line("p90", accent, "dash", "good 10%"), level(state.rule.floor, "floor")]
    : [line("90", accent, "solid", "lasts in 90%"), line("95", accent, "dot", "lasts in 95%"), level(state.spending, "your spending")];
  Plotly.react("ch-safe", traces, layout({
    hovermode: "x unified",
    xaxis: { dtick: 1, showgrid: false },
    yaxis: { tickformat: "~s" },
    shapes: [{ type: "line", x0: state.fire_year, x1: state.fire_year, y0: 0, y1: 1, yref: "paper", line: { color: css("--faint"), dash: "dot", width: 1 } }],
    margin: { l: 58, r: 14, t: 36, b: 36 },
    legend: { orientation: "h", x: 0, y: 1.01, yanchor: "bottom", font: { size: 11, color: css("--muted") } },
  }), CONFIG);
}

function renderStress() {
  const st = explore.stress;
  if (!st) return;
  const labels = st.map((r) => r.short);
  const kinds = [["fixed", "Fixed", css("--faint")], ["guardrails", "Guardrails", css("--accent")], ["vanguard", "Vanguard", css("--good")], ["spenddown", "Spend-down", css("--warn")]];
  const traces = kinds.map(([k, name, color]) => ({
    type: "bar", orientation: "h", name, y: labels, x: st.map((r) => r.rates[k]),
    marker: { color, opacity: k === state.rule.kind ? 1 : 0.55 },
    text: st.map((r) => (r.rates[k] == null ? "n/a" : fmt.pct(r.rates[k]))), textposition: "outside", cliponaxis: false,
    hovertemplate: `${name}, %{y}: money lasts in %{x:.1%}<extra></extra>`,
  }));
  Plotly.react("ch-stress", traces, layout({
    barmode: "group",
    bargap: 0.25,
    margin: { l: 8, r: 36, t: 8, b: 36 },
    xaxis: { range: [0, 1.08], tickformat: ".0%", fixedrange: true },
    yaxis: { autorange: "reversed", fixedrange: true, gridcolor: "rgba(0,0,0,0)", automargin: true },
    legend: { orientation: "h", x: 0, y: -0.14, traceorder: "normal" },
    dragmode: false,
  }), CONFIG);
}
const RENDER = { grid: renderGrid, safe: renderSafe, stress: renderStress };

function renderAll() {
  if (sim) renderSim();
  for (const r of Object.values(RENDER)) r();
}

function wireGridClicks() {
  const gd = document.getElementById("ch-grid");
  if (gd.dataset.wired) return;
  gd.dataset.wired = "1";
  gd.on("plotly_click", (ev) => {
    const pt = ev.points?.[0];
    if (!pt || pt.z == null || !explore.grid) return; // an empty cell isn't a valid plan
    const v = explore.grid.values[pt.pointIndex[1]];
    if (explore.grid.axis === "floor") state.rule.floor = v;
    else {
      followBand(v, state.spending);
      state.spending = v;
    }
    state.fire_year = explore.grid.fire_years[pt.pointIndex[0]];
    changed();
  });
}

// ---- wiring ----------------------------------------------------------------------------------------------
function wire() {
  document.addEventListener("click", (e) => {
    const b = e.target.closest?.("[data-help]");
    if (!b) return;
    e.preventDefault();
    openHelp(b.dataset.help);
  });
  $("#guide").addEventListener("click", openGuide);
  $("#help-close").addEventListener("click", () => $("#help-dialog").close());
  $("#help-dialog").addEventListener("click", (e) => { if (e.target.id === "help-dialog") e.target.close(); });
  document.querySelectorAll("#c-paths [data-unit]").forEach((b) => b.addEventListener("click", () => {
    unit = b.dataset.unit;
    document.querySelectorAll("#c-paths [data-unit]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    if (sim) renderPaths();
  }));
  $("#new-seed").addEventListener("click", newSeed);
  $("#plan-select").addEventListener("change", (e) => switchTo(e.target.value));
  $("#plan-save").addEventListener("click", saveCurrent);
  $("#plan-revert").addEventListener("click", revert);
  $("#backup-export").addEventListener("click", exportPlans);
  $("#shared-use").addEventListener("click", useSharedRun);
  $("#shared-close").addEventListener("click", forgetRun);
  wireMenu();
  $("#plan-pill").addEventListener("click", () => {
    if (isPhone()) $("#rail").classList.add("open");
    $("#plan-select").focus();
  });
  document.addEventListener("keydown", (e) => {
    if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== "s") return;
    e.preventDefault(); // never the browser's "save page"
    if (!base || document.querySelector("dialog[open]")) return;
    if (edits().length || !planById(base.id)) saveCurrent();
    else toast(`“${base.name}” has no unsaved changes.`);
  });
  $("#name-cancel").addEventListener("click", () => $("#name-dialog").close());
  $("#setup-cancel").addEventListener("click", () => $("#setup-dialog").close());
  $("#share-close").addEventListener("click", () => $("#share-dialog").close());
  for (const d of document.querySelectorAll("dialog.panel")) d.addEventListener("click", (e) => { if (e.target === d) d.close(); });
  $("#import-file").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) importPlans(file);
  });
  $("#welcome-setup").addEventListener("click", openSetup);
  $("#welcome-import").addEventListener("click", () => $("#import-file").click());
  $("#welcome-close").addEventListener("click", () => {
    settings.welcomeClosed = true;
    store.saveSettings(settings);
    renderPlanBar();
  });
  $("#toast-close").addEventListener("click", hideToast);
  const t = $("#toast");
  const hold = () => clearTimeout(toastTimer);
  const release = () => { if (t.classList.contains("show")) toastTimer = setTimeout(hideToast, Number(t.dataset.ms)); };
  t.addEventListener("mouseenter", hold);
  t.addEventListener("focusin", hold);
  t.addEventListener("mouseleave", release);
  t.addEventListener("focusout", release);
  $("#fab").addEventListener("click", () => $("#rail").classList.add("open"));
  $("#sheet-close").addEventListener("click", () => $("#rail").classList.remove("open"));
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", renderAll);
  let w = window.innerWidth;
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    if ((w <= 960) !== (window.innerWidth <= 960)) renderAll();
    else resizeTimer = setTimeout(() => { if (sim) renderPaths(); }, 200); // the year labels' spacing follows the width
    w = window.innerWidth;
  });
  window.addEventListener("hashchange", openSharedLink);
  // Another tab saved, renamed or deleted plans: pick up the list, and the plan on screen if it has
  // no unsaved changes here.
  window.addEventListener("storage", (e) => {
    if (e.key === store.BACKUP_KEY) {
      exported = store.loadExported();
      if (base) renderBackup();
      return;
    }
    if (e.key !== store.PLANS_KEY || !base) return;
    const hadEdits = edits().length > 0;
    plans = loadPlans();
    const p = planById(base.id);
    if (p && !eq(p.plan, base.values)) {
      if (hadEdits) {
        base = { id: p.id, name: p.name, values: clone(p.plan) };
        toast(`“${p.name}” was saved in another tab. Your unsaved changes here are kept.`);
      } else {
        useBase(p.id);
        toast(`“${p.name}” was updated in another tab.`);
      }
    } else if (p) base.name = p.name;
    renderPlanBar();
  });
}

function loadPlans() {
  const raw = store.loadPlans() ?? [];
  return raw
    .filter((p) => p && typeof p === "object" && p.plan)
    .map((p) => ({
      id: typeof p.id === "string" ? p.id : uid(),
      name: typeof p.name === "string" && p.name.trim() ? p.name.trim().slice(0, 60) : "Plan",
      plan: normalize(p.plan, { currency: p.plan.currency }),
      updated: typeof p.updated === "number" ? p.updated : null,
      example: p.example === true,
      ...(store.cleanRun(p.shared) ? { shared: store.cleanRun(p.shared) } : {}),
    }));
}

function start() {
  wire();
  canStore = store.storageWorks();
  plans = loadPlans();
  if (!plans.length) {
    addPlan("Example", examplePlan(), { example: true });
  }
  const session = store.loadSession();
  const current = planById(session?.current) ?? [...plans].sort((a, b) => (b.updated ?? 0) - (a.updated ?? 0))[0];
  base = { id: current.id, name: current.name, values: clone(current.plan) };
  state = session?.current === current.id && session.working ? normalize(session.working, { currency: current.plan.currency }) : clone(current.plan);
  refreshFormat();
  spawnMain();
  buildForm();
  persistSession();
  if (!canStore) storageProblem();
  // Installable as an app, and usable offline once loaded (manifest + service worker).
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
  openSharedLink();
  if (location.hash === "#guide") openGuide();
  runSim();
}

start();
