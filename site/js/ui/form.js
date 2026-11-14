// The parameter form, section by section, and adding or removing people, accounts, income lines
// and events.
import { RULE_KINDS, endYear, lognormal, mixStats, personById } from "../engine.js";
import { CURRENCIES, LOCALES, currencyName } from "../format.js";
import { andList, t } from "../i18n.js";
import {
  LIMITS,
  bandAround,
  bandFollows,
  newAccount,
  newEvent,
  newIncome,
  newPerson,
} from "../plan.js";
import * as store from "../store.js";
import { STRESS_SCENARIOS, niceStep } from "../views.js";
import { $, clone, el } from "./dom.js";
import {
  FIELDS,
  addButtons,
  ages,
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

function ruleGroup() {
  const seg = el("div", { class: "seg", role: "group", "aria-label": t("form.rule") });
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
        t(`rule.short.${k}`),
      ),
    );
  }
  const hintEl = el("div", { class: "hint" });
  const ruleHelp = helpBtn("rule.fixed");
  const flexible = row2(
    numberField({
      path: "rule.floor",
      label: t("form.floor"),
      hint: t("form.floor.hint"),
      min: 0,
    }),
    numberField({
      path: "rule.ceiling",
      label: t("form.ceiling"),
      hint: t("form.ceiling.hint"),
      min: 0,
    }),
  );
  const guard = row2(
    numberField({
      path: "rule.band",
      label: t("form.band"),
      kind: "pct",
      min: 0.001,
      max: 0.99,
    }),
    numberField({
      path: "rule.adjust",
      label: t("form.adjust"),
      kind: "pct",
      min: 0.001,
      max: 0.99,
    }),
  );
  const vang = row2(
    numberField({ path: "rule.up", label: t("form.maxRaise"), kind: "pct", min: 0, max: 0.99 }),
    numberField({ path: "rule.down", label: t("form.maxCut"), kind: "pct", min: 0, max: 0.99 }),
  );
  const down = el(
    "div",
    { class: "stack" },
    numberField({
      path: "rule.assumed_return",
      label: t("form.assumedReturn"),
      kind: "pct",
      what: t("form.assumedReturn.what"),
      min: -0.09,
      max: 0.19,
      // Compared with the portfolio's compound real return at its usual stock share (a bond tent
      // is only for a few years): spending tends to stay level when the two are close.
      hint: (v) => {
        const m = mixStats(state, state.stock_share).compound;
        const pct = fmt.pct(m, 2);
        if (v < m - 0.0025) return t("form.assumedReturn.below", { pct });
        if (v > m + 0.0025) return t("form.assumedReturn.above", { pct });
        return t("form.assumedReturn.level", { pct });
      },
    }),
    row2(
      numberField({
        path: "rule.max_raise",
        label: t("form.maxRaise"),
        kind: "pct",
        what: t("form.maxRaise.what"),
        min: 0,
        max: 0.99,
      }),
      numberField({
        path: "rule.max_cut",
        label: t("form.maxCut"),
        kind: "pct",
        what: t("form.maxCut.what"),
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
  FIELDS.push({ path: "rule.kind", label: t("form.rule"), node: kindField });
  syncers.push(() => {
    const k = state.rule.kind;
    seg
      .querySelectorAll("button")
      .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.kind === k)));
    hintEl.textContent = t(`rule.hint.${k}`);
    ruleHelp.dataset.help = `rule.${k}`;
    ruleHelp.setAttribute("aria-label", t("help.explain", { title: helpEntry(`rule.${k}`).title }));
    flexible.classList.toggle("hidden", k === "fixed");
    guard.classList.toggle("hidden", k !== "guardrails");
    vang.classList.toggle("hidden", k !== "vanguard");
    down.classList.toggle("hidden", k !== "spenddown");
  });
  return group("rule", true, kindField, flexible, guard, vang, down);
}

