# Contributing

Thanks for looking. Issues and pull requests are welcome: a bug, a number that looks wrong, a
pension system the simulator can't express, a sentence that could be clearer. For a bigger
change, open an issue first, so we can agree on it before you write it. A security problem goes
privately instead: see [SECURITY.md](SECURITY.md).

## What the project is

- **No build step, no framework, no dependencies.** The site is plain HTML, CSS and ES modules in
  `site/`, served as they are. A change that needs a package or a bundler is unlikely to go in.
- **Nothing leaves the device.** No request to anyone else, no analytics, no cookies. The
  Content-Security-Policy (`site/_headers`) enforces it, and a change shouldn't loosen it.
- **Small on purpose.** One page that answers a few questions well. The model's limits are
  written down in [docs/methodology.md](docs/methodology.md); lifting one is a good change,
  adding a screen of options for a rare case usually isn't.
- **Plans already saved keep working.** Plans live in people's browsers, files and links, and
  this code can't reach them to fix them: see the notes on plans below.

## Working on it

```bash
git clone https://github.com/gabriardi/fire-simulator.git
cd fire-simulator
node scripts/serve.js            # http://127.0.0.1:8000, with the production headers
node --test "tests/*.test.js"    # Node 22 or newer; no packages to install
```

Opening `site/index.html` from disk won't work: browsers don't load ES modules or Web Workers
from `file://`. `node scripts/serve.js --lan` also serves it to a phone on the same network.

## The layout

Everything the site serves is in `site/`; the rest of the repository is for working on it. Only
`site/js/app.js` and `site/js/ui/` touch the page. The model, the plan format and the storage
formats need no page, so the tests run them under Node.

In `site/`:

| File | What it does |
| --- | --- |
| `index.html`, `app.css` | The page and its styles, in light and dark mode, down to phone width |
| `js/app.js` | The page's entry point: wires buttons, menus and dialogs to `js/ui/`, then starts |
| `js/ui/state.js` | What the page's modules share: settings, saved plans, the plan on screen, its results |
| `js/ui/fields.js`, `js/ui/form.js` | The form's fields, and the form built from them, section by section |
| `js/ui/plans.js` | Saving, switching, renaming, deleting, undo, and the plan bar |
| `js/ui/setup.js`, `js/ui/share.js`, `js/ui/files.js` | Setting up a plan; share links; export and import files |
| `js/ui/run.js`, `js/ui/charts.js` | Running the model in workers, and drawing what they return |
| `js/ui/messages.js`, `js/ui/dom.js` | Help and the guide, toasts and errors; small page helpers |
| `js/ui/updates.js` | Starting the service worker; loading a new version into a page left open |
| `js/engine.js` | The model: random draws, accounts, income, spending rules, one future at a time |
| `js/views.js` | Turns simulations into what each chart shows (percentiles, the grid, safe spending, the stress test) |
| `js/worker.js` | Runs the views in Web Workers, so the page never freezes |
| `js/plan.js` | The plan format: defaults, the example, cleaning a plan that comes from storage, a file or a link |
| `js/store.js` | Local storage, export and import files, share links |
| `js/format.js` | Currencies, number formats, and parsing typed numbers |
| `js/help.js` | Every "?" text and the guide |
| `sw.js`, `manifest.webmanifest` | Offline use, installing as an app, and telling a page left open about a new version |
| `vendor/` | Plotly's cartesian bundle (charts) |
| `privacy.html` | The privacy notice of this project's copy |
| `robots.txt`, `sitemap.xml`, `images/social.png` | For search engines and link previews |
| `_headers` | The response headers: the Content-Security-Policy, caching |
| `LICENSE` | A copy of the repository's license, served with the code |

Around it:

| File | What it does |
| --- | --- |
| `scripts/serve.js` | The local server, with the production headers |
| `wrangler.jsonc` | Hosting on Cloudflare: `site/` as static files, and the logs |
| `tests/` | The tests, below |
| `docs/` | How the simulation works, the README's screenshots, and the link-preview card |
| `.github/` | The tests on GitHub Actions, Dependabot for those actions, the sponsor button |
| `.editorconfig` | UTF-8, LF, two spaces; files from elsewhere left as they came |

## Tests

GitHub Actions runs them on every push to `main` and every pull request, on Node 22 and 24
(`.github/workflows/test.yml`). It also checks that the bundled Plotly is, byte for byte, the
file published on npm for its version.

- `tests/engine.test.js` covers the model's mechanics:
  - accounts unlocking, income lines and events;
  - taxes and the spending rules' limits;
  - the statistics of the random draws;
  - results that can be worked out by hand: the most a portfolio can pay as an annuity, and the
    odds of a bad first year, from the normal distribution.
