// Putting a list's cards in another order (people, accounts, income lines, events): drag one by its
// grip, with a mouse, a finger or a pen, or move it one place with its ↑ and ↓ buttons. The buttons
// are also the way for the keyboard, a screen reader, and anyone who can't drag (WCAG 2.5.7), so
// the grip itself is left out of both. Each move is announced; Escape or a lost pointer drops a
// drag where it started.
import { el } from "./dom.js";
import { announce } from "./messages.js";

const EDGE = 48; // px from the top or bottom of the scrolling panel where a drag scrolls it
const SPEED = 14; // px per frame, at the very edge

const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const cardsIn = (list) => [...list.children].filter((n) => n.classList.contains("item"));

/**
 * The grip and the ↑ ↓ buttons for the card at `index` of `count`, or nulls with nothing to
 * reorder. `move(to)` puts the item at `to` in the plan, builds the form again, and returns the
 * list's new cards, in their new order.
 */
export function moveControls({ index, count, name, move }) {
  if (count < 2) return { grip: null, buttons: null };
  const grip = el("span", { class: "grip", "aria-hidden": "true", title: "Drag to move" });
  grip.addEventListener("pointerdown", (e) => drag(e, grip, index, count, name, move));
  const button = (dir, to, text, label) =>
    el(
      "button",
      {
        type: "button",
        class: "btn quiet small move",
        "data-move": dir,
        "aria-label": label,
        title: label,
        disabled: to < 0 || to >= count,
        onclick: (e) => step(e.currentTarget, dir, to, count, name, move),
      },
      text,
    );
  const buttons = el(
    "span",
    { class: "moves" },
    button("up", index - 1, "↑", `Move “${name}” up`),
    button("down", index + 1, "↓", `Move “${name}” down`),
  );
  return { grip, buttons };
}

// One place up or down. The focus stays on the same button of the moved card, or on the other one
// when it reached an end, so the keys can carry on moving it.
function step(btn, dir, to, count, name, move) {
  const cards = cardsIn(btn.closest(".item").parentElement);
  const before = tops(cards);
  const now = move(to);
  slide(now, before);
  say(name, to, count);
  const card = now[to];
  const same = card.querySelector(`[data-move="${dir}"]`);
  (same.disabled ? card.querySelector("[data-move]:not(:disabled)") : same).focus();
}

function drag(e, grip, index, count, name, move) {
  if (!e.isPrimary || e.button !== 0) return;
  e.preventDefault(); // no text selection, no scrolling (with touch-action: none)
  const card = grip.closest(".item");
  const list = card.parentElement;
  const cards = cardsIn(list);
  const scroller = scrollerOf(list);
  const y0 = e.clientY;
  const s0 = scroller.scrollTop;
  // Where each card is in the scrolled content, which scrolling the panel doesn't change.
  const boxes = cards.map((c) => {
    const r = c.getBoundingClientRect();
    return { top: r.top + s0, mid: r.top + s0 + r.height / 2, h: r.height };
  });
  const me = boxes[index];
  const shift = me.h + (parseFloat(getComputedStyle(list).rowGap) || 0);
  const lo = boxes[0].top - me.top;
  const hi = boxes.at(-1).top + boxes.at(-1).h - me.top - me.h;
  let y = y0;
  let to = index;
  let frame = 0;

  const place = () => {
    const dy = Math.min(hi, Math.max(lo, y - y0 + scroller.scrollTop - s0));
    // A card takes the place of each one it covers half of: its top edge past their middle going
    // up, its bottom edge going down. (Its own middle would never get past the first card's, as
    // far as it can go, when the two are the same height.)
    const top = me.top + dy;
    const bottom = top + me.h;
    to = index;
    for (let j = 0; j < index; j++)
      if (top < boxes[j].mid) {
        to = j;
        break;
      }
    for (let j = index + 1; j < boxes.length; j++) if (bottom > boxes[j].mid) to = j;
    cards.forEach((c, j) => {
      const off =
        j === index ? dy : j > index && j <= to ? -shift : j < index && j >= to ? shift : 0;
      c.style.transform = off ? `translateY(${off}px)` : "";
    });
  };
  // Near the panel's top or bottom edge, the panel scrolls, faster closer to the edge.
  const scroll = () => {
    frame = requestAnimationFrame(scroll);
    const { top, bottom } = visible(scroller);
    const d = y < top + EDGE ? y - top - EDGE : y > bottom - EDGE ? y - bottom + EDGE : 0;
    if (!d) return;
    const was = scroller.scrollTop;
    scroller.scrollTop += Math.sign(d) * Math.ceil(SPEED * Math.min(1, Math.abs(d) / EDGE));
    if (scroller.scrollTop !== was) place();
  };

  const stop = new AbortController();
  const on = (target, type, fn, capture = false) =>
    target.addEventListener(type, fn, { signal: stop.signal, capture });
  const end = (keep) => {
    stop.abort();
    cancelAnimationFrame(frame);
    const before = tops(cards); // where they are on screen, moved as they are
    for (const c of cards) c.style.transform = "";
    card.classList.remove("lifted");
    list.classList.remove("sorting");
    document.documentElement.classList.remove("grabbing");
    // The form may have been built again meanwhile (a plan changed in another tab): then the
    // places counted at the start no longer hold.
    if (keep && to !== index && card.isConnected) {
      slide(move(to), before);
      say(name, to, count);
    } else slide(cards, before);
  };

  grip.setPointerCapture(e.pointerId);
  card.classList.add("lifted");
  list.classList.add("sorting");
  document.documentElement.classList.add("grabbing");
  on(grip, "pointermove", (ev) => {
    if (ev.pointerId !== e.pointerId) return;
    y = ev.clientY;
    place();
  });
  on(grip, "pointerup", () => end(true));
  on(grip, "pointercancel", () => end(false));
  on(grip, "lostpointercapture", () => end(false)); // without a pointerup: taken away
  on(
    window,
    "keydown",
    (ev) => {
      if (ev.key !== "Escape") return;
      ev.preventDefault();
      ev.stopPropagation(); // it's the drag's, nothing else's
      end(false);
    },
    true,
  );
  frame = requestAnimationFrame(scroll);
}

const say = (name, to, count) => announce(`“${name}” moved to place ${to + 1} of ${count}.`);

// Each card's place on screen, by its item's id.
const tops = (cards) => new Map(cards.map((c) => [c.dataset.key, c.getBoundingClientRect().top]));
// The cards glide from where they were to where they are now, instead of jumping.
function slide(cards, from) {
  if (still()) return;
  for (const c of cards) {
    const dy = (from.get(c.dataset.key) ?? NaN) - c.getBoundingClientRect().top;
    if (dy && Number.isFinite(dy))
      c.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], {
        duration: 160,
        easing: "ease-out",
      });
  }
}

function scrollerOf(node) {
  for (let n = node.parentElement; n; n = n.parentElement) {
    const o = getComputedStyle(n).overflowY;
    if ((o === "auto" || o === "scroll") && n.scrollHeight > n.clientHeight) return n;
  }
  return document.scrollingElement;
}
// The part of the panel where the cards show: below its sticky head, if it has one.
function visible(scroller) {
  if (scroller === document.scrollingElement) return { top: 0, bottom: innerHeight };
  const r = scroller.getBoundingClientRect();
  const head = scroller.querySelector(":scope > .rail-head");
  return { top: head ? head.getBoundingClientRect().bottom : r.top, bottom: r.bottom };
}
