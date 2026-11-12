import assert from "node:assert/strict";
import { test } from "node:test";
import {
  RULE_KINDS,
  RULE_NAMES,
  RULE_SHORT,
  incomeByYear,
  lasts,
  marketDraws,
  mixStats,
  real,
  simulate,
  stockShares,
  successRate,
  yearOf,
} from "../site/js/engine.js";
import { annuityPlan, household } from "./helpers.js";

const row = (res, arr, year) => res[arr][res.years.indexOf(year)];

test("no spending, no failure, and wealth only grows after the FIRE start", () => {
  const res = simulate(household({ spending: 0, income: [] }), { record: true });
  assert.equal(successRate(res), 1);
  const i0 = res.years.indexOf(2040);
  for (let t = i0 + 1; t < res.years.length; t++)
    assert.ok(res.total[t] >= res.total[t - 1] - 1e-6);
});

test("spending more than the money fails in the first FIRE year, and leaves nothing after", () => {
  const res = simulate(household({ spending: 10_000_000 }), { record: true });
  assert.equal(res.fail[0], 2040);
  const i0 = res.years.indexOf(2040);
  for (let t = i0 + 1; t < res.years.length; t++) assert.equal(res.total[t], 0);
});

test("an account counts net of tax while locked, and becomes reachable when its owner unlocks it", () => {
  const res = simulate(household(), { record: true });
  // Ana (born 1986) unlocks in 2046, Ben (1984) in 2046 too: 60 + 1986 = 2046, 62 + 1984 = 2046.
  assert.ok(row(res, "total", 2045) > row(res, "accessible", 2045));
  assert.equal(row(res, "total", 2046), row(res, "accessible", 2046));
});

test("income lines: by age, by year, after the FIRE start, and not before it", () => {
  const plan = household({
    income: [
      {
        id: "1",
        name: "Pension",
        amount: 10_000,
        from: { kind: "age", person: "a", value: 67 },
        to: null,
        indexed: true,
      },
      {
        id: "2",
        name: "Part-time",
        amount: 20_000,
        from: { kind: "fire", value: 0 },
        to: { kind: "fire", value: 3 },
        indexed: true,
      },
      {
        id: "3",
        name: "Rent",
        amount: -6_000,
        from: { kind: "year", value: 2030 },
        to: { kind: "year", value: 2045 },
        indexed: true,
      },
    ],
  });
  assert.equal(yearOf(plan, plan.income[0].from), 2053);
  const years = Array.from({ length: 50 }, (_, k) => 2026 + k);
  const inc = incomeByYear(plan, years);
  const at = (y) => inc[y - 2026];
  assert.equal(at(2039), 0); // before the FIRE start nothing counts, not even the rent
  assert.equal(at(2040), 14_000); // part-time 20k, rent -6k
  assert.equal(at(2042), 14_000);
  assert.equal(at(2043), -6_000); // part-time stopped after 3 years
  assert.equal(at(2045), 0); // the rent stopped
  assert.equal(at(2053), 10_000);
  // The part-time line moves with the FIRE start.
  assert.equal(incomeByYear(plan, years, 2045)[2045 - 2026], 20_000 + 0 + 0);
});

test("an income line that isn't indexed loses value to inflation", () => {
  const plan = household({
    income: [
      {
        id: "1",
        name: "Annuity",
        amount: 10_000,
        from: { kind: "year", value: 2040 },
        to: null,
        indexed: false,
      },
    ],
  });
  const years = Array.from({ length: 30 }, (_, k) => 2026 + k);
  const inc = incomeByYear(plan, years);
  assert.ok(Math.abs(inc[2040 - 2026] - 10_000 / 1.02 ** 14) < 1e-9);
});

