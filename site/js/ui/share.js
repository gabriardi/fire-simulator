// Share links: making one (locked with a password, if wanted), opening one, and the note when
// the sharer's seed or number of futures differ from the viewer's.
import { fromNewer, normalize } from "../plan.js";
import * as store from "../store.js";
import { $, clone, eq } from "./dom.js";
import { confirmBox, toast } from "./messages.js";
import { addPlan, canSave, edits, persistPlans, switchTo, uniqueName } from "./plans.js";
import { changed } from "./run.js";
import { base, fmt, planById, plans, settings, state } from "./state.js";

// A password protects the link only as well as it resists guessing: whoever holds a locked link
// can try passwords offline, as fast as their hardware allows. PBKDF2 slows each try; length does
// the rest.
const MIN_PASSWORD = 8;
let shareTurn = 0; // the latest link being made: an older one finishing late is dropped

export async function openShare() {
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
    note.textContent = !password
      ? "Without one, anyone with the link can open it."
      : short
        ? `At least ${MIN_PASSWORD} characters. A few unrelated words are best.`
        : "The link opens only with this password, which isn't in the link: send it separately, not in the same message.";
    // Never a link without the lock while a password is being typed: it could be sent by mistake.
    show("", short ? "Finish the password first" : password ? "Locking…" : "");
    if (short) return;
    timer = setTimeout(
      async () => {
        const code = await store.packPlan(name, plan, { password, run });
        if (turn !== shareTurn) return;
        locked = Boolean(password);
        show(`${location.origin}${location.pathname}#plan=${code}`);
      },
      password ? 300 : 0,
    );
  };
  $("#share-lock").hidden = !store.canLock();
  pw.oninput = make;
  pw.onkeydown = (e) => {
    if (e.key === "Enter") e.preventDefault();
  };
  nativeBtn.hidden = typeof navigator.share !== "function";
  // A share sheet often puts the title in the message: a locked plan's name stays out of it.
  nativeBtn.onclick = () =>
    navigator.share({ title: locked ? "FIRE plan" : `FIRE plan: ${name}`, url }).catch(() => {});
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
      reject(
        new Error(
          "This share link is locked with a password, which this browser can only unlock over https.",
        ),
      );
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
      if (!input.value) {
        problem("Type the password you were given.");
        input.focus();
        return;
      }
      ok.disabled = true;
      ok.textContent = "Unlocking…";
      try {
        done(resolve, await store.unpackPlan(code, input.value));
      } catch (err) {
        if (err.code !== "password") done(reject, err);
        else if (!settled) {
          problem(err.message);
          input.focus();
          input.select();
        }
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
export const NEWER =
  "This plan was made by a newer version of the simulator: reload the page to update it";

// Links open one at a time, in the order they came: one arriving while another still asks its
// question (or its password) waits its turn, instead of taking that dialog over.
let opening = Promise.resolve();
export function openSharedLink() {
  const m = /^#plan=([\w-]+)$/.exec(location.hash);
  if (!m) return;
  history.replaceState(null, "", location.pathname + location.search);
  opening = opening.then(() => openCode(m[1])).catch((err) => toast(err.message, { error: true }));
}

async function openCode(code) {
  const locked = store.isLocked(code);
  let shared;
  try {
    shared = locked ? await unlockShared(code) : await store.unpackPlan(code);
  } catch (err) {
    toast(err.message, { error: true });
    return;
  }
  if (!shared) return;
  if (fromNewer(shared.plan)) {
    history.replaceState(null, "", `${location.pathname}${location.search}#plan=${code}`); // a reload opens it
    toast(`${NEWER}, and the link opens.`, { error: true });
    return;
  }
  const plan = normalize(shared.plan, { currency: state.currency });
  const name =
    (typeof shared.name === "string" && shared.name.trim().slice(0, 50)) || "Shared plan";
  // Opened before (a bookmarked link, or the sharer's own browser): go to that copy, no new one.
  // Looked for again after the question: the same link may have opened in another tab meanwhile.
  const twin = () => plans.find((x) => eq(x.plan, plan));
  if (twin()) {
    openTwin(twin(), shared.run);
    return;
  }
  // Typing the password already said yes.
  const yes =
    locked ||
    (await confirmBox({
      title: "Open a shared plan?",
      text: `Someone shared “${name}” with you. It opens as a new plan in this browser; your own plans stay as they are.`,
      ok: "Open it",
      cancel: "Not now",
    }));
  if (!yes) return;
  if (twin()) {
    openTwin(twin(), shared.run);
    return;
  }
  const p = addPlan(uniqueName(name), plan);
  noteRun(p, shared.run);
  switchTo(p.id);
}
function openTwin(twin, run) {
  const unsaved = edits().length > 0;
  noteRun(twin, run);
  switchTo(twin.id);
  if (!unsaved) toast(`Already saved here as “${twin.name}”: opened it.`);
}

// A share link says which seed and how many futures the sharer used. Different ones here give
// slightly different numbers, so the plan keeps them and a note says so until the person opening
// it uses the same, dismisses the note, or saves changes to the plan.
const sameRun = (r) => r.seed === settings.seed && r.n_sims === settings.n_sims;
function noteRun(p, run) {
  if (!run || sameRun(run)) return;
  p.shared = run;
  persistPlans();
}
export function renderShared() {
  const box = $("#shared-note");
  const run = planById(base.id)?.shared;
  box.hidden = !run || sameRun(run);
  if (box.hidden) return;
  const seed = run.seed !== settings.seed;
  const n = run.n_sims !== settings.n_sims;
  const theirs = [seed && `seed ${run.seed}`, n && `${fmt.num(run.n_sims)} futures`]
    .filter(Boolean)
    .join(" and ");
  const yours = [seed && `seed ${settings.seed}`, n && `${fmt.num(settings.n_sims)} futures`]
    .filter(Boolean)
    .join(" and ");
  $("#shared-text").textContent =
    `Shared with ${theirs}. With your ${yours}, the numbers can differ a little.`;
}
export function forgetRun() {
  const p = planById(base.id);
  if (!p?.shared) return;
  delete p.shared;
  persistPlans();
  renderShared();
}
export function useSharedRun() {
  const run = planById(base.id)?.shared;
  if (!run) return;
  settings.seed = run.seed;
  settings.n_sims = run.n_sims;
  store.saveSettings(settings);
  forgetRun();
  changed();
  toast(
    `Now on seed ${run.seed} and ${fmt.num(run.n_sims)} futures, as shared. Change them under Simulation.`,
  );
}
