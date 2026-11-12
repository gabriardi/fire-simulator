// The theme picked in this browser: light, dark, or the device's ("auto": no attribute). A plain
// script in the head of each page, not a module, as modules wait for the page: it puts the theme
// on the page before it is first drawn, so it never flashes in the other one. It reads the
// viewer's settings itself, at the key store.js keeps them under (tests/site.test.js checks the
// two match). The browser's bar colour (theme-color) follows the theme, also when the page's
// switch changes it.
(() => {
  const root = document.documentElement;
  try {
    const t = JSON.parse(localStorage.getItem("fire-sim.settings.v1"))?.theme;
    if (t === "light" || t === "dark") root.dataset.theme = t;
  } catch {
    // no storage, or nothing readable in it: the device's theme
  }
  const metas = [...document.querySelectorAll('meta[name="theme-color"]')];
  const own = new Map(metas.map((m) => [m, m.content]));
  const colourOf = (scheme) => own.get(metas.find((m) => m.media.includes(scheme)));
  const sync = () => {
    const t = root.dataset.theme;
    for (const m of metas) m.content = t ? colourOf(t) : own.get(m);
  };
  sync();
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
})();
