/**
 * The model: a Monte Carlo simulation of a FIRE plan. No DOM, no I/O: it runs in a Web Worker in
 * the page and under Node in the tests.
 *
 * One step is one calendar year, and everything is in today's money: returns are drawn net of
 * inflation, so spending, savings and income stay constant unless a spending rule changes them
 * (or an income line is not inflation-indexed, or has a yearly change).
 *
 * Year by year, in each simulated future:
 * - the portfolio, and the retirement accounts invested like it, is a stock/bond mix rebalanced
 *   every year: `stock_share` normally, dipping to `tent_share` around the FIRE start if set (a
 *   "bond tent"). Stocks and bonds each get a random yearly return;
 * - cash grows at its interest minus inflation, fixed-interest accounts at theirs;
 * - until the FIRE year: yearly savings into the portfolio and the retirement accounts, arriving
 *   at the end of the year;
 * - when its owner reaches its unlock age, a retirement account is withdrawn, taxed, and added to
 *   the portfolio;
 * - from the FIRE year: the income lines (pensions, part-time work) and extra costs, and the
 *   year's spending, set by the spending rule and taken at the start of the year;
 * - one-off events (an inheritance, a house) in their year;
 * - money is taken from cash first, then from the portfolio (grossed up by the tax on portfolio
 *   withdrawals). A year whose bills the reachable money can't pay is a failure, even if a
 *   retirement account would unlock later: in real life that is the year the bills can't be paid.
 *
 * The start year counts only from `start_month`: balances are a snapshot, so of their year only
 * the rest still grows and saves.
 *
 * Every simulated future (path i) has its own random streams, seeded from (seed, i): the same
 * seed always gives the same futures, and the first n futures of a bigger run are the futures of
 * a run of n. So every view compares plans on the same markets.
 */

/** The spending rules. Their names are the page's (`rule.name.*`, `rule.short.*` in the messages). */
export const RULE_KINDS = ["fixed", "guardrails", "vanguard", "spenddown"];

export const real = (nominal, inflation) => (1 + nominal) / (1 + inflation) - 1;

export const personById = (plan, id) => plan.people.find((x) => x.id === id) ?? plan.people[0];
export const endYear = (plan) => personById(plan, plan.end_person).birth_year + plan.end_age;
export const unlockYear = (plan, acct) => personById(plan, acct.owner).birth_year + acct.unlock_age;

/** The calendar year of a `{ kind: "year" | "age" | "fire", value, person }` moment. */
export function yearOf(plan, when, fireYear = plan.fire_year) {
  if (!when) return null;
  if (when.kind === "age") return personById(plan, when.person).birth_year + when.value;
  if (when.kind === "fire") return fireYear + when.value;
  return when.value;
}

/**
 * Income minus extra costs in each year, in today's money. A line counts from the FIRE year on
 * (before it, the savings already reflect what comes in), from its start until the year it stops.
 * A line that isn't inflation-indexed keeps its amount in money, so it loses value every year.
 * A line's `change` makes it rise (or fall) by that share each year after it starts (or after the
 * start year, for a line that started before): on top of inflation if it's indexed, in money if
 * it isn't.
 */
export function incomeByYear(plan, years, fireYear = plan.fire_year) {
  const out = new Float64Array(years.length);
  for (const s of plan.income) {
    const from = yearOf(plan, s.from, fireYear) ?? fireYear;
    const to = yearOf(plan, s.to, fireYear); // the first year it no longer pays
    const g = 1 + (s.change || 0);
    const since = Math.max(from, plan.start_year);
    for (let t = 0; t < years.length; t++) {
      const y = years[t];
      if (y < fireYear || y < from || (to != null && y >= to)) continue;
      const amount = g === 1 ? s.amount : s.amount * g ** (y - since);
      out[t] +=
        s.indexed === false ? amount / (1 + plan.inflation) ** (y - plan.start_year) : amount;
    }
  }
  return out;
}

export function eventsByYear(plan, years) {
  const out = new Float64Array(years.length);
  for (const e of plan.events) {
    const t = e.year - years[0];
    if (t >= 0 && t < years.length) out[t] += e.amount;
  }
  return out;
}

/** Stock share of the portfolio in each simulated year (the rest is in bonds). */
export function stockShares(plan, nYears, i0 = plan.fire_year - plan.start_year) {
  const {
    stock_share: share,
    tent_share: tent,
    tent_years_before: before,
    tent_years_after: after,
  } = plan;
  const w = new Float64Array(nYears).fill(share);
  for (let i = 0; i < nYears; i++) {
    const k = i - i0; // years after (>= 0) or before (< 0) the FIRE start
    if ((k >= 0 && k < after) || (k === 0 && after === 0))
      w[i] = tent + ((share - tent) * k) / Math.max(after, 1);
    else if (k < 0 && k >= -before) w[i] = tent + ((share - tent) * -k) / before;
  }
  return w;
}

