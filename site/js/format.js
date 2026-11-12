/**
 * Numbers on screen: in the viewer's number format (or one they pick) and the plan's currency.
 * Also the reverse, reading what someone typed, which in many locales means "1.234,5".
 */
import { t } from "./i18n.js";

export const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CHF",
  "CAD",
  "AUD",
  "NZD",
  "JPY",
  "SEK",
  "NOK",
  "DKK",
  "PLN",
  "CZK",
  "HUF",
  "SGD",
  "HKD",
  "INR",
  "ZAR",
  "BRL",
  "MXN",
  "ILS",
  "KRW",
  "CNY",
  "TRY",
  "AED",
];

// Number formats to pick from, each shown the way this browser writes it.
export const LOCALES = [
  ["", t("format.browserDefault")],
  ...[
    "en-US",
    "en-GB",
    "de-DE",
    "de-CH",
    "fr-FR",
    "fr-CH",
    "it-IT",
    "es-ES",
    "nl-NL",
    "sv-SE",
    "en-IN",
    "ja-JP",
  ].map((loc) => {
    let sample = loc;
    try {
      sample = new Intl.NumberFormat(loc).format(1234567.89);
    } catch {
      /* unknown to this browser */
    }
    return [loc, `${sample} (${loc})`];
  }),
];

export function currencyName(code, locale) {
  try {
    return new Intl.DisplayNames(locale || undefined, { type: "currency" }).of(code);
  } catch {
    return code;
  }
}

/** Formatting and parsing for one number format and currency. */
export function makeFormat(locale, currency) {
  let loc = locale || globalThis.navigator?.language || "en-US";
  try {
    new Intl.NumberFormat(loc);
  } catch {
    loc = "en-US";
  }
  const whole = new Intl.NumberFormat(loc, { maximumFractionDigits: 0 });
  const parts = new Intl.NumberFormat(loc).formatToParts(1234567.5);
  const group = parts.find((p) => p.type === "group")?.value ?? ",";
  const decimal = parts.find((p) => p.type === "decimal")?.value ?? ".";
  const money = new Intl.NumberFormat(loc, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
  const compact = new Intl.NumberFormat(loc, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    notation: "compact",
    maximumSignificantDigits: 3,
  });
  // Some languages (German, for one) only abbreviate millions: below that, whole amounts.
  const thousands = compact.formatToParts(1500).some((p) => p.type === "compact");
  const symbol = money.formatToParts(1).find((p) => p.type === "currency")?.value ?? currency;
  const dash = "–";
  const ok = (v) => v != null && Number.isFinite(v);

  /** A typed number, or NaN. `kind` "pct" also accepts either decimal mark; money takes k/M. */
  function parse(s, kind = "num") {
    let x = String(s)
      .trim()
      .replace(/[\s\u00a0\u202f'’]/g, "")
      .replace(/[−–]/g, "-");
    if (!x || x === "-") return NaN;
    let mult = 1;
    const m = /^(.*?)([kKmM])$/.exec(x);
    if (m && kind === "money") {
      x = m[1];
      mult = /[kK]/.test(m[2]) ? 1e3 : 1e6;
    }
    if (kind === "pct") x = x.replace(",", ".");
    else {
      if (group === "." || group === ",") x = x.split(group).join("");
      if (decimal !== ".") x = x.replace(decimal, ".");
    }
    if (!/^-?(\d+\.?\d*|\.\d+)$/.test(x)) return NaN;
    return Number(x) * mult;
  }

  // Commas, semicolons or spaces separate a list. Where the decimal mark is a comma, a comma right
  // before a digit is that mark: "-12,5, -20" is two numbers.
  const listSep = decimal === "," ? /[;\s]+|,(?=[\s\-−–])/ : /[;\s]+|,(?=[\s\-−–\d])/;

  return {
    locale: loc,
    currency,
    symbol,
    group,
    decimal,
    /** Plotly's `separators`: the decimal mark, then the thousands mark. */
    plotly: decimal + (group.trim() ? group : " "),
    num: (v) => (ok(v) ? whole.format(Math.round(v)) : dash),
    money: (v) => (ok(v) ? money.format(Math.round(v)) : dash),
    /** 1.23M-style, three digits, for tiles and chart labels. */
    short: (v) =>
      !ok(v)
        ? dash
        : Math.abs(v) < 1e6 && !thousands
          ? money.format(Math.round(v))
          : compact.format(v),
    pct: (v, d = 0) => (ok(v) ? `${(v * 100).toFixed(d).replace(".", decimal)}%` : dash),
    parse,
    /** A typed list of numbers ("-15, -20, -25"), each read by `parse`: NaN where one isn't. */
    parseList: (s, kind = "num") =>
      String(s)
        .split(listSep)
        .filter(Boolean)
        .map((x) => parse(x, kind)),
  };
}
