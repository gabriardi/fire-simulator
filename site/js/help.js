// The guide: its sections, in order, each with the keys of its cards. The texts, in each
// language, are in locales/<language>/help.js; a "?" whose key isn't there shows the entry its
// alias names.
import { t } from "./i18n.js";

export const ALIASES = { end_age: "end_person", start_month: "start_year" };

export const GUIDE = [
  [
    t("guide.basics"),
    [
      "concept.todays-money",
      "concept.monte-carlo",
      "concept.sequence",
      "concept.swr",
      "concept.privacy",
    ],
  ],
  [t("guide.plans"), ["plans", "backup", "share", "files"]],
  [t("guide.plan"), ["fire_year", "spending", "end_person"]],
  [
    t("guide.rules"),
    [
      "rule.fixed",
      "rule.guardrails",
      "rule.vanguard",
      "rule.spenddown",
      "rule.floor",
      "rule.ceiling",
      "rule.band",
      "rule.adjust",
      "rule.up",
      "rule.down",
      "rule.assumed_return",
      "rule.max_raise",
      "rule.max_cut",
    ],
  ],
  [t("guide.household"), ["currency", "people"]],
  [
    t("guide.savings"),
    [
      "portfolio",
      "cash",
      "contrib",
      "contrib_growth",
      "cash_interest",
      "cash_buffer_years",
      "portfolio_tax",
    ],
  ],
  [
    t("guide.accounts"),
    ["accounts", "account.contrib", "account.growth", "account.unlock_age", "account.tax"],
  ],
  [t("guide.income"), ["income", "income.when", "income.indexed", "income.change", "events"]],
  [t("guide.markets"), ["stock_return", "stock_vol", "inflation", "_tails"]],
  [
    t("guide.mix"),
    ["stock_share", "tent_share", "tent_years", "bond_return", "bond_vol", "stock_bond_corr"],
  ],
  [t("guide.stress"), ["_stress", "stress-custom"]],
  [t("guide.simulation"), ["n_sims", "seed", "start_year", "locale"]],
  [
    t("guide.results"),
    [
      "result.success",
      "result.start",
      "result.first",
      "result.rate",
      "result.fail",
      "result.end",
      "result.flex",
      "result.compare",
    ],
  ],
  [
    t("guide.charts"),
    ["chart.paths", "chart.spending", "chart.grid", "chart.safe", "chart.stress", "chart.dist"],
  ],
  [t("guide.about"), ["concept.about"]],
];
