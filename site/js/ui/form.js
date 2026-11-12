// The parameter form, section by section, and adding or removing people, accounts, income lines
// and events.
import { RULE_KINDS, RULE_SHORT, endYear, lognormal, mixStats, personById } from "../engine.js";
import { CURRENCIES, LOCALES, currencyName } from "../format.js";
import { LIMITS, bandAround, newAccount, newEvent, newIncome, newPerson, same } from "../plan.js";
import * as store from "../store.js";
import { STRESS_SCENARIOS, niceStep } from "../views.js";
import { $, clone, el } from "./dom.js";
import {
  FIELDS,
  addButtons,
  ages,
  checkField,
  group,
  groups,
  invalid,
  itemCard,
  numberField,
  row2,
  selectField,
  syncAll,
  syncers,
  textField,
  whenField,
} from "./fields.js";
import { helpBtn, helpEntry, toast } from "./messages.js";
import { renderPlanBar, restore, snapshot } from "./plans.js";
import { changed } from "./run.js";
import { fmt, realOf, refreshFormat, settings, state } from "./state.js";

const RULE_HINTS = {
  fixed:
    "The same real amount every year, whatever the markets do. The classic safe withdrawal rate.",
  guardrails:
    "Guyton & Klinger: cut spending when the withdrawal rate drifts above where it started by more than the band, raise it when it drifts below. Never below the floor or above the ceiling.",
  vanguard:
    "Aim at a fixed share of wealth, but change spending by at most +up / −down a year. Never below the floor or above the ceiling.",
  spenddown:
    "Die with zero: each year, aim at what would leave nothing at the end if the money earned the assumed return, locked accounts and future income included. Change spending by at most +raise / −cut a year, between the floor and the ceiling.",
};

function ruleGroup() {
  const seg = el("div", { class: "seg", role: "group", "aria-label": "Spending rule" });
  for (const k of RULE_KINDS) {
    seg.append(
      el(
        "button",
        {
          type: "button",
          "data-kind": k,
          onclick: () => {
            state.rule.kind = k;
            changed();
          },
        },
        RULE_SHORT[k],
      ),
    );
  }
  const hintEl = el("div", { class: "hint" });
  const ruleHelp = helpBtn("rule.fixed");
  const flexible = row2(
    numberField({ path: "rule.floor", label: "Floor", hint: "costs you can't cut", min: 0 }),
    numberField({ path: "rule.ceiling", label: "Ceiling", hint: "the most you'd spend", min: 0 }),
  );
  const guard = row2(
    numberField({ path: "rule.band", label: "Guardrail band", kind: "pct", min: 0.001, max: 0.99 }),
    numberField({
      path: "rule.adjust",
      label: "Cut / raise by",
      kind: "pct",
      min: 0.001,
      max: 0.99,
    }),
  );
  const vang = row2(
    numberField({ path: "rule.up", label: "Max raise / yr", kind: "pct", min: 0, max: 0.99 }),
    numberField({ path: "rule.down", label: "Max cut / yr", kind: "pct", min: 0, max: 0.99 }),
  );
  const down = el(
    "div",
    { class: "stack" },
    numberField({
      path: "rule.assumed_return",
      label: "Assumed return (real)",
      kind: "pct",
      what: "Spend-down assumed return",
      min: -0.09,
      max: 0.19,
      hint: (v) => {
        const m = realOf(state.stock_return);
        return v < m
          ? `Below the stocks' ${fmt.pct(m, 2)} real median: a safety margin.`
          : `At or above the stocks' ${fmt.pct(m, 2)} real median: more early, more cuts later.`;
      },
    }),
    row2(
      numberField({
        path: "rule.max_raise",
        label: "Max raise / yr",
        kind: "pct",
        what: "Spend-down max raise / yr",
        min: 0,
        max: 0.99,
      }),
      numberField({
        path: "rule.max_cut",
        label: "Max cut / yr",
        kind: "pct",
        what: "Spend-down max cut / yr",
        min: 0,
        max: 1,
      }),
    ),
  );
  const kindField = el(
    "div",
    { class: "field" },
    seg,
    el("div", { class: "hint-row" }, hintEl, ruleHelp),
  );
  FIELDS.push({
    path: "rule.kind",
    label: "Spending rule",
    show: (k) => RULE_SHORT[k],
    node: kindField,
  });
  syncers.push(() => {
    const k = state.rule.kind;
    seg
      .querySelectorAll("button")
      .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.kind === k)));
    hintEl.textContent = RULE_HINTS[k];
    ruleHelp.dataset.help = `rule.${k}`;
    ruleHelp.setAttribute("aria-label", `Explain: ${helpEntry(`rule.${k}`).title}`);
    flexible.classList.toggle("hidden", k === "fixed");
    guard.classList.toggle("hidden", k !== "guardrails");
    vang.classList.toggle("hidden", k !== "vanguard");
    down.classList.toggle("hidden", k !== "spenddown");
  });
  return group("Spending rule", true, kindField, flexible, guard, vang, down);
}

