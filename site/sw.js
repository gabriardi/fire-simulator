// Service worker: makes the simulator installable and usable offline once it has loaded.
// - The page and its files: network first, so a page opened anew always gets the latest version;
//   the stored copy is used only when the network can't be reached.
// - The chart library (its file name carries its version): the stored copy first.
// - A page left open asks it whether a new version has been deployed (js/ui/updates.js).
// It stores nothing else: plans live in the page's own storage, never here.
const CACHE = "fire-shell-v1";
const SHELL = [
  "./", // the page itself (hosts redirect index.html here, and a stored redirect can't answer a page load)
  "app.css",
  "js/app.js",
  "js/ui/charts.js",
  "js/ui/dom.js",
  "js/ui/fields.js",
  "js/ui/files.js",
  "js/ui/form.js",
  "js/ui/messages.js",
  "js/ui/plans.js",
  "js/ui/run.js",
  "js/ui/setup.js",
  "js/ui/share.js",
  "js/ui/state.js",
  "js/ui/updates.js",
  "js/engine.js",
  "js/views.js",
  "js/plan.js",
  "js/format.js",
  "js/store.js",
  "js/help.js",
  "js/worker.js",
  "vendor/plotly-cartesian-4.1.1.min.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/favicon-64.png",
];
// What a new version changes: the page and its code. (The chart library's name is in the page.)
const CODE = SHELL.filter((p) => p === "./" || (/\.(js|css)$/.test(p) && !p.startsWith("vendor/")));

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
      // A chart library that a newer one has replaced.
      const cache = await caches.open(CACHE);
      for (const req of await cache.keys()) {
        const path = new URL(req.url).pathname;
        if (path.includes("/vendor/") && !SHELL.some((p) => path.endsWith(`/${p}`)))
          await cache.delete(req);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith(url.pathname.includes("/vendor/") ? storedFirst(req) : networkFirst(req, url));
});

async function networkFirst(req, url) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    // Stored under its address without the query: the page (?utm=… from a link) and the workers
    // (worker.js?3, see js/ui/run.js). So there's one copy of each, and it's the latest.
    if (res.ok) cache.put(url.origin + url.pathname, res.clone());
    return res;
  } catch (err) {
    const hit =
      (await cache.match(req, { ignoreSearch: true })) ||
      (req.mode === "navigate" ? await cache.match("./") : null);
    if (hit) return hit;
    throw err;
  }
}

async function storedFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

// A fingerprint of the page's code, as the server has it now ("server") or as stored here
// ("stored"), sent back on the message's port; null when a file can't be read.
self.addEventListener("message", (event) => {
  const from = event.data?.fingerprint;
  const port = event.ports[0];
  if (!port || (from !== "server" && from !== "stored")) return;
  event.waitUntil(
    fingerprint(from)
      .catch(() => null)
      .then((f) => port.postMessage(f)),
  );
});

async function fingerprint(from) {
  const cache = await caches.open(CACHE);
  const hashes = await Promise.all(
    CODE.map(async (path) => {
      const res =
        from === "server" ? await fetch(path, { cache: "no-cache" }) : await cache.match(path);
      if (!res?.ok) throw new Error(`${path} can't be read`);
      const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", await res.arrayBuffer()));
      return Array.from(hash.subarray(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
    }),
  );
  return hashes.join(" ");
}
