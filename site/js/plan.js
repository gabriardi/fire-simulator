/**
 * A plan: the household, its money, and the choices being tried. Plain JSON, kept in the browser,
 * exported to files and packed into share links. This module makes new ones, checks and cleans
 * any that come from outside (storage, a file, a link), and compares two of them.
 *
 * Amounts are in the plan's currency, in today's money. Rates are fractions (0.02 = 2%); returns
 * and interest are nominal, the model turns them into real ones with the inflation.
 */
import { bandAround, bandFollows, roundish, same } from "./band.js";
import { RULE_KINDS, endYear, personById } from "./engine.js";
import { t } from "./i18n.js";

export { bandAround, bandFollows, roundish, same };

export const SCHEMA = 1;

/**
 * MIGRATIONS[n] turns a schema-n plan into a schema-(n + 1) one, returning a new object. A field
 * that is renamed or reshaped gets a step here, and SCHEMA goes up by one: plans already in
 * storage, files and share links then keep their values, instead of `normalize` dropping the old
 * field and putting the default in place of the new one. A field that is only added needs no
 * step, just a default in `normalize`.
 */
const MIGRATIONS = {
  // 1: (r) => { const { old_name, ...rest } = r; return { ...rest, new_name: old_name }; },
};

/** A plan raised to the current schema, step by step; not cleaned yet. */
export function migrate(raw, { to = SCHEMA, steps = MIGRATIONS } = {}) {
  if (!raw || typeof raw !== "object") return raw;
  let r = raw;
  for (let v = Number.isInteger(r.schema) && r.schema >= 1 ? r.schema : 1; v < to; v++) {
    if (steps[v]) r = steps[v](r);
  }
  return r;
}

/** A plan made by a later version of the simulator: this one would drop what it doesn't know. */
export const fromNewer = (raw) => Number.isInteger(raw?.schema) && raw.schema > SCHEMA;

/** New plans and the example start in this currency; anyone can pick another. */
export const DEFAULT_CURRENCY = "CHF";
/**
 * The most a plan holds. The lists' caps are well above what a household writes in by hand; they
 * are there for plans from a file or a link, which could hold anything: `normalize` keeps that many
 * and drops the rest, so a link can't make the page build a form of a million cards, or simulate
 * them in every future. (A person is a line of ages on the charts: a household has a few.)
 */
export const LIMITS = { people: 4, accounts: 50, income: 50, events: 50, years: 120 };

export const RULE_DEFAULTS = {
  kind: "fixed",
  band: 0.2,
  adjust: 0.1,
  up: 0.05,
  down: 0.025,
  assumed_return: 0.02,
  max_raise: 0.05,
  max_cut: 0.1,
};

export function uid() {
  try {
    return crypto.randomUUID().slice(0, 8);
  } catch {
    return Math.random().toString(36).slice(2, 10);
  }
}

export function blankPlan({ currency = DEFAULT_CURRENCY, today = new Date() } = {}) {
  const y = today.getFullYear();
  return {
    schema: SCHEMA,
    currency,
    start_year: y,
    start_month: today.getMonth() + 1,
    people: [{ id: "p1", name: t("plan.me"), birth_year: y - 35 }],
    end_person: "p1",
    end_age: 95,
    fire_year: y + 15,
    spending: 40_000,
    portfolio: 100_000,
    cash: 10_000,
    contrib: 20_000,
    contrib_growth: 0,
    cash_interest: 0.01,
    cash_buffer_years: 0,
    portfolio_tax: 0,
    accounts: [],
    income: [],
    events: [],
    inflation: 0.02,
    stock_return: 0.06,
    stock_vol: 0.17,
    fat_tails_df: null,
    stress_returns: [],
    stock_share: 1,
    tent_share: 1,
    tent_years_before: 4,
    tent_years_after: 8,
    bond_return: 0.03,
    bond_vol: 0.05,
    stock_bond_corr: 0,
    rule: { ...RULE_DEFAULTS, ...bandAround(40_000) },
  };
}

