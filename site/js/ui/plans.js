// The plans kept in this browser: saving, switching, renaming, deleting, undo, and the plan bar.
//
// The values on screen always start from a saved plan (`base`); whatever differs from it is an
// unsaved change, kept in this browser so a reload carries on where it was.
import { t } from "../i18n.js";
import { counterpart, differences, examplePlan, uid } from "../plan.js";
import * as store from "../store.js";
import { $, byName, clone, el, eq, getPath } from "./dom.js";
import { FIELDS, groups, invalid } from "./fields.js";
import { buildForm } from "./form.js";
import { showError, showNotice, toast } from "./messages.js";
import { changed } from "./run.js";
import { renderShared } from "./share.js";
import {
  base,
  canStore,
  exported,
  fmt,
  planById,
  plans,
  refreshFormat,
  setBase,
  setCanStore,
  setPlans,
  setState,
  settings,
  state,
} from "./state.js";

let keepAsked = false;

// What the plan lists as edited when a list itself changed: an item added, removed or moved.
const LIST_NAMES = {
  "people.#": t("plans.edited.people"),
  "accounts.#": t("plans.edited.accounts"),
  "income.#": t("plans.edited.income"),
  "events.#": t("plans.edited.events"),
};
const MOD_S = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
  ? t("plans.saveKey.mac")
  : t("plans.saveKey");
export const edits = () => differences(base.values, state);

export function persistPlans() {
  const ok = store.savePlans(plans);
  if (!ok && canStore) storageProblem();
  if (ok && !keepAsked && plans.some((p) => !p.example)) {
    keepAsked = true; // once per visit: Firefox asks the viewer, the others decide on their own
    store.keepStorage();
  }
}
export function persistSession() {
  store.saveSession({ current: base.id, working: state });
}
export function storageProblem() {
  setCanStore(false);
  showNotice(t("plans.noStorage"));
}

// Undo brings back what was on screen, never an older list of saved plans: a save made after the
// action it undoes must survive.
export function snapshot() {
  return { state: clone(state), base: clone(base) };
}
export function restore(snap) {
  setState(snap.state);
  setBase(snap.base);
  refreshFormat();
  reload();
}
function reload() {
  invalid.clear();
  showError("");
  buildForm();
  changed();
}

export function useBase(id) {
  const p = planById(id);
  setState(clone(p.plan));
  setBase({ id, name: p.name, values: clone(p.plan) });
  refreshFormat();
  reload();
}
export function switchTo(id) {
  const before = snapshot();
  const unsaved = edits().length > 0;
  useBase(id);
  if (unsaved)
    toast(t("plans.discarded", { name: before.base.name }), { undo: () => restore(before) });
}
export function revert() {
  const before = snapshot();
  useBase(base.id);
  toast(t("plans.reverted"), { undo: () => restore(before) });
}
export function addPlan(name, plan, extra = {}) {
  const p = { id: uid(), name, plan: clone(plan), updated: Date.now(), ...extra };
  plans.push(p);
  persistPlans();
  return p;
}
export function uniqueName(name) {
  let n = name.slice(0, 60);
  for (let i = 2; nameProblem(n); i++) n = `${name.slice(0, 54)} (${i})`;
  return n;
}

export function canSave() {
  if (invalid.size) {
    toast(t("plans.invalid"), { error: true });
    return false;
  }
  return true;
}
export function saveCurrent() {
  if (!canSave()) return;
  const p = planById(base.id);
  if (!p) {
    saveAsNew();
    return;
  }
  p.plan = clone(state);
  p.updated = Date.now();
  p.example = false;
  delete p.shared; // changed since it was shared: the sharer's numbers no longer compare
  persistPlans();
  base.values = clone(state);
  persistSession();
  renderPlanBar();
  toast(t("plans.saved", { name: p.name }));
}
function suggestName() {
  const k = state.rule.kind;
  const amount =
    k === "spenddown"
      ? t("plans.suggest.floor", { amount: fmt.short(state.rule.floor) })
      : fmt.short(state.spending);
  return uniqueName(
    t("plans.suggest", { year: state.fire_year, amount, rule: t(`rule.inName.${k}`) }),
  );
}
export function saveAsNew() {
  if (!canSave()) return;
  askName({
    title: t("plans.saveAs"),
    text: planById(base.id) ? t("plans.saveAs.text", { name: base.name }) : "",
    value: suggestName(),
    ok: t("plans.save"),
    submit: (name) => {
      const p = addPlan(name, state);
      setBase({ id: p.id, name: p.name, values: clone(state) });
      persistSession();
      renderPlanBar();
      toast(t("plans.savedAs", { name: p.name }));
    },
  });
}
export function renamePlan() {
  const p = planById(base.id);
  askName({
    title: t("plans.rename"),
    value: p.name,
    ok: t("plans.rename.ok"),
    exceptId: p.id,
    submit: (name) => {
      p.name = name;
      base.name = name;
      persistPlans();
      renderPlanBar();
    },
  });
}
export function deletePlan() {
  const before = snapshot();
  const p = planById(base.id);
  setPlans(plans.filter((x) => x.id !== p.id));
  // Never an empty list: the example comes back, until it's needed no more.
  const stand_in = plans.length
    ? null
    : addPlan(t("plans.example"), examplePlan({ currency: state.currency }), { example: true });
  const next = [...plans].sort((a, b) => (b.updated ?? 0) - (a.updated ?? 0))[0];
  persistPlans();
  useBase(next.id);
  toast(t("plans.deleted", { name: p.name }), {
    undo: () => {
      if (!planById(p.id)) plans.push(p);
      const ex = stand_in && planById(stand_in.id);
      if (ex?.example && eq(ex.plan, stand_in.plan)) setPlans(plans.filter((x) => x !== ex));
      persistPlans();
      restore(before);
    },
  });
}

