// Opens the simulator in the language wanted, if this page isn't in it. A plain script in the head
// of each language's simulator page, not a module, like theme.js: it runs before anything is drawn.
// - A language picked with the page's switch is kept in the viewer's settings, and wins.
// - With none picked, the English page, at the site's root, where most links and search results
//   lead, opens in the browser's first language that the site has. The other languages' pages
//   stay as they are: a link to one is a choice of it.
// It reads the settings itself, at the key store.js keeps them under; its list of languages is
// LANGS in js/i18n.js (tests/site.test.js checks that both match). The address keeps its query
// and its "#", which may hold a shared plan.
(() => {
  const LANGS = ["en", "de"];
  const page = document.documentElement.lang;
  let want = null;
  try {
    want = JSON.parse(localStorage.getItem("fire-sim.settings.v1"))?.lang;
  } catch {
    // no storage, or nothing readable in it
  }
  if (!LANGS.includes(want)) {
    // Not where this browser can't keep a language picked: English would then be impossible to
    // stay on.
    if (page !== "en" || !canStore()) return;
    const browser = navigator.languages?.length ? navigator.languages : [navigator.language];
    want = browser.map((l) => String(l).split("-")[0].toLowerCase()).find((l) => LANGS.includes(l));
  }
  if (!want || want === page) return;
  const root = new URL("../../", document.currentScript.src); // this file is in js/ui/
  const to = new URL(want === "en" ? "./" : `${want}/`, root);
  location.replace(to.href + location.search + location.hash);

  function canStore() {
    try {
      localStorage.setItem("fire-sim.test", "1");
      localStorage.removeItem("fire-sim.test");
      return true;
    } catch {
      return false;
    }
  }
})();