/** A made-up household, to show what the simulator does before anyone types in their own. */
export function examplePlan({ currency = DEFAULT_CURRENCY, today = new Date() } = {}) {
  const y = today.getFullYear();
  const p = blankPlan({ currency, today });
  const alex = { id: "alex", name: t("example.alex"), birth_year: y - 38 };
  const sam = { id: "sam", name: t("example.sam"), birth_year: y - 36 };
  return {
    ...p,
    people: [alex, sam],
    end_person: "sam",
    fire_year: y + 13,
    spending: 64_000,
    portfolio: 310_000,
    cash: 30_000,
    contrib: 42_000,
    accounts: [
      {
        id: "ret-alex",
        name: t("plan.account"),
        owner: "alex",
        balance: 140_000,
        contrib: 12_000,
        growth: "portfolio",
        interest: 0.02,
        unlock_age: 60,
        tax: 0.15,
      },
      {
        id: "pen-sam",
        name: t("example.workplacePension"),
        owner: "sam",
        balance: 95_000,
        contrib: 9_000,
        growth: "fixed",
        interest: 0.03,
        unlock_age: 60,
        tax: 0.15,
      },
    ],
    income: [
      {
        id: "sp-alex",
        name: t("plan.statePensionOf", { name: alex.name }),
        amount: 21_000,
        from: { kind: "age", person: "alex", value: 67 },
        to: null,
        indexed: true,
        change: 0,
      },
      {
        id: "sp-sam",
        name: t("plan.statePensionOf", { name: sam.name }),
        amount: 17_000,
        from: { kind: "age", person: "sam", value: 67 },
        to: null,
        indexed: true,
        change: 0,
      },
    ],
    rule: { ...RULE_DEFAULTS, ...bandAround(64_000) },
  };
}

export function newPerson(plan) {
  const used = new Set(plan.people.map((x) => x.name));
  let k = plan.people.length + 1;
  while (used.has(t("plan.person", { n: k }))) k++;
  return {
    id: uid(),
    name: t("plan.person", { n: k }),
    birth_year: plan.people[0]?.birth_year ?? plan.start_year - 35,
  };
}
export const newAccount = (plan, owner = plan.people[0].id) => ({
  id: uid(),
  name: t("plan.account"),
  owner,
  balance: 0,
  contrib: 0,
  growth: "portfolio",
  interest: 0.02,
  unlock_age: 60,
  tax: 0.1,
});
export const newIncome = (plan, cost = false) =>
  cost
    ? {
        id: uid(),
        name: t("plan.extraCost"),
        amount: -5_000,
        from: { kind: "fire", value: 0 },
        to: { kind: "fire", value: 10 },
        indexed: true,
        change: 0,
      }
    : {
        id: uid(),
        name: t("plan.statePension"),
        amount: 15_000,
        from: { kind: "age", person: plan.people[0].id, value: 67 },
        to: null,
        indexed: true,
        change: 0,
      };
export const newEvent = (plan) => ({
  id: uid(),
  name: t("plan.event"),
  year: plan.fire_year,
  amount: -20_000,
});

// ---- cleaning what comes from outside ------------------------------------------------------------

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const num = (v, d, lo = -1e12, hi = 1e12) => (isNum(v) ? Math.min(Math.max(v, lo), hi) : d);
const int = (v, d, lo, hi) => Math.round(num(v, d, lo, hi));
const str = (v, d, max = 60) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : d);
const oneOf = (v, options, d) => (options.includes(v) ? v : d);
const list = (v, max) =>
  Array.isArray(v) ? v.filter((x) => x && typeof x === "object").slice(0, max) : [];

/**
 * A complete, well-formed plan from anything: every field present with the right type, within
 * sane bounds, references pointing at people who exist. Unknown fields are dropped. It does not
 * judge whether the plan makes sense: that's `problems()`.
 */
