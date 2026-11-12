/**
 * The page's words, in one language. Every text the code shows is a message in a catalog, found
 * by its key: `t("plans.saved", { name })`. The catalogs are in locales/<language>/: messages.js
 * for the page's own texts, help.js for the "?" explanations and the guide. The pages' HTML
 * (index.html, privacy.html) keeps its English in place, each piece marked with its key; so do
 * the web app manifest and the pages' structured data, by the field. `npm run strings` lists the
 * whole English catalog, all of these together, and tests/i18n.test.js checks that nothing shown
 * is left out of it.
 *
 * Only English exists so far.
 */
import messages from "./locales/en/messages.js";

export const LANG = "en";

const plural = new Intl.PluralRules(LANG);
const and = new Intl.ListFormat(LANG, { type: "conjunction" });
// A variable, `{name}`, or Plotly's `%{x}`, which some messages hold for the charts to fill in
// and which stays as it is. (Not with a lookbehind: Safari has it only from 16.4.)
const VAR = /(%?)\{(\w+)\}/g;

/**
 * The message `key` as pieces: text, with each `{name}` in it filled in from `vars.name`. A value
 * that isn't text or a number (a page element: a <strong>, a "?" button) stays a piece of its
 * own, so it can go in where the message puts it. A message with a form per number,
 * `{ one, other }`, takes the form for `vars.n` in this language.
 */
export function tParts(key, vars = {}) {
  let m = messages[key];
  if (m == null) return [key]; // tests/i18n.test.js makes sure it never happens
  if (typeof m === "object") m = m[plural.select(vars.n)] ?? m.other;
  const out = [""];
  const add = (x) => {
    if (typeof x === "object") out.push(x, "");
    else out[out.length - 1] += x;
  };
  let at = 0;
  for (const v of m.matchAll(VAR)) {
    if (v[1]) continue; // Plotly's
    add(m.slice(at, v.index));
    add(v[2] in vars ? vars[v[2]] : v[0]);
    at = v.index + v[0].length;
  }
  add(m.slice(at));
  return out.filter((x) => x !== "");
}

/** The message `key` as text: see `tParts`. */
export const t = (key, vars) => tParts(key, vars).join("");

/** "A and B", "A, B and C": items listed the way this language does. */
export const andList = (items) => and.format(items);
