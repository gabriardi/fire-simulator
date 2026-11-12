// The service worker (sw.js), and new versions.
//
// The service worker makes the page installable as an app and usable offline. It serves the
// network's copy first, so a page opened anew always gets the latest version. A page left open,
// though (an installed app resumed from the background, a tab kept for days), keeps running the
// version it loaded, while the workers it restarts would fetch the new one.
//
// So the page notes which version it runs: a fingerprint of its code as the server has it shortly
// after the page opens (as stored, if it opened offline). When the page comes back into view, and
// every hour while it's in view, it compares that with the code the server has now. The plan on
// screen, unsaved changes included, survives a reload (the session, in store.js), so a new version
// is loaded as soon as it's found when the page comes back into view, unless something is in
// progress: then a toast offers it, and it's loaded the next time the page comes back into view.
import { toast } from "./messages.js";

const FIRST = 5_000; // after opening, when the page notes its version
const EVERY = 60 * 60_000; // while in view
const GAP = 15 * 60_000; // at least this long between two checks

let running = null; // the fingerprint of the version this page runs
let lastCheck = 0;
let checking = false;
let ready = false; // a new version has been found
let shownAt = 0; // when the page last came into view
let touchedAt = 0; // when the user last clicked, tapped or typed

export function startServiceWorker() {
  if (!("serviceWorker" in navigator) || location.protocol !== "https:") return;
  navigator.serviceWorker.register("sw.js").catch(() => {});
  setTimeout(check, FIRST);
  setInterval(() => {
    if (document.visibilityState === "visible") check();
  }, EVERY);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    shownAt = Date.now();
    if (!ready) check({ shown: true });
    else if (quiet()) location.reload();
  });
  const touched = () => {
    touchedAt = Date.now();
  };
  addEventListener("pointerdown", touched, { capture: true, passive: true });
  addEventListener("keydown", touched, { capture: true, passive: true });
}

async function check({ shown = false } = {}) {
  if (checking || ready || Date.now() - lastCheck < GAP) return;
  checking = true;
  lastCheck = Date.now();
  try {
    if (!running) {
      running = (await ask("server")) ?? (await ask("stored"));
      return;
    }
    const latest = await ask("server");
    if (!latest || latest === running) return;
    ready = true;
    if (shown && quiet()) location.reload();
    else
      toast("A new version is ready. Your plan stays as it is.", {
        action: { label: "Reload", run: () => location.reload() },
        stay: true,
      });
  } finally {
    checking = false;
  }
}

/** Nothing in progress: the user hasn't touched the page since it came into view, no dialog is open, and no field has the focus. */
const quiet = () =>
  touchedAt < shownAt &&
  !document.querySelector("dialog[open]") &&
  !document.activeElement?.matches("input, select, textarea");

/** Asks the service worker for a fingerprint ("server" or "stored"); null if there's no answer. */
function ask(from) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 30_000);
    navigator.serviceWorker.ready.then((reg) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (e) => {
        clearTimeout(timer);
        resolve(e.data);
      };
      reg.active.postMessage({ fingerprint: from }, [channel.port2]);
    });
  });
}
