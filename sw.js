// Service worker: makes the simulator installable and usable offline once it has loaded.
// - The page and its files: network first, so a deploy shows up the next time the app opens;
//   the stored copy is used only when the network can't be reached.
// - The chart library (its file name carries its version): the stored copy first.
// It stores nothing else: plans live in the page's own storage, never here.
const CACHE = "fire-shell-v1";
const SHELL = [
  "./", // the page itself (hosts redirect index.html here, and a stored redirect can't answer a page load)
  "app.css",
  "js/app.js",
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

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith(url.pathname.includes("/vendor/") ? storedFirst(req) : networkFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = (await cache.match(req, { ignoreSearch: true })) || (req.mode === "navigate" ? await cache.match("./") : null);
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