function stressGroup() {
  const custom = el("input", {
    type: "text",
    id: "f-stress-custom",
    inputmode: "text",
    placeholder: "-15, -20, -25",
    "aria-label": "Custom crash, real returns in %",
  });
  const customBox = el(
    "div",
    { class: "field" },
    el(
      "div",
      { class: "field-head" },
      el("label", { for: custom.id, text: "Custom crash (real % per year, from the FIRE start)" }),
      helpBtn("stress-custom"),
    ),
    el("div", { class: "input" }, custom, el("span", { class: "unit", text: "%" })),
  );
  const keyOf = (arr) => arr.map((x) => Math.round(x * 1000)).join(",");
  let wantCustom = false;
  custom.addEventListener("input", () => {
    const parts = fmt.parseList(custom.value, "pct");
    const bad = parts.some((x) => Number.isNaN(x) || x < -100);
    custom.parentElement.classList.toggle("invalid", bad);
    if (bad) {
      invalid.add("stress");
      return;
    }
    invalid.delete("stress");
    state.stress_returns = parts.map((x) => x / 100);
    changed();
  });
  const label = (r) =>
    STRESS_SCENARIOS.find((x) => keyOf(x.returns) === keyOf(r))?.label ??
    `custom (${r.map((x) => +(x * 100).toFixed(1)).join(", ")}%)`;
  const sel = selectField({
    path: "stress_returns",
    label: "Force a crash at the FIRE start",
    help: "_stress",
    what: "Crash at the start",
    options: () => [...STRESS_SCENARIOS.map((s, i) => [String(i), s.label]), ["custom", "Custom…"]],
    show: {
      toKey: (r) => {
        const i = STRESS_SCENARIOS.findIndex((s) => keyOf(s.returns) === keyOf(r));
        return wantCustom || i < 0 ? "custom" : String(i);
      },
      text: label,
    },
    hint: "Random markets after it. The stress-test chart runs every scenario anyway.",
    onchange: (v) => {
      wantCustom = v === "custom";
      if (!wantCustom) state.stress_returns = clone(STRESS_SCENARIOS[Number(v)].returns);
    },
  });
  syncers.push(() => {
    const i = STRESS_SCENARIOS.findIndex((s) => keyOf(s.returns) === keyOf(state.stress_returns));
    customBox.classList.toggle("hidden", !(wantCustom || i < 0));
    if (document.activeElement !== custom)
      custom.value = state.stress_returns
        .map((x) => String(+(x * 100).toFixed(1)).replace(".", fmt.decimal))
        .join(", ");
  });
  return group("Stress test", false, sel, customBox);
}

function marketHint(nominal) {
  // The model's distribution: median 1+g, standard deviation stock_vol.
  const g = realOf(nominal);
  const [mu, s] = lognormal(1 + g, state.stock_vol);
  const at = (z) => Math.exp(mu + s * z) - 1;
  return `= ${fmt.pct(g, 2)} real median. 2 years in 3 between ${fmt.pct(at(-1))} and +${fmt.pct(at(1))}, 19 in 20 between ${fmt.pct(at(-1.96))} and +${fmt.pct(at(1.96))}.`;
}
const mixHint = (w) => {
  const m = mixStats(state, w);
  return `Mix: ${fmt.pct(m.compound, 2)} real compound, ${fmt.pct(m.vol, 1)} volatility.`;
};

