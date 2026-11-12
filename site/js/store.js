/**
 * Where plans live: this browser's localStorage, and nowhere else. A file export is the backup and
 * the way to move plans to another device; a share link carries one plan inside the link itself.
 */
import { t } from "./i18n.js";
import { normalize, uid } from "./plan.js";

const KEYS = {
  plans: "fire-sim.plans.v1", // [{ id, name, plan, updated, example, shared }]: the saved plans
  session: "fire-sim.session.v1", // { current, working }: the plan on screen, unsaved changes included
  settings: "fire-sim.settings.v1", // { seed, n_sims, locale, theme }: the viewer's, not any plan's
  groups: "fire-sim.groups.v1", // which form sections are open
  backup: "fire-sim.backup.v1", // { exported }: when the plans were last exported to a file
};
export const PLANS_KEY = KEYS.plans;
export const BACKUP_KEY = KEYS.backup;
export const SETTINGS_KEY = KEYS.settings; // also read by js/ui/theme.js, before the page is drawn

// A run: which futures (the seed) and how many. The viewer's choice, kept in the settings; a share
// link only tells the person opening it which run the sharer used.
export const SEEDS = 2 ** 31; // a seed is 0 to 2^31 - 1
export const SIMS = { min: 500, max: 50_000 };
/** The page's colours: the device's light or dark ("auto"), or always one of them. */
export const THEMES = ["auto", "light", "dark"];
const DEFAULT_SETTINGS = { seed: 42, n_sims: 10_000, locale: "", theme: "auto" };

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

/**
 * The saved plans as found in storage, each complete and well-formed. What isn't a plan is dropped.
 * Storage is only written by this page, but by older versions of it too, and can be edited by hand.
 */
export function cleanSaved(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((p) => p && typeof p === "object" && p.plan)
    .map((p) => {
      const shared = cleanRun(p.shared);
      return {
        id: typeof p.id === "string" ? p.id : uid(),
        name:
          typeof p.name === "string" && p.name.trim()
            ? p.name.trim().slice(0, 60)
            : t("plan.untitled"),
        plan: normalize(p.plan), // its own currency if it's a currency code, else the default
        updated: Number.isFinite(p.updated) ? p.updated : null,
        example: p.example === true,
        ...(shared ? { shared } : {}),
      };
    });
}

/** The viewer's settings as found in storage, with anything odd put right. */
export function cleanSettings(raw) {
  const s = {
    ...DEFAULT_SETTINGS,
    ...(raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}),
  };
  s.seed = Number.isInteger(s.seed) && s.seed >= 0 ? s.seed % SEEDS : DEFAULT_SETTINGS.seed;
  s.n_sims = Number.isInteger(s.n_sims)
    ? Math.min(Math.max(s.n_sims, SIMS.min), SIMS.max)
    : DEFAULT_SETTINGS.n_sims;
  if (typeof s.locale !== "string") s.locale = DEFAULT_SETTINGS.locale;
  if (!THEMES.includes(s.theme)) s.theme = DEFAULT_SETTINGS.theme;
  return s;
}

export const loadPlans = () => cleanSaved(read(KEYS.plans, null)?.plans);
export const savePlans = (plans) => write(KEYS.plans, { schema: 1, plans });
export const loadSession = () => read(KEYS.session, null);
export const saveSession = (s) => write(KEYS.session, s);
export const loadSettings = () => cleanSettings(read(KEYS.settings, {}));
export const saveSettings = (s) => write(KEYS.settings, s);
export const loadGroups = () => read(KEYS.groups, {});
export const saveGroups = (g) => write(KEYS.groups, g);
/** When the plans were last exported (ms since 1970), 0 if never. */
export const loadExported = () => {
  const ms = read(KEYS.backup, {})?.exported;
  return Number.isFinite(ms) && ms > 0 ? ms : 0;
};
export const saveExported = (ms) => write(KEYS.backup, { exported: ms });

/**
 * Ask the browser to keep this site's storage for good, instead of clearing it when space runs low.
 * The browser decides (Chrome and Edge from how the site is used, Firefox by asking); nothing breaks
 * if it says no, and only an exported file survives a lost device or cleared browser data.
 */
export async function keepStorage() {
  try {
    if (!navigator.storage?.persist) return false;
    return (await navigator.storage.persisted()) || (await navigator.storage.persist());
  } catch {
    return false;
  }
}

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
    name: t("files.name", { day }),
    text: JSON.stringify(body, null, 1),
  };
}

/** The plans in an exported file (or a bare plan, or a list of them), not yet cleaned. */
export function readFile(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(t("files.notJson"));
  }
  const items = data?.format === FILE_FORMAT ? data.plans : Array.isArray(data) ? data : [data];
  const out = (items || [])
    .filter((x) => x && typeof x === "object")
    .map((x) =>
      x.plan && typeof x.plan === "object"
        ? { name: x.name, plan: x.plan }
        : { name: x.name, plan: x },
    )
    .filter((x) => Array.isArray(x.plan.people) || typeof x.plan.spending === "number");
  if (!out.length) throw new Error(t("files.empty"));
  return out;
}

