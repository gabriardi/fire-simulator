// What several test files share. Not a test file itself: `node --test "tests/*.test.js"` skips it.
import { real } from "../site/js/engine.js";
import { blankPlan } from "../site/js/plan.js";

/**
 * A small household without randomness unless a test adds it: two people, one retirement account
 * each, a state pension each. It stops in 2040, spends 50,000, and a flexible rule keeps it between
 * 40,000 and 65,000.
 */
export function household(over = {}) {
  const p = blankPlan({ currency: "EUR", today: new Date(2026, 0, 15) });
  const base = {
    ...p,
    people: [
      { id: "a", name: "Ana", birth_year: 1986 },
      { id: "b", name: "Ben", birth_year: 1984 },
    ],
    end_person: "a",
    end_age: 95,
    fire_year: 2040,
    portfolio: 300_000,
    cash: 20_000,
    contrib: 30_000,
    spending: 50_000,
    accounts: [
      {
        id: "x",
        name: "Pension A",
        owner: "a",
        balance: 80_000,
        contrib: 6_000,
        growth: "portfolio",
        interest: 0,
        unlock_age: 60,
        tax: 0.1,
      },
      {
        id: "y",
        name: "Pension B",
        owner: "b",
        balance: 120_000,
        contrib: 8_000,
        growth: "fixed",
        interest: 0.02,
        unlock_age: 62,
        tax: 0.1,
      },
    ],
    income: [
      {
        id: "s1",
        name: "State pension A",
        amount: 15_000,
        from: { kind: "age", person: "a", value: 67 },
        to: null,
        indexed: true,
      },
      {
        id: "s2",
        name: "State pension B",
        amount: 12_000,
        from: { kind: "age", person: "b", value: 67 },
        to: null,
        indexed: true,
      },
    ],
    stock_vol: 0,
    bond_vol: 0,
    n_sims: 1,
    ...over,
  };
  base.rule = { ...p.rule, floor: 40_000, ceiling: 65_000, ...(over.rule || {}) };
  return base;
}

/**
 * A plan that is nothing but a portfolio, spent from the start year on, without volatility: the
 * most it can spend every year until the end is an annuity due, W (1 - 1/g) / (1 - g^-N), with W
 * the portfolio, g the yearly real growth and N the number of years.
 */
export function annuityPlan() {
  const plan = household({
    portfolio: 1_000_000,
    cash: 0,
    contrib: 0,
    accounts: [],
    income: [],
    fire_year: 2026,
    start_month: 1,
  });
  const g = 1 + real(plan.stock_return, plan.inflation);
  const years = 2081 - 2026 + 1; // until Ana (born 1986) turns 95
  return { plan, years, most: (plan.portfolio * (1 - 1 / g)) / (1 - g ** -years) };
}