test("income reduces what the portfolio pays: a pension covering all spending never fails", () => {
  const plan = household({
    portfolio: 0,
    cash: 0,
    contrib: 0,
    accounts: [],
    income: [
      {
        id: "1",
        name: "Pension",
        amount: 60_000,
        from: { kind: "fire", value: 0 },
        to: null,
        indexed: true,
      },
    ],
  });
  const res = simulate(plan, { record: true });
  assert.equal(successRate(res), 1);
  // The surplus is reinvested.
  assert.ok(row(res, "total", 2050) > 0);
});

test("a one-off event before the FIRE start adds to the portfolio in its year", () => {
  const without = simulate(household(), { record: true });
  const withIt = simulate(
    household({ events: [{ id: "e", name: "Inheritance", year: 2030, amount: 100_000 }] }),
    {
      record: true,
    },
  );
  assert.equal(row(withIt, "total", 2030), row(without, "total", 2030)); // the start of the year
  const g = 1 + real(0.06, 0.02);
  assert.ok(
    Math.abs(row(withIt, "total", 2031) - row(without, "total", 2031) - 100_000 * g) < 1e-6,
  );
});

test("a one-off cost larger than the money is a failure in its year, even before the FIRE start", () => {
  const res = simulate(
    household({ events: [{ id: "e", name: "House", year: 2030, amount: -5_000_000 }] }),
  );
  assert.equal(res.fail[0], 2030);
});

test("the tax on portfolio withdrawals grosses up what the portfolio pays, not cash", () => {
  const plan = household({
    cash: 0,
    accounts: [],
    income: [],
    contrib: 0,
    fire_year: 2026,
    start_month: 1,
  });
  const none = simulate(plan, { record: true });
  const taxed = simulate({ ...plan, portfolio_tax: 0.2 }, { record: true });
  const g = 1 + real(0.06, 0.02);
  // Year one: 300k - 50k (untaxed) vs 300k - 62.5k (taxed), then one year of growth.
  assert.ok(Math.abs(none.total[1] - (300_000 - 50_000) * g) < 1e-6);
  assert.ok(Math.abs(taxed.total[1] - (300_000 - 62_500) * g) < 1e-6);
});

test("savings grow by the savings growth each year until the FIRE start", () => {
  const plan = household({
    accounts: [],
    contrib_growth: 0.03,
    stock_return: 0.02,
    inflation: 0.02,
    cash_interest: 0.02,
    start_month: 1,
  });
  const res = simulate(plan, { record: true });
  // Zero real return: wealth is the sum of the contributions.
  let want = 320_000;
  for (let t = 0; t < 14; t++) want += 30_000 * 1.03 ** t;
  assert.ok(Math.abs(row(res, "total", 2040) - want) < 1e-6);
});

test("the flexible rules stay within their floor and ceiling", () => {
  for (const kind of ["guardrails", "vanguard", "spenddown"]) {
    const res = simulate(household({ stock_vol: 0.17, n_sims: 2000, rule: { kind } }), {
      record: true,
    });
    const Y = res.years.length;
    for (let i = 0; i < res.n; i++) {
      if (!Number.isNaN(res.fail[i])) continue;
      for (let t = res.i0; t < Y; t++) {
        const s = res.spending[i * Y + t];
        assert.ok(s >= 40_000 - 1e-6 && s <= 65_000 + 1e-6, `${kind}: ${s}`);
      }
    }
  }
});

test("the spend-down with returns as assumed spends evenly, down to nothing at the end", () => {
  const plan = household({
    cash: 0,
    rule: { kind: "spenddown", floor: 0, ceiling: 1e9, assumed_return: real(0.06, 0.02) },
  });
  const res = simulate(plan, { record: true });
  const Y = res.years.length;
  const sp = Array.from(res.spending.subarray(res.i0, Y));
  for (const s of sp) assert.ok(Math.abs(s / sp[0] - 1) < 1e-9);
  const last = Y - 1;
  const incomeLast = 15_000 + 12_000;
  assert.ok(Math.abs(sp.at(-1) - (res.accessible[last] + incomeLast)) < 1e-6);
  assert.equal(successRate(res), 1);
});