/**
 * An amount's slider: from 2.5 times less to 2.5 times more than the amount it's anchored on, in
 * round steps. Never 0, which isn't a spending, and the same both ways: let go at either end, it
 * centres on that end, for more room above or below.
 */
const moneySlider = (anchor) => {
  const a = anchor > 0 ? anchor : 1000;
  const step = niceStep((a * 2.5 - a / 2.5) / 250);
  return {
    min: Math.max(step, Math.floor(a / 2.5 / step) * step),
    max: Math.ceil((a * 2.5) / step) * step,
    step,
  };
};

// Guardrails and Vanguard need the spending between the rule's floor and ceiling. A band nobody set
// by hand, the one around the spending, moves with it (not for the spend-down, whose floor is its
// main input and which doesn't use the spending). A band set by hand stays: the slider then keeps
// within it, while the box can still go outside, with the error and its fix.
const bandIsAuto = (spending) => {
  const b = bandAround(spending);
  return same(state.rule.floor, b.floor) && same(state.rule.ceiling, b.ceiling);
};
const bandHolds = () => ["guardrails", "vanguard"].includes(state.rule.kind);
const bandByHand = () =>
  bandHolds() && !bandIsAuto(state.spending) && state.rule.floor < state.rule.ceiling;
export function followBand(v, prev) {
  if (state.rule.kind !== "spenddown" && bandIsAuto(prev)) Object.assign(state.rule, bandAround(v));
}
const spendingSlider = (anchor) => {
  if (!bandByHand()) return moneySlider(anchor);
  const { floor, ceiling } = state.rule;
  const step = niceStep((ceiling - floor) / 200);
  const min = Math.ceil(floor / step) * step;
  const max = Math.floor(ceiling / step) * step;
  return max > min
    ? { min, max, step }
    : { min: floor, max: ceiling, step: (ceiling - floor) / 200 };
};

function peopleGroup() {
  const cards = state.people.map((x, i) =>
    itemCard(
      {
        title: () => state.people[i]?.name || `Person ${i + 1}`,
        key: x.id,
        move: moving("people", i),
        onremove: state.people.length > 1 ? () => removePerson(i) : null,
        removeLabel: `Remove ${x.name}`,
      },
      row2(
        textField({
          path: `people.${i}.name`,
          label: "Name",
          what: `Person ${i + 1}'s name`,
          oncommit: rebuild,
        }),
        numberField({
          path: `people.${i}.birth_year`,
          label: "Born",
          kind: "year",
          what: `${x.name} born`,
          help: "people",
          min: 1900,
          max: 2100,
          hint: (v) => `age ${state.start_year - v} in ${state.start_year}`,
        }),
      ),
    ),
  );
  return group(
    "Household",
    { open: true, list: "people" },
    selectField({
      path: "currency",
      label: "Currency",
      options: () => {
        const list = CURRENCIES.includes(state.currency)
          ? CURRENCIES
          : [state.currency, ...CURRENCIES];
        return list.map((c) => [c, `${c} · ${currencyName(c, fmt.locale)}`]);
      },
      onchange: (v) => {
        state.currency = v;
        refreshFormat();
      },
    }),
    ...cards,
    addButtons(["Add person", addPerson, state.people.length >= LIMITS.people]),
  );
}