- `tests/parity.test.js` checks the engine against the Python/numpy model it was ported from. The
  numbers in `tests/fixtures/python-model.json` come from that model, run on fictional plans:
  - without volatility, both are deterministic and agree year by year to within 1e-9;
  - with volatility, the success rates agree within sampling noise.

  That model isn't published, so the fixture is frozen. Agreeing shows that the port is faithful,
  not that the model is right: the hand-worked results in `tests/engine.test.js` are for that. A
  deliberate change to the model that breaks a case says so in its commit, and retires the case
  or takes the engine's new numbers for it.
- `tests/views.test.js` covers what the charts show:
  - the percentiles (numpy's method), and the safe-spending search, which finds an annuity's
    payment;
  - every failing future counted, also those that fail before the FIRE start;
  - the grid and the stress test agreeing with direct runs on the same futures.
- `tests/plan.test.js` covers:
  - cleaning untrusted plans, saved plans and settings;
  - comparing plans, for the "unsaved changes" marks;
  - share links (with and without a password, with the run they were shared with) and export
    files round-tripping;
  - migrating plans from an older schema;
  - number and list parsing in several locales.
- `tests/site.test.js` checks what the notes below would otherwise leave to memory:
  - every file the page and its workers load is in the service worker's list, and every file
    in that list exists;
  - the Plotly file name is the same everywhere;
  - every "?" has an explanation, and the guide shows all of them;
  - the site serves the repository's license as it is.

## Before a pull request

1. `node --test "tests/*.test.js"` passes.
2. Try the change in the page (`node scripts/serve.js`), in a browser's private window so you start
   from the example. The tests don't drive the page, so it's worth a few minutes:
   - the result and all the charts appear, and update when you change the spending or a slider;
   - *Set up my plan* creates a plan; save, *Save as a copy*, rename, delete and undo work;
   - a share link, with and without a password, opens in another private window;
   - export, then import the file;
   - light and dark mode, and a phone's width.
3. If you moved code between modules, check that nothing is used without being imported. With
   [Deno](https://deno.com) (nothing to install in the project):

   ```bash
   deno lint --rules-tags= --rules-include=no-undef,no-unused-vars site/js/
   ```

   The only names it should report are the browser's own (`document`, `history`,
   `getComputedStyle`, `requestAnimationFrame`) and `Plotly`, which the page loads separately.
4. Commit messages say what changed for someone using or reading the project, in plain words,
   with the reason in the body: `Share links: an optional password`.

## Notes for changes

- **The model is described three times**, for three readers: in full in
  `docs/methodology.md`, briefly on the page (`site/index.html`, "How the simulation works"),
  and input by input in the guide (`site/js/help.js`). A change to the model updates all three,
  and the README's short "How it works" if it's affected.
- **The default currency** is `DEFAULT_CURRENCY` in `site/js/plan.js`.
- **Plans are versioned** (`schema` in `site/js/plan.js`). Anything loaded from storage, a file or
  a link goes through `normalize()`, which fills in missing fields, clamps values and repairs
  references. A new field needs a default there.
- **Renaming or reshaping a field** needs a step in `MIGRATIONS` (`site/js/plan.js`) and `SCHEMA`
  one higher. Otherwise `normalize()` drops the old field and uses the default, and plans in
  storage, files and links already sent silently lose that value. A plan from a newer schema than
  the page knows isn't opened or imported: the page asks for a reload, which fetches the new
  version.
- **Storage keys and the file format** (`fire-sim.*` in `site/js/store.js`, `FILE_FORMAT`) stay as
  they are, whatever the site is called: changing them loses every plan already saved.
- **New modules**: a module the page or a worker imports has to be added to `SHELL` in
  `site/sw.js`, or the app won't work offline. `tests/site.test.js` fails until it is.
- **The link-preview image** (`site/images/social.png`) is `docs/social-card.html` at
  1200 × 630: the command to make it again is at the top of that file. Make it again after a new
  screenshot.
- **Upgrading Plotly**: take `plotly-cartesian.min.js` and `LICENSE` from the npm package
  `plotly.js-cartesian-dist-min` at the new version
  (`npm pack plotly.js-cartesian-dist-min@<version>`), unchanged. The file name carries the
  version, so it can be cached forever: update `site/index.html`, `site/sw.js` and the README with
  it. The tests check the name; CI checks the file against the package.
- **Browser support**: any current browser. The page needs module workers and CSS subgrid
  (Chrome and Edge 117+, Safari 16+, Firefox 114+). It has been tested in Chrome. Share links use
  `CompressionStream` where available, and fall back to uncompressed links elsewhere.
  Password-locked links need Web Crypto, which browsers offer only over https and on
  `localhost`: elsewhere the password field is hidden.
- **The share links' format** is in [SECURITY.md](SECURITY.md#share-links-the-format). A change
  of the locked format needs a new version byte, and the old one still has to open.
