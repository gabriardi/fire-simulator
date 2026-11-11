// The engine against the model it was ported from: a numpy simulation (not part of this repo)
// whose results for a few fictional plans are kept in fixtures/python-model.json. That model knew
// one country's pension system; here it is the special case of two retirement accounts per person
// (one invested like the portfolio, one at a fixed interest) and income lines for the state pension.
//
// Without volatility both models are deterministic and must agree to the last cent, year by year.
// With volatility the random numbers differ, so the results must agree within sampling noise.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { simulate, successRate } from "../js/engine.js";

const golden = JSON.parse(readFileSync(new URL("./fixtures/python-model.json", import.meta.url)));

function fromPython(p, kind = "fixed", assumedReturn = 0.02) {
  const people = p.people.map((x, k) => ({ id: `p${k}`, name: x.name, birth_year: x.birth_year }));
  const accounts = p.people.flatMap((x, k) => [
    { id: `a${k}`, name: "Invested", owner: `p${k}`, balance: x.pillar3a, contrib: x.contrib_3a, growth: "portfolio", interest: 0, unlock_age: p.unlock_age, tax: p.withdrawal_tax },
    { id: `b${k}`, name: "Fixed", owner: `p${k}`, balance: x.pillar2, contrib: x.contrib_pillar2, growth: "fixed", interest: p.pillar2_interest, unlock_age: p.unlock_age, tax: p.withdrawal_tax },
  ]);
  // Each pension row replaced the one before: here, lines that stop where the next one starts.
  const rows = [...p.ahv].sort((a, b) => a[0] - b[0]);
  const income = rows.map(([from, amount], k) => ({
    id: `i${k}`, name: "Pension", amount, indexed: true,
    from: { kind: "year", value: from },
    to: k + 1 < rows.length ? { kind: "year", value: rows[k + 1][0] } : null,
  }));
  const flexible = kind === "spenddown" ? [60_000, 150_000] : [golden.floor, golden.ceiling];
  return {
    start_year: p.start_year, start_month: p.start_month, fire_year: p.fire_year,
    people, end_person: people.find((x) => x.name === p.end_person).id, end_age: p.end_age,
    portfolio: p.securities, cash: p.cash, contrib: p.contrib_securities, contrib_growth: 0,
    cash_interest: p.cash_interest, cash_buffer_years: p.cash_buffer_years, portfolio_tax: 0,
    accounts, income, events: [], spending: p.spending,
    inflation: p.inflation, stock_return: p.stock_return, stock_vol: p.stock_vol, fat_tails_df: p.fat_tails_df,
    stress_returns: p.stress_returns, stock_share: p.stock_share, tent_share: p.tent_share,
    tent_years_before: p.tent_years_before, tent_years_after: p.tent_years_after,
    bond_return: p.bond_return, bond_vol: p.bond_vol, stock_bond_corr: p.stock_bond_corr,
    rule: {
      kind, floor: flexible[0], ceiling: flexible[1], band: 0.2, adjust: 0.1, up: 0.05, down: 0.025,
      assumed_return: assumedReturn, max_raise: 0.05, max_cut: 0.1,
    },
    n_sims: p.n_sims, seed: p.seed,
  };
}

const close = (a, b, rel = 1e-9) => Math.abs(a - b) <= rel * Math.max(1, Math.abs(a), Math.abs(b));

for (const g of golden.deterministic) {
  test(`deterministic: ${g.label}`, () => {
    const res = simulate(fromPython(g.params, g.kind, g.assumed_return), { n: 1, record: true });
    assert.equal(res.years.length, g.total.length);
    const fail = Number.isNaN(res.fail[0]) ? null : res.fail[0];
    assert.equal(fail, g.fail_year);
    for (let t = 0; t < g.total.length; t++) {
      const y = res.years[t];
      assert.ok(close(res.total[t], g.total[t]), `total ${y}: ${res.total[t]} vs ${g.total[t]}`);
      assert.ok(close(res.accessible[t], g.accessible[t]), `accessible ${y}: ${res.accessible[t]} vs ${g.accessible[t]}`);
      assert.ok(close(res.spending[t], g.spending[t]), `spending ${y}: ${res.spending[t]} vs ${g.spending[t]}`);
    }
  });
}

const sortedMedian = (a, q = 50) => {
  const s = Float64Array.from(a).sort();
  const pos = ((s.length - 1) * q) / 100;
  const lo = Math.floor(pos);
  return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (pos - lo);
};

for (const g of golden.monte_carlo) {
  test(`Monte Carlo agrees within sampling noise: ${g.label}`, () => {
    for (const [kind, want] of Object.entries(g.rules)) {
      const res = simulate(fromPython(g.params, kind), { n: 20_000, record: true });
      const got = successRate(res);
      // 20,000 futures on each side: the difference has a standard error of about 0.5 points.
      assert.ok(Math.abs(got - want.success) < 0.02, `${kind}: lasts in ${got} vs ${want.success}`);
      assert.ok(close(sortedMedian(res.atFire), want.start_median, 0.02), `${kind}: median at FIRE ${sortedMedian(res.atFire)} vs ${want.start_median}`);
      assert.ok(close(sortedMedian(res.atFire, 10), want.start_p10, 0.03), `${kind}: 10th pct at FIRE`);
      // Wealth decades later is spread very widely: its median moves 2.5–6% between seeds.
      const Y = res.years.length;
      const ends = Array.from({ length: res.n }, (_, i) => res.total[i * Y + Y - 1]);
      assert.ok(close(sortedMedian(ends), want.end_median, 0.15), `${kind}: median at the end ${sortedMedian(ends)} vs ${want.end_median}`);
    }
  });
}
