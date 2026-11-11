// Runs one view of a plan off the page's thread: { id, task, plan } in, { id, task, result, ms } out.
import { gridView, mainView, safeView, stressView } from "./views.js";

const TASKS = { main: mainView, grid: gridView, safe: safeView, stress: stressView };

self.onmessage = (e) => {
  const { id, task, plan } = e.data;
  const t0 = performance.now();
  try {
    const result = TASKS[task](plan);
    self.postMessage({ id, task, result, ms: Math.round(performance.now() - t0) });
  } catch (err) {
    self.postMessage({ id, task, error: String(err?.message || err) });
  }
};
