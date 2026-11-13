import assert from "node:assert/strict";
import { test } from "node:test";
import { simulate } from "../site/js/engine.js";
import { makeFormat } from "../site/js/format.js";
import {
  DEFAULT_CURRENCY,
  LIMITS,
  SCHEMA,
  bandAround,
  blankPlan,
  counterpart,
  differences,
  examplePlan,
  fromNewer,
  migrate,
  normalize,
  problems,
  roundish,
} from "../site/js/plan.js";
import {
  cleanRun,
  cleanSaved,
  cleanSettings,
  exportFile,
  isLocked,
  packPlan,
  readFile,
  unpackPlan,
} from "../site/js/store.js";

const today = new Date(2026, 10, 11);

test("a new plan and the example are complete and simulate", () => {
  for (const plan of [blankPlan({ today }), examplePlan({ today, currency: "EUR" })]) {
    assert.deepEqual(normalize(plan, { today }), plan); // nothing to clean
    assert.deepEqual(problems(plan), []);
    const res = simulate({ ...plan, seed: 1, n_sims: 200 });
    assert.equal(res.n, 200);
  }
});

test("normalize fills what's missing and drops what doesn't belong", () => {
  const p = normalize(
    {
      spending: 50_000,
      people: [{ name: "Ana", birth_year: 1980 }],
      evil: "<script>",
      rule: { kind: "nope" },
    },
    { today, currency: "CHF" },
  );
  assert.equal(p.currency, "CHF");
  assert.equal(p.people.length, 1);
  assert.equal(p.people[0].name, "Ana");
  assert.equal(p.end_person, p.people[0].id);
  assert.equal(p.rule.kind, "fixed");
  assert.deepEqual(p.rule.floor, bandAround(50_000).floor);
  assert.equal("evil" in p, false);
  assert.deepEqual(p.accounts, []);
});

test("normalize keeps values in bounds and references pointing at people who exist", () => {
  const p = normalize(
    {
      people: [{ id: "a", name: "A", birth_year: 1985 }],
      end_person: "ghost",
      start_month: 15,
      stock_vol: -3,
      fat_tails_df: 1,
      stress_returns: [-2, "x", 0.1],
      accounts: [{ owner: "ghost", balance: -5, tax: 2, growth: "magic" }],
      income: [
        {
          amount: 1000,
          from: { kind: "age", person: "ghost", value: 67 },
          to: { kind: "bogus", value: 2050 },
        },
      ],
      people_extra: 1,
    },
    { today },
  );
  assert.equal(p.end_person, "a");
  assert.equal(p.start_month, 12);
  assert.equal(p.stock_vol, 0);
  assert.equal(p.fat_tails_df, 2.1);
  assert.deepEqual(p.stress_returns, [-1, 0.1]);
  assert.equal(p.accounts[0].owner, "a");
  assert.equal(p.accounts[0].balance, 0);
  assert.equal(p.accounts[0].tax, 0.9);
  assert.equal(p.accounts[0].growth, "portfolio");
  assert.deepEqual(p.income[0].from, { kind: "age", person: "a", value: 67 });
  assert.equal(p.income[0].to.kind, "year");
});