export function nameProblem(name, exceptId = null) {
  if (!name) return t("plans.name.empty");
  if (name.length > 60) return t("plans.name.long", { n: 60 });
  const key = name.toLocaleLowerCase();
  const twin = plans.find((x) => x.id !== exceptId && x.name.toLocaleLowerCase() === key);
  return twin ? t("plans.name.taken", { name: twin.name }) : "";
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
    if (msg) {
      problem(msg);
      input.focus();
      return;
    }
    submit(name);
    d.close();
  };
  d.showModal();
  input.focus();
  input.select();
}

const labelOf = (path) => {
  if (LIST_NAMES[path]) return LIST_NAMES[path];
  let best = null;
  for (const f of FIELDS)
    if (
      (path === f.path || path.startsWith(`${f.path}.`)) &&
      (!best || f.path.length > best.path.length)
    )
      best = f;
  return best?.label ?? path;
};
let optionsKey = "";
export function renderPlanBar() {
  if (!base) return;
  const sel = $("#plan-select");
  const saved = planById(base.id);
  const key = JSON.stringify([base.id, base.name, plans.map((x) => [x.id, x.name])]);
  if (key !== optionsKey) {
    optionsKey = key;
    const opts = [...plans].sort(byName).map((x) => el("option", { value: x.id, text: x.name }));
    if (!saved)
      opts.unshift(
        el("option", { value: base.id, text: t("plans.notSaved", { name: base.name }) }),
      );
    sel.replaceChildren(...opts);
    sel.value = base.id;
  }
  const edited = edits();
  // Each field is compared with the same one in the saved plan: in a list, the item's own, wherever
  // it was moved.
  for (const f of FIELDS) {
    const a = getPath(state, f.path);
    const b = counterpart(base.values, state, f.path);
    f.node.classList.toggle("edited", !eq(a, b));
  }
  // A section is edited when a field in it is, or when one of its list items was added, removed or
  // moved.
  for (const g of groups) {
    const list = g.dataset.list;
    g.classList.toggle(
      "edited",
      Boolean(g.querySelector(".field.edited")) ||
        Boolean(list && !eq(state[list], base.values[list])),
    );
  }
  const status = $("#plan-state");
  const saveBtn = $("#plan-save");
  $("#plan-revert").hidden = !edited.length || !saved;
  saveBtn.hidden = !edited.length && saved;
  saveBtn.textContent = saved ? t("plans.save") : t("plans.saveNew");
  saveBtn.title = saved
    ? t("plans.save.title", { name: base.name, key: MOD_S })
    : t("plans.saveNew.title");
  if (edited.length) {
    status.className = "scenario-state dirty";
    status.textContent = t("plans.edited", { what: [...new Set(edited.map(labelOf))].join(", ") });
  } else if (!saved) {
    status.className = "scenario-state dirty";
    status.textContent = t("plans.deletedElsewhere");
  } else {
    status.className = "scenario-state";
    const when = (ms) =>
      new Intl.DateTimeFormat(fmt.words, { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(ms),
      );
    status.textContent = saved.example
      ? t("plans.example.state")
      : saved.updated
        ? t("plans.savedHere.when", { when: when(saved.updated) })
        : t("plans.savedHere");
  }
  status.title = status.textContent;
  const menu = $("#plan-menu");
  menu.querySelector("[data-act=rename]").disabled = !saved;
  menu.querySelector("[data-act=delete]").disabled = !saved;
  menu.querySelector("[data-act=export]").disabled = !plans.length;
  const pill = $("#plan-pill");
  pill.replaceChildren(el("span", { class: "pill-name", text: base.name }));
  if (edited.length)
    pill.append(el("span", { class: "pill-edited", text: t("plans.pill.edited") }));
  pill.setAttribute(
    "aria-label",
    edited.length
      ? t("plans.pill.editedLabel", { name: base.name })
      : t("plans.pill.label", { name: base.name }),
  );
  // The welcome box: js/ui/welcome.js put it on the page before it was drawn, by the same rule.
  document.documentElement.toggleAttribute(
    "data-welcome",
    Boolean(saved?.example && !settings.welcomeClosed),
  );
  renderBackup();
  renderShared();
}

// Saved plans live in this browser only, and browsers can clear them. Until an exported file holds
// the latest saves, a reminder sits under the plan bar (not when storage doesn't work at all: the
// notice about that says more).
export function renderBackup() {
  const own = plans.filter((p) => !p.example);
  const newer = own.filter((p) => (p.updated ?? Infinity) > exported);
  const box = $("#backup");
  box.hidden = !canStore || !newer.length;
  if (box.hidden) return;
  const day = (ms) =>
    new Intl.DateTimeFormat(fmt.words, { dateStyle: "medium" }).format(new Date(ms));
  $("#backup-text").textContent = exported
    ? t("plans.backup.since", { day: day(exported) })
    : t("plans.backup.never");
}