test("the spend-down never runs out when it may cut freely", () => {
  const plan = household({
    stock_vol: 0.25,
    n_sims: 2000,
    rule: { kind: "spenddown", floor: 0, max_cut: 1 },
  });
  assert.equal(lasts(plan), 1);
});

test("the spend-down moves by at most its yearly limits", () => {
  const res = simulate(
    household({
      stock_vol: 0.17,
      n_sims: 2000,
      rule: { kind: "spenddown", max_raise: 0.05, max_cut: 0.1, floor: 0, ceiling: 1e9 },
    }),
    { record: true },
  );
  const Y = res.years.length;
  for (let i = 0; i < res.n; i++) {
    if (!Number.isNaN(res.fail[i])) continue;
    for (let t = res.i0 + 1; t < Y; t++) {
      const ch = res.spending[i * Y + t] / res.spending[i * Y + t - 1] - 1;
      assert.ok(ch >= -0.1 - 1e-12 && ch <= 0.05 + 1e-12);
    }
  }
});

test("flexible spending lasts at least as often as fixed", () => {
  const plan = household({ stock_vol: 0.17, n_sims: 4000 });
  assert.ok(lasts(plan, { kind: "guardrails" }) >= lasts(plan, { kind: "fixed" }));
});

test("a forced crash hits the first FIRE years", () => {
  const res = simulate(household({ stress_returns: [-1] }));
  assert.equal(res.fail[0], 2041); // stocks wiped out in 2040: 2041's spending can't be paid
});

test("balances from October count only the rest of the start year", () => {
  const jan = simulate(household({ start_month: 1 }), { record: true });
  const oct = simulate(household({ start_month: 10 }), { record: true });
  // Three quarters of a year less saving (44k a year) and growth, compounded until 2040.
  const d = row(jan, "total", 2040) - row(oct, "total", 2040);
  assert.ok(d > 45_000 && d < 90_000, String(d));
});

test("volatility is the standard deviation and the median the compound return", () => {
  const plan = household({ stock_vol: 0.17, seed: 3 });
  const d = marketDraws(plan, 100_000, 2);
  const g = Float64Array.from(d.stock, (x) => x - 1).sort();
  const mean = g.reduce((a, b) => a + b) / g.length;
  const sd = Math.sqrt(g.reduce((a, b) => a + (b - mean) ** 2, 0) / g.length);
  assert.ok(Math.abs(sd - 0.17) < 0.002, String(sd));
  assert.ok(Math.abs(g[g.length / 2] - real(0.06, 0.02)) < 0.002);
});

test("fat tails are capped", () => {
  const d = marketDraws(household({ stock_vol: 0.17, fat_tails_df: 4 }), 50_000, 4);
  let lo = Infinity;
  let hi = -Infinity;
  for (const x of d.stock) {
    lo = Math.min(lo, x);
    hi = Math.max(hi, x);
  }
  assert.ok(lo >= 0.4 && hi <= 1.6);
});

test("the same seed gives the same futures, and a bigger run starts with a smaller run's", () => {
  const plan = household({ stock_vol: 0.17 });
  const small = Float64Array.from(marketDraws({ ...plan, stock_return: 0.061 }, 100, 10).stock);
  const big = marketDraws({ ...plan, stock_return: 0.061 }, 300, 10).stock;
  assert.deepEqual(Array.from(big.subarray(0, 1000)), Array.from(small));
  const other = marketDraws({ ...plan, seed: 43, stock_return: 0.061 }, 100, 10).stock;
  assert.notDeepEqual(Array.from(other), Array.from(small));
});

test("bond tent shares step down and back", () => {
  const plan = household({
    start_year: 2026,
    fire_year: 2036,
    stock_share: 1,
    tent_share: 0.7,
    tent_years_before: 4,
    tent_years_after: 8,
  });
  const w = stockShares(plan, 40);
  const at = (y) => w[y - 2026];
  assert.equal(at(2032), 1);
  assert.ok(Math.abs(at(2033) - 0.925) < 1e-12 && Math.abs(at(2035) - 0.775) < 1e-12);
  assert.equal(at(2036), 0.7);
  assert.ok(Math.abs(at(2040) - 0.85) < 1e-12);
  assert.equal(at(2044), 1);
});

