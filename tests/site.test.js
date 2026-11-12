// The site's own bookkeeping, which no build step does for it: the files the service worker keeps
// for offline use, the chart library's version, and an explanation behind every "?". The README's
// "Notes for changes" lists these by hand; this file checks them.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { RULE_KINDS } from "../site/js/engine.js";
import { GUIDE, HELP } from "../site/js/help.js";

const ROOT = new URL("../site/", import.meta.url); // what is deployed
const REPO = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), "utf8");
const exists = (path) => existsSync(new URL(path, ROOT));
const html = read("index.html");
// The page's code: js/app.js and the modules in js/ui/.
const app = [
  "js/app.js",
  ...readdirSync(new URL("js/ui/", ROOT))
    .filter((f) => f.endsWith(".js"))
    .map((f) => `js/ui/${f}`),
]
  .map(read)
  .join("\n");

/** The paths in sw.js's SHELL list. */
const SHELL = (() => {
  const list = /const SHELL = \[([\s\S]*?)\];/.exec(read("sw.js"));
  assert.ok(list, "sw.js has a SHELL list");
  return [...list[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
})();

/** Every module a module loads, its own imports and its workers, followed to the end. */
function modulesFrom(entry) {
  const seen = new Set();
  const visit = (path) => {
    if (seen.has(path)) return;
    seen.add(path);
    const src = read(path);
    const specs = [
      ...[...src.matchAll(/\bfrom "(\.\.?\/[^"]+)"/g)].map((m) => m[1]),
      ...[...src.matchAll(/new URL\("(\.\.?\/[^"]+)", import\.meta\.url\)/g)].map((m) => m[1]),
    ];
    for (const spec of specs) visit(new URL(spec, new URL(path, ROOT)).pathname.slice(ROOT.pathname.length));
  };
  visit(entry);
  return [...seen];
}

test("everything the page needs offline is in the service worker's list", () => {
  const page = [
    ...[...html.matchAll(/<script [^>]*src="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/<link rel="(?:stylesheet|manifest|icon)" href="([^"]+)"/g)].map((m) => m[1]),
  ];
  assert.ok(page.includes("js/app.js") && page.includes("app.css"), "the page's own script and styles were found");
  const needed = new Set([...page, ...modulesFrom("js/app.js")]);
  assert.ok(needed.has("js/worker.js") && needed.has("js/engine.js"), "the worker and what it imports were found");
  const missing = [...needed].filter((f) => !SHELL.includes(f));
  assert.deepEqual(missing, [], "add these to SHELL in sw.js, or the app won't work offline");
});

test("every file in the service worker's list exists", () => {
  // One missing file fails the whole install: the app then doesn't work offline at all.
  const missing = SHELL.filter((f) => f !== "./" && !exists(f));
  assert.deepEqual(missing, []);
});

test("the chart library is the same version everywhere", () => {
  const bundles = readdirSync(new URL("vendor/", ROOT)).filter((f) => /^plotly.*\.js$/.test(f));
  assert.equal(bundles.length, 1, `one Plotly bundle in vendor/, not ${bundles.join(", ")}`);
  const file = `vendor/${bundles[0]}`;
  // The version in the name is what lets _headers cache it for good.
  assert.match(file, /-\d+\.\d+\.\d+\.min\.js$/);
  assert.ok(html.includes(`<script src="${file}">`), `index.html loads ${file}`);
  assert.ok(SHELL.includes(file), `sw.js keeps ${file}`);
  assert.ok(readFileSync(new URL("README.md", REPO), "utf8").includes(file), `README.md names ${file}`);
});

const entry = (key) => (HELP[key]?.alias ? HELP[HELP[key].alias] : HELP[key]);

/** The source of each call's argument, an object literal: `fn({ ... })`. */
function callArgs(src, fn) {
  const out = [];
  for (const m of src.matchAll(new RegExp(`\\b${fn}\\(\\{`, "g"))) {
    const from = m.index + m[0].length - 1;
    let depth = 0;
    let i = from;
    for (; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}" && --depth === 0) break;
    }
    out.push(src.slice(from, i + 1));
  }
  return out;
}

test("every ? has an explanation, and the guide shows all of them", () => {
  const keys = new Set([
    ...[...html.matchAll(/data-help="([^"]+)"/g)].map((m) => m[1]),
    ...[...app.matchAll(/\bhelpBtn\("([^"]+)"\)/g)].map((m) => m[1]),
    ...[...app.matchAll(/\bhelp: "([^"]+)"/g)].map((m) => m[1]),
    ...RULE_KINDS.map((k) => `rule.${k}`), // the rule's "?" follows the rule picked
  ]);
  // A number or select field without its own `help` is explained under its path.
  const problems = [];
  let fields = 0;
  for (const fn of ["numberField", "selectField"]) {
    for (const args of callArgs(app, fn)) {
      const path = /\bpath: (["`])(.*?)\1/.exec(args);
      if (!path) continue; // the function's own definition
      fields++;
      if (/\bhelp: "/.test(args)) continue;
      if (path[1] === "`") problems.push(`${fn} ${path[2]}: a path made per item needs its own \`help\``);
      else keys.add(path[2]);
    }
  }
  assert.ok(fields > 40, `the form's fields were found (${fields})`);
  for (const key of keys) if (!entry(key)) problems.push(`"${key}" has no entry in HELP`);
  for (const [key, h] of Object.entries(HELP))
    if (h.alias && !HELP[h.alias]) problems.push(`"${key}" is an alias of a missing "${h.alias}"`);

  const inGuide = GUIDE.flatMap(([, list]) => list);
  for (const key of inGuide) if (!entry(key)) problems.push(`the guide lists "${key}", which has no entry`);
  if (new Set(inGuide).size !== inGuide.length) problems.push("the guide lists an entry twice");
  for (const key of Object.keys(HELP))
    if (!HELP[key].alias && !inGuide.includes(key)) problems.push(`"${key}" isn't in the guide`);
  assert.deepEqual(problems, []);
});

test("the site serves the repository's license as it is", () => {
  // MIT asks for the notice in every copy, and the site is one: site/LICENSE is a copy of LICENSE.
  assert.equal(read("LICENSE"), readFileSync(new URL("LICENSE", REPO), "utf8"));
});