/** [mu, sigma] of a log-normal growth factor with this median and standard deviation. */
export function lognormal(median, sd) {
  const u = (1 + Math.sqrt(1 + 4 * (sd / median) ** 2)) / 2; // sd = median * sqrt(u (u - 1))
  return [Math.log(median), Math.sqrt(Math.log(u))];
}

/**
 * The yearly real growth of the portfolio rebalanced at stock share `w`, as the model draws it
 * (without fat tails): its mean and volatility, and its compound rate (the median of a log-normal
 * with that mean and volatility). The form's hints show these.
 */
export function mixStats(plan, w) {
  const moments = (nominal, sd) => {
    const [mu, sigma] = lognormal(1 + real(nominal, plan.inflation), sd);
    return { mean: Math.exp(mu + sigma ** 2 / 2), sigma };
  };
  const st = moments(plan.stock_return, plan.stock_vol);
  const bd = moments(plan.bond_return, plan.bond_vol);
  // The model correlates the normal draws behind the two log-normal growth factors.
  const cov = st.mean * bd.mean * (Math.exp(plan.stock_bond_corr * st.sigma * bd.sigma) - 1);
  const mean = w * st.mean + (1 - w) * bd.mean;
  const variance =
    (w * plan.stock_vol) ** 2 + ((1 - w) * plan.bond_vol) ** 2 + 2 * w * (1 - w) * cov;
  return {
    mean: mean - 1,
    compound: mean / Math.sqrt(1 + variance / mean ** 2) - 1,
    vol: Math.sqrt(variance),
  };
}

// ---- random numbers ----------------------------------------------------------------------------

function mix32(h) {
  h = Math.imul(h ^ (h >>> 16), 0x21f0aaad);
  h = Math.imul(h ^ (h >>> 15), 0x735a2d97);
  return (h ^ (h >>> 15)) >>> 0;
}

/** A seeded generator (sfc32) for one stream of one simulated future. */
export function makeRng(seed, path, stream) {
  let s = mix32(
    mix32(mix32((seed >>> 0) ^ 0x9e3779b9) ^ Math.imul(path + 1, 0x85ebca6b)) ^
      Math.imul(stream + 1, 0xc2b2ae35),
  );
  const next0 = () => {
    s = (s + 0x9e3779b9) | 0;
    return mix32(s);
  };
  let a = next0();
  let b = next0();
  let c = next0();
  let d = next0();
  const next = () => {
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return t >>> 0;
  };
  for (let k = 0; k < 12; k++) next();
  const uniform = () => ((next() >>> 5) * 67108864 + (next() >>> 6)) / 9007199254740992; // [0, 1), 53 bits
  let spare = NaN;
  const normal = () => {
    if (!Number.isNaN(spare)) {
      const z = spare;
      spare = NaN;
      return z;
    }
    const r = Math.sqrt(-2 * Math.log(1 - uniform()));
    const th = 2 * Math.PI * uniform();
    spare = r * Math.sin(th);
    return r * Math.cos(th);
  };
  const gamma = (k) => {
    if (k < 1) return gamma(k + 1) * uniform() ** (1 / k);
    const dd = k - 1 / 3;
    const cc = 1 / Math.sqrt(9 * dd);
    for (;;) {
      let x;
      let v;
      do {
        x = normal();
        v = 1 + cc * x;
      } while (v <= 0);
      v = v * v * v;
      const u = uniform();
      if (u < 1 - 0.0331 * x ** 4) return dd * v;
      if (Math.log(u) < 0.5 * x * x + dd * (1 - v + Math.log(v))) return dd * v;
    }
  };
  const studentT = (df) => normal() / Math.sqrt((2 * gamma(df / 2)) / df);
  return { uniform, normal, studentT };
}

// Yearly real growth factors of stocks and bonds for every (future, year), drawn once per market
// setting and kept: the grid and the safe-spending search rerun the same futures many times.
const DRAWS = [];
const DRAWS_KEPT = 3;