function accountsGroup() {
  const owners = () => state.people.map((p) => [p.id, p.name]);
  const cards = state.accounts.map((a, i) => {
    const P = `accounts.${i}`;
    const name = () => `“${state.accounts[i]?.name}”`;
    const interest = numberField({
      path: `${P}.interest`,
      label: "Interest (nominal)",
      kind: "pct",
      what: `${name()} interest`,
      help: "account.growth",
      min: -0.5,
      max: 1,
      hint: (v) => `${fmt.pct(realOf(v), 1)} real`,
    });
    syncers.push(() => interest.classList.toggle("hidden", state.accounts[i]?.growth !== "fixed"));
    return itemCard(
      {
        title: () => state.accounts[i]?.name || "Account",
        key: a.id,
        move: moving("accounts", i),
        onremove: () => removeItem("accounts", i),
        removeLabel: `Remove ${a.name}`,
      },
      row2(
        textField({ path: `${P}.name`, label: "Name", what: "Account name", oncommit: rebuild }),
        selectField({
          path: `${P}.owner`,
          label: "Owner",
          what: `${a.name} owner`,
          help: "accounts",
          options: owners,
        }),
      ),
      row2(
        numberField({
          path: `${P}.balance`,
          label: "Balance today",
          what: `${a.name} balance`,
          help: "accounts",
          min: 0,
        }),
        numberField({
          path: `${P}.contrib`,
          label: "Paid in per year",
          what: `${a.name} paid in per year`,
          help: "account.contrib",
          min: 0,
        }),
      ),
      row2(
        selectField({
          path: `${P}.growth`,
          label: "Grows",
          what: `${a.name} grows`,
          help: "account.growth",
          options: () => [
            ["portfolio", "Like the portfolio"],
            ["fixed", "At a fixed interest"],
          ],
        }),
        interest,
      ),
      row2(
        numberField({
          path: `${P}.unlock_age`,
          label: "Unlocks at age",
          kind: "int",
          unit: "years",
          what: `${a.name} unlocks at`,
          help: "account.unlock_age",
          min: 0,
          max: 125,
          hint: (v) => `in ${personById(state, state.accounts[i]?.owner).birth_year + v}`,
        }),
        numberField({
          path: `${P}.tax`,
          label: "Tax when withdrawn",
          kind: "pct",
          what: `${a.name} tax`,
          help: "account.tax",
          min: 0,
          max: 0.9,
        }),
      ),
    );
  });
  return group(
    "Retirement accounts",
    { open: state.accounts.length > 0, list: "accounts" },
    el(
      "div",
      { class: "hint-row" },
      el("div", {
        class: "hint",
        text: "Money you can't reach until an age: it's withdrawn, taxed and added to the portfolio when its owner gets there.",
      }),
      helpBtn("accounts"),
    ),
    ...cards,
    addButtons([
      "Add account",
      () => addItem("accounts", newAccount(state)),
      state.accounts.length >= LIMITS.accounts,
    ]),
  );
}

function incomeGroup() {
  const cards = state.income.map((s, i) => {
    const P = `income.${i}`;
    return itemCard(
      {
        title: () => state.income[i]?.name || "Line",
        key: s.id,
        move: moving("income", i),
        onremove: () => removeItem("income", i),
        removeLabel: `Remove ${s.name}`,
      },
      row2(
        textField({ path: `${P}.name`, label: "Name", what: "Line name", oncommit: rebuild }),
        numberField({
          path: `${P}.amount`,
          label: "Per year",
          what: `${s.name} per year`,
          help: "income",
          hint: (v) =>
            v >= 0
              ? `income, ${fmt.money(v / 12)} a month (negative: a cost)`
              : `a cost, ${fmt.money(-v / 12)} a month`,
        }),
      ),
      whenField({ path: `${P}.from`, label: "Starts", what: `${s.name} starts` }),
      whenField({ path: `${P}.to`, label: "Stops", what: `${s.name} stops`, never: true }),
      checkField({
        path: `${P}.indexed`,
        label: "Rises with inflation",
        what: `${s.name} rises with inflation`,
        help: "income.indexed",
      }),
    );
  });
  const full = state.income.length >= LIMITS.income;
  return group(
    "Income and costs after stopping",
    { open: state.income.length > 0, list: "income" },
    el(
      "div",
      { class: "hint-row" },
      el("div", {
        class: "hint",
        text: "Pensions, part-time work, rent coming in; or a mortgage, school fees going out. Counted from the FIRE start.",
      }),
      helpBtn("income"),
    ),
    ...cards,
    addButtons(
      ["Add income", () => addItem("income", newIncome(state)), full],
      ["Add cost", () => addItem("income", newIncome(state, true)), full],
    ),
  );
}