test("normalize gives every item a unique id", () => {
  const p = normalize(
    {
      people: [
        { id: "x", name: "A", birth_year: 1980 },
        { id: "x", name: "B", birth_year: 1982 },
      ],
      accounts: [{ id: "x" }, {}],
    },
    { today },
  );
  const ids = [...p.people, ...p.accounts].map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("problems: the FIRE start, the horizon and the flexible rule's band", () => {
  const p = blankPlan({ today });
  assert.deepEqual(problems(p), []);
  assert.match(problems({ ...p, fire_year: p.start_year - 1 })[0], /FIRE start must be between/);
  assert.match(problems({ ...p, end_age: 30 })[0], /has to run past/);
  const flex = { ...p, rule: { ...p.rule, kind: "guardrails" }, spending: p.rule.ceiling + 1 };
  assert.match(problems(flex)[0], /between the floor and the ceiling/);
  assert.deepEqual(problems({ ...flex, rule: { ...flex.rule, kind: "spenddown" } }), []);
});

test("differences: changed values by path, an added or removed item once", () => {
  const a = examplePlan({ today });
  const b = structuredClone(a);
  b.spending = 70_000;
  b.income[0].from.value = 66;
  b.events.push({ id: "e", name: "Roof", year: 2040, amount: -30_000 });
  b.accounts.pop();
  assert.deepEqual(differences(a, b).sort(), [
    "accounts.#",
    "events.#",
    "income.0.from.value",
    "spending",
  ]);
  assert.deepEqual(differences(a, structuredClone(a)), []);
  // A stop added where there was none.
  const c = structuredClone(a);
  c.income[1].to = { kind: "year", value: 2070 };
  assert.ok(differences(a, c).some((p) => p.startsWith("income.1.to")));
});

test("normalize keeps as many items as a plan holds, and drops the rest", () => {
  const plan = examplePlan({ today });
  const many = (n) => Array.from({ length: n }, (_, i) => ({ ...plan.accounts[0], id: `a${i}` }));
  assert.equal(normalize({ ...plan, accounts: many(LIMITS.accounts) }).accounts.length, 50);
  const cut = normalize({ ...plan, accounts: many(LIMITS.accounts + 5) }).accounts;
  assert.deepEqual(
    cut.map((a) => a.id),
    many(LIMITS.accounts).map((a) => a.id),
  );
});

test("differences: a moved item is the same item, and the list changed once", () => {
  const a = examplePlan({ today });
  const b = structuredClone(a);
  b.accounts.reverse();
  assert.deepEqual(differences(a, b), ["accounts.#"]);
  // Moved and changed: its own field, at its new place.
  b.accounts[0].balance = 1;
  assert.deepEqual(differences(a, b).sort(), ["accounts.#", "accounts.0.balance"]);
  // One removed and one added in its place: the list changed, the new item's fields don't count.
  const c = structuredClone(a);
  c.income[0] = { ...c.income[0], id: "new", amount: 5 };
  assert.deepEqual(differences(a, c), ["income.#"]);
  // Moved back where it was: nothing changed.
  b.accounts[0].balance = a.accounts[1].balance;
  b.accounts.reverse();
  assert.deepEqual(differences(a, b), []);
});

test("counterpart finds a moved item's saved value, and none for a new one", () => {
  const a = examplePlan({ today });
  const b = structuredClone(a);
  b.people.reverse();
  b.people.push({ id: "kid", name: "Kid", birth_year: 2020 });
  assert.equal(counterpart(a, b, "people.0.name"), a.people[1].name);
  assert.equal(counterpart(a, b, "people.2.name"), undefined);
  assert.equal(counterpart(a, b, "spending"), a.spending);
  assert.deepEqual(counterpart(a, b, "income.0.from"), a.income[0].from);
});

test("roundish keeps two significant digits", () => {
  assert.equal(roundish(57_600), 58_000);
  assert.equal(roundish(5_760_000), 5_800_000);
  assert.equal(roundish(80), 80);
});

test("share links round-trip a plan, and refuse a damaged one", async () => {
  const plan = examplePlan({ today, currency: "JPY" });
  const code = await packPlan("Retire at 50 — “quotes” & ünïcode", plan);
  assert.match(code, /^z[\w-]+$/);
  const back = await unpackPlan(code);
  assert.equal(back.name, "Retire at 50 — “quotes” & ünïcode");
  assert.deepEqual(back.plan, plan);
  await assert.rejects(unpackPlan(`${code.slice(0, -12)}AAAA`), /damaged/);
  await assert.rejects(unpackPlan("zNotBase64!!"), /damaged/);
});

test("a share link carries the run it was shared with, as information", async () => {
  const plan = examplePlan({ today });
  const run = { seed: 7, n_sims: 50_000 };
  assert.deepEqual((await unpackPlan(await packPlan("A", plan, { run }))).run, run);
  assert.deepEqual(
    (
      await unpackPlan(
        await packPlan("A", plan, { run, password: "long enough pw" }),
        "long enough pw",
      )
    ).run,
    run,
  );
  assert.equal((await unpackPlan(await packPlan("A", plan))).run, null); // links made before
  for (const bad of [
    null,
    "7",
    { seed: -1, n_sims: 10_000 },
    { seed: 1.5, n_sims: 10_000 },
    { seed: 1, n_sims: 100 },
    { seed: 1, n_sims: 1e6 },
  ]) {
    assert.equal(cleanRun(bad), null);
  }
});

test("old plans are migrated step by step before they're cleaned", () => {
  const steps = {
    1: (r) => {
      const { yearly_spend, ...rest } = r;
      return { ...rest, spending: yearly_spend };
    },
    2: (r) => ({ ...r, extra: (r.extra ?? 0) + 1 }),
  };
  const old = { schema: 1, yearly_spend: 40_000 };
  assert.deepEqual(migrate(old, { to: 3, steps }), { schema: 1, spending: 40_000, extra: 1 });
  assert.deepEqual(old, { schema: 1, yearly_spend: 40_000 }); // the input isn't changed
  assert.deepEqual(migrate({ yearly_spend: 1 }, { to: 2, steps }), { spending: 1 }); // no schema: 1
  assert.deepEqual(migrate({ schema: 2, extra: 5 }, { to: 3, steps }), { schema: 2, extra: 6 }); // from where it is
  assert.deepEqual(migrate({ schema: 3 }, { to: 3, steps }), { schema: 3 }); // current: untouched
  assert.equal(migrate(null), null);

  // Today: nothing to migrate, and a plan from a later version is recognised.
  const plan = examplePlan({ today });
  assert.deepEqual(normalize(plan, { today }), plan);
  assert.ok(!fromNewer(plan));
  assert.ok(fromNewer({ ...plan, schema: SCHEMA + 1 }));
  assert.ok(!fromNewer(null));
});

test("a locked share link opens with its password only, and hides the plan's name", async () => {
  const plan = examplePlan({ today, currency: "CHF" });
  const password = "correct horse battery";
  const code = await packPlan("Secret “plan” ü", plan, { password });
  assert.match(code, /^e[\w-]+$/);
  assert.ok(isLocked(code));
  assert.ok(!isLocked(await packPlan("Open", plan)));
  assert.notEqual(await packPlan("Secret “plan” ü", plan, { password }), code); // a fresh salt and iv each time
  assert.doesNotMatch(
    Buffer.from(code.slice(1), "base64url").toString("latin1"),
    /Secret|pillar|balance/,
  );

  const back = await unpackPlan(code, password);
  assert.equal(back.name, "Secret “plan” ü");
  assert.deepEqual(back.plan, plan);

  const code_of = (e) => e.code;
  await assert.rejects(unpackPlan(code), (e) => code_of(e) === "locked");
  await assert.rejects(unpackPlan(code, "correct horse batterY"), (e) => code_of(e) === "password");
  await assert.rejects(unpackPlan(code.slice(0, 30), password), (e) => code_of(e) === "damaged");
  const newer = Buffer.from(code.slice(1), "base64url");
  newer[0] = 9;
  await assert.rejects(
    unpackPlan(`e${newer.toString("base64url")}`, password),
    (e) => code_of(e) === "newer",
  );

  // "é" typed as one character or as e + accent is the same password.
  const accented = await packPlan("x", plan, { password: "café au lait" });
  assert.equal((await unpackPlan(accented, "café au lait")).name, "x");
});

test("exported files read back; a bare plan and junk are handled", () => {
  const plans = [
    { name: "A", plan: blankPlan({ today }) },
    { name: "B", plan: examplePlan({ today }) },
  ];
  const f = exportFile(plans, today);
  assert.equal(f.name, "fire-plans-2026-11-11.json");
  const back = readFile(f.text);
  assert.deepEqual(
    back.map((x) => x.name),
    ["A", "B"],
  );
  assert.deepEqual(back[1].plan, plans[1].plan);
  assert.equal(readFile(JSON.stringify(blankPlan({ today })))[0].plan.spending, 40_000);
  assert.throws(() => readFile("not json"), /isn't JSON/);
  assert.throws(() => readFile(JSON.stringify({ hello: 1 })), /No plans/);
});

test("typed numbers in several number formats", () => {
  const en = makeFormat("en-US", "USD");
  assert.equal(en.parse("1,234,567", "money"), 1_234_567);
  assert.equal(en.parse("250k", "money"), 250_000);
  assert.equal(en.parse("1.5M", "money"), 1_500_000);
  assert.equal(en.parse("-5,000", "money"), -5000);
  assert.equal(en.parse("4.5", "pct"), 4.5);
  assert.ok(Number.isNaN(en.parse("abc", "money")));
  const de = makeFormat("de-DE", "EUR");
  assert.equal(de.parse("1.234.567", "money"), 1_234_567);
  assert.equal(de.parse("1.234,5", "money"), 1234.5);
  assert.equal(de.parse("4,5", "pct"), 4.5);
  assert.equal(de.parse("4.5", "pct"), 4.5); // either mark works for a percentage
  assert.equal(de.parse("−3", "num"), -3); // a typographic minus
  const ch = makeFormat("de-CH", "CHF");
  assert.equal(ch.parse("1'234'567", "money"), 1_234_567);
  assert.equal(ch.parse("1’234’567", "money"), 1_234_567);
  const fr = makeFormat("fr-FR", "EUR");
  assert.equal(fr.parse("1 234 567", "money"), 1_234_567);
  assert.equal(fr.parse("1 234,5", "money"), 1234.5);
});

test("typed lists of numbers: where the decimal mark is a comma, it isn't a separator", () => {
  const de = makeFormat("de-DE", "EUR");
  assert.deepEqual(de.parseList("-12,5, -20", "pct"), [-12.5, -20]);
  assert.deepEqual(de.parseList("-12,5,-20; 3", "pct"), [-12.5, -20, 3]);
  const en = makeFormat("en-US", "USD");
  assert.deepEqual(en.parseList("-15,-20, -25", "pct"), [-15, -20, -25]);
  assert.deepEqual(en.parseList("−15,−20 -12.5", "pct"), [-15, -20, -12.5]); // typographic minus
  assert.ok(Number.isNaN(en.parseList("-15, abc", "pct")[1]));
  assert.deepEqual(en.parseList("  ", "pct"), []);
  // The custom crash field shows the list like this, and has to read it back the same.
  for (const f of [de, en, makeFormat("fr-CH", "CHF"), makeFormat("de-CH", "CHF")]) {
    const values = [-12.5, -20, 0, 3.5];
    const shown = values.map((x) => String(x).replace(".", f.decimal)).join(", ");
    assert.deepEqual(f.parseList(shown, "pct"), values, `${f.locale}: ${shown}`);
  }
});

test("percentages as each number format writes them; dates in the page's language", () => {
  // As Intl writes them (its data differs a little between versions): "86%", "86 %", "3,6 %".
  for (const locale of ["en-US", "de-DE", "de-CH", "fr-FR", "fr-CH", "sv-SE"])
    for (const d of [0, 1, 2]) {
      const intl = new Intl.NumberFormat(locale, {
        style: "percent",
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      });
      for (const v of [0.857, 0.0355, -0.4])
        assert.equal(makeFormat(locale, "CHF").pct(v, d), intl.format(v), `${locale} ${v} ${d}`);
    }
  assert.equal(makeFormat("en-US", "CHF").pct(0.857), "86%");
  assert.match(makeFormat("de-DE", "CHF").pct(0.857), /^86\s%$/);
  assert.equal(makeFormat("en-US", "CHF").pct(null), "–");
  // Under Node the page's language is English: English words, in the number format's region.
  assert.equal(makeFormat("de-CH", "CHF").words, "en-CH");
  assert.equal(makeFormat("en-GB", "CHF").words, "en-GB");
  assert.equal(makeFormat("ja", "CHF").words, "en-JP");
});

test("settings from storage: odd values put right, the rest kept", () => {
  const plain = { seed: 42, n_sims: 10_000, locale: "", theme: "auto", lang: "" };
  assert.deepEqual(cleanSettings(null), plain);
  assert.deepEqual(cleanSettings([1, 2]), plain);
  assert.deepEqual(
    cleanSettings({ seed: -5, n_sims: 123_456, locale: 5, theme: "purple", lang: "xx" }),
    { ...plain, n_sims: 50_000 },
  );
  assert.deepEqual(
    cleanSettings({ seed: 2 ** 31 + 7, n_sims: 100, locale: "de-CH", theme: "dark", lang: "de" }),
    { seed: 7, n_sims: 500, locale: "de-CH", theme: "dark", lang: "de" },
  );
  assert.deepEqual(cleanSettings({ seed: 1.5, n_sims: "many", welcomeClosed: true }), {
    ...plain,
    welcomeClosed: true,
  });
});

test("saved plans from storage: junk dropped, each entry complete, a bad currency replaced", () => {
  const saved = cleanSaved([
    {
      id: "a",
      name: "  Stop early  ",
      plan: { spending: 50_000, currency: "EUR" },
      updated: 3,
      shared: { seed: 7, n_sims: 20_000 },
    },
    null,
    "junk",
    { name: "No plan here" },
    {
      id: 5,
      name: "",
      plan: { spending: 30_000, currency: "xx" },
      updated: NaN,
      example: "yes",
      shared: { seed: 1, n_sims: 10 },
    },
  ]);
  assert.equal(saved.length, 2);
  const [a, b] = saved;
  assert.deepEqual(
    [a.id, a.name, a.updated, a.example, a.shared, a.plan.currency],
    ["a", "Stop early", 3, false, { seed: 7, n_sims: 20_000 }, "EUR"],
  );
  assert.equal(typeof b.id, "string");
  assert.deepEqual([b.name, b.updated, b.example, "shared" in b], ["Plan", null, false, false]);
  // "xx" isn't a currency: kept, it would stop the page (Intl throws on it).
  assert.equal(b.plan.currency, DEFAULT_CURRENCY);
  assert.deepEqual(normalize(b.plan), b.plan);
  assert.deepEqual(cleanSaved(undefined), []);
});