// ---- share links ---------------------------------------------------------------------------------
// "#plan=z…": the plan as deflated JSON in base64url ("j…": not compressed, where the browser
// can't compress). "#plan=e…": locked with a password: [version][salt][iv][AES-GCM of "z…" or
// "j…" as bytes], with the key from PBKDF2. The password is never in the link, and neither is the
// plan's name. All of it after the "#", so browsers never send it to the site's server.

const LOCK = { version: 1, iterations: 600_000, salt: 16, iv: 12 }; // a new version may change these
const fail = (code, message) => Object.assign(new Error(message), { code });
const damaged = () => fail("damaged", t("link.damaged"));
const encoder = new TextEncoder();

const concat = (...parts) => {
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};
const toB64 = (bytes) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64 = (s) => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
async function through(bytes, stream) {
  return new Uint8Array(
    await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer(),
  );
}

/** Whether this browser can lock and unlock links: Web Crypto exists over https and on localhost only. */
export const canLock = () => Boolean(globalThis.crypto?.subtle);
/** Whether a share code needs a password to open. */
export const isLocked = (code) => code[0] === "e";

// The same password typed on two devices can come out as different Unicode ("é" as one character
// or two): NFC makes them the same bytes.
async function lockKey(password, salt, usage) {
  const raw = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password.normalize("NFC")),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: LOCK.iterations },
    raw,
    { name: "AES-GCM", length: 256 },
    false,
    [usage],
  );
}

/**
 * The seed and number of futures a plan was shared with, if well-formed: { seed, n_sims }, or null.
 * They're the sharer's settings, not part of the plan: the person opening it is told, not switched.
 */
export function cleanRun(r) {
  if (!r || typeof r !== "object") return null;
  const { seed, n_sims } = r;
  const ok =
    Number.isInteger(seed) &&
    seed >= 0 &&
    seed < SEEDS &&
    Number.isInteger(n_sims) &&
    n_sims >= SIMS.min &&
    n_sims <= SIMS.max;
  return ok ? { seed, n_sims } : null;
}

/**
 * The code after "#plan=": the plan, its name and the run it was shared with ({ seed, n_sims }),
 * locked when a password is given.
 */
export async function packPlan(name, plan, { password = "", run = null } = {}) {
  const json = encoder.encode(JSON.stringify({ n: name, p: plan, ...(run ? { r: run } : {}) }));
  const zip = typeof CompressionStream === "function";
  const body = zip ? await through(json, new CompressionStream("deflate-raw")) : json;
  const kind = zip ? "z" : "j";
  if (!password) return kind + toB64(body);
  const head = new Uint8Array([LOCK.version]);
  const salt = crypto.getRandomValues(new Uint8Array(LOCK.salt));
  const iv = crypto.getRandomValues(new Uint8Array(LOCK.iv));
  const key = await lockKey(password, salt, "encrypt");
  const sealed = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: head },
    key,
    concat(encoder.encode(kind), body),
  );
  return `e${toB64(concat(head, salt, iv, new Uint8Array(sealed)))}`;
}

/**
 * { name, plan, run } from a share code (`run` is null in links made before it was added). Errors
 * carry a `code`: "locked" (a password is needed), "password" (not the right one), "newer" (made
 * by a later version), "damaged".
 */
export async function unpackPlan(code, password = "") {
  let kind = code[0];
  let bytes;
  try {
    bytes = fromB64(code.slice(1));
  } catch {
    throw damaged();
  }
  if (kind === "e") {
    if (!password) throw fail("locked", t("link.locked"));
    if (!canLock()) throw fail("locked", t("link.lockedHttps"));
    if (bytes[0] > LOCK.version) throw fail("newer", t("link.newer"));
    const top = 1 + LOCK.salt + LOCK.iv;
    if (bytes[0] !== LOCK.version || bytes.length <= top + 16) throw damaged();
    let inner;
    try {
      const key = await lockKey(password, bytes.subarray(1, 1 + LOCK.salt), "decrypt");
      const iv = bytes.subarray(1 + LOCK.salt, top);
      inner = new Uint8Array(
        await crypto.subtle.decrypt(
          { name: "AES-GCM", iv, additionalData: bytes.subarray(0, 1) },
          key,
          bytes.subarray(top),
        ),
      );
    } catch {
      // AES-GCM can't tell a wrong password from a changed link; a wrong password is far likelier.
      throw fail("password", t("link.wrongPassword"));
    }
    kind = String.fromCharCode(inner[0]);
    bytes = inner.subarray(1);
  }
  try {
    if (kind !== "z" && kind !== "j") throw new Error();
    const json =
      kind === "z" ? await through(bytes, new DecompressionStream("deflate-raw")) : bytes;
    const d = JSON.parse(new TextDecoder().decode(json));
    if (!d || typeof d.p !== "object") throw new Error();
    return {
      name: typeof d.n === "string" ? d.n : t("link.untitled"),
      plan: d.p,
      run: cleanRun(d.r),
    };
  } catch {
    throw damaged();
  }
}