export function marketDraws(plan, n, Y) {
  const df = plan.fat_tails_df || 0;
  const [mu, sigma] = lognormal(1 + real(plan.stock_return, plan.inflation), plan.stock_vol);
  const [bmu, bsigma] = lognormal(1 + real(plan.bond_return, plan.inflation), plan.bond_vol);
  const rho = plan.stock_bond_corr;
  const key = [plan.seed, Y, mu, sigma, df, bmu, bsigma, rho].join("|");
  const at = DRAWS.findIndex((x) => x.key === key);
  const old = at >= 0 ? DRAWS.splice(at, 1)[0] : null;
  if (old && old.n >= n) {
    DRAWS.unshift(old);
    return old;
  }
  const stock = new Float64Array(n * Y);
  const bond = new Float64Array(n * Y);
  let from = 0;
  if (old) {
    stock.set(old.stock);
    bond.set(old.bond);
    from = old.n;
  }
  // A t in log space has no sensible upper bound (single years of +50,000% appear), so
  // fat-tailed years are capped at historically plausible extremes: -60% / +60% real.
  const tScale = df ? Math.sqrt((df - 2) / df) : 1;
  const bScale = Math.sqrt(1 - rho * rho);
  for (let i = from; i < n; i++) {
    const rs = makeRng(plan.seed, i, 0);
    const rb = makeRng(plan.seed, i, 1);
    for (let t = 0; t < Y; t++) {
      const z = df ? rs.studentT(df) * tScale : rs.normal();
      const g = Math.exp(mu + sigma * z);
      stock[i * Y + t] = df ? Math.min(Math.max(g, 0.4), 1.6) : g;
      const zb = rho === 0 ? rb.normal() : rho * z + bScale * rb.normal();
      bond[i * Y + t] = Math.exp(bmu + bsigma * zb);
    }
  }
  const entry = { key, n, Y, stock, bond };
  DRAWS.unshift(entry);
  DRAWS.length = Math.min(DRAWS.length, DRAWS_KEPT);
  return entry;
}

// ---- simulation --------------------------------------------------------------------------------

/**
 * Everything about a run that is the same in every future. `o` overrides parts of the plan for
 * one run: `fire_year`, `kind` (the spending rule), `rule` (its settings), `stress_returns`.
 */
export function prepare(plan, n, o = {}) {
  const fireYear = o.fire_year ?? plan.fire_year;
  const kind = o.kind ?? plan.rule.kind;
  const rule = { ...plan.rule, ...(o.rule || {}) };
  const stress = o.stress_returns ?? plan.stress_returns;
  const y0 = plan.start_year;
  const Y = endYear(plan) - y0 + 1;
  const i0 = fireYear - y0;
  const years = Array.from({ length: Y }, (_, t) => y0 + t);
  const f0 = (13 - plan.start_month) / 12;
  const infl = plan.inflation;
  const cg = 1 + (plan.contrib_growth || 0);

  const contrib = new Float64Array(Y);
  for (let t = 0; t < Math.min(i0, Y); t++) contrib[t] = plan.contrib * cg ** t;

  const accts = plan.accounts;
  const A = accts.length;
  const bal0 = new Float64Array(A);
  const keep = new Float64Array(A);
  const fixed = new Uint8Array(A);
  const gfix = new Float64Array(A);
  const gfixF0 = new Float64Array(A);
  const unlockT = new Int32Array(A);
  const contribA = new Float64Array(A * Y);
  accts.forEach((a, k) => {
    bal0[k] = a.balance;
    keep[k] = 1 - a.tax;
    fixed[k] = a.growth === "fixed" ? 1 : 0;
    gfix[k] = 1 + real(a.interest, infl);
    gfixF0[k] = gfix[k] ** f0;
    unlockT[k] = unlockYear(plan, a) - y0;
    for (let t = 0; t < Math.min(i0, Y); t++) contribA[k * Y + t] = a.contrib * cg ** t;
  });
  // Accounts in the order they unlock: the spend-down adds them up in that order.
  const byUnlock = Int32Array.from([...accts.keys()].sort((x, y) => unlockT[x] - unlockT[y]));

  const income = incomeByYear(plan, years, fireYear);
  const events = eventsByYear(plan, years);
  const w = stockShares(plan, Y, i0);
  const stressG = new Float64Array(Y).fill(NaN); // a forced crash hits the stocks
  stress.forEach((r, k) => {
    if (i0 + k >= 0 && i0 + k < Y) stressG[i0 + k] = 1 + r;
  });
  const gcash = 1 + real(plan.cash_interest, infl);
  const ptax = plan.portfolio_tax || 0;
  const draws = marketDraws(plan, n, Y);

  const c = {
    plan,
    kind,
    rule,
    years,
    Y,
    i0,
    f0,
    fireYear,
    portfolio: plan.portfolio,
    cash: plan.cash,
    contrib,
    cbuf: plan.cash_buffer_years,
    A,
    bal0,
    keep,
    fixed,
    gfix,
    gfixF0,
    unlockT,
    contribA,
    byUnlock,
    income,
    events,
    w,
    allStocks: w.every((x) => x === 1),
    stressG,
    gcash,
    gcashF0: gcash ** f0,
    keepP: 1 - ptax,
    grossUp: 1 / (1 - ptax),
    stock: draws.stock,
    bond: draws.bond,
    acct: new Float64Array(A),
    locked: new Uint8Array(A),
    steps: new Float64Array(A),
  };
  if (kind === "spenddown") c.sd = spendDownTables(c);
  return c;
}

