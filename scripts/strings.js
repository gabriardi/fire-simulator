// Every text the site shows, by key, from wherever it's kept, in English and in each language.
//   node scripts/strings.js                   # the English catalog, as JSON: { key: text }
//   node scripts/strings.js --check           # what's wrong with any language's (exit code 1)
//   node scripts/strings.js --translated de   # after updating the German: it's up to date
//
// English, the source:
// - site/js/locales/en/messages.js: the code's texts.
// - site/js/locales/en/help.js: the "?" explanations and the guide (help.<key>.title, .html, .more).
// - The pages (index.html, privacy.html) keep their English in place, each piece marked with its
//   key: `data-i18n="key"` for an element's content (HTML, as it is), `data-i18n-<attribute>`
//   for an attribute's text (aria-label, title, a meta's content…). An element marked
//   `translate="no"` holds no text to translate (a language's own name, in its switch).
// - The web app manifest and the page's structured data (JSON-LD), by the field (below).
// The same key can be in several places, with the same text: one translation then serves them all.
//
// Another language has the same keys, in site/js/locales/<lang>/: messages.js and help.js as in
// English, and pages.js for the texts only the pages hold (scripts/pages.js writes its pages).
// tests/translated.json records the English each language's texts were translated from: a text
// whose English has changed since is reported, until it's updated and `--translated` run.
//
// tests/i18n.test.js checks that the catalogs have no problems, and that the code uses every
// message.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { LANGS } from "../site/js/i18n.js";
import help from "../site/js/locales/en/help.js";
import messages from "../site/js/locales/en/messages.js";

const SITE = new URL("../site/", import.meta.url);
const TRANSLATED = new URL("../tests/translated.json", import.meta.url);
export const PAGES = ["index.html", "privacy.html"];

// Attributes people read or hear: each one with text needs a data-i18n-<attribute>.
const TEXT_ATTRIBUTES = ["aria-label", "title", "placeholder", "alt"];
// The metas whose content is text for people (link previews, search results, a phone's home
// screen), and those whose content isn't. A meta in neither list is a problem: decide which.
const TEXT_METAS = [
  "description",
  "og:site_name",
  "og:title",
  "og:description",
  "og:image:alt",
  "apple-mobile-web-app-title",
];
const OTHER_METAS = [
  "viewport",
  "theme-color",
  "og:type",
  "og:url",
  "og:locale",
  "og:locale:alternate",
  "og:image",
  "og:image:width",
  "og:image:height",
  "twitter:card",
  "mobile-web-app-capable",
  "apple-mobile-web-app-capable",
  "apple-mobile-web-app-status-bar-style",
];
// The structured data's and the manifest's fields: text (by key), or not text.
export const JSON_LD = {
  text: {
    name: "app.name",
    alternateName: "meta.alternateName",
    description: "meta.description",
    operatingSystem: "meta.os",
    browserRequirements: "meta.requirements",
  },
  other: [
    "@context",
    "@type",
    "url",
    "inLanguage",
    "applicationCategory",
    "isAccessibleForFree",
    "offers",
    "image",
    "author",
    "license",
    "sameAs",
  ],
};
export const MANIFEST = {
  text: { name: "app.name", short_name: "app.shortName", description: "manifest.description" },
  other: [
    "id",
    "lang",
    "start_url",
    "scope",
    "display",
    "orientation",
    "background_color",
    "theme_color",
    "icons",
  ],
};

