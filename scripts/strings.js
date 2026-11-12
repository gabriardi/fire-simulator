// The whole English catalog: every text the site shows, by key, from wherever it's kept.
//   node scripts/strings.js           # the catalog, as JSON: { key: text }
//   node scripts/strings.js --check   # what's wrong with it, if anything (exit code 1)
//
// - site/js/locales/en/messages.js: the code's texts.
// - site/js/locales/en/help.js: the "?" explanations and the guide (help.<key>.title, .html).
// - The pages (index.html, privacy.html) keep their English in place, each piece marked with its
//   key: `data-i18n="key"` for an element's content (HTML, as it is), `data-i18n-<attribute>`
//   for an attribute's text (aria-label, title, a meta's content…).
// - The web app manifest and the page's structured data (JSON-LD), by the field (below).
//
// The same key can be in several places, with the same text: one translation then serves them all.
// tests/i18n.test.js checks that the catalog has no problems, and that the code uses every message.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import help from "../site/js/locales/en/help.js";
import messages from "../site/js/locales/en/messages.js";

const SITE = new URL("../site/", import.meta.url);
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
  "og:image",
  "og:image:width",
  "og:image:height",
  "twitter:card",
  "mobile-web-app-capable",
  "apple-mobile-web-app-capable",
  "apple-mobile-web-app-status-bar-style",
];
// The structured data's and the manifest's fields: text (by key), or not text.
const JSON_LD = {
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
    "applicationCategory",
    "isAccessibleForFree",
    "offers",
    "image",
    "author",
    "license",
    "sameAs",
  ],
};
const MANIFEST = {
  text: { name: "app.name", short_name: "app.shortName", description: "manifest.description" },
  other: [
    "id",
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

function attributesOf(src) {
  const out = {};
  for (const m of src.matchAll(ATTRIBUTE)) out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  return out;
}

/**
 * The texts of a page, by key: [{ key, text, where }], and its problems: text no key covers, an
 * attribute or meta with text and no key, a key inside a keyed element.
 */
export function pageStrings(file, src = readFileSync(new URL(file, SITE), "utf8")) {
  const entries = [];
  const problems = [];
  const stack = []; // open elements: { tag, key, from }
  const keyed = () => stack.some((e) => e.key);
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
      if (open.key)
        entries.push({ key: open.key, text: tidy(src.slice(open.from, at)), where: file });
      continue;
    }
    const attrs = attributesOf(rest);
    if (keyed() && Object.keys(attrs).some((a) => a.startsWith("data-i18n")))
      problems.push(`${file}:${line(at)}: a key inside an element that has one`);
    for (const a of TEXT_ATTRIBUTES) {
      if (!(a in attrs) || !LETTER.test(attrs[a]) || keyed()) continue;
      const key = attrs[`data-i18n-${a}`];
      if (key) entries.push({ key, text: attrs[a], where: file });
      else problems.push(`${file}:${line(at)}: ${a}="${attrs[a]}" has no data-i18n-${a}`);
    }
    if (tag === "meta" && "content" in attrs) {
      const kind = attrs.name ?? attrs.property;
      if (TEXT_METAS.includes(kind)) {
        const key = attrs["data-i18n-content"];
        if (key) entries.push({ key, text: attrs.content, where: file });
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
      stack.push({ tag, key: attrs["data-i18n"] ?? null, from: TOKEN.lastIndex });
  }
  return { entries, problems };
}

function fields(data, { text, other }, where, entries, problems) {
  for (const [field, value] of Object.entries(data)) {
    if (text[field]) entries.push({ key: text[field], text: value, where });
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
    for (const part of ["title", "html"])
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { strings, problems } = catalog();
  if (process.argv.includes("--check")) {
    for (const p of problems) console.log(p);
    process.exit(problems.length ? 1 : 0);
  }
  console.log(JSON.stringify(strings, null, 2));
}
