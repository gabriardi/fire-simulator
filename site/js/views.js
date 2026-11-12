/**
 * What the page shows, worked out from the model (engine.js): the main result, and the three
 * heavier views (the grid of FIRE years x spending, safe spending by FIRE year, the stress test).
 * Each is a plain function of the plan, run in its own Web Worker.
 */
import {
  RULE_KINDS,
  RULE_NAMES,
  endYear,
  lasts,
  makeRng,
  personById,
  prepare,
  runPath,
  simulate,
  successRate,
  unlockYear,
  yearOf,
} from "./engine.js";

export const PERCENTILES = [5, 10, 25, 50, 75, 90, 95];

// Crashes forced into the first FIRE years (real returns), everything after them random: the bad
// start is what breaks a plan, not a crash 25 years in.
export const STRESS_SCENARIOS = [
  { label: "No forced crash", short: "No forced crash", returns: [] },
  { label: "2008-style: −40% in the first year", short: "2008: −40% first year", returns: [-0.4] },
  { label: "2000–2002-style: −15%, −20%, −25%", short: "2000–02: −15/−20/−25%", returns: [-0.15, -0.2, -0.25] },
  { label: "Lost decade: 10 years at 0% real", short: "Lost decade: 0% × 10 yrs", returns: Array(10).fill(0) },
];

/** numpy's default (linear) percentile of an ascending array. */
export function percentile(sorted, q) {
  const n = sorted.length;
  if (!n) return NaN;
  const pos = ((n - 1) * q) / 100;
  const lo = Math.floor(pos);
  const hi = Math.min(lo + 1, n - 1);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
const sorted = (a) => Float64Array.from(a).sort();
const median = (a) => percentile(sorted(a), 50);
const round = (v) => (Number.isFinite(v) ? Math.round(v) : null);

/** A flexible rule only makes sense when it starts between its floor and ceiling (the spend-down
 * sets its own starting spending). */
export function inBand(plan, kind, spending = plan.spending) {
  return kind === "fixed" || kind === "spenddown" || (plan.rule.floor <= spending && spending <= plan.rule.ceiling);
}

/** The FIRE years around the plan's, as far as they make sense. */
export function nearYears(plan) {
  const out = [];
  for (let y = plan.fire_year - 4; y <= plan.fire_year + 4; y++)
    if (y >= plan.start_year && y < endYear(plan)) out.push(y);
  return out;
}

/** A round step near `x`: 1, 2, 2.5 or 5 times a power of ten. */
export function niceStep(x) {
  if (!(x > 0)) return 1;
  const e = 10 ** Math.floor(Math.log10(x));
  let best = e;
  for (const m of [1, 2, 2.5, 5, 10])
    if (Math.abs(Math.log(m * e) - Math.log(x)) < Math.abs(Math.log(best) - Math.log(x))) best = m * e;
  return best;
}

/** `k` different future indices out of `n`, the same ones every time. */
function pick(n, k) {
  const r = makeRng(0, 0, 7);
  const idx = Int32Array.from({ length: n }, (_, i) => i);
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(r.uniform() * (n - i));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return Array.from(idx.subarray(0, k));
}

/** numpy.histogram(values, bins): counts and edges of equal-width bins over the range. */
function histogram(values, bins) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (lo === hi) {
    lo -= 0.5;
    hi += 0.5;
  }
  const counts = new Array(bins).fill(0);
  const width = (hi - lo) / bins;
  for (const v of values) counts[Math.min(Math.floor((v - lo) / width), bins - 1)]++;
  const edges = Array.from({ length: bins + 1 }, (_, k) => lo + k * width);
  return { counts, edges };
}

/** The years worth marking on the charts: the FIRE start, accounts unlocking, income starting or
 * stopping, one-off events. Labels are made by the page (they need its number format). */
export function milestones(plan) {
  const y1 = endYear(plan);
  const marks = new Map([[plan.fire_year, [{ type: "fire" }]]]);
  const add = (year, item) => {
    if (year == null || year < plan.start_year || year > y1) return;
    if (!marks.has(year)) marks.set(year, []);
    marks.get(year).push(item);
  };
  for (const a of plan.accounts) {
    if (a.balance > 0 || a.contrib > 0)
      add(unlockYear(plan, a), { type: "unlock", name: a.name, owner: personById(plan, a.owner).name });
  }
  for (const s of plan.income) {
    const from = yearOf(plan, s.from);
    if (from > plan.fire_year) add(from, { type: "income", name: s.name, amount: s.amount });
    const to = yearOf(plan, s.to);
    if (to != null && to > Math.max(from, plan.fire_year))
      add(to, { type: "income-end", name: s.name, amount: s.amount });
  }
  for (const e of plan.events) if (e.amount) add(e.year, { type: "event", name: e.name, amount: e.amount });
  return [...marks].sort((a, b) => a[0] - b[0]).map(([year, items]) => ({ year, items }));
}