export function normalize(raw, { currency = DEFAULT_CURRENCY, today = new Date() } = {}) {
  const up = migrate(raw);
  const r = up && typeof up === "object" ? up : {};
  const d = blankPlan({ currency, today });
  const ids = new Set();
  const idOf = (v) => {
    let id = str(v, "", 40);
    while (!id || ids.has(id)) id = uid();
    ids.add(id);
    return id;
  };

  const people = list(r.people, LIMITS.people).map((x, k) => ({
    id: idOf(x.id),
    name: str(x.name, t("plan.person", { n: k + 1 }), 40),
    birth_year: int(x.birth_year, d.start_year - 35, 1900, 2100),
  }));
  if (!people.length) people.push({ ...d.people[0], id: idOf("p1") });
  const person = (id) => (people.some((x) => x.id === id) ? id : people[0].id);

  const when = (w, dflt) => {
    if (w === null) return null;
    if (!w || typeof w !== "object") return dflt;
    const kind = oneOf(w.kind, ["year", "age", "fire"], "year");
    const out = {
      kind,
      value: int(
        w.value,
        kind === "year" ? d.fire_year : 0,
        kind === "year" ? 1900 : 0,
        kind === "year" ? 2300 : 150,
      ),
    };
    if (kind === "age") out.person = person(w.person);
    return out;
  };

  const rule = r.rule && typeof r.rule === "object" ? r.rule : {};
  const spending = num(r.spending, d.spending, 0);
  const band = bandAround(spending);
  return {
    schema: SCHEMA,
    currency: /^[A-Z]{3}$/.test(r.currency) ? r.currency : currency,
    start_year: int(r.start_year, d.start_year, 1900, 2200),
    start_month: int(r.start_month, d.start_month, 1, 12),
    people,
    end_person: person(r.end_person),
    end_age: int(r.end_age, d.end_age, 1, 125),
    fire_year: int(r.fire_year, d.fire_year, 1900, 2300),
    spending,
    portfolio: num(r.portfolio, d.portfolio, 0),
    cash: num(r.cash, d.cash, 0),
    contrib: num(r.contrib, d.contrib, 0),
    contrib_growth: num(r.contrib_growth, 0, -0.5, 0.5),
    cash_interest: num(r.cash_interest, d.cash_interest, -0.5, 1),
    cash_buffer_years: num(r.cash_buffer_years, 0, 0, 20),
    portfolio_tax: num(r.portfolio_tax, 0, 0, 0.9),
    accounts: list(r.accounts, LIMITS.accounts).map((a) => ({
      id: idOf(a.id),
      name: str(a.name, t("plan.account")),
      owner: person(a.owner),
      balance: num(a.balance, 0, 0),
      contrib: num(a.contrib, 0, 0),
      growth: oneOf(a.growth, ["portfolio", "fixed"], "portfolio"),
      interest: num(a.interest, 0.02, -0.5, 1),
      unlock_age: int(a.unlock_age, 60, 0, 125),
      tax: num(a.tax, 0, 0, 0.9),
    })),
    income: list(r.income, LIMITS.income).map((s) => ({
      id: idOf(s.id),
      name: str(s.name, t("plan.income")),
      amount: num(s.amount, 0),
      from: when(s.from, { kind: "fire", value: 0 }) ?? { kind: "fire", value: 0 },
      to: when(s.to, null),
      indexed: s.indexed !== false,
      change: num(s.change, 0, -0.1, 0.1),
    })),
    events: list(r.events, LIMITS.events).map((e) => ({
      id: idOf(e.id),
      name: str(e.name, t("plan.event")),
      year: int(e.year, d.fire_year, 1900, 2300),
      amount: num(e.amount, 0),
    })),
    inflation: num(r.inflation, d.inflation, -0.2, 1),
    stock_return: num(r.stock_return, d.stock_return, -0.5, 1),
    stock_vol: num(r.stock_vol, d.stock_vol, 0, 1),
    fat_tails_df: r.fat_tails_df == null ? null : num(r.fat_tails_df, null, 2.1, 100),
    stress_returns: Array.isArray(r.stress_returns)
      ? r.stress_returns
          .filter(isNum)
          .slice(0, 30)
          .map((x) => Math.min(Math.max(x, -1), 5))
      : [],
    stock_share: num(r.stock_share, 1, 0, 1),
    tent_share: num(r.tent_share, num(r.stock_share, 1, 0, 1), 0, 1),
    tent_years_before: int(r.tent_years_before, 4, 0, 40),
    tent_years_after: int(r.tent_years_after, 8, 0, 40),
    bond_return: num(r.bond_return, d.bond_return, -0.5, 1),
    bond_vol: num(r.bond_vol, d.bond_vol, 0, 1),
    stock_bond_corr: num(r.stock_bond_corr, 0, -1, 1),
    rule: {
      kind: oneOf(rule.kind, RULE_KINDS, "fixed"),
      floor: num(rule.floor, band.floor, 0),
      ceiling: num(rule.ceiling, band.ceiling, 0),
      band: num(rule.band, RULE_DEFAULTS.band, 0.001, 0.99),
      adjust: num(rule.adjust, RULE_DEFAULTS.adjust, 0.001, 0.99),
      up: num(rule.up, RULE_DEFAULTS.up, 0, 0.99),
      down: num(rule.down, RULE_DEFAULTS.down, 0, 0.99),
      assumed_return: num(rule.assumed_return, RULE_DEFAULTS.assumed_return, -0.09, 0.19),
      max_raise: num(rule.max_raise, RULE_DEFAULTS.max_raise, 0, 0.99),
      max_cut: num(rule.max_cut, RULE_DEFAULTS.max_cut, 0, 1),
    },
  };
}

