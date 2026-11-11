/**
 * A plan: the household, its money, and the choices being tried. Plain JSON, kept in the browser,
 * exported to files and packed into share links. This module makes new ones, checks and cleans
 * any that come from outside (storage, a file, a link), and compares two of them.
 *
 * Amounts are in the plan's currency, in today's money. Rates are fractions (0.02 = 2%); returns
 * and interest are nominal, the model turns them into real ones with the inflation.
 */
import { RULE_KINDS, endYear, personById } from "./engine.js";

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
export const LIMITS = { people: 4, accounts: 12, income: 12, events: 20, years: 120 };

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

/** Two significant digits: 57,600 → 58,000. */
export function roundish(x) {
  if (!(x > 0)) return 0;
  const step = 10 ** Math.max(Math.floor(Math.log10(x)) - 1, 0);
  return Math.round(x / step) * step;
}

/** A floor and ceiling for the flexible rules, around a spending. */
export const bandAround = (spending) => ({ floor: roundish(spending * 0.8), ceiling: roundish(spending * 1.25) });

export function blankPlan({ currency = DEFAULT_CURRENCY, today = new Date() } = {}) {
  const y = today.getFullYear();
  return {
    schema: SCHEMA,
    currency,
    start_year: y,
    start_month: today.getMonth() + 1,
    people: [{ id: "p1", name: "Me", birth_year: y - 35 }],
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
  const alex = { id: "alex", name: "Alex", birth_year: y - 38 };
  const sam = { id: "sam", name: "Sam", birth_year: y - 36 };
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
      { id: "ret-alex", name: "Retirement account", owner: "alex", balance: 140_000, contrib: 12_000, growth: "portfolio", interest: 0.02, unlock_age: 60, tax: 0.15 },
      { id: "pen-sam", name: "Workplace pension", owner: "sam", balance: 95_000, contrib: 9_000, growth: "fixed", interest: 0.03, unlock_age: 60, tax: 0.15 },
    ],
    income: [
      { id: "sp-alex", name: "State pension (Alex)", amount: 21_000, from: { kind: "age", person: "alex", value: 67 }, to: null, indexed: true },
      { id: "sp-sam", name: "State pension (Sam)", amount: 17_000, from: { kind: "age", person: "sam", value: 67 }, to: null, indexed: true },
    ],
    rule: { ...RULE_DEFAULTS, ...bandAround(64_000) },
  };
}

export function newPerson(plan) {
  const used = new Set(plan.people.map((x) => x.name));
  let k = plan.people.length + 1;
  while (used.has(`Person ${k}`)) k++;
  return { id: uid(), name: `Person ${k}`, birth_year: plan.people[0]?.birth_year ?? plan.start_year - 35 };
}
export const newAccount = (plan, owner = plan.people[0].id) => ({
  id: uid(), name: "Retirement account", owner, balance: 0, contrib: 0, growth: "portfolio", interest: 0.02, unlock_age: 60, tax: 0.1,
});
export const newIncome = (plan, cost = false) => (cost
  ? { id: uid(), name: "Extra cost", amount: -5_000, from: { kind: "fire", value: 0 }, to: { kind: "fire", value: 10 }, indexed: true }
  : { id: uid(), name: "State pension", amount: 15_000, from: { kind: "age", person: plan.people[0].id, value: 67 }, to: null, indexed: true });
export const newEvent = (plan) => ({ id: uid(), name: "One-off", year: plan.fire_year, amount: -20_000 });

