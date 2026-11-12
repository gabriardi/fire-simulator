// Running the model off the page's thread, in Web Workers (worker.js).
//
// One worker for the main result (one request at a time, the newest waiting), and one per heavier
// view: those restart when the plan changes while they run, so a slider never queues stale work.
import { t } from "../i18n.js";
import { bandAround, bandProblem, problems } from "../plan.js";
import { RENDER, renderSim } from "./charts.js";
import { invalid, syncAll } from "./fields.js";
import { showError } from "./messages.js";
import { persistSession, renderPlanBar } from "./plans.js";
import { explore, runPlan, setSim, state } from "./state.js";

const WORKER = new URL("../worker.js", import.meta.url);
// Each worker gets an address of its own (worker.js?1, ?2…). WebKit (Safari) otherwise reuses a
// worker script it already has in memory, and that worker then fetches its imports past the
// service worker: offline, they fail. The service worker stores worker.js once, without the "?".
let spawned = 0;
const spawn = () => new Worker(`${WORKER}?${++spawned}`, { type: "module" });
let reqId = 0;
const main = { worker: null, busy: false, queued: null, latest: 0 };
const heavy = {
  grid: { worker: null, id: 0 },
  safe: { worker: null, id: 0 },
  stress: { worker: null, id: 0 },
};
const CARDS = { grid: "c-grid", safe: "c-safe", stress: "c-stress" };
const MAIN_CARDS = ["c-paths", "c-spending", "c-dist"];

export function spawnMain() {
  main.worker = spawn();
  main.worker.onmessage = (e) => {
    main.busy = false;
    const q = main.queued;
    main.queued = null;
    if (q) postMain(q);
    if (e.data.id !== main.latest) return;
    busy(MAIN_CARDS, false);
    if (e.data.error) {
      showError(t("run.stopped", { error: e.data.error }));
      return;
    }
    setSim({ ...e.data.result, ms: e.data.ms });
    renderSim();
  };
  main.worker.onerror = (e) => {
    main.busy = false;
    main.queued = null;
    busy(MAIN_CARDS, false);
    showError(t("run.failed", { error: e.message || t("run.workerError") }));
  };
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
  if (h.id && h.worker) {
    h.worker.terminate();
    h.worker = null;
  } // still busy with an older plan
  if (!h.worker) {
    h.worker = spawn();
    h.worker.onmessage = (e) => {
      if (e.data.id !== h.id) return;
      h.id = 0;
      busy([CARDS[name]], false);
      if (e.data.error) {
        showError(t("run.view.stopped", { view: t(`run.view.${name}`), error: e.data.error }));
        return;
      }
      explore[name] = e.data.result;
      RENDER[name]();
    };
    h.worker.onerror = (e) => {
      h.id = 0;
      busy([CARDS[name]], false);
      showError(
        t("run.view.failed", {
          view: t(`run.view.${name}`),
          error: e.message || t("run.workerError"),
        }),
      );
    };
  }
  h.id = ++reqId;
  busy([CARDS[name]], true);
  h.worker.postMessage({ id: h.id, task: name, plan });
}

let simTimer = null;
let expTimer = null;
export function changed() {
  persistSession();
  syncAll();
  renderPlanBar();
  clearTimeout(simTimer);
  simTimer = setTimeout(runSim, 160);
}
export function runSim() {
  if (invalid.size) {
    showError(t("run.invalid"));
    return;
  }
  const probs = problems(state);
  if (probs.length) {
    // A floor and ceiling that don't fit the spending: one click puts them around it.
    const fix = bandProblem(state)
      ? {
          label: t("run.fixBand"),
          run: () => {
            Object.assign(state.rule, bandAround(state.spending));
            changed();
          },
        }
      : null;
    showError(probs.join(" "), fix);
    return;
  }
  showError("");
  const plan = runPlan();
  runMain(plan);
  clearTimeout(expTimer);
  expTimer = setTimeout(() => {
    for (const name of Object.keys(heavy)) runHeavy(name, plan);
  }, 250);
}
function busy(ids, on) {
  for (const id of ids) document.getElementById(id)?.classList.toggle("busy", on);
}
