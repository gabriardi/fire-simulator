// Whether the welcome box shows: while the made-up example plan is on screen, until it's closed (the
// rule in js/ui/plans.js, which keeps it up to date afterwards). A plain script in the head of the
// simulator's pages, like theme.js: it decides before the page is first drawn, so the box doesn't
// appear a moment later and push the results down. It reads the viewer's storage itself, at the
// keys store.js keeps it under (tests/site.test.js checks they match). A wrong guess, from storage
// edited by hand, only moves the box into place once the page has started.
(() => {
  let show = true; // a first visit, or a browser that keeps nothing: the example plan
  try {
    const read = (key) => JSON.parse(localStorage.getItem(key));
    const plans = read("fire-sim.plans.v1")?.plans?.filter?.((p) => p?.plan) ?? [];
    if (read("fire-sim.settings.v1")?.welcomeClosed) show = false;
    else if (plans.length) {
      // The plan the page opens with: the one on screen last time, else the latest saved.
      const at = (p) => (Number.isFinite(p.updated) ? p.updated : 0);
      const current = read("fire-sim.session.v1")?.current;
      const plan =
        plans.find((p) => p.id === current) ?? plans.reduce((a, b) => (at(b) > at(a) ? b : a));
      show = plan.example === true;
    }
  } catch {
    // nothing readable in storage: as on a first visit
  }
  if (show) document.documentElement.dataset.welcome = "";
})();