function eventsGroup() {
  const cards = state.events.map((e, i) =>
    itemCard(
      {
        title: () => state.events[i]?.name || "Event",
        key: e.id,
        move: moving("events", i),
        onremove: () => removeItem("events", i),
        removeLabel: `Remove ${e.name}`,
      },
      textField({ path: `events.${i}.name`, label: "Name", what: "Event name", oncommit: rebuild }),
      row2(
        numberField({
          path: `events.${i}.year`,
          label: "Year",
          kind: "year",
          what: `${e.name} year`,
          help: "events",
          min: 1900,
          max: 2300,
          hint: (v) => ages(v),
        }),
        numberField({
          path: `events.${i}.amount`,
          label: "Amount",
          what: `${e.name} amount`,
          help: "events",
          hint: (v) => (v >= 0 ? "comes in (negative: goes out)" : "goes out"),
        }),
      ),
    ),
  );
  return group(
    "One-off events",
    { open: state.events.length > 0, list: "events" },
    el(
      "div",
      { class: "hint-row" },
      el("div", {
        class: "hint",
        text: "An inheritance, a house sale, a new roof: a single amount in a single year.",
      }),
      helpBtn("events"),
    ),
    ...cards,
    addButtons([
      "Add event",
      () => addItem("events", newEvent(state)),
      state.events.length >= LIMITS.events,
    ]),
  );
}