/** The last year a retirement account with money in it unlocks, if after the FIRE start: until
 * then the reachable money alone has to carry the plan (the "bridge"). */
export function bridgeEnd(plan) {
  let last = null;
  for (const a of plan.accounts) {
    if (a.balance > 0 || a.contrib > 0) last = Math.max(last ?? -Infinity, unlockYear(plan, a));
  }
  return last != null && last > plan.fire_year ? last : null;
}

// ---- the main result -----------------------------------------------------------------------------

export function mainView(plan, nPaths = 120) {
  const kind = plan.rule.kind;
  const res = simulate(plan, { record: true });
  const { years, n, i0 } = res;
  const Y = years.length;

  const col = new Float64Array(n);
  const percentiles = Object.fromEntries(PERCENTILES.map((q) => [q, []]));
  for (let t = 0; t < Y; t++) {
    for (let i = 0; i < n; i++) col[i] = res.total[i * Y + t];
    col.sort();
    for (const q of PERCENTILES) percentiles[q].push(round(percentile(col, q)));
  }

  const chosen = pick(n, Math.min(nPaths, n));
  const end = (i) => res.total[i * Y + Y - 1];
  const order = [...chosen].sort((a, b) => end(a) - end(b));
  const rankOf = new Map(order.map((i, r) => [i, r / Math.max(order.length - 1, 1)]));
  const failed = (i) => !Number.isNaN(res.fail[i]);
  const row = (arr, i) => Array.from(arr.subarray(i * Y, (i + 1) * Y), round);
  const paths = chosen.map((i) => ({ values: row(res.total, i), failed: failed(i), rank: rankOf.get(i) }));

  const failYears = Array.from(res.fail).filter((f) => !Number.isNaN(f));
  const lastYear = years[Y - 1];
  // From the FIRE start, or from earlier if a one-off cost broke some futures before it.
  let firstFail = plan.fire_year;
  for (const f of failYears) if (f < firstFail) firstFail = f;
  const failCounts = new Array(lastYear - firstFail + 1).fill(0);
  for (const f of failYears) failCounts[f - firstFail]++;
  const ends = sorted(Array.from({ length: n }, (_, i) => end(i)));
  const atFire = sorted(res.atFire);
  const firstSpending = Array.from({ length: n }, (_, i) => res.spending[i * Y + i0]);
  const bridge = bridgeEnd(plan);

  const out = {
    years,
    fire_index: i0,
    people: plan.people.map((x) => ({ name: x.name, birth_year: x.birth_year })),
    milestones: milestones(plan),
    rule: RULE_NAMES[kind],
    n_sims: n,
    percentiles,
    paths,
    start_hist: histogram(res.atFire, 40),
    fail_hist: { years: failCounts.map((_, k) => firstFail + k), counts: failCounts },
    summary: {
      success: successRate(res),
      start_median: percentile(atFire, 50),
      start_p10: percentile(atFire, 10),
      // The first year's spending is the plan's except for the spend-down.
      withdrawal_rate: median(firstSpending) / percentile(atFire, 50),
      first_year: null,
      end_median: percentile(ends, 50),
      end_p10: percentile(ends, 10),
      fail_median_year: failYears.length ? median(failYears) : null,
      fail_in_bridge: bridge == null ? null : failYears.filter((f) => f < bridge).length / n,
      bridge_end: bridge,
    },
  };
  if (res.startAmount) {
    const s = sorted(res.startAmount);
    out.summary.first_year = { p10: percentile(s, 10), p50: percentile(s, 50), p90: percentile(s, 90) };
  }

  if (kind !== "fixed") {
    const lasting = [];
    for (let i = 0; i < n; i++) if (!failed(i)) lasting.push(i);
    const L = Y - i0;
    const sp = { 10: [], 50: [], 90: [] };
    const c2 = new Float64Array(Math.max(lasting.length, 1));
    for (let t = i0; t < Y; t++) {
      lasting.forEach((i, k) => {
        c2[k] = res.spending[i * Y + t];
      });
      c2.sort();
      for (const q of [10, 50, 90]) sp[q].push(round(percentile(c2, q)));
    }
    out.spending = {
      years: years.slice(i0),
      percentiles: sp,
      paths: chosen.slice(0, 60).map((i) => ({
        values: Array.from(res.spending.subarray(i * Y + i0, i * Y + i0 + L), (v) => (v > 0 ? Math.round(v) : null)),
        failed: failed(i),
      })),
      floor: plan.rule.floor,
      ceiling: plan.rule.ceiling,
    };
    const means = sorted(lasting.map((i) => res.spendMean[i]));
    const mins = sorted(lasting.map((i) => res.spendMin[i]));
    Object.assign(out.summary, {
      avg_spending_median: lasting.length ? percentile(means, 50) : 0,
      lowest_p10: lasting.length ? percentile(mins, 10) : 0,
      floor_share: lasting.length ? mins.filter((m) => m <= plan.rule.floor + 1).length / lasting.length : 0,
    });
  }

  // Same plan, every rule. The selected one reuses the main result, so its chip always matches
  // the big number.
  const nCmp = Math.min(n, 20_000);
  out.compare = RULE_KINDS.map((k) => {
    if (!inBand(plan, k)) return { kind: k, name: RULE_NAMES[k], success: null };
    const r = k === kind ? res : simulate(plan, { n: nCmp, kind: k });
    const row2 = { kind: k, name: RULE_NAMES[k], success: successRate(r) };
    if (k !== "fixed") {
      const m = [];
      for (let i = 0; i < r.n; i++) if (Number.isNaN(r.fail[i])) m.push(r.spendMean[i]);
      row2.avg_spending = m.length ? median(m) : null;
    }
    return row2;
  });
  return out;
}

