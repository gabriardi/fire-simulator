/**
 * Where plans live: this browser's localStorage, and nowhere else. A file export is the backup and
 * the way to move plans to another device; a share link carries one plan inside the link itself.
 */

const KEYS = {
  plans: "fire-sim.plans.v1", // [{ id, name, plan, updated, example }]: the saved plans
  session: "fire-sim.session.v1", // { current, working }: the plan on screen, unsaved changes included
  settings: "fire-sim.settings.v1", // { seed, n_sims, locale }: the viewer's, not part of any plan
  groups: "fire-sim.groups.v1", // which form sections are open
};
export const PLANS_KEY = KEYS.plans;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // private mode, storage disabled or full
  }
}

/** Whether this browser keeps what the page saves (not in some private modes, or when blocked). */
export function storageWorks() {
  try {
    localStorage.setItem("fire-sim.test", "1");
    localStorage.removeItem("fire-sim.test");
    return true;
  } catch {
    return false;
  }
}

export const loadPlans = () => {
  const d = read(KEYS.plans, null);
  return Array.isArray(d?.plans) ? d.plans : null;
};
export const savePlans = (plans) => write(KEYS.plans, { schema: 1, plans });
export const loadSession = () => read(KEYS.session, null);
export const saveSession = (s) => write(KEYS.session, s);
export const loadSettings = () => ({ seed: 42, n_sims: 10_000, locale: "", ...read(KEYS.settings, {}) });
export const saveSettings = (s) => write(KEYS.settings, s);
export const loadGroups = () => read(KEYS.groups, {});
export const saveGroups = (g) => write(KEYS.groups, g);

// ---- files ---------------------------------------------------------------------------------------

export const FILE_FORMAT = "fire-simulator-plans";

export function exportFile(plans, today = new Date()) {
  const body = {
    format: FILE_FORMAT,
    version: 1,
    exported: today.toISOString(),
    plans: plans.map((p) => ({ name: p.name, plan: p.plan })),
  };
  const pad = (n) => String(n).padStart(2, "0");
  const day = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`; // local, not UTC
  return {
    name: `fire-plans-${day}.json`,
    text: JSON.stringify(body, null, 1),
  };
}

/** The plans in an exported file (or a bare plan, or a list of them), not yet cleaned. */
export function readFile(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("This file isn't a plans file: it isn't JSON.");
  }
  const items = data?.format === FILE_FORMAT ? data.plans : Array.isArray(data) ? data : [data];
  const out = (items || [])
    .filter((x) => x && typeof x === "object")
    .map((x) => (x.plan && typeof x.plan === "object" ? { name: x.name, plan: x.plan } : { name: x.name, plan: x }))
    .filter((x) => Array.isArray(x.plan.people) || typeof x.plan.spending === "number");
  if (!out.length) throw new Error("No plans found in this file.");
  return out;
}

// ---- share links ---------------------------------------------------------------------------------
// "#plan=z…": the plan as deflated JSON in base64url ("j…": not compressed, where the browser
// can't compress). After the "#", so browsers never send it to the site's server.

const toB64 = (bytes) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64 = (s) => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
async function through(bytes, stream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}

export async function packPlan(name, plan) {
  const json = new TextEncoder().encode(JSON.stringify({ n: name, p: plan }));
  if (typeof CompressionStream === "function") return `z${toB64(await through(json, new CompressionStream("deflate-raw")))}`;
  return `j${toB64(json)}`;
}

export async function unpackPlan(code) {
  try {
    const bytes = fromB64(code.slice(1));
    const json = code[0] === "z" ? await through(bytes, new DecompressionStream("deflate-raw")) : bytes;
    const d = JSON.parse(new TextDecoder().decode(json));
    if (!d || typeof d.p !== "object") throw new Error();
    return { name: typeof d.n === "string" ? d.n : "Shared plan", plan: d.p };
  } catch {
    throw new Error("This share link is damaged or incomplete: ask for it again.");
  }
}
