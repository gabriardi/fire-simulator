// Every text the site shows is in the catalog, by key, so it can be translated: the code's in
// site/js/locales/en/, the pages' marked in place (scripts/strings.js says where each kind is).
// These tests check that nothing shown is left out of it, that nothing in it is left unused, and
// that every other language has all of it, up to date.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { catalog, problemsOf } from "../scripts/strings.js";
import { RULE_KINDS } from "../site/js/engine.js";
import { LANGS } from "../site/js/i18n.js";
import { LIMITS } from "../site/js/plan.js";
import { STRESS_SCENARIOS } from "../site/js/views.js";
import messages from "../site/js/locales/en/messages.js";

const ROOT = new URL("../site/", import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), "utf8");
// The code: every module but the catalogs themselves.
const CODE = [
  ...readdirSync(new URL("js/", ROOT)).map((f) => `js/${f}`),
  ...readdirSync(new URL("js/ui/", ROOT)).map((f) => `js/ui/${f}`),
  "sw.js",
].filter((f) => f.endsWith(".js"));
const code = Object.fromEntries(CODE.map((f) => [f, read(f)]));

test("the English catalog holds every text on the pages, each key with one text", () => {
  const { strings, problems } = catalog();
  assert.deepEqual(problems, []);
  assert.ok(Object.keys(strings).length > 600, "the catalog was found");
});

for (const lang of LANGS.slice(1))
  test(`the ${lang} catalog has every English text, translated from the English as it is now`, async () => {
    // Every key, with the same values to fill in, the same markup and the forms per number its
    // language has; none whose English changed since (scripts/strings.js, `--translated`).
    assert.deepEqual(await problemsOf(lang), []);
  });

// ---- the code's messages -------------------------------------------------------------------------