/**
 * What's wrong with the rule's floor and ceiling, if anything: "order" (the floor is above the
 * ceiling), "outside" (guardrails or Vanguard with the spending outside them), or null.
 */
export function bandProblem(plan) {
  const r = plan.rule;
  if (r.kind !== "fixed" && r.floor > r.ceiling) return "order";
  if (
    (r.kind === "guardrails" || r.kind === "vanguard") &&
    (plan.spending < r.floor || plan.spending > r.ceiling)
  )
    return "outside";
  return null;
}

/** What stops a plan from being simulated, as messages for the person editing it. */
export function problems(plan) {
  const out = [];
  const end = endYear(plan);
  const years = end - plan.start_year + 1;
  const who = personById(plan, plan.end_person);
  if (years < 2)
    out.push(
      t("problem.tooShort", { start: plan.start_year, name: who.name, age: plan.end_age, end }),
    );
  else if (years > LIMITS.years)
    out.push(t("problem.tooLong", { n: years, end, max: LIMITS.years }));
  if (plan.fire_year < plan.start_year || plan.fire_year >= end)
    out.push(t("problem.fireYear", { start: plan.start_year, last: end - 1 }));
  if (!(plan.spending > 0)) out.push(t("problem.spending"));
  const band = bandProblem(plan);
  if (band === "order") out.push(t("problem.bandOrder"));
  else if (band === "outside") out.push(t("problem.bandOutside"));
  return out;
}

// ---- comparing plans -----------------------------------------------------------------------------

const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
/** A list of items (people, accounts…), walked into; other lists (crash years) are one value. */
const isItems = (v) => Array.isArray(v) && v.every(isObj);
/**
 * For each of `to`'s items, the same item in `from`: the one with its id (by place, for items
 * without one), wherever it was moved; undefined for an item `to` added.
 */
function counterparts(from, to) {
  const key = (x, i) => (typeof x.id === "string" ? x.id : i);
  const was = new Map(from.map((x, i) => [key(x, i), x]));
  return to.map((x, i) => was.get(key(x, i)));
}

/**
 * The dotted paths whose values differ between two plans, as paths in `to`. List items are matched
 * by id, so an item moved up or down is compared with itself. An item added, removed or moved
 * changes the list, which counts once, at "<list>.#", not as each of its items' fields.
 */
export function differences(from, to) {
  const out = [];
  const walk = (a, b, path) => {
    const at = (k) => (path ? `${path}.${k}` : k);
    if (isObj(a) && isObj(b)) {
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[k], b[k], at(k));
    } else if (isItems(a) && isItems(b)) {
      const was = counterparts(a, b);
      const kept = was.filter(Boolean);
      const order = a.filter((x) => kept.includes(x)); // the same items, in `from`'s order
      if (
        kept.length !== a.length ||
        kept.length !== b.length ||
        kept.some((x, k) => x !== order[k])
      )
        out.push(at("#"));
      was.forEach((x, i) => x && walk(x, b[i], at(i)));
    } else if (!same(a, b)) out.push(path);
  };
  walk(from, to, "");
  return out;
}

/** What `from` has at `to`'s dotted path: list items matched as in `differences`. */
export function counterpart(from, to, path) {
  let a = from;
  let b = to;
  for (const k of path.split(".")) {
    a = isItems(a) && isItems(b) && /^\d+$/.test(k) ? counterparts(a, b)[k] : a?.[k];
    b = b?.[k];
  }
  return a;
}