const VOID = new Set(["meta", "link", "input", "br", "hr", "img", "source", "area", "wbr"]);
const RAW = new Set(["script", "style"]);
const LETTER = /\p{L}/u;
const TOKEN =
  /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/?([a-z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|[^<]+/giy;
const ATTRIBUTE = /([^\s=/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

/** A piece of HTML as one line: runs of spaces as one, and none before a tag's `>`. */
export const tidy = (html) => html.replace(/\s+/g, " ").replace(/\s+>/g, ">").trim();

/** A tag's attributes, { name: value }, and where each value is in the page: { name: [from, to] }. */
function attributesOf(src, offset) {
  const attrs = {};
  const spans = {};
  for (const m of src.matchAll(ATTRIBUTE)) {
    const name = m[1].toLowerCase();
    const value = m[2] ?? m[3] ?? m[4];
    attrs[name] = value ?? "";
    if (value == null) continue;
    const to = offset + m.index + m[0].length - (m[4] == null ? 1 : 0);
    spans[name] = [to - value.length, to];
  }
  return { attrs, spans };
}

/**
 * The texts of a page, by key: [{ key, text, where, kind, span }], where `kind` is "html" (an
 * element's content), "attribute" or "field" (the structured data's), and `span` is where the
 * text is in the page, [from, to] (none for a field). Also every tag that opens an element,
 * [{ tag, attrs, spans, at, end, inKey }] (`inKey`: inside an element whose content has a key),
 * and the page's problems: text no key covers, an attribute or meta with text and no key, a key
 * inside a keyed element.
 */
export function pageStrings(file, src = readFileSync(new URL(file, SITE), "utf8")) {
  const entries = [];
  const problems = [];
  const tags = [];
  const stack = []; // open elements: { tag, key, fixed, from }
  const keyed = () => stack.some((e) => e.key || e.fixed);
  const line = (at) => src.slice(0, at).split("\n").length;
  TOKEN.lastIndex = 0;
  for (let m; (m = TOKEN.exec(src));) {
    const [tok, name, rest] = m;
    const at = m.index;
    if (!name) {
      if (tok.startsWith("<")) continue; // a comment, the doctype
      const text = tok.replace(/&[#\w]+;/g, " ");
      if (LETTER.test(text) && !keyed())
        problems.push(`${file}:${line(at)}: text without a key: "${tidy(tok).slice(0, 60)}"`);
      continue;
    }
    const tag = name.toLowerCase();
    if (tok.startsWith("</")) {
      const i = stack.findLastIndex((e) => e.tag === tag);
      if (i < 0) continue;
      const [open] = stack.splice(i);
      if (open.key) {
        const inner = src.slice(open.from, at);
        const from = open.from + (inner.length - inner.trimStart().length);
        const to = at - (inner.length - inner.trimEnd().length);
        entries.push({
          key: open.key,
          text: tidy(inner),
          where: file,
          kind: "html",
          span: [from, to],
        });
      }
      continue;
    }
    const { attrs, spans } = attributesOf(rest, at + 1 + name.length);
    tags.push({ tag, attrs, spans, at, end: TOKEN.lastIndex, inKey: keyed() });
    if (keyed() && Object.keys(attrs).some((a) => a.startsWith("data-i18n")))
      problems.push(`${file}:${line(at)}: a key inside an element that has one`);
    for (const a of TEXT_ATTRIBUTES) {
      if (!(a in attrs) || !LETTER.test(attrs[a]) || keyed()) continue;
      const key = attrs[`data-i18n-${a}`];
      if (key)
        entries.push({ key, text: attrs[a], where: file, kind: "attribute", span: spans[a] });
      else problems.push(`${file}:${line(at)}: ${a}="${attrs[a]}" has no data-i18n-${a}`);
    }
    if (tag === "meta" && "content" in attrs) {
      const kind = attrs.name ?? attrs.property;
      if (TEXT_METAS.includes(kind)) {
        const key = attrs["data-i18n-content"];
        if (key)
          entries.push({
            key,
            text: attrs.content,
            where: file,
            kind: "attribute",
            span: spans.content,
          });
        else problems.push(`${file}:${line(at)}: the ${kind} meta has no data-i18n-content`);
      } else if (!OTHER_METAS.includes(kind))
        problems.push(
          `${file}:${line(at)}: is the ${kind} meta text? Add it to a list in strings.js`,
        );
    }
    if (RAW.has(tag)) {
      const end = src.indexOf(`</${tag}>`, TOKEN.lastIndex);
      const body = src.slice(TOKEN.lastIndex, end);
      if (tag === "script" && attrs.type === "application/ld+json")
        fields(JSON.parse(body), JSON_LD, `${file} (JSON-LD)`, entries, problems);
      TOKEN.lastIndex = end + tag.length + 3;
      continue;
    }
    if (!VOID.has(tag) && !tok.endsWith("/>"))
      stack.push({
        tag,
        key: attrs["data-i18n"] ?? null,
        fixed: attrs.translate === "no",
        from: TOKEN.lastIndex,
      });
  }
  return { entries, problems, tags };
}

function fields(data, { text, other }, where, entries, problems) {
  for (const [field, value] of Object.entries(data)) {
    if (text[field]) entries.push({ key: text[field], text: value, where, kind: "field" });
    else if (!other.includes(field))
      problems.push(`${where}: is the "${field}" field text? Add it to a list in strings.js`);
  }
}

/** The English catalog, { key: text }, and its problems (also a key with two different texts). */
export function catalog() {
  const entries = [];
  const problems = [];
  for (const [key, text] of Object.entries(messages))
    entries.push({ key, text, where: "locales/en/messages.js" });
  for (const [id, h] of Object.entries(help))
    for (const part of h.more == null ? ["title", "html"] : ["title", "html", "more"])
      entries.push({ key: `help.${id}.${part}`, text: h[part], where: "locales/en/help.js" });
  for (const file of PAGES) {
    const page = pageStrings(file);
    entries.push(...page.entries);
    problems.push(...page.problems);
  }
  const manifest = JSON.parse(readFileSync(new URL("manifest.webmanifest", SITE), "utf8"));
  fields(manifest, MANIFEST, "manifest.webmanifest", entries, problems);

  const out = {};
  const from = {};
  for (const { key, text, where } of entries) {
    if (!(key in out)) {
      out[key] = text;
      from[key] = where;
    } else if (JSON.stringify(out[key]) !== JSON.stringify(text))
      problems.push(`"${key}" has two texts: in ${from[key]}, and another in ${where}`);
  }
  return { strings: out, problems };
}

// ---- the other languages -------------------------------------------------------------------------

/** A language's texts, as they are in its folder: { messages, help, pages }. */
export async function textsOf(lang) {
  const load = async (name) =>
    (await import(new URL(`js/locales/${lang}/${name}.js`, SITE).href)).default;
  return { messages: await load("messages"), help: await load("help"), pages: await load("pages") };
}

/** A language's catalog, by the English keys: { key: text } (a help entry as two or three keys). */
export function flatten({ messages, help, pages }) {
  const out = { ...messages, ...pages };
  for (const [id, h] of Object.entries(help)) {
    out[`help.${id}.title`] = h?.title;
    out[`help.${id}.html`] = h?.html;
    if (h?.more != null) out[`help.${id}.more`] = h.more;
  }
  return out;
}

/** The English texts each language was translated from, by key (tests/translated.json). */
export function translatedFrom() {
  try {
    return JSON.parse(readFileSync(TRANSLATED, "utf8"));
  } catch {
    return {};
  }
}

const vars = (s) => [...s.matchAll(/(%?)\{([^}]*)\}/g)].map((m) => m[0]).sort();
// The markup of a text: its tags, each with its attributes. A link may go to the language's own
// version of a page instead, an address with a folder named after the language where the
// English has "en" or none: the FDPIC's /en is /de in German, the history of site/privacy.html is
// that of site/de/privacy.html.
const markup = (s, lang) =>
  [...s.matchAll(/<\/?[a-z][^>]*>/gi)]
    .map((m) => m[0].replace(new RegExp(`(href="[^"]*)/(en|${lang})(?=[/"])`), "$1"))
    .sort();

/** What's wrong with a language's catalog, compared with the English one: [problem]. */
export async function problemsOf(lang) {
  const { strings: english } = catalog();
  const texts = await textsOf(lang);
  const own = flatten(texts);
  const problems = [];
  const where = (key) =>
    key.startsWith("help.")
      ? `locales/${lang}/help.js`
      : key in messages
        ? `locales/${lang}/messages.js`
        : `locales/${lang}/pages.js`;
  for (const key of Object.keys(english))
    if (own[key] == null) problems.push(`${where(key)}: "${key}" is missing`);
  for (const key of Object.keys(own))
    if (!(key in english)) problems.push(`${lang}: "${key}" isn't an English key`);
  for (const key of Object.keys(texts.pages))
    if (key in messages) problems.push(`locales/${lang}/pages.js: "${key}" belongs in messages.js`);

  const forms = new Intl.PluralRules(lang).resolvedOptions().pluralCategories;
  const inAttributes = new Set(
    PAGES.flatMap((p) =>
      pageStrings(p)
        .entries.filter((e) => e.kind === "attribute")
        .map((e) => e.key),
    ),
  );
  for (const [key, en] of Object.entries(english)) {
    const text = own[key];
    if (text == null) continue;
    const at = `${where(key)}: "${key}"`;
    if (typeof en === "object") {
      if (typeof text !== "object") problems.push(`${at} needs a form per number, as in English`);
      else
        for (const f of forms)
          if (typeof text[f] !== "string") problems.push(`${at} has no "${f}" form`);
    } else if (typeof text !== "string") problems.push(`${at} isn't text`);
    const all = typeof text === "object" ? Object.values(text) : [text];
    const enOther = typeof en === "object" ? en.other : en;
    for (const s of all) {
      if (typeof s !== "string") continue;
      if (!s.trim() || s !== s.trim()) problems.push(`${at}: empty, or spaces at an end`);
      if (JSON.stringify(vars(s)) !== JSON.stringify(vars(enOther)))
        problems.push(
          `${at} fills in ${vars(s).join(" ") || "nothing"}, English ${vars(enOther).join(" ") || "nothing"}`,
        );
      if (JSON.stringify(markup(s, lang)) !== JSON.stringify(markup(enOther, lang)))
        problems.push(`${at}: its markup isn't the English's`);
      if (inAttributes.has(key) && /["<]|&(?![#\w]+;)/.test(s))
        problems.push(`${at} goes in an attribute: write " < & as &quot; &lt; &amp;`);
    }
  }
  const from = translatedFrom()[lang] ?? {};
  for (const [key, en] of Object.entries(english))
    if (own[key] != null && key in from && JSON.stringify(from[key]) !== JSON.stringify(en))
      problems.push(
        `${where(key)}: "${key}" was translated from another English: ${JSON.stringify(from[key])}, now ${JSON.stringify(en)}`,
      );
    else if (own[key] != null && !(key in from))
      problems.push(
        `${where(key)}: "${key}" isn't in tests/translated.json: run --translated ${lang}`,
      );
  return problems;
}

/** Records the English as the source of a language's texts: they're up to date with it. */
export async function markTranslated(lang) {
  const { strings: english } = catalog();
  const own = flatten(await textsOf(lang));
  const all = translatedFrom();
  all[lang] = Object.fromEntries(
    Object.keys(english)
      .filter((k) => own[k] != null)
      .sort()
      .map((k) => [k, english[k]]),
  );
  writeFileSync(TRANSLATED, `${JSON.stringify(all, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args[0] === "--translated") {
    const lang = args[1];
    if (!LANGS.includes(lang) || lang === "en") throw new Error(`a language: ${LANGS.slice(1)}`);
    await markTranslated(lang);
  } else if (args.includes("--check")) {
    const { problems } = catalog();
    for (const lang of LANGS.slice(1)) problems.push(...(await problemsOf(lang)));
    for (const p of problems) console.log(p);
    process.exit(problems.length ? 1 : 0);
  } else console.log(JSON.stringify(catalog().strings, null, 2));
}
