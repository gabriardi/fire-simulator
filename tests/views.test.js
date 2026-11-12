// What the charts show, worked out from the model: the statistics, the searches, and the views
// agreeing with direct runs of the engine on the same futures.
import assert from "node:assert/strict";
import { test } from "node:test";
import { lasts, simulate, successRate } from "../site/js/engine.js";
import {
  gridView,
  mainView,
  percentile,
  spendingLastingIn,
  stressView,
  sustainable,
} from "../site/js/views.js";
import { annuityPlan, household } from "./helpers.js";

const sum = (a) => a.reduce((s, x) => s + x, 0);

test("percentile matches numpy's default (linear) method", () => {
  const a = Float64Array.from([1, 2, 3, 4]);
  assert.equal(percentile(a, 0), 1);
  assert.equal(percentile(a, 25), 1.75);
  assert.equal(percentile(a, 50), 2.5);
  assert.equal(percentile(a, 100), 4);
  assert.equal(percentile(Float64Array.from([10, 20]), 90), 19);
  assert.equal(percentile(Float64Array.from([7]), 10), 7);
  assert.ok(Number.isNaN(percentile(new Float64Array(0), 50)));
});

test("the spending that lasts in 90% of futures is one that nine futures in ten can pay", () => {
  const caps = Float64Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(spendingLastingIn(caps, 0.9, 0), 2);
  assert.equal(spendingLastingIn(caps, 0.95, 0), 1);
  // A future that can't pay even the lowest spending searched (NaN) counts against every level.
  const some = Float64Array.from([NaN, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  assert.equal(spendingLastingIn(some, 0.9, 0), 5);
  assert.equal(spendingLastingIn(some, 0.95, 0), null);
  assert.equal(spendingLastingIn(caps, 0.9, 3), null); // below the lowest spending searched
});

test("each future's highest lasting spending is found by bisection, to the search's resolution", () => {
  // No volatility: every future is the same one, with the same highest spending.
  const plan = household({ n_sims: 3 });
  const lo = 10_000;
  const hi = 200_000;
  const { caps, atFire } = sustainable(plan, 2040, 3, lo, hi);
  assert.equal(new Set(caps).size, 1);
  const resolution = (hi - lo) / 2 ** 13; // 13 halvings
  assert.equal(lasts(plan, { n: 1, spending: caps[0] }), 1);
  assert.equal(lasts(plan, { n: 1, spending: caps[0] + resolution }), 0);
  assert.ok(atFire[0] > 0);
  // Not even the lowest spending lasts: NaN.
  assert.ok(Number.isNaN(sustainable(plan, 2040, 1, 5_000_000, 6_000_000).caps[0]));
});

test("the main view counts every future that runs out, also those that run out before the FIRE start", () => {
  // A cost in 2030, ten years before the FIRE start, that some futures can't pay.
  const plan = household({
    stock_vol: 0.17,
    n_sims: 2000,
    seed: 1,
    events: [{ id: "e", name: "House", year: 2030, amount: -420_000 }],
  });
  const v = mainView(plan, 10);
  const res = simulate(plan);
  const failures = Array.from(res.fail).filter((f) => !Number.isNaN(f));
  assert.ok(
    failures.some((f) => f === 2030) && failures.some((f) => f >= 2040),
    "the plan should fail both before and after the FIRE start",
  );
  assert.equal(v.summary.success, successRate(res));
  assert.equal(sum(v.fail_hist.counts), failures.length);
  assert.equal(v.fail_hist.years[0], 2030);
  assert.equal(v.fail_hist.years.at(-1), res.years.at(-1));
  assert.equal(v.fail_hist.counts[0], failures.filter((f) => f === 2030).length);
  // The wealth at the FIRE start: every future in one of the bars.
  assert.equal(sum(v.start_hist.counts), plan.n_sims);
  assert.equal(v.start_hist.edges.length, v.start_hist.counts.length + 1);
});

test("the grid agrees with a direct run on the same futures, and leaves out the cells outside the rule's band", () => {
  const plan = household({ stock_vol: 0.17, n_sims: 1000, seed: 5, rule: { kind: "guardrails" } });
  const g = gridView(plan);
  const i = g.fire_years.indexOf(2040);
  const j = g.values.indexOf(50_000);
  assert.ok(i >= 0 && j >= 0);
  assert.equal(g.success[i][j], lasts(plan, { n: 1000 }));
  // Guardrails between 40,000 and 65,000: the spending levels outside have no rate.
  g.values.forEach((v, k) =>
    assert.equal(g.success[i][k] == null, v < 40_000 || v > 65_000, `spending ${v}`),
  );
});

test("the stress test without a forced crash is the plain result, and a crash at the start only hurts", () => {
  const plan = household({ stock_vol: 0.17, n_sims: 1000, seed: 5, spending: 70_000 });
  const [none, crash] = stressView(plan);
  assert.equal(none.rates.fixed, lasts(plan, { n: 1000, kind: "fixed", stress_returns: [] }));
  assert.ok(crash.rates.fixed < none.rates.fixed);
  // 70,000 is above the flexible rules' ceiling of 65,000; the spend-down sets its own spending.
  assert.equal(none.rates.guardrails, null);
  assert.equal(none.rates.vanguard, null);
  assert.equal(typeof none.rates.spenddown, "number");
});

test("the safe-spending search finds an annuity's payment", () => {
  const { plan, most } = annuityPlan();
  const [lo, hi] = [most / 2, most * 2];
  const { caps } = sustainable(plan, 2026, 1, lo, hi);
  assert.ok(caps[0] <= most && most - caps[0] <= (hi - lo) / 2 ** 13, `${caps[0]} vs ${most}`);
});
