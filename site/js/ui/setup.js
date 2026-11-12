// Setting up a new plan: the essentials in one dialog; everything else starts from the defaults.
import { endYear } from "../engine.js";
import { CURRENCIES, currencyName, makeFormat } from "../format.js";
import { DEFAULT_CURRENCY, LIMITS, RULE_DEFAULTS, bandAround, blankPlan, normalize, uid } from "../plan.js";
import { $, el } from "./dom.js";
import { toast } from "./messages.js";
import { addPlan, nameProblem, switchTo, uniqueName } from "./plans.js";
import { fmt, settings, state, today } from "./state.js";

export function openSetup() {
  const now = today();
  const y = now.getFullYear();
  const people = [{ name: "Me", born: y - 35, pension: "", age: 67 }];
  const money = {
    currency: state?.currency ?? DEFAULT_CURRENCY,
    portfolio: "",
    cash: "",
    contrib: "",
    spending: "",
    fire: String(y + 15),
    name: uniqueName("My plan"),
  };
  const wrap = $("#setup-fields");
  const f = () => makeFormat(settings.locale, money.currency);
  const field = (label, input, hint) =>
    el(
      "label",
      { class: "setup-field" },
      el("span", { text: label }),
      input,
      hint ? el("small", { text: hint }) : null,
    );
  const text = (obj, key, attrs = {}) => {
    const i = el("input", { type: "text", value: obj[key] ?? "", ...attrs });
    i.addEventListener("input", () => {
      obj[key] = i.value;
    });
    return i;
  };
  const render = () => {
    const cur = el(
      "select",
      {},
      ...CURRENCIES.map((c) => el("option", { value: c, text: `${c} · ${currencyName(c, fmt.locale)}` })),
    );
    cur.value = money.currency;
    cur.addEventListener("change", () => {
      money.currency = cur.value;
      render();
    });
    const rows = people.map((p, i) =>
      el(
        "div",
        { class: "setup-person" },
        field("Name", text(p, "name", { maxlength: 40 })),
        field("Born", text(p, "born", { inputmode: "numeric" })),
        field("State pension / yr", text(p, "pension", { inputmode: "decimal", placeholder: "optional" })),
        field("from age", text(p, "age", { inputmode: "numeric" })),
        people.length > 1
          ? el(
              "button",
              {
                type: "button",
                class: "btn quiet small",
                "aria-label": `Remove ${p.name}`,
                onclick: () => {
                  people.splice(i, 1);
                  render();
                },
              },
              "×",
            )
          : el("span"),
      ),
    );
    wrap.replaceChildren(
      el(
        "div",
        { class: "setup-grid" },
        field("Plan name", text(money, "name", { maxlength: 60 })),
        field("Currency", cur),
      ),
      el("h3", { text: "Who's in the household" }),
      ...rows,
      el(
        "button",
        {
          type: "button",
          class: "btn small",
          disabled: people.length >= LIMITS.people,
          title: people.length >= LIMITS.people ? `A plan holds up to ${LIMITS.people} people.` : null,
          onclick: () => {
            people.push({ name: `Person ${people.length + 1}`, born: String(y - 35), pension: "", age: 67 });
            render();
          },
        },
        "Add person",
      ),
      el("h3", { text: "Money" }),
      el(
        "div",
        { class: "setup-grid" },
        field(
          `Invested today (${money.currency})`,
          text(money, "portfolio", { inputmode: "decimal", placeholder: "0" }),
          "funds, shares: what you could sell",
        ),
        field(`Cash today (${money.currency})`, text(money, "cash", { inputmode: "decimal", placeholder: "0" })),
        field(
          `Saved per year (${money.currency})`,
          text(money, "contrib", { inputmode: "decimal", placeholder: "0" }),
          "until you stop working",
        ),
        field(
          `Spending per year (${money.currency})`,
          text(money, "spending", { inputmode: "decimal" }),
          "once you stop, today's money, taxes included",
        ),
        field("Stop working in", text(money, "fire", { inputmode: "numeric" }), "the FIRE start, a year"),
      ),
    );
  };
  render();
  $("#setup-error").textContent = "";
  $("#setup-form").onsubmit = (e) => {
    e.preventDefault();
    const F = f();
    const amount = (s, label, required = false) => {
      if (!String(s).trim()) {
        if (required) throw new Error(`${label}: enter an amount.`);
        return 0;
      }
      const v = F.parse(s, "money");
      if (!(v >= 0)) throw new Error(`${label}: “${s}” isn't an amount.`);
      return v;
    };
    try {
      const plan = blankPlan({ currency: money.currency, today: now });
      plan.people = people.map((p, i) => {
        const born = Math.round(F.parse(p.born, "num"));
        if (!(born >= 1900 && born <= y))
          throw new Error(`${p.name || `Person ${i + 1}`}: the birth year should be between 1900 and ${y}.`);
        return { id: uid(), name: p.name.trim() || `Person ${i + 1}`, birth_year: born };
      });
      plan.income = people.flatMap((p, i) => {
        const v = amount(p.pension, `${plan.people[i].name}'s state pension`);
        const age = Math.round(F.parse(p.age, "num"));
        if (!v) return [];
        if (!(age >= 40 && age <= 90))
          throw new Error(`${plan.people[i].name}'s state pension: the age should be between 40 and 90.`);
        const name = people.length > 1 ? `State pension (${plan.people[i].name})` : "State pension";
        return [
          {
            id: uid(),
            name,
            amount: v,
            from: { kind: "age", person: plan.people[i].id, value: age },
            to: null,
            indexed: true,
          },
        ];
      });
      plan.end_person = [...plan.people].sort((a, b) => b.birth_year - a.birth_year)[0].id;
      plan.portfolio = amount(money.portfolio, "Invested today");
      plan.cash = amount(money.cash, "Cash today");
      plan.contrib = amount(money.contrib, "Saved per year");
      plan.spending = amount(money.spending, "Spending per year", true);
      if (!(plan.spending > 0)) throw new Error("Spending per year: it has to be more than 0.");
      plan.fire_year = Math.round(F.parse(money.fire, "num"));
      if (!(plan.fire_year >= y && plan.fire_year < endYear(plan)))
        throw new Error(`Stop working in: a year from ${y} on.`);
      plan.rule = { ...RULE_DEFAULTS, ...bandAround(plan.spending) };
      const name = money.name.trim() || "My plan";
      const msg = nameProblem(name);
      if (msg) throw new Error(msg);
      $("#setup-dialog").close();
      const p = addPlan(name, normalize(plan, { currency: plan.currency, today: now }));
      switchTo(p.id);
      toast(`Created “${p.name}”. Add retirement accounts, income and one-off events in the panel.`);
    } catch (err) {
      $("#setup-error").textContent = err.message;
    }
  };
  $("#setup-dialog").showModal();
}
