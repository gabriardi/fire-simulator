// Small helpers for making and reading the page's elements. No state of their own.
import { same } from "../plan.js";

export const $ = (sel, root = document) => root.querySelector(sel);
export const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) n.append(kid);
  return n;
};
export const clone = (o) => JSON.parse(JSON.stringify(o));
export const getPath = (obj, path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
export const setPath = (obj, path, v) => {
  const keys = path.split(".");
  const last = keys.pop();
  keys.reduce((o, k) => o[k], obj)[last] = v;
};
export const isPhone = () => window.matchMedia("(max-width: 960px)").matches;
export const css = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// Plotly reads a few HTML tags in its labels: names typed by people (or in a shared link) go in as text.
export const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const byName = (a, b) =>
  a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });

/** Deep equality for plan values (numbers to 1e-9). */
export function eq(a, b) {
  const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
  if (isObj(a) && isObj(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].every((k) => eq(a[k], b[k]));
  }
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((x, i) => eq(x, b[i]));
  return same(a, b);
}