/**
 * For each FIRE year t: today's value, at the assumed return, of spending 1 a year until each
 * later year (`cost`), and of the income, costs and one-offs still to come (`flow`); and for each
 * fixed-interest account, what its balance will be worth when it unlocks, in today's value.
 */
function spendDownTables(c) {
  const r = c.rule.assumed_return;
  const tables = [];
  for (let t = Math.max(c.i0, 0); t < c.Y; t++) {
    const L = c.Y - t;
    const cost = new Float64Array(L);
    const flow = new Float64Array(L);
    const disc = new Float64Array(L);
    let sc = 0;
    let sf = 0;
    for (let k = 0; k < L; k++) {
      disc[k] = (1 + r) ** -k;
      const ev = c.events[t + k];
      sc += disc[k];
      sf += (c.income[t + k] + (ev > 0 ? ev * c.keepP : ev)) * disc[k];
      cost[k] = sc;
      flow[k] = sf;
    }
    const fac = new Float64Array(c.A);
    for (let a = 0; a < c.A; a++) {
      const k = c.unlockT[a] - t;
      // An invested account grows like the portfolio: today's value is its balance.
      fac[a] =
        k > 0 && k < L ? (c.fixed[a] ? c.gfix[a] ** k * disc[k] : 1) * c.keep[a] * c.keepP : 0;
    }
    tables.push({ cost, flow, fac });
  }
  return tables;
}

/**
 * Die with zero: the amount that could be spent every year from now until the plan ends, the same
 * each year, if the money earned exactly the assumed return. Until an account unlocks only the
 * reachable money pays the bills, so it's also no more than that money alone can carry until then.
 */
function spendDownAmount(c, t, stocks, cash) {
  const { cost, flow, fac } = c.sd[t - Math.max(c.i0, 0)];
  const L = cost.length;
  const reach = cash + stocks * c.keepP;
  let best = Infinity;
  let pots = 0;
  let next = 0;
  for (let k = 0; k < L; k++) {
    while (next < c.A && c.unlockT[c.byUnlock[next]] - t <= k) {
      const a = c.byUnlock[next++];
      if (c.locked[a]) pots += c.acct[a] * fac[a];
    }
    const v = (reach + flow[k] + pots) / cost[k];
    if (v < best) best = v;
  }
  return best;
}

const clip = (x, lo, hi) => Math.min(Math.max(x, lo), hi);

/**
 * One simulated future. Returns the year the money ran out, or NaN if it lasted. With `out`, also
 * records its numbers there (row i); `spend0` is the starting spending.
 */