test("the mix's mean and volatility are those of the model's own draws", () => {
  const plan = household({ stock_vol: 0.17, bond_vol: 0.06, stock_bond_corr: 0.3, seed: 9 });
  // All stocks, or all bonds: the median and the volatility that were set.
  for (const [w, nominal, vol] of [
    [1, plan.stock_return, 0.17],
    [0, plan.bond_return, 0.06],
  ]) {
    const m = mixStats(plan, w);
    assert.ok(Math.abs(m.compound - real(nominal, plan.inflation)) < 1e-12);
    assert.ok(Math.abs(m.vol - vol) < 1e-12);
  }
  // A 60/40 mix, against 200,000 drawn years.
  const d = marketDraws(plan, 100_000, 2);
  const g = Float64Array.from(d.stock, (s, k) => 0.6 * s + 0.4 * d.bond[k] - 1);
  const mean = g.reduce((a, b) => a + b) / g.length;
  const sd = Math.sqrt(g.reduce((a, b) => a + (b - mean) ** 2, 0) / g.length);
  const m = mixStats(plan, 0.6);
  assert.ok(Math.abs(mean - m.mean) < 0.001, `mean ${mean} vs ${m.mean}`);
  assert.ok(Math.abs(sd - m.vol) < 0.001, `volatility ${sd} vs ${m.vol}`);
  assert.ok(m.compound < m.mean); // compounding costs about half the variance
});

test("every spending rule has a name and a short name", () => {
  assert.deepEqual(Object.keys(RULE_NAMES), RULE_KINDS);
  assert.deepEqual(Object.keys(RULE_SHORT), RULE_KINDS);
});

// ---- results that can be worked out by hand, without this code or the model it was ported from ----

test("without volatility, the most a portfolio can spend each year is an annuity's payment", () => {
  const { plan, years, most } = annuityPlan();
  assert.equal(simulate(plan).years.length, years);
  assert.equal(lasts(plan, { spending: most * (1 - 1e-9) }), 1);
  assert.equal(lasts(plan, { spending: most * (1 + 1e-6) }), 0);
});

test("the odds of a bad first year are those of the log-normal distribution", () => {
  // Two years: spend s from W, then s again. The money runs out exactly when the first year's
  // growth g is below s / (W - s), whose probability the distribution gives.
  const plan = household({
    portfolio: 1_000_000,
    cash: 0,
    contrib: 0,
    accounts: [],
    income: [],
    fire_year: 2026,
    start_month: 1,
    end_age: 2027 - 1986,
    stock_vol: 0.17,
    seed: 11,
  });
  const W = plan.portfolio;
  const M = 1 + real(plan.stock_return, plan.inflation); // the median growth
  // A log-normal with median M and standard deviation sd has sigma^2 = ln u, u = (1 + sqrt(1 + 4 (sd/M)^2)) / 2.
  const sigma = Math.sqrt(Math.log((1 + Math.sqrt(1 + 4 * (plan.stock_vol / M) ** 2)) / 2));
  const spendingFor = (threshold) => (threshold * W) / (1 + threshold); // s / (W - s) = threshold
  const n = 200_000;
  // Below the median: half the futures. Below the median times e^-sigma: Phi(-1) = 15.87% of them.
  const half = lasts(plan, { n, spending: spendingFor(M) });
  const oneSigma = lasts(plan, { n, spending: spendingFor(M * Math.exp(-sigma)) });
  assert.ok(Math.abs(half - 0.5) < 0.005, `lasts in ${half}, not 50%`);
  assert.ok(Math.abs(oneSigma - 0.841345) < 0.004, `lasts in ${oneSigma}, not 84.13%`);
});