export function buildForm() {
  const form = $("#form");
  const focused = document.activeElement?.id;
  form.replaceChildren();
  syncers.length = 0;
  FIELDS.length = 0;
  groups.length = 0;
  const youngest = [...state.people].sort((a, b) => b.birth_year - a.birth_year)[0];
  form.append(
    group(
      "Plan",
      true,
      numberField({
        path: "fire_year",
        label: "FIRE start",
        kind: "year",
        slider: () => ({
          min: state.start_year,
          max: Math.max(state.start_year + 1, Math.min(endYear(state) - 1, state.start_year + 50)),
        }),
        hint: (v) => `Ages then: ${ages(v)}`,
      }),
      numberField({
        path: "spending",
        label: "Spending per year",
        min: 0,
        slider: spendingSlider,
        onchange: followBand,
        hint: (v) =>
          state.rule.kind === "spenddown"
            ? "Not used by the spend-down, which works out its own. Still the unit of “years of spending” and of the cash cushion."
            : `${fmt.money(v / 12)} a month, today's money, taxes of the FIRE years included${
                bandByHand()
                  ? `. The slider stays within the rule's floor and ceiling, ${fmt.short(state.rule.floor)}–${fmt.short(state.rule.ceiling)}.`
                  : ""
              }`,
      }),
      row2(
        selectField({
          path: "end_person",
          label: "Must last until",
          options: () => state.people.map((x) => [x.id, x.name]),
          hint: () =>
            state.people.length > 1 && state.end_person !== youngest.id
              ? `${youngest.name} is the youngest.`
              : "",
        }),
        numberField({
          path: "end_age",
          label: "turns",
          kind: "int",
          unit: "years",
          min: 1,
          max: 125,
          hint: () => `in ${endYear(state)}`,
        }),
      ),
    ),
  );
  form.append(ruleGroup());
  form.append(peopleGroup());
  form.append(
    group(
      "Savings and portfolio",
      true,
      numberField({ path: "portfolio", label: "Invested today", min: 0 }),
      numberField({ path: "cash", label: "Cash today", min: 0 }),
      numberField({
        path: "contrib",
        label: "Saved per year until the FIRE start",
        min: 0,
        hint: (v) => `${fmt.money(v / 12)} a month, into the portfolio`,
      }),
      row2(
        numberField({
          path: "contrib_growth",
          label: "Savings growth",
          kind: "pct",
          unit: "%/yr",
          min: -0.5,
          max: 0.5,
          hint: "above inflation",
        }),
        numberField({
          path: "cash_interest",
          label: "Cash interest",
          kind: "pct",
          min: -0.5,
          max: 1,
          hint: (v) => `${fmt.pct(realOf(v), 1)} real`,
        }),
      ),
      row2(
        numberField({
          path: "cash_buffer_years",
          label: "Cash cushion",
          kind: "num",
          unit: "yrs",
          min: 0,
          max: 20,
          hint: "of spending, moved to cash at the start",
        }),
        numberField({
          path: "portfolio_tax",
          label: "Tax on withdrawals",
          kind: "pct",
          min: 0,
          max: 0.9,
          help: "portfolio_tax",
          hint: "from the portfolio",
        }),
      ),
    ),
  );
  form.append(accountsGroup());
  form.append(incomeGroup());
  form.append(eventsGroup());
  form.append(
    group(
      "Markets",
      false,
      numberField({
        path: "stock_return",
        label: "Stock return (nominal median)",
        kind: "pct",
        min: -0.5,
        max: 1,
        slider: { min: 0, max: 12, step: 0.1 },
        hint: marketHint,
      }),
      numberField({
        path: "stock_vol",
        label: "Stock volatility (yearly spread)",
        kind: "pct",
        min: 0,
        max: 1,
        slider: { min: 5, max: 30, step: 0.5 },
        hint: "World stocks: about 15–18%. For a calmer portfolio, lower the stock share under Portfolio mix instead.",
      }),
      numberField({
        path: "inflation",
        label: "Inflation",
        kind: "pct",
        min: -0.2,
        max: 1,
        slider: { min: 0, max: 6, step: 0.1 },
        hint: "Turns the nominal inputs into today's money.",
      }),
      selectField({
        path: "fat_tails_df",
        label: "Extreme years",
        help: "_tails",
        options: () => [
          ["", "Normal distribution"],
          ["6", "Fat tails (t, 6)"],
          ["5", "Fat tails (t, 5)"],
          ["4", "Very fat tails (t, 4)"],
        ],
        show: {
          toKey: (v) => (v == null ? "" : String(v)),
          text: (v) =>
            ({
              "": "normal",
              6: "fat tails (t, 6)",
              5: "fat tails (t, 5)",
              4: "very fat tails (t, 4)",
            })[v ?? ""],
        },
        hint: "Fat tails make −40% years about 8× more frequent, with calmer ordinary years.",
        onchange: (v) => {
          state.fat_tails_df = v === "" ? null : Number(v);
        },
      }),
    ),
  );
  form.append(
    group(
      "Portfolio mix",
      false,
      numberField({
        path: "stock_share",
        label: "Stock share",
        kind: "pct",
        min: 0,
        max: 1,
        slider: { min: 0, max: 100, step: 5 },
        hint: () => mixHint(state.stock_share),
      }),
      numberField({
        path: "tent_share",
        label: "Stock share at the FIRE start",
        kind: "pct",
        min: 0,
        max: 1,
        slider: { min: 0, max: 100, step: 5 },
        hint: () =>
          state.tent_share < state.stock_share
            ? `Bond tent. ${mixHint(state.tent_share)}`
            : "Same as normal: no bond tent.",
      }),
      row2(
        numberField({
          path: "tent_years_before",
          label: "Years to get there",
          kind: "int",
          unit: "yrs",
          help: "tent_years",
          min: 0,
          max: 40,
        }),
        numberField({
          path: "tent_years_after",
          label: "Years back after",
          kind: "int",
          unit: "yrs",
          help: "tent_years",
          min: 0,
          max: 40,
        }),
      ),
      row2(
        numberField({
          path: "bond_return",
          label: "Bond return (nominal)",
          kind: "pct",
          min: -0.5,
          max: 1,
          hint: (v) => `${fmt.pct(realOf(v), 2)} real`,
        }),
        numberField({ path: "bond_vol", label: "Bond volatility", kind: "pct", min: 0, max: 1 }),
      ),
      numberField({
        path: "stock_bond_corr",
        label: "Stock/bond correlation",
        kind: "num",
        unit: "",
        min: -1,
        max: 1,
        hint: "0 = independent; −1…1",
      }),
    ),
  );
  form.append(stressGroup());
  form.append(
    group(
      "Simulation",
      false,
      row2(
        numberField({
          path: "start_year",
          label: "Balances as of",
          kind: "year",
          min: 1900,
          max: 2200,
        }),
        numberField({
          path: "start_month",
          label: "… month (1–12)",
          kind: "int",
          unit: "",
          min: 1,
          max: 12,
          hint: "Only the rest of that year still grows and saves.",
        }),
      ),
      selectField({
        path: "n_sims",
        label: "Simulated futures",
        setting: true,
        options: () => {
          const opts = [1000, 5000, 10000, 25000, 50000];
          if (!opts.includes(settings.n_sims)) opts.push(settings.n_sims);
          return opts.sort((a, b) => a - b).map((n) => [String(n), fmt.num(n)]);
        },
        hint: "10,000: within about ±1 point, 19 times in 20. The grid and safe spending use at most 4,000, for speed.",
        onchange: (v) => {
          settings.n_sims = Number(v);
          store.saveSettings(settings);
        },
      }),
      row2(
        numberField({
          path: "seed",
          label: "Random seed",
          kind: "int",
          unit: "",
          setting: true,
          min: 0,
          max: store.SEEDS - 1,
          onchange: () => store.saveSettings(settings),
        }),
        selectField({
          path: "locale",
          label: "Number format",
          setting: true,
          options: () => LOCALES,
          onchange: (v) => {
            settings.locale = v;
            store.saveSettings(settings);
            refreshFormat();
            rebuild();
          },
        }),
      ),
      addButtons(["New seed", newSeed]),
      el("div", {
        class: "hint",
        text: "The seed, the number of futures and the number format belong to this browser, not to a plan: switching plans keeps the same futures.",
      }),
    ),
  );
  syncAll();
  renderPlanBar();
  if (focused) document.getElementById(focused)?.focus();
}
function rebuild() {
  buildForm();
}

function afterAdd(list) {
  rebuild();
  changed();
  const id = `f-${list}-${state[list].length - 1}-name`;
  const input = document.getElementById(id);
  input?.closest(".item")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  input?.focus();
  input?.select();
}
function addItem(list, item) {
  state[list].push(item);
  afterAdd(list);
}
function addPerson() {
  state.people.push(newPerson(state));
  afterAdd("people");
}
// Moving an item to another place in its list changes no result, only the order things are shown
// in (for people, also in the charts' ages) and, for the first person, who a new account or
// pension starts out with.
const moving = (list, i) => ({
  index: i,
  count: state[list].length,
  move: (to) => {
    state[list].splice(to, 0, ...state[list].splice(i, 1));
    rebuild();
    changed();
    return [...document.querySelectorAll(`#form [data-list="${list}"] > .fields > .item`)];
  },
});
function removeItem(list, i) {
  const before = snapshot();
  const [gone] = state[list].splice(i, 1);
  rebuild();
  changed();
  toast(`Removed “${gone.name}”.`, { undo: () => restore(before) });
}

// A person goes with their accounts and the income lines tied to their age.
function removePerson(i) {
  const before = snapshot();
  const [gone] = state.people.splice(i, 1);
  const ownsAccount = (a) => a.owner === gone.id;
  const tied = (s) => s.from?.person === gone.id || s.to?.person === gone.id;
  const nAcc = state.accounts.filter(ownsAccount).length;
  const nInc = state.income.filter(tied).length;
  state.accounts = state.accounts.filter((a) => !ownsAccount(a));
  state.income = state.income.filter((s) => !tied(s));
  if (state.end_person === gone.id) state.end_person = state.people[0].id;
  rebuild();
  changed();
  const also = [
    nAcc && `${nAcc} account${nAcc > 1 ? "s" : ""}`,
    nInc && `${nInc} income line${nInc > 1 ? "s" : ""}`,
  ].filter(Boolean);
  toast(`Removed ${gone.name}${also.length ? `, with ${also.join(" and ")}` : ""}.`, {
    undo: () => restore(before),
  });
}

export function newSeed() {
  let seed;
  do seed = 1 + Math.floor(Math.random() * 99_999);
  while (seed === settings.seed);
  settings.seed = seed;
  store.saveSettings(settings);
  changed();
}