export function runPath(c, i, spend0, out = null) {
  const { Y, i0, A, rule, kind, acct, locked } = c;
  const off = i * Y;
  const rec = out?.total ? off : -1;
  let stocks = c.portfolio;
  let cash = c.cash;
  acct.set(c.bal0);
  locked.fill(1);
  let prev = 0; // last year's spending
  let ref = 0; // the rule's reference: the starting withdrawal rate
  let sum = 0;
  let min = Infinity;
  let failed = NaN;

  for (let t = 0; t < Y; t++) {
    const f = t === 0 ? c.f0 : 1; // the start year counts from the balances' month
    if (t === i0 && c.cbuf > 0) {
      const move = Math.min(stocks, c.cbuf * spend0);
      stocks -= move;
      cash += move;
    }
    let pots = 0;
    for (let a = 0; a < A; a++) {
      if (!locked[a]) continue;
      if (t >= c.unlockT[a]) {
        stocks += acct[a] * c.keep[a];
        acct[a] = 0;
        locked[a] = 0;
      } else pots += acct[a] * c.keep[a];
    }
    if (rec >= 0) {
      out.total[rec + t] = stocks + cash + pots;
      out.accessible[rec + t] = stocks + cash;
    }
    if (t === i0 && out) out.atFire[i] = stocks + cash + pots;

    let need = -c.events[t];
    if (t >= i0) {
      const inc = c.income[t];
      const wealthNow = stocks + cash + pots;
      const wealth = Math.max(wealthNow, 1);
      let spend;
      if (kind === "fixed") spend = spend0;
      else if (kind === "guardrails") {
        if (t === i0) {
          spend = spend0;
          ref = (spend - inc) / wealth;
        } else {
          const wr = (prev - inc) / wealth;
          spend = prev;
          // Nothing to guard where the portfolio paid nothing at the start (income covered it).
          if (ref > 0 && wr > ref * (1 + rule.band)) spend = prev * (1 - rule.adjust);
          else if (ref > 0 && wr < ref * (1 - rule.band)) spend = prev * (1 + rule.adjust);
          spend = clip(spend, rule.floor, rule.ceiling);
        }
      } else if (kind === "vanguard") {
        if (t === i0) {
          spend = spend0;
          ref = (spend - inc) / wealth;
        } else {
          spend =
            ref > 0
              ? clip(ref * wealthNow + inc, prev * (1 - rule.down), prev * (1 + rule.up))
              : prev;
          spend = clip(spend, rule.floor, rule.ceiling);
        }
      } else {
        const amount = spendDownAmount(c, t, stocks, cash);
        if (t === i0) {
          if (out?.startAmount) out.startAmount[i] = amount;
          spend = clip(amount, rule.floor, rule.ceiling);
        } else {
          spend = clip(
            clip(amount, prev * (1 - rule.max_cut), prev * (1 + rule.max_raise)),
            rule.floor,
            rule.ceiling,
          );
        }
      }
      prev = spend;
      if (rec >= 0) out.spending[rec + t] = spend;
      sum += spend;
      if (spend < min) min = spend;
      need += (spend - inc) * f; // only the rest of the year, if FIRE starts in the start year
    }
    if (need !== 0) {
      const fromCash = need > 0 ? Math.min(need, cash) : 0;
      cash -= fromCash;
      const rest = need - fromCash;
      stocks -= rest > 0 ? rest * c.grossUp : rest; // a negative need is reinvested
      // -1e-6, not 0: spending exactly all that's left (the spend-down's last year) lands a
      // rounding error below zero.
      if (stocks < -1e-6) {
        failed = c.years[t];
        break;
      }
    }

    const gs = Number.isNaN(c.stressG[t]) ? c.stock[off + t] : c.stressG[t];
    const g1 = c.allStocks ? gs : c.w[t] * gs + (1 - c.w[t]) * c.bond[off + t];
    const g = f === 1 ? g1 : g1 ** f;
    stocks *= g;
    cash *= t === 0 ? c.gcashF0 : c.gcash;
    for (let a = 0; a < A; a++) {
      if (locked[a]) acct[a] *= c.fixed[a] ? (t === 0 ? c.gfixF0[a] : c.gfix[a]) : g;
    }
    if (t < i0) {
      stocks += c.contrib[t] * f;
      for (let a = 0; a < A; a++) if (locked[a]) acct[a] += c.contribA[a * Y + t] * f;
    }
  }

  if (out) {
    out.fail[i] = failed;
    out.spendMean[i] = sum / Math.max(Y - i0, 1);
    out.spendMin[i] = min;
  }
  return failed;
}

/**
 * Run `n` futures (default: the plan's). Options: the overrides of `prepare`, plus `spending` (the
 * starting spending: a number, or one per future) and `record` (keep every year's numbers).
 */
export function simulate(plan, o = {}) {
  const n = o.n ?? plan.n_sims;
  const c = prepare(plan, n, o);
  const { Y } = c;
  const out = {
    years: c.years,
    n,
    i0: c.i0,
    kind: c.kind,
    fail: new Float64Array(n),
    atFire: new Float64Array(n),
    spendMean: new Float64Array(n),
    spendMin: new Float64Array(n),
    startAmount: c.kind === "spenddown" ? new Float64Array(n) : null,
    total: o.record ? new Float64Array(n * Y) : null,
    accessible: o.record ? new Float64Array(n * Y) : null,
    spending: o.record ? new Float64Array(n * Y) : null,
  };
  const spending = o.spending ?? plan.spending;
  const each = typeof spending !== "number";
  for (let i = 0; i < n; i++) runPath(c, i, each ? spending[i] : spending, out);
  return out;
}

/** The share of futures in which the money lasts, without keeping anything else. */
export function lasts(plan, o = {}) {
  const n = o.n ?? plan.n_sims;
  const c = prepare(plan, n, o);
  const spend = o.spending ?? plan.spending;
  let ok = 0;
  for (let i = 0; i < n; i++) if (Number.isNaN(runPath(c, i, spend))) ok++;
  return ok / n;
}

export function successRate(res) {
  let ok = 0;
  for (const f of res.fail) if (Number.isNaN(f)) ok++;
  return ok / res.n;
}
