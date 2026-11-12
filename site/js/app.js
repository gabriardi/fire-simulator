// The page's entry point: wires the buttons, menus and dialogs to the modules in ui/, then starts.
// The numbers come from workers running the model (engine.js, views.js); nothing here talks to a
// server.
import { t } from "./i18n.js";
import { examplePlan, normalize } from "./plan.js";
import * as store from "./store.js";
import { renderAll, renderPaths, setUnit } from "./ui/charts.js";
import { $, clone, eq, isPhone } from "./ui/dom.js";
import { exportPlans, importPlans } from "./ui/files.js";
import { buildForm, newSeed } from "./ui/form.js";
import { openGuide, openHelp, toast, wireToast } from "./ui/messages.js";
import {
  addPlan,
  deletePlan,
  edits,
  persistSession,
  renamePlan,
  renderBackup,
  renderPlanBar,
  revert,
  saveAsNew,
  saveCurrent,
  storageProblem,
  switchTo,
  useBase,
} from "./ui/plans.js";
import { runSim, spawnMain } from "./ui/run.js";
import { openSetup } from "./ui/setup.js";
import { forgetRun, openShare, openSharedLink, useSharedRun } from "./ui/share.js";
import {
  base,
  canStore,
  planById,
  plans,
  refreshFormat,
  setBase,
  setCanStore,
  setExported,
  setPlans,
  setState,
  settings,
  sim,
} from "./ui/state.js";
import { startServiceWorker } from "./ui/updates.js";

const ACTIONS = {
  new: openSetup,
  "save-as": saveAsNew,
  rename: renamePlan,
  delete: deletePlan,
  share: openShare,
  export: exportPlans,
  import: () => $("#import-file").click(),
};

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
  btn.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      open();
    }
  });
  menu.addEventListener("keydown", (e) => {
    const list = items();
    const i = list.indexOf(document.activeElement);
    const go = (j) => {
      e.preventDefault();
      list[(j + list.length) % list.length]?.focus();
    };
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(list.length - 1);
    else if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "Tab") close(false);
  });
  menu.addEventListener("click", (e) => {
    const item = e.target.closest("[role=menuitem]");
    if (!item || item.disabled) return;
    close(false);
    ACTIONS[item.dataset.act]();
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".menu-wrap")) close(false);
  });
}

// Light, dark or the device's: a setting of this browser, like the number format. js/ui/theme.js
// put it on the page before it was drawn; a change here goes on the page at once.
function wireTheme() {
  const sel = $("#theme");
  sel.value = settings.theme;
  sel.addEventListener("change", () => {
    settings.theme = sel.value;
    store.saveSettings(settings);
    if (sel.value === "auto") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = sel.value;
    renderAll(); // the charts take their colours from the page's
  });
}

function wire() {
  document.addEventListener("click", (e) => {
    const b = e.target.closest?.("[data-help]");
    if (!b) return;
    e.preventDefault();
    openHelp(b.dataset.help);
  });
  $("#guide").addEventListener("click", openGuide);
  $("#help-close").addEventListener("click", () => $("#help-dialog").close());
  $("#help-dialog").addEventListener("click", (e) => {
    if (e.target.id === "help-dialog") e.target.close();
  });
  document.querySelectorAll("#c-paths [data-unit]").forEach((b) =>
    b.addEventListener("click", () => {
      setUnit(b.dataset.unit);
      document
        .querySelectorAll("#c-paths [data-unit]")
        .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      if (sim) renderPaths();
    }),
  );
  $("#new-seed").addEventListener("click", newSeed);
  $("#plan-select").addEventListener("change", (e) => switchTo(e.target.value));
  $("#plan-save").addEventListener("click", saveCurrent);
  $("#plan-revert").addEventListener("click", revert);
  $("#backup-export").addEventListener("click", exportPlans);
  $("#shared-use").addEventListener("click", useSharedRun);
  $("#shared-close").addEventListener("click", forgetRun);
  wireMenu();
  wireTheme();
  $("#plan-pill").addEventListener("click", () => {
    if (isPhone()) $("#rail").classList.add("open");
    $("#plan-select").focus();
  });
  document.addEventListener("keydown", (e) => {
    if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== "s") return;
    e.preventDefault(); // never the browser's "save page"
    if (!base || document.querySelector("dialog[open]")) return;
    if (edits().length || !planById(base.id)) saveCurrent();
    else toast(t("plans.unchanged", { name: base.name }));
  });
  $("#name-cancel").addEventListener("click", () => $("#name-dialog").close());
  $("#setup-cancel").addEventListener("click", () => $("#setup-dialog").close());
  $("#share-close").addEventListener("click", () => $("#share-dialog").close());
  for (const d of document.querySelectorAll("dialog.panel"))
    d.addEventListener("click", (e) => {
      if (e.target === d) d.close();
    });
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
  wireToast();
  $("#fab").addEventListener("click", () => $("#rail").classList.add("open"));
  $("#sheet-close").addEventListener("click", () => $("#rail").classList.remove("open"));
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", renderAll);
  let w = window.innerWidth;
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    if (w <= 960 !== window.innerWidth <= 960) renderAll();
    else
      resizeTimer = setTimeout(() => {
        if (sim) renderPaths();
      }, 200); // the year labels' spacing follows the width
    w = window.innerWidth;
  });
  window.addEventListener("hashchange", openSharedLink);
  // Another tab saved, renamed or deleted plans: pick up the list, and the plan on screen if it has
  // no unsaved changes here.
  window.addEventListener("storage", (e) => {
    if (e.key === store.BACKUP_KEY) {
      setExported(store.loadExported());
      if (base) renderBackup();
      return;
    }
    if (e.key !== store.PLANS_KEY || !base) return;
    const hadEdits = edits().length > 0;
    setPlans(store.loadPlans());
    const p = planById(base.id);
    if (p && !eq(p.plan, base.values)) {
      if (hadEdits) {
        setBase({ id: p.id, name: p.name, values: clone(p.plan) });
        toast(t("plans.savedElsewhere", { name: p.name }));
      } else {
        useBase(p.id);
        toast(t("plans.updatedElsewhere", { name: p.name }));
      }
    } else if (p) base.name = p.name;
    renderPlanBar();
  });
}

function start() {
  wire();
  setCanStore(store.storageWorks());
  setPlans(store.loadPlans());
  if (!plans.length) {
    addPlan(t("plans.example"), examplePlan(), { example: true });
  }
  const session = store.loadSession();
  const current =
    planById(session?.current) ?? [...plans].sort((a, b) => (b.updated ?? 0) - (a.updated ?? 0))[0];
  setBase({ id: current.id, name: current.name, values: clone(current.plan) });
  setState(
    session?.current === current.id && session.working
      ? normalize(session.working, { currency: current.plan.currency })
      : clone(current.plan),
  );
  refreshFormat();
  spawnMain();
  buildForm();
  persistSession();
  if (!canStore) storageProblem();
  // Installable as an app, usable offline once loaded, and up to date when left open.
  startServiceWorker();
  openSharedLink();
  if (location.hash === "#guide") openGuide();
  runSim();
}

start();
