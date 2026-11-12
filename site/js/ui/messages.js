// What the page tells the viewer: the "?" explanations and the guide, toasts, notices, errors and
// the confirm box.
import { ALIASES, GUIDE } from "../help.js";
import { t } from "../i18n.js";
import HELP from "../locales/en/help.js";
import { $, el } from "./dom.js";

export const helpEntry = (key) => HELP[ALIASES[key] ?? key];
export function helpBtn(key) {
  const h = helpEntry(key);
  if (!h) return null;
  return el(
    "button",
    {
      type: "button",
      class: "help",
      "data-help": key,
      "aria-label": t("help.explain", { title: h.title }),
      title: t("help.what"),
    },
    "?",
  );
}
function openDialog(title, body, wide = false) {
  $("#help-title").textContent = title;
  const b = $("#help-body");
  b.replaceChildren(...body.filter((x) => x != null && x !== false));
  b.scrollTop = 0;
  const d = $("#help-dialog");
  d.classList.toggle("wide", wide);
  if (!d.open) d.showModal();
  requestAnimationFrame(() => {
    b.scrollTop = 0;
  });
}
function entryNodes(h) {
  const div = el("div", { class: "help-entry" });
  div.innerHTML = h.html; // trusted: our own static help texts
  // An example's label, shown before it by the styles (app.css).
  for (const ex of div.querySelectorAll(".ex")) ex.dataset.label = t("help.example");
  return div;
}
export function openHelp(key) {
  const h = helpEntry(key);
  if (!h) return;
  $("#help-body").onscroll = null;
  openDialog(h.title, [
    entryNodes(h),
    el(
      "button",
      { type: "button", class: "btn guide-link", onclick: openGuide },
      t("help.openGuide"),
    ),
  ]);
}
export function openGuide() {
  const toc = el("nav", { class: "guide-toc", "aria-label": t("guide.sections") });
  const content = el("div", { class: "guide-content" });
  const links = [];
  GUIDE.forEach(([title, keys], i) => {
    const id = `guide-${i}`;
    const link = el(
      "button",
      {
        type: "button",
        class: "toc-link",
        "data-target": id,
        onclick: () =>
          document.getElementById(id).scrollIntoView({ behavior: "smooth", block: "start" }),
      },
      title,
    );
    links.push(link);
    toc.append(link);
    content.append(
      el(
        "section",
        { class: "guide-section", id },
        el("h3", { text: title }),
        el(
          "div",
          { class: "guide-cards" },
          ...keys
            .map(helpEntry)
            .filter(Boolean)
            .map((h) =>
              el("article", { class: "guide-item" }, el("h4", { text: h.title }), entryNodes(h)),
            ),
        ),
      ),
    );
  });
  openDialog(t("guide.title"), [el("div", { class: "guide" }, toc, content)], true);
  const body = $("#help-body");
  const mark = () => {
    const top = body.getBoundingClientRect().top + 40;
    let current = links[0];
    for (const l of links)
      if (document.getElementById(l.dataset.target).getBoundingClientRect().top <= top) current = l;
    if (body.scrollTop + body.clientHeight >= body.scrollHeight - 2) current = links.at(-1); // the end: short last sections never reach the top
    links.forEach((l) => l.setAttribute("aria-current", String(l === current)));
    // The list scrolls when it doesn't fit (a short window; a phone's row): keep the current one in view.
    if (current.offsetTop < toc.scrollTop) toc.scrollTop = current.offsetTop;
    else if (current.offsetTop + current.offsetHeight > toc.scrollTop + toc.clientHeight)
      toc.scrollTop = current.offsetTop + current.offsetHeight - toc.clientHeight;
    if (current.offsetLeft < toc.scrollLeft) toc.scrollLeft = current.offsetLeft;
    else if (current.offsetLeft + current.offsetWidth > toc.scrollLeft + toc.clientWidth)
      toc.scrollLeft = current.offsetLeft + current.offsetWidth - toc.clientWidth;
  };
  body.onscroll = mark;
  mark();
}
export function confirmBox({ title, text, ok = t("dialog.ok"), cancel = t("dialog.cancel") }) {
  return new Promise((resolve) => {
    const d = $("#confirm-dialog");
    $("#confirm-title").textContent = title;
    $("#confirm-text").textContent = text;
    $("#confirm-ok").textContent = ok;
    $("#confirm-cancel").textContent = cancel;
    const done = (v) => {
      d.onclose = null;
      d.close();
      resolve(v);
    };
    $("#confirm-ok").onclick = () => done(true);
    $("#confirm-cancel").onclick = () => done(false);
    d.onclose = () => resolve(false);
    d.showModal();
  });
}

let toastTimer = null;
/** A short message: `undo` adds an Undo button, `action` ({ label, run }) another one, `stay` keeps it until dismissed. */
export function toast(text, { undo = null, action = null, error = false, stay = false } = {}) {
  const box = $("#toast");
  $("#toast-text").textContent = text;
  const act = action ?? (undo ? { label: t("toast.undo"), run: undo } : null);
  const btn = $("#toast-action");
  btn.hidden = !act;
  if (act) btn.textContent = act.label;
  btn.onclick = act
    ? () => {
        hideToast();
        act.run();
      }
    : null;
  box.classList.toggle("error", error);
  box.classList.add("show");
  box.dataset.ms = stay ? 0 : act || error ? 10000 : 4500;
  clearTimeout(toastTimer);
  if (!stay) toastTimer = setTimeout(hideToast, Number(box.dataset.ms));
}
function hideToast() {
  clearTimeout(toastTimer);
  $("#toast").classList.remove("show");
}

/** The toast stays while the mouse or the keyboard focus is on it. */
export function wireToast() {
  $("#toast-close").addEventListener("click", hideToast);
  const box = $("#toast");
  const hold = () => clearTimeout(toastTimer);
  const release = () => {
    if (box.classList.contains("show") && Number(box.dataset.ms))
      toastTimer = setTimeout(hideToast, Number(box.dataset.ms));
  };
  box.addEventListener("mouseenter", hold);
  box.addEventListener("focusin", hold);
  box.addEventListener("mouseleave", release);
  box.addEventListener("focusout", release);
}
// For screen readers, what just happened when nothing on the screen says it in words (a card
// moved). Emptied first, so the same words twice are read twice.
let announceTimer = 0;
export function announce(text) {
  const a = $("#announce");
  a.textContent = "";
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => {
    a.textContent = text;
  }, 100);
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
