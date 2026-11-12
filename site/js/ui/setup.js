// Setting up a new plan: the essentials in one dialog; everything else starts from the defaults.
import { endYear } from "../engine.js";
import { CURRENCIES, currencyName, makeFormat } from "../format.js";
import { t } from "../i18n.js";
import {
  DEFAULT_CURRENCY,
  LIMITS,
  RULE_DEFAULTS,
  bandAround,
  blankPlan,
  normalize,
  uid,
} from "../plan.js";
import { $, el } from "./dom.js";
import { toast } from "./messages.js";
import { addPlan, nameProblem, switchTo, uniqueName } from "./plans.js";
import { fmt, settings, state, today } from "./state.js";

export function openSetup() {
  const now = today();
  const y = now.getFullYear();
  const people = [{ name: t("plan.me"), born: y - 35, pension: "", age: 67 }];
  const money = {
    currency: state?.currency ?? DEFAULT_CURRENCY,
    portfolio: "",
    cash: "",
    contrib: "",
    spending: "",
    fire: String(y + 15),
    name: uniqueName(t("setup.defaultName")),
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
      ...CURRENCIES.map((c) =>
        el("option", { value: c, text: `${c} · ${currencyName(c, fmt.locale)}` }),
      ),
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
        field(t("form.name"), text(p, "name", { maxlength: 40 })),
        field(t("form.person.born"), text(p, "born", { inputmode: "numeric" })),
        field(
          t("setup.pension"),
          text(p, "pension", { inputmode: "decimal", placeholder: t("setup.optional") }),
        ),
        field(t("setup.pensionAge"), text(p, "age", { inputmode: "numeric" })),
        people.length > 1
          ? el(
              "button",
              {
                type: "button",
                class: "btn quiet small",
                "aria-label": t("item.removeNamed", { name: p.name }),
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
        field(t("setup.name"), text(money, "name", { maxlength: 60 })),
        field(t("form.currency"), cur),
      ),
      el("h3", { text: t("setup.household") }),
      ...rows,
      el(
        "button",
        {
          type: "button",
          class: "btn small",
          disabled: people.length >= LIMITS.people,
          title:
            people.length >= LIMITS.people ? t("form.full.people", { n: LIMITS.people }) : null,
          onclick: () => {
            people.push({
              name: t("plan.person", { n: people.length + 1 }),
              born: String(y - 35),
              pension: "",
              age: 67,
            });
            render();
          },
        },
        t("form.add.person"),
      ),
      el("h3", { text: t("setup.money") }),
      el(
        "div",
        { class: "setup-grid" },
        field(
          t("setup.portfolio.in", { currency: money.currency }),
          text(money, "portfolio", { inputmode: "decimal", placeholder: "0" }),
          t("setup.portfolio.hint"),
        ),
        field(
          t("setup.cash.in", { currency: money.currency }),
          text(money, "cash", { inputmode: "decimal", placeholder: "0" }),
        ),
        field(
          t("setup.contrib.in", { currency: money.currency }),
          text(money, "contrib", { inputmode: "decimal", placeholder: "0" }),
          t("setup.contrib.hint"),
        ),
        field(
          t("setup.spending.in", { currency: money.currency }),
          text(money, "spending", { inputmode: "decimal" }),
          t("setup.spending.hint"),
        ),
        field(t("setup.fire"), text(money, "fire", { inputmode: "numeric" }), t("setup.fire.hint")),
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
        if (required) throw new Error(t("setup.error.noAmount", { label }));
        return 0;
      }
      const v = F.parse(s, "money");
      if (!(v >= 0)) throw new Error(t("setup.error.notAmount", { label, text: s }));
      return v;
    };
    try {
      const plan = blankPlan({ currency: money.currency, today: now });
      plan.people = people.map((p, i) => {
        const born = Math.round(F.parse(p.born, "num"));
        const name = p.name.trim() || t("plan.person", { n: i + 1 });
        if (!(born >= 1900 && born <= y))
          throw new Error(t("setup.error.born", { name: p.name || name, from: 1900, to: y }));
        return { id: uid(), name, birth_year: born };
      });
      plan.income = people.flatMap((p, i) => {
        const who = plan.people[i].name;
        const v = amount(p.pension, t("plan.statePensionOf", { name: who }));
        const age = Math.round(F.parse(p.age, "num"));
        if (!v) return [];
        if (!(age >= 40 && age <= 90))
          throw new Error(t("setup.error.pensionAge", { name: who, from: 40, to: 90 }));
        const name =
          people.length > 1 ? t("plan.statePensionOf", { name: who }) : t("plan.statePension");
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
      plan.portfolio = amount(money.portfolio, t("setup.portfolio"));
      plan.cash = amount(money.cash, t("setup.cash"));
      plan.contrib = amount(money.contrib, t("setup.contrib"));
      plan.spending = amount(money.spending, t("setup.spending"), true);
      if (!(plan.spending > 0)) throw new Error(t("setup.error.spending"));
      plan.fire_year = Math.round(F.parse(money.fire, "num"));
      if (!(plan.fire_year >= y && plan.fire_year < endYear(plan)))
        throw new Error(t("setup.error.fire", { year: y }));
      plan.rule = { ...RULE_DEFAULTS, ...bandAround(plan.spending) };
      const name = money.name.trim() || t("setup.defaultName");
      const msg = nameProblem(name);
      if (msg) throw new Error(msg);
      $("#setup-dialog").close();
      const p = addPlan(name, normalize(plan, { currency: plan.currency, today: now }));
      switchTo(p.id);
      toast(t("setup.created", { name: p.name }));
    } catch (err) {
      $("#setup-error").textContent = err.message;
    }
  };
  $("#setup-dialog").showModal();
}