// ---- the heavier views ---------------------------------------------------------------------------

/** How often the money lasts, by FIRE year and spending. The spend-down sets its own spending, so
 * for it the columns are its floor instead. */
export function gridView(plan) {
  const n = Math.min(plan.n_sims, 4_000);
  const kind = plan.rule.kind;
  const byFloor = kind === "spenddown";
  const base = byFloor ? plan.rule.floor : plan.spending;
  const step = niceStep(base * 0.08);
  const centre = Math.round(base / step) * step;
  const values = [];
  for (let k = -5; k <= 5; k++) if (centre + k * step > 0) values.push(centre + k * step);
  const fireYears = nearYears(plan);
  const success = fireYears.map((fy) =>
    values.map((v) => {
      if (byFloor) return v > plan.rule.ceiling ? null : lasts(plan, { n, fire_year: fy, rule: { floor: v } });
      if (!inBand(plan, kind, v)) return null;
      return lasts(plan, { n, fire_year: fy, spending: v });
    }),
  );
  return { fire_years: fireYears, axis: byFloor ? "floor" : "spending", values, step, success };
}

/** The highest starting spending that lasts in 90% and 95% of futures, by FIRE year; for the
 * spend-down instead, what it allows in the first year. */
export function safeView(plan) {
  const n = Math.min(plan.n_sims, 4_000);
  const kind = plan.rule.kind;
  if (kind === "spenddown") {
    return nearYears(plan).map((fy) => {
      const r = simulate(plan, { n, fire_year: fy });
      const s = sorted(r.startAmount);
      return {
        fire_year: fy,
        median_start: median(r.atFire),
        p10: percentile(s, 10),
        p50: percentile(s, 50),
        p90: percentile(s, 90),
      };
    });
  }
  const flexible = kind !== "fixed";
  const lo = flexible ? plan.rule.floor : 0.15 * plan.spending;
  const hi = flexible ? plan.rule.ceiling : 3 * plan.spending;
  return nearYears(plan).map((fy) => {
    const { caps, atFire } = sustainable(plan, fy, n, lo, hi);
    const row = { fire_year: fy, median_start: median(atFire) };
    for (const target of [0.9, 0.95]) row[String(Math.round(target * 100))] = spendingLastingIn(caps, target, lo);
    return row;
  });
}

/** Each future's highest starting spending that still lasts (NaN: not even `lo`), by bisection. */
export function sustainable(plan, fireYear, n, lo, hi, steps = 13) {
  const c = prepare(plan, n, { fire_year: fireYear });
  const out = {
    fail: new Float64Array(n),
    atFire: new Float64Array(n),
    spendMean: new Float64Array(n),
    spendMin: new Float64Array(n),
    startAmount: null,
    total: null,
  };
  const caps = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    if (!Number.isNaN(runPath(c, i, lo, out))) {
      caps[i] = NaN;
      continue;
    }
    let low = lo;
    let high = hi;
    for (let s = 0; s < steps; s++) {
      const mid = (low + high) / 2;
      if (Number.isNaN(runPath(c, i, mid))) low = mid;
      else high = mid;
    }
    caps[i] = low;
  }
  return { caps, atFire: out.atFire };
}

/** The highest spending at least `target` of the futures can sustain; null if below `lo`. */
export function spendingLastingIn(caps, target, lo) {
  const a = Float64Array.from(caps, (v) => (Number.isNaN(v) ? -Infinity : v)).sort();
  const v = a[Math.floor(a.length * (1 - target) + 1e-9)]; // 1e-9: 100 * (1 - 0.9) is 9.999...
  return !Number.isFinite(v) || v < lo ? null : v;
}

/** How often the money lasts with a crash forced into the first FIRE years, for every rule. */
export function stressView(plan) {
  const n = Math.min(plan.n_sims, 20_000);
  return STRESS_SCENARIOS.map((s) => ({
    label: s.label,
    short: s.short,
    rates: Object.fromEntries(
      RULE_KINDS.map((k) => [k, inBand(plan, k) ? lasts(plan, { n, kind: k, stress_returns: s.returns }) : null]),
    ),
  }));
}
