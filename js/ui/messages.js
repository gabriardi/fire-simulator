// What the page tells the viewer: the "?" explanations and the guide, toasts, notices, errors and
// the confirm box.
import { GUIDE, HELP } from "../help.js";
import { $, el } from "./dom.js";

export const helpEntry = (key) => (HELP[key]?.alias ? HELP[HELP[key].alias] : HELP[key]);
export function helpBtn(key) {
  const h = helpEntry(key);
  if (!h) return null;
  return el("button", { type: "button", class: "help", "data-help": key, "aria-label": `Explain: ${h.title}`, title: "What is this?" }, "?");
}
function openDialog(title, body, wide = false) {
  $("#help-title").textContent = title;
  const b = $("#help-body");
  b.replaceChildren(...body.filter((x) => x != null && x !== false));
  b.scrollTop = 0;
  const d = $("#help-dialog");
  d.classList.toggle("wide", wide);
  if (!d.open) d.showModal();
  requestAnimationFrame(() => { b.scrollTop = 0; });
}
function entryNodes(h) {
  const div = el("div", { class: "help-entry" });
  div.innerHTML = h.html; // trusted: our own static help.js
  return div;
}
export function openHelp(key) {
  const h = helpEntry(key);
  if (!h) return;
  $("#help-body").onscroll = null;
  openDialog(h.title, [entryNodes(h), el("button", { type: "button", class: "btn guide-link", onclick: openGuide }, "Open the full guide")]);
}
export function openGuide() {
  const toc = el("nav", { class: "guide-toc", "aria-label": "Guide sections" });
  const content = el("div", { class: "guide-content" });
  const links = [];
  GUIDE.forEach(([title, keys], i) => {
    const id = `guide-${i}`;
    const link = el("button", {
      type: "button", class: "toc-link", "data-target": id,
      onclick: () => document.getElementById(id).scrollIntoView({ behavior: "smooth", block: "start" }),
    }, title);
    links.push(link);
    toc.append(link);
    content.append(el("section", { class: "guide-section", id },
      el("h3", { text: title }),
      el("div", { class: "guide-cards" },
        ...keys.map(helpEntry).filter(Boolean).map((h) => el("article", { class: "guide-item" }, el("h4", { text: h.title }), entryNodes(h))))));
  });
  openDialog("Guide", [el("div", { class: "guide" }, toc, content)], true);
  const body = $("#help-body");
  const mark = () => {
    const top = body.getBoundingClientRect().top + 40;
    let current = links[0];
    for (const l of links) if (document.getElementById(l.dataset.target).getBoundingClientRect().top <= top) current = l;
    links.forEach((l) => l.setAttribute("aria-current", String(l === current)));
  };
  body.onscroll = mark;
  mark();
}
export function confirmBox({ title, text, ok = "OK", cancel = "Cancel" }) {
  return new Promise((resolve) => {
    const d = $("#confirm-dialog");
    $("#confirm-title").textContent = title;
    $("#confirm-text").textContent = text;
    $("#confirm-ok").textContent = ok;
    $("#confirm-cancel").textContent = cancel;
    const done = (v) => { d.onclose = null; d.close(); resolve(v); };
    $("#confirm-ok").onclick = () => done(true);
    $("#confirm-cancel").onclick = () => done(false);
    d.onclose = () => resolve(false);
    d.showModal();
  });
}

let toastTimer = null;
export function toast(text, { undo = null, error = false } = {}) {
  const t = $("#toast");
  $("#toast-text").textContent = text;
  const action = $("#toast-action");
  action.hidden = !undo;
  action.onclick = undo ? () => { hideToast(); undo(); } : null;
  t.classList.toggle("error", error);
  t.classList.add("show");
  t.dataset.ms = undo || error ? 10000 : 4500;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, Number(t.dataset.ms));
}
function hideToast() {
  clearTimeout(toastTimer);
  $("#toast").classList.remove("show");
}

/** The toast stays while the mouse or the keyboard focus is on it. */
export function wireToast() {
  $("#toast-close").addEventListener("click", hideToast);
  const t = $("#toast");
  const hold = () => clearTimeout(toastTimer);
  const release = () => { if (t.classList.contains("show")) toastTimer = setTimeout(hideToast, Number(t.dataset.ms)); };
  t.addEventListener("mouseenter", hold);
  t.addEventListener("focusin", hold);
  t.addEventListener("mouseleave", release);
  t.addEventListener("focusout", release);
}
export function showNotice(msg) {
  const n = $("#notice");
  n.textContent = msg;
  n.classList.toggle("show", Boolean(msg));
}
export function showError(msg, fix = null) {
  const e = $("#error");
  $("#error-text").textContent = msg || "";
  const btn = $("#error-fix");
  btn.hidden = !fix;
  if (fix) {
    btn.textContent = fix.label;
    btn.onclick = fix.run;
  }
  e.classList.toggle("show", Boolean(msg));
}
