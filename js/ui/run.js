// Running the model off the page's thread, in Web Workers (worker.js).
//
// One worker for the main result (one request at a time, the newest waiting), and one per heavier
// view: those restart when the plan changes while they run, so a slider never queues stale work.
import { bandAround, problems } from "../plan.js";
import { RENDER, renderSim } from "./charts.js";
import { invalid, syncAll } from "./fields.js";
import { showError } from "./messages.js";
import { persistSession, renderPlanBar } from "./plans.js";
import { explore, runPlan, setSim, state } from "./state.js";

const WORKER = new URL("../worker.js", import.meta.url);
let reqId = 0;
const main = { worker: null, busy: false, queued: null, latest: 0 };
const heavy = { grid: { worker: null, id: 0 }, safe: { worker: null, id: 0 }, stress: { worker: null, id: 0 } };
const CARDS = { grid: "c-grid", safe: "c-safe", stress: "c-stress" };
const MAIN_CARDS = ["c-paths", "c-spending", "c-dist"];

export function spawnMain() {
  main.worker = new Worker(WORKER, { type: "module" });
  main.worker.onmessage = (e) => {
    main.busy = false;
    const q = main.queued;
    main.queued = null;
    if (q) postMain(q);
    if (e.data.id !== main.latest) return;
    busy(MAIN_CARDS, false);
    if (e.data.error) { showError(`The simulation stopped: ${e.data.error}`); return; }
    setSim({ ...e.data.result, ms: e.data.ms });
    renderSim();
  };
  main.worker.onerror = (e) => {
    main.busy = false;
    main.queued = null;
    busy(MAIN_CARDS, false);
    showError(`The simulation couldn't run: ${e.message || "worker error"}`);
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
export function changed() {
  persistSession();
  syncAll();
  renderPlanBar();
  clearTimeout(simTimer);
  simTimer = setTimeout(runSim, 160);
}
export function runSim() {
  if (invalid.size) { showError("Some fields aren't valid yet: fix the red ones."); return; }
  const probs = problems(state);
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
