/**
 * The flexible rules' floor and ceiling: the band around a spending, and whether a rule still has
 * it. Both the plan (js/plan.js) and the views that try other spendings (js/views.js) need it, and
 * the views run in Web Workers, which restart often and show no text: so it's here, on its own,
 * not in plan.js with the plan's default names and messages.
 */

/** Equal, numbers to 1e-9: 2.5 typed in as % is 0.025. */
export function same(a, b) {
  if (typeof a === "number" && typeof b === "number")
    return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((x, i) => same(x, b[i]));
  return a === b || (a == null && b == null);
}

/** Two significant digits: 57,600 → 58,000. */
export function roundish(x) {
  if (!(x > 0)) return 0;
  const step = 10 ** Math.max(Math.floor(Math.log10(x)) - 1, 0);
  return Math.round(x / step) * step;
}

/** A floor and ceiling for the flexible rules, around a spending. */
export const bandAround = (spending) => ({
  floor: roundish(spending * 0.8),
  ceiling: roundish(spending * 1.25),
});

/**
 * Whether a rule's floor and ceiling are the band around this spending: nobody set them by hand,
 * so they move with the spending (for guardrails and Vanguard, which need the spending between).
 */
export function bandFollows(rule, spending) {
  const b = bandAround(spending);
  return same(rule.floor, b.floor) && same(rule.ceiling, b.ceiling);
}
