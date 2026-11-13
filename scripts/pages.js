// The pages of each language but English, made from the English ones and that language's texts,
// so that every language has the same pages, with the same markup:
//   site/<lang>/index.html, site/<lang>/privacy.html, site/<lang>/manifest.webmanifest
//
//   node scripts/pages.js           # writes them
//   node scripts/pages.js --check   # which are missing or out of date (exit code 1)
//
// Run it after changing an English page, the manifest, or a language's texts: the files are in the
// repository as they're served (there's no build step), and tests/site.test.js fails while one is
// out of date. Don't edit them by hand.
//
// In each one, the texts marked with a key (scripts/strings.js) are the language's, the page says
// its language (<html lang>), and the addresses are those of the language's folder: its own pages,
// manifest and catalogs, and the site's shared files one folder up.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { LANGS } from "../site/js/i18n.js";
import { JSON_LD, MANIFEST, PAGES, flatten, pageStrings, textsOf } from "./strings.js";

const SITE = new URL("../site/", import.meta.url);
const read = (path) => readFileSync(new URL(path, SITE), "utf8");
// What each language has its own of; any other relative address is a shared file, one folder up.
const OWN = new Set([
  "./",
  ...PAGES.filter((p) => p !== "index.html").map((p) => p.replace(/\.html$/, "")),
  "manifest.webmanifest",
]);
// The site's address: what the English simulator's canonical link says.
const SITE_URL = /<link rel="canonical" href="([^"]+)"/.exec(read("index.html"))[1];

const isRelative = (url) => url !== "" && !/^([a-z][\w+.-]*:|\/|#)/i.test(url);
/** A relative address of an English page, from the language's folder instead. */
const fromFolder = (url) => (!isRelative(url) || OWN.has(url) ? url : `../${url}`);
/** An absolute address on this site, in the language's folder. */
const inFolder = (lang, url) =>
  url.startsWith(SITE_URL) ? `${SITE_URL}${lang}/${url.slice(SITE_URL.length)}` : url;

/** The page `file` in `lang`, from its English and the language's texts. */
export function translatePage(file, lang, texts) {
  const src = read(file);
  const { entries, tags } = pageStrings(file, src);
  const edits = []; // [from, to, text]
  for (const e of entries) if (e.span) edits.push([...e.span, texts[e.key] ?? e.text]);
  for (const { tag, attrs, spans, at, end, inKey } of tags) {
    if (inKey) continue; // the language's own markup
    if (tag === "html") edits.push([...spans.lang, lang]);
    if (tag === "link" && attrs.rel === "canonical")
      edits.push([...spans.href, inFolder(lang, attrs.href)]);
    if (tag === "meta" && attrs.property === "og:url")
      edits.push([...spans.content, inFolder(lang, attrs.content)]);
    for (const a of ["src", "href"]) {
      if (!(a in spans) || (tag === "link" && attrs.rel === "canonical")) continue;
      const url = attrs[a].replace(/^js\/locales\/en\//, `js/locales/${lang}/`);
      if (fromFolder(url) !== attrs[a]) edits.push([...spans[a], fromFolder(url)]);
    }
    if (tag === "script" && attrs.type === "application/ld+json") {
      const close = src.indexOf("</script>", end);
      const indent = /[ \t]*$/.exec(src.slice(0, at))[0];
      const data = JSON.parse(src.slice(end, close));
      for (const [field, key] of Object.entries(JSON_LD.text))
        if (field in data) data[field] = texts[key] ?? data[field];
      data.url = inFolder(lang, data.url);
      data.inLanguage = lang;
      const json = JSON.stringify(data, null, 2).replace(/^/gm, `${indent}  `);
      edits.push([end, close, `\n${json}\n${indent}`]);
    }
  }
  edits.sort((a, b) => b[0] - a[0]);
  let out = src;
  for (const [from, to, text] of edits) out = out.slice(0, from) + text + out.slice(to);
  const note = `<!-- Made by scripts/pages.js from ../${file} and js/locales/${lang}/: don't edit it, change those and run npm run pages. -->`;
  return out.replace(/^<!doctype html>\n/i, (d) => `${d}${note}\n`);
}

/** The web app manifest in `lang`: its texts, and its own start, scope and identity. */
export function translateManifest(lang, texts) {
  const m = JSON.parse(read("manifest.webmanifest"));
  for (const [field, key] of Object.entries(MANIFEST.text)) m[field] = texts[key] ?? m[field];
  m.lang = lang;
  m.id = `${lang}/`; // resolved against the site's origin: an app of its own
  m.icons = m.icons.map((i) => ({ ...i, src: fromFolder(i.src) }));
  return `${JSON.stringify(m, null, 2)}\n`;
}

/** Every file of every language but English: { "de/index.html": content }. */
export async function allPages() {
  const out = {};
  for (const lang of LANGS.slice(1)) {
    const texts = flatten(await textsOf(lang));
    for (const file of PAGES) out[`${lang}/${file}`] = translatePage(file, lang, texts);
    out[`${lang}/manifest.webmanifest`] = translateManifest(lang, texts);
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = await allPages();
  if (process.argv.includes("--check")) {
    const problems = Object.entries(files)
      .filter(([path, text]) => !existsSync(new URL(path, SITE)) || read(path) !== text)
      .map(([path]) => `site/${path} is out of date: run npm run pages`);
    for (const lang of LANGS.slice(1))
      for (const f of readdirSync(new URL(`${lang}/`, SITE)))
        if (!(`${lang}/${f}` in files)) problems.push(`site/${lang}/${f}: not made by pages.js`);
    for (const p of problems) console.log(p);
    process.exit(problems.length ? 1 : 0);
  }
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(new URL(".", new URL(path, SITE)), { recursive: true });
    writeFileSync(new URL(path, SITE), text);
  }
}