function stressGroup() {
  const custom = el("input", {
    type: "text",
    id: "f-stress-custom",
    inputmode: "text",
    placeholder: "-15, -20, -25",
    "aria-label": t("form.crash.custom.aria"),
  });
  const customBox = el(
    "div",
    { class: "field" },
    el(
      "div",
      { class: "field-head" },
      el("label", { for: custom.id, text: t("form.crash.custom") }),
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
  const sel = selectField({
    path: "stress_returns",
    label: t("form.crash"),
    help: "_stress",
    what: t("form.crash.what"),
    options: () => [
      ...STRESS_SCENARIOS.map((s, i) => [String(i), t(`stress.label.${s.id}`)]),
      ["custom", t("form.crash.customOption")],
    ],
    toKey: (r) => {
      const i = STRESS_SCENARIOS.findIndex((s) => keyOf(s.returns) === keyOf(r));
      return wantCustom || i < 0 ? "custom" : String(i);
    },
    hint: t("form.crash.hint"),
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
  return group("stress", false, sel, customBox);
}

function marketHint(nominal) {
  // The model's distribution: median 1+g, standard deviation stock_vol.
  const g = realOf(nominal);
  const [mu, s] = lognormal(1 + g, state.stock_vol);
  const at = (z) => Math.exp(mu + s * z) - 1;
  return t("form.stockReturn.hint", {
    median: fmt.pct(g, 2),
    low: fmt.pct(at(-1)),
    high: fmt.pct(at(1)),
    lowest: fmt.pct(at(-1.96)),
    highest: fmt.pct(at(1.96)),
  });
}
const mixHint = (w) => {
  const m = mixStats(state, w);
  return t("form.mix", { compound: fmt.pct(m.compound, 2), vol: fmt.pct(m.vol, 1) });
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
const bandIsAuto = (spending) => bandFollows(state.rule, spending);
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

// A list that's full says so, instead of leaving a greyed-out button to puzzle over.
const fullNote = (list) =>
  state[list].length >= LIMITS[list]
    ? el("div", { class: "hint", text: t(`form.full.${list}`, { n: LIMITS[list] }) })
    : null;

function peopleGroup() {
  const cards = state.people.map((x, i) =>
    itemCard(
      {
        title: () => state.people[i]?.name || t("plan.person", { n: i + 1 }),
        key: x.id,
        move: moving("people", i),
        onremove: state.people.length > 1 ? () => removePerson(i) : null,
        removeLabel: t("item.removeNamed", { name: x.name }),
      },
      row2(
        textField({
          path: `people.${i}.name`,
          label: t("form.name"),
          what: t("form.person.name.what", { n: i + 1 }),
          oncommit: rebuild,
        }),
        numberField({
          path: `people.${i}.birth_year`,
          label: t("form.person.born"),
          kind: "year",
          what: t("form.person.born.what", { name: x.name }),
          help: "people",
          min: 1900,
          max: 2100,
          hint: (v) =>
            t("form.person.born.hint", { age: state.start_year - v, year: state.start_year }),
        }),
      ),
    ),
  );
  return group(
    "household",
    { open: true, list: "people" },
    selectField({
      path: "currency",
      label: t("form.currency"),
      options: () => {
        const list = CURRENCIES.includes(state.currency)
          ? CURRENCIES
          : [state.currency, ...CURRENCIES];
        return list.map((c) => [c, `${c} · ${currencyName(c, fmt.words)}`]);
      },
      onchange: (v) => {
        state.currency = v;
        refreshFormat();
      },
    }),
    ...cards,
    addButtons([t("form.add.person"), addPerson, state.people.length >= LIMITS.people]),
    fullNote("people"),
  );
}

function accountsGroup() {
  const owners = () => state.people.map((p) => [p.id, p.name]);
  const cards = state.accounts.map((a, i) => {
    const P = `accounts.${i}`;
    const interest = numberField({
      path: `${P}.interest`,
      label: t("form.account.interest"),
      kind: "pct",
      what: t("form.account.interest.what", { name: state.accounts[i]?.name }),
      help: "account.growth",
      min: -0.5,
      max: 1,
      hint: (v) => t("form.real", { pct: fmt.pct(realOf(v), 1) }),
    });
    syncers.push(() => interest.classList.toggle("hidden", state.accounts[i]?.growth !== "fixed"));
    return itemCard(
      {
        title: () => state.accounts[i]?.name || t("form.account.untitled"),
        key: a.id,
        move: moving("accounts", i),
        onremove: () => removeItem("accounts", i),
        removeLabel: t("item.removeNamed", { name: a.name }),
      },
      row2(
        textField({
          path: `${P}.name`,
          label: t("form.name"),
          what: t("form.account.name.what"),
          oncommit: rebuild,
        }),
        selectField({
          path: `${P}.owner`,
          label: t("form.account.owner"),
          what: t("form.account.owner.what", { name: a.name }),
          help: "accounts",
          options: owners,
        }),
      ),
      row2(
        numberField({
          path: `${P}.balance`,
          label: t("form.account.balance"),
          what: t("form.account.balance.what", { name: a.name }),
          help: "accounts",
          min: 0,
        }),
        numberField({
          path: `${P}.contrib`,
          label: t("form.account.contrib"),
          what: t("form.account.contrib.what", { name: a.name }),
          help: "account.contrib",
          min: 0,
        }),
      ),
      row2(
        selectField({
          path: `${P}.growth`,
          label: t("form.account.growth"),
          what: t("form.account.growth.what", { name: a.name }),
          help: "account.growth",
          options: () => [
            ["portfolio", t("form.account.growth.portfolio")],
            ["fixed", t("form.account.growth.fixed")],
          ],
        }),
        interest,
      ),
      row2(
        numberField({
          path: `${P}.unlock_age`,
          label: t("form.account.unlock"),
          kind: "int",
          unit: t("unit.years"),
          what: t("form.account.unlock.what", { name: a.name }),
          help: "account.unlock_age",
          min: 0,
          max: 125,
          hint: (v) =>
            t("form.inYear", { year: personById(state, state.accounts[i]?.owner).birth_year + v }),
        }),
        numberField({
          path: `${P}.tax`,
          label: t("form.account.tax"),
          kind: "pct",
          what: t("form.account.tax.what", { name: a.name }),
          help: "account.tax",
          min: 0,
          max: 0.9,
        }),
      ),
    );
  });
  return group(
    "accounts",
    { open: state.accounts.length > 0, list: "accounts" },
    el(
      "div",
      { class: "hint-row" },
      el("div", { class: "hint", text: t("form.accounts.hint") }),
      helpBtn("accounts"),
    ),
    ...cards,
    addButtons([
      t("form.add.account"),
      () => addItem("accounts", newAccount(state)),
      state.accounts.length >= LIMITS.accounts,
    ]),
    fullNote("accounts"),
  );
}

/** How an income line moves each year: one of three ways, with a % only for the middle one. */
const lineMode = (s) => (s?.indexed === false ? "fixed" : s?.change == null ? "inflation" : "gap");

function indexedField(i) {
  return selectField({
    path: `income.${i}.indexed`,
    label: t("form.income.indexed"),
    what: t("form.income.indexed.what", { name: state.income[i].name }),
    help: "income.indexed",
    options: () => [
      ["inflation", t("form.income.indexed.inflation")],
      ["gap", t("form.income.indexed.gap")],
      ["fixed", t("form.income.indexed.fixed")],
    ],
    toKey: () => lineMode(state.income[i]),
    onchange: (k) => {
      const s = state.income[i];
      s.indexed = k !== "fixed";
      s.change = k === "gap" ? (s.change ?? 0) : null;
    },
    hint: () => {
      const mode = lineMode(state.income[i]);
      if (mode === "inflation") return t("form.income.indexed.hint.inflation");
      if (mode === "fixed") return t("form.income.indexed.hint.fixed");
      return "";
    },
  });
}

/**
 * How much faster (or, negative, slower) than inflation a line rises, shown only when it's set
 * to. Its hint says it in words, with what the line is worth in 10 years.
 */
function changeField(i) {
  const node = numberField({
    path: `income.${i}.change`,
    label: t("form.income.change"),
    what: t("form.income.change.what", { name: state.income[i].name }),
    help: "income.indexed",
    kind: "pct",
    unit: t("unit.pctPerYear"),
    min: -0.1,
    max: 0.1,
    hint: (v) => {
      const line = state.income[i];
      if (!line || !v) return t("form.income.change.flat");
      const a = Math.abs(v);
      const pct = fmt.pct(a, Math.round(a * 1000) % 10 ? 1 : 0);
      const amount = fmt.money(Math.abs(line.amount * (1 + v) ** 10));
      return v > 0
        ? t("form.income.change.up", { pct, amount })
        : t("form.income.change.down", { pct, amount });
    },
  });
  syncers.push(() => node.classList.toggle("hidden", lineMode(state.income[i]) !== "gap"));
  return node;
}

function incomeGroup() {
  const cards = state.income.map((s, i) => {
    const P = `income.${i}`;
    return itemCard(
      {
        title: () => state.income[i]?.name || t("form.income.untitled"),
        key: s.id,
        move: moving("income", i),
        onremove: () => removeItem("income", i),
        removeLabel: t("item.removeNamed", { name: s.name }),
      },
      row2(
        textField({
          path: `${P}.name`,
          label: t("form.name"),
          what: t("form.income.name.what"),
          oncommit: rebuild,
        }),
        numberField({
          path: `${P}.amount`,
          label: t("form.income.amount"),
          what: t("form.income.amount.what", { name: s.name }),
          help: "income",
          hint: (v) =>
            v >= 0
              ? t("form.income.amount.in", { amount: fmt.money(v / 12) })
              : t("form.income.amount.out", { amount: fmt.money(-v / 12) }),
        }),
      ),
      whenField({
        path: `${P}.from`,
        label: t("form.income.from"),
        what: t("form.income.from.what", { name: s.name }),
      }),
      whenField({
        path: `${P}.to`,
        label: t("form.income.to"),
        what: t("form.income.to.what", { name: s.name }),
        never: true,
      }),
      indexedField(i),
      changeField(i),
    );
  });
  const full = state.income.length >= LIMITS.income;
  return group(
    "income",
    { open: state.income.length > 0, list: "income" },
    el(
      "div",
      { class: "hint-row" },
      el("div", { class: "hint", text: t("form.income.hint") }),
      helpBtn("income"),
    ),
    ...cards,
    addButtons(
      [t("form.add.income"), () => addItem("income", newIncome(state)), full],
      [t("form.add.cost"), () => addItem("income", newIncome(state, true)), full],
    ),
    fullNote("income"),
  );
}

function eventsGroup() {
  const cards = state.events.map((e, i) =>
    itemCard(
      {
        title: () => state.events[i]?.name || t("form.event.untitled"),
        key: e.id,
        move: moving("events", i),
        onremove: () => removeItem("events", i),
        removeLabel: t("item.removeNamed", { name: e.name }),
      },
      textField({
        path: `events.${i}.name`,
        label: t("form.name"),
        what: t("form.event.name.what"),
        oncommit: rebuild,
      }),
      row2(
        numberField({
          path: `events.${i}.year`,
          label: t("form.event.year"),
          kind: "year",
          what: t("form.event.year.what", { name: e.name }),
          help: "events",
          min: 1900,
          max: 2300,
          hint: (v) => ages(v),
        }),
        numberField({
          path: `events.${i}.amount`,
          label: t("form.event.amount"),
          what: t("form.event.amount.what", { name: e.name }),
          help: "events",
          hint: (v) => (v >= 0 ? t("form.event.amount.in") : t("form.event.amount.out")),
        }),
      ),
    ),
  );
  return group(
    "events",
    { open: state.events.length > 0, list: "events" },
    el(
      "div",
      { class: "hint-row" },
      el("div", { class: "hint", text: t("form.events.hint") }),
      helpBtn("events"),
    ),
    ...cards,
    addButtons([
      t("form.add.event"),
      () => addItem("events", newEvent(state)),
      state.events.length >= LIMITS.events,
    ]),
    fullNote("events"),
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
      "plan",
      true,
      numberField({
        path: "fire_year",
        label: t("form.fireYear"),
        kind: "year",
        slider: () => ({
          min: state.start_year,
          max: Math.max(state.start_year + 1, Math.min(endYear(state) - 1, state.start_year + 50)),
        }),
        hint: (v) => t("form.fireYear.hint", { ages: ages(v) }),
      }),
      numberField({
        path: "spending",
        label: t("form.spending"),
        min: 0,
        slider: spendingSlider,
        onchange: followBand,
        hint: (v) => {
          if (state.rule.kind === "spenddown") return t("form.spending.spenddown");
          const month = fmt.money(v / 12);
          return bandByHand()
            ? t("form.spending.band", {
                month,
                floor: fmt.short(state.rule.floor),
                ceiling: fmt.short(state.rule.ceiling),
              })
            : t("form.spending.hint", { month });
        },
      }),
      row2(
        selectField({
          path: "end_person",
          label: t("form.endPerson"),
          options: () => state.people.map((x) => [x.id, x.name]),
          hint: () =>
            state.people.length > 1 && state.end_person !== youngest.id
              ? t("form.endPerson.youngest", { name: youngest.name })
              : "",
        }),
        numberField({
          path: "end_age",
          label: t("form.endAge"),
          kind: "int",
          unit: t("unit.years"),
          min: 1,
          max: 125,
          hint: () => t("form.inYear", { year: endYear(state) }),
        }),
      ),
    ),
  );
  form.append(ruleGroup());
  form.append(peopleGroup());
  form.append(
    group(
      "savings",
      true,
      numberField({ path: "portfolio", label: t("form.portfolio"), min: 0 }),
      numberField({ path: "cash", label: t("form.cash"), min: 0 }),
      numberField({
        path: "contrib",
        label: t("form.contrib"),
        min: 0,
        hint: (v) => t("form.contrib.hint", { month: fmt.money(v / 12) }),
      }),
      row2(
        numberField({
          path: "contrib_growth",
          label: t("form.contribGrowth"),
          kind: "pct",
          unit: t("unit.pctPerYear"),
          min: -0.5,
          max: 0.5,
          hint: t("form.contribGrowth.hint"),
        }),
        numberField({
          path: "cash_interest",
          label: t("form.cashInterest"),
          kind: "pct",
          min: -0.5,
          max: 1,
          hint: (v) => t("form.real", { pct: fmt.pct(realOf(v), 1) }),
        }),
      ),
      row2(
        numberField({
          path: "cash_buffer_years",
          label: t("form.cushion"),
          kind: "num",
          unit: t("unit.yrs"),
          min: 0,
          max: 20,
          hint: t("form.cushion.hint"),
        }),
        numberField({
          path: "portfolio_tax",
          label: t("form.portfolioTax"),
          kind: "pct",
          min: 0,
          max: 0.9,
          help: "portfolio_tax",
          hint: t("form.portfolioTax.hint"),
        }),
      ),
    ),
  );
  form.append(accountsGroup());
  form.append(incomeGroup());
  form.append(eventsGroup());
  form.append(
    group(
      "markets",
      false,
      numberField({
        path: "stock_return",
        label: t("form.stockReturn"),
        kind: "pct",
        min: -0.5,
        max: 1,
        slider: { min: 0, max: 12, step: 0.1 },
        hint: marketHint,
      }),
      numberField({
        path: "stock_vol",
        label: t("form.stockVol"),
        kind: "pct",
        min: 0,
        max: 1,
        slider: { min: 5, max: 30, step: 0.5 },
        hint: t("form.stockVol.hint"),
      }),
      numberField({
        path: "inflation",
        label: t("form.inflation"),
        kind: "pct",
        min: -0.2,
        max: 1,
        slider: { min: 0, max: 6, step: 0.1 },
        hint: t("form.inflation.hint"),
      }),
      selectField({
        path: "fat_tails_df",
        label: t("form.tails"),
        help: "_tails",
        options: () => [
          ["", t("form.tails.normal")],
          ["6", t("form.tails.fat", { df: 6 })],
          ["5", t("form.tails.fat", { df: 5 })],
          ["4", t("form.tails.veryFat", { df: 4 })],
        ],
        hint: t("form.tails.hint"),
        onchange: (v) => {
          state.fat_tails_df = v === "" ? null : Number(v);
        },
      }),
    ),
  );
  form.append(
    group(
      "mix",
      false,
      numberField({
        path: "stock_share",
        label: t("form.stockShare"),
        kind: "pct",
        min: 0,
        max: 1,
        slider: { min: 0, max: 100, step: 5 },
        hint: () => mixHint(state.stock_share),
      }),
      numberField({
        path: "tent_share",
        label: t("form.tentShare"),
        kind: "pct",
        min: 0,
        max: 1,
        slider: { min: 0, max: 100, step: 5 },
        hint: () =>
          state.tent_share < state.stock_share
            ? t("form.tentShare.tent", { mix: mixHint(state.tent_share) })
            : t("form.tentShare.none"),
      }),
      row2(
        numberField({
          path: "tent_years_before",
          label: t("form.tentBefore"),
          kind: "int",
          unit: t("unit.yrs"),
          help: "tent_years",
          min: 0,
          max: 40,
        }),
        numberField({
          path: "tent_years_after",
          label: t("form.tentAfter"),
          kind: "int",
          unit: t("unit.yrs"),
          help: "tent_years",
          min: 0,
          max: 40,
        }),
      ),
      row2(
        numberField({
          path: "bond_return",
          label: t("form.bondReturn"),
          kind: "pct",
          min: -0.5,
          max: 1,
          hint: (v) => t("form.real", { pct: fmt.pct(realOf(v), 2) }),
        }),
        numberField({
          path: "bond_vol",
          label: t("form.bondVol"),
          kind: "pct",
          min: 0,
          max: 1,
        }),
      ),
      numberField({
        path: "stock_bond_corr",
        label: t("form.corr"),
        kind: "num",
        unit: "",
        min: -1,
        max: 1,
        hint: t("form.corr.hint"),
      }),
    ),
  );
  form.append(stressGroup());
  form.append(
    group(
      "simulation",
      false,
      row2(
        numberField({
          path: "start_year",
          label: t("form.startYear"),
          kind: "year",
          min: 1900,
          max: 2200,
        }),
        numberField({
          path: "start_month",
          label: t("form.startMonth"),
          kind: "int",
          unit: "",
          min: 1,
          max: 12,
          hint: t("form.startMonth.hint"),
        }),
      ),
      selectField({
        path: "n_sims",
        label: t("form.nSims"),
        setting: true,
        options: () => {
          const opts = [1000, 5000, 10000, 25000, 50000];
          if (!opts.includes(settings.n_sims)) opts.push(settings.n_sims);
          return opts.sort((a, b) => a - b).map((n) => [String(n), fmt.num(n)]);
        },
        hint: t("form.nSims.hint"),
        onchange: (v) => {
          settings.n_sims = Number(v);
          store.saveSettings(settings);
        },
      }),
      row2(
        numberField({
          path: "seed",
          label: t("form.seed"),
          kind: "int",
          unit: "",
          setting: true,
          min: 0,
          max: store.SEEDS - 1,
          onchange: () => store.saveSettings(settings),
        }),
        selectField({
          path: "locale",
          label: t("form.locale"),
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
      addButtons([t("form.newSeed"), newSeed]),
      el("div", { class: "hint", text: t("form.simulation.hint") }),
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
  toast(t("form.removed", { name: gone.name }), { undo: () => restore(before) });
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
    nAcc && t("form.removedPerson.accounts", { n: nAcc }),
    nInc && t("form.removedPerson.incomes", { n: nInc }),
  ].filter(Boolean);
  toast(
    also.length
      ? t("form.removedPerson.with", { name: gone.name, also: andList(also) })
      : t("form.removedPerson", { name: gone.name }),
    { undo: () => restore(before) },
  );
}

export function newSeed() {
  let seed;
  do seed = 1 + Math.floor(Math.random() * 99_999);
  while (seed === settings.seed);
  settings.seed = seed;
  store.saveSettings(settings);
  changed();
}
