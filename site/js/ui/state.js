// What the page's modules share: the viewer's settings, the saved plans, the plan on screen and
// its results. The other modules import these, and an import always shows the current value, but
// can't be assigned to: they change them with the setters at the end.
import { real } from "../engine.js";
import { makeFormat } from "../format.js";
import { DEFAULT_CURRENCY } from "../plan.js";
import * as store from "../store.js";

export let settings = store.loadSettings(); // the viewer's: seed, number of futures, number format
export let fmt = makeFormat(settings.locale, DEFAULT_CURRENCY);
export let exported = store.loadExported(); // when the plans were last exported to a file, 0 if never
export let plans = []; // the saved plans: [{ id, name, plan, updated, example, shared }]
export let base = null; // { id, name, values }: the saved plan the values on screen started from
export let state = null; // the plan on screen, unsaved changes included
export let sim = null; // the main view's result, as the worker sent it
export const explore = { grid: null, safe: null, stress: null }; // the heavier views' results
export let canStore = true; // whether this browser keeps what the page saves

export const refreshFormat = () => {
  fmt = makeFormat(settings.locale, state.currency);
};
export const realOf = (nominal) => real(nominal, state.inflation);
export const planById = (id) => plans.find((p) => p.id === id);
export const runPlan = () => ({ ...state, seed: settings.seed, n_sims: settings.n_sims });
export const today = () => new Date();

// The setters.
export const setState = (v) => {
  state = v;
};
export const setBase = (v) => {
  base = v;
};
export const setPlans = (v) => {
  plans = v;
};
export const setSim = (v) => {
  sim = v;
};
export const setExported = (v) => {
  exported = v;
};
export const setCanStore = (v) => {
  canStore = v;
};