// ---- cleaning what comes from outside ------------------------------------------------------------

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const num = (v, d, lo = -1e12, hi = 1e12) => (isNum(v) ? Math.min(Math.max(v, lo), hi) : d);
const int = (v, d, lo, hi) => Math.round(num(v, d, lo, hi));
const str = (v, d, max = 60) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : d);
const oneOf = (v, options, d) => (options.includes(v) ? v : d);
const list = (v, max) => (Array.isArray(v) ? v.filter((x) => x && typeof x === "object").slice(0, max) : []);

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
    name: str(x.name, `Person ${k + 1}`, 40),
    birth_year: int(x.birth_year, d.start_year - 35, 1900, 2100),
  }));
  if (!people.length) people.push({ ...d.people[0], id: idOf("p1") });
  const person = (id) => (people.some((x) => x.id === id) ? id : people[0].id);

  const when = (w, dflt) => {
    if (w === null) return null;
    if (!w || typeof w !== "object") return dflt;
    const kind = oneOf(w.kind, ["year", "age", "fire"], "year");
    const out = { kind, value: int(w.value, kind === "year" ? d.fire_year : 0, kind === "year" ? 1900 : 0, kind === "year" ? 2300 : 150) };
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
      name: str(a.name, "Retirement account"),
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
      name: str(s.name, "Income"),
      amount: num(s.amount, 0),
      from: when(s.from, { kind: "fire", value: 0 }) ?? { kind: "fire", value: 0 },
      to: when(s.to, null),
      indexed: s.indexed !== false,
    })),
    events: list(r.events, LIMITS.events).map((e) => ({
      id: idOf(e.id),
      name: str(e.name, "One-off"),
      year: int(e.year, d.fire_year, 1900, 2300),
      amount: num(e.amount, 0),
    })),
    inflation: num(r.inflation, d.inflation, -0.2, 1),
    stock_return: num(r.stock_return, d.stock_return, -0.5, 1),
    stock_vol: num(r.stock_vol, d.stock_vol, 0, 1),
    fat_tails_df: r.fat_tails_df == null ? null : num(r.fat_tails_df, null, 2.1, 100),
    stress_returns: Array.isArray(r.stress_returns) ? r.stress_returns.filter(isNum).slice(0, 30).map((x) => Math.min(Math.max(x, -1), 5)) : [],
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

/** What stops a plan from being simulated, as messages for the person editing it. */
export function problems(plan) {
  const out = [];
  const end = endYear(plan);
  const years = end - plan.start_year + 1;
  const who = personById(plan, plan.end_person);
  if (years < 2) out.push(`The plan has to run past ${plan.start_year}: ${who.name} turns ${plan.end_age} in ${end}.`);
  else if (years > LIMITS.years) out.push(`The plan runs ${years} years (until ${end}): ${LIMITS.years} at most.`);
  if (plan.fire_year < plan.start_year || plan.fire_year >= end) {
    out.push(`The FIRE start must be between ${plan.start_year} (the balances' year) and ${end - 1}.`);
  }
  if (!(plan.spending > 0)) out.push("The spending per year must be more than 0.");
  const r = plan.rule;
  if (r.kind !== "fixed" && r.floor > r.ceiling) out.push("The spending rule's floor must not be above its ceiling.");
  else if ((r.kind === "guardrails" || r.kind === "vanguard") && (plan.spending < r.floor || plan.spending > r.ceiling)) {
    out.push("With a flexible rule the spending per year must be between the floor and the ceiling.");
  }
  return out;
}

// ---- comparing plans -----------------------------------------------------------------------------

/**
 * {dotted path: value}. Objects and lists of objects (people, accounts) are walked into, and a list
 * of objects also gives its length at "<path>.#"; other lists (crash years) are one value.
 */
export function flatten(v, prefix = "", out = {}) {
  const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
  const objList = Array.isArray(v) && (v.length === 0 ? prefix !== "stress_returns" : v.every(isObj));
  if (!(isObj(v) || objList)) {
    out[prefix] = v;
    return out;
  }
  if (objList) out[`${prefix}.#`] = v.length;
  for (const [k, x] of Object.entries(v)) flatten(x, prefix ? `${prefix}.${k}` : k, out);
  return out;
}

/** Equal, numbers to 1e-9: 2.5 typed in as % is 0.025. */
export function same(a, b) {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => same(x, b[i]));
  return a === b || (a == null && b == null);
}

/**
 * The paths whose values differ between two plans. An item added to or removed from a list counts
 * once, as the list's length, not as each of its fields.
 */
export function differences(from, to) {
  const a = flatten(from);
  const b = flatten(to);
  const lengths = {};
  for (const [p, v] of Object.entries({ ...a, ...b })) if (p.endsWith(".#")) lengths[p.slice(0, -2)] = Math.min(a[p] ?? 0, b[p] ?? 0, v);
  const inChangedItem = (p) => Object.entries(lengths).some(([list, n]) => {
    if (!p.startsWith(`${list}.`)) return false;
    const k = Number(p.slice(list.length + 1).split(".")[0]);
    return Number.isInteger(k) && k >= n;
  });
  const paths = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...paths].filter((p) => !same(a[p], b[p]) && !inChangedItem(p));
}