// The keys the code asks for: as written (`t("plans.saved")`), and the start of those it builds
// (`t(\`rule.short.${kind}\`)`), which form a family below.
const used = new Set();
const built = new Set();
for (const src of Object.values(code)) {
  for (const m of src.matchAll(/\bt(?:Parts)?\(\s*"([^"]+)"/g)) used.add(m[1]);
  for (const m of src.matchAll(/\bt(?:Parts)?\(\s*`([^`$]*)\$\{/g)) built.add(m[1]);
}
// The pages use some of the messages too (a title the code changes, a button's first text).
const onPages = new Set(
  ["index.html", "privacy.html"].flatMap((p) =>
    [...read(p).matchAll(/data-i18n(?:-[\w-]+)?="([^"]+)"/g)].map((m) => m[1]),
  ),
);

// Each family of built keys, and the values the code builds them with.
const FAMILIES = {
  "rule.name.": RULE_KINDS,
  "rule.short.": RULE_KINDS,
  "rule.inline.": RULE_KINDS,
  "rule.inName.": RULE_KINDS,
  "rule.hint.": RULE_KINDS,
  "stress.label.": STRESS_SCENARIOS.map((s) => s.id),
  "stress.short.": STRESS_SCENARIOS.map((s) => s.id),
  // The form's sections: the ids `group()` is called with.
  "group.": [...code["js/ui/form.js"].matchAll(/\bgroup\(\s*"(\w+)"/g)].map((m) => m[1]),
  // The lists that say when they're full.
  "form.full.": Object.keys(LIMITS).filter((k) => k !== "years"),
  // The heavier views, each in a worker of its own: every task but the main one.
  "run.view.": [...code["js/worker.js"].matchAll(/(\w+): \w+View/g)]
    .map((m) => m[1])
    .filter((k) => k !== "main"),
};

test("every message the code asks for is in the catalog", () => {
  const missing = [...used].filter((k) => !(k in messages));
  assert.deepEqual(missing, [], "add these to site/js/locales/en/messages.js");
  assert.ok(used.size > 300, `the code's messages were found (${used.size})`);
});

test("every key the code builds belongs to a family, and each family is complete", () => {
  const unknown = [...built].filter((p) => !FAMILIES[p]);
  assert.deepEqual(unknown, [], "a new family of built keys: add it to FAMILIES, with its values");
  const missing = [];
  for (const [prefix, values] of Object.entries(FAMILIES)) {
    assert.ok(values.length > 1, `the values of ${prefix}* were found`);
    for (const v of values) if (!(`${prefix}${v}` in messages)) missing.push(`${prefix}${v}`);
  }
  assert.deepEqual(missing, []);
  assert.deepEqual(Object.keys(FAMILIES).sort(), [...built].sort(), "a family nothing builds");
});

test("every message is used, so none is left to translate for nothing", () => {
  const inFamily = (k) =>
    Object.entries(FAMILIES).some(([p, values]) => values.some((v) => k === `${p}${v}`));
  const unused = Object.keys(messages).filter(
    (k) => !used.has(k) && !onPages.has(k) && !inFamily(k),
  );
  assert.deepEqual(unused, []);
});

test("messages are well formed: text, or a form per number with an `other`", () => {
  const FORMS = ["zero", "one", "two", "few", "many", "other"];
  const problems = [];
  const vars = (s) => [...s.matchAll(/(?<!%)\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const [key, m] of Object.entries(messages)) {
    const forms = typeof m === "string" ? { other: m } : m;
    if (!forms || typeof forms !== "object" || !("other" in forms)) {
      problems.push(`${key}: neither text nor { one, other }`);
      continue;
    }
    for (const [form, text] of Object.entries(forms)) {
      if (!FORMS.includes(form)) problems.push(`${key}: "${form}" isn't a plural form`);
      if (typeof text !== "string" || !text.trim()) problems.push(`${key}.${form}: no text`);
      else if (text !== text.trim()) problems.push(`${key}.${form}: spaces at an end`);
      // A brace that isn't a whole `{name}` or a Plotly `%{…}` is a typo.
      else if (/\{/.test(text.replace(/(?<!%)\{\w+\}|%\{[^}]*\}/g, "")))
        problems.push(`${key}.${form}: a stray brace`);
    }
    if (typeof m === "object") {
      if (!vars(m.other).includes("n")) problems.push(`${key}: a form per number without {n}`);
      for (const text of Object.values(m))
        if (JSON.stringify(vars(text)) !== JSON.stringify(vars(m.other)))
          problems.push(`${key}: its forms fill in different values`);
    }
  }
  assert.deepEqual(problems, []);
});

// ---- no text of the code's own -------------------------------------------------------------------

/**
 * The string literals of a module, and each template literal as one (`${…}` for what it fills
 * in), with their lines and what's just before them: comments and regular expressions told apart
 * from them.
 */
function literals(src) {
  const out = [];
  const line = (at) => src.slice(0, at).split("\n").length;
  // A "/" starts a regular expression where a value is expected: after an operator, a bracket or
  // a keyword, not after a name or a number (then it divides).
  const valueNext = (prev) =>
    /^$|[(,=:[!&|?{};+\-*%<>~^]$/.test(prev) ||
    /^(return|typeof|case|in|of|else|do|void|delete|throw|new|yield|await)$/.test(prev);
  function code(i, untilBrace) {
    let depth = 0;
    let prev = "";
    while (i < src.length) {
      const c = src[i];
      if (c === "/" && src[i + 1] === "/") i = src.indexOf("\n", i) + 1 || src.length;
      else if (c === "/" && src[i + 1] === "*") i = src.indexOf("*/", i) + 2;
      else if (c === '"' || c === "'") {
        let j = i + 1;
        while (src[j] !== c) j += src[j] === "\\" ? 2 : 1;
        out.push({ text: src.slice(i + 1, j), line: line(i), before: src.slice(i - 24, i) });
        i = j + 1;
        prev = "x";
      } else if (c === "`") {
        i = template(i);
        prev = "x";
      } else if (c === "/" && valueNext(prev)) {
        let j = i + 1;
        let inClass = false;
        while (j < src.length && (inClass || src[j] !== "/")) {
          if (src[j] === "\\") j++;
          else if (src[j] === "[") inClass = true;
          else if (src[j] === "]") inClass = false;
          j++;
        }
        i = j + 1;
        while (/\w/.test(src[i])) i++;
        prev = "x";
      } else if (/\s/.test(c)) i++;
      else if (/[\w$]/.test(c)) {
        let j = i;
        while (/[\w$.]/.test(src[j])) j++;
        prev = src.slice(i, j);
        i = j;
      } else {
        if (c === "{") depth++;
        if (c === "}" && untilBrace && depth-- === 0) return i + 1;
        prev = c;
        i++;
      }
    }
    return i;
  }
  function template(start) {
    let i = start + 1;
    let text = "";
    while (src[i] !== "`") {
      if (src[i] === "\\") {
        text += src.slice(i, i + 2);
        i += 2;
      } else if (src[i] === "$" && src[i + 1] === "{") {
        text += "${…}";
        i = code(i + 2, true);
      } else text += src[i++];
    }
    out.push({ text, line: line(start), before: src.slice(start - 24, start) });
    return i + 1;
  }
  code(0, false);
  return out;
}

// Literals that look like words and aren't text for people. A new one goes here once it's sure
// that nobody reads it; the last test checks that each one is still in the code.
const NOT_TEXT = new Set([
  // The names the form's sections are remembered under in this browser: their English titles
  // from before the page spoke other languages (js/ui/fields.js).
  "Plan",
  "Spending rule",
  "Household",
  "Savings and portfolio",
  "Retirement accounts",
  "Income and costs after stopping",
  "One-off events",
  "Markets",
  "Portfolio mix",
  "Stress test",
  "Simulation",
  // Keys, a selector.
  "ArrowDown",
  "ArrowUp",
  "Home",
  "End",
  "Escape",
  "Enter",
  "Tab",
  "input, select, textarea",
  // An error the service worker catches itself, never shown (sw.js).
  "${…} can't be read",
  // Plotly's English texts, the keys of its dictionary of translations (js/ui/charts.js).
  "Double-click to zoom back out",
  "Double-click on legend to isolate one trace",
]);

/** The literals of the code that look like words, and aren't in NOT_TEXT: { text, at }. */
function wordy() {
  const out = [];
  for (const [file, src] of Object.entries(code)) {
    for (const { text, line, before } of literals(src)) {
      // What's left to read once the markup and the values filled in (by the code, by Plotly)
      // are taken out: not a path or a URL, not a selector, not a list of classes.
      const words = text.replace(/<[^>]*>|\$\{…\}|%\{[^}]*\}/g, " ");
      const technical =
        /^(\.{1,2}\/|https?:|#|\[|:|\()/.test(text) ||
        /^[\w.-]+\/[\w./-]+$/.test(text) ||
        /\bclass(Name)?\s*[:=]\s*$/.test(before);
      const prose =
        /\p{L}{2,}[,.;:!?'’]?\s+\p{L}/u.test(words) || /(?:^|\s)\p{Lu}\p{Ll}+/u.test(words);
      if (prose && !technical) out.push({ text, at: `${file}:${line}` });
    }
  }
  return out;
}

test("the code shows no text of its own: it's all in the catalog", () => {
  const found = wordy()
    .filter((x) => !NOT_TEXT.has(x.text))
    .map((x) => `${x.at}: ${x.text}`);
  assert.deepEqual(found, [], "put these in the catalog (or, if no one reads them, in NOT_TEXT)");
  const gone = [...NOT_TEXT].filter((x) => !wordy().some((w) => w.text === x));
  assert.deepEqual(gone, [], "no longer in the code: take them out of NOT_TEXT");
});

test("the check for text in the code finds text", () => {
  // It would pass on nothing if it couldn't read the code: so, a module it must flag.
  const src = [
    'const a = "Saved your plan.";',
    "const b = `Removed ${name} from the list`;",
    'const c = /"not a string"/g, d = x / 2 / "Divided";',
    '// "In a comment"',
    'el("span", { class: "btn small", text: t("plans.saved") });',
  ].join("\n");
  assert.deepEqual(
    literals(src).map((l) => l.text),
    [
      "Saved your plan.",
      "Removed ${…} from the list",
      "Divided",
      "span",
      "btn small",
      "plans.saved",
    ],
  );
});
