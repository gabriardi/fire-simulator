# When can I stop?

**[whencanistop.fyi](https://whencanistop.fyi)** · a Monte Carlo FIRE simulator that runs in your browser

[![whencanistop.fyi](https://img.shields.io/website?url=https%3A%2F%2Fwhencanistop.fyi&label=whencanistop.fyi&up_message=online&down_message=offline)](https://whencanistop.fyi)
[![Tests](https://github.com/gabriardi/fire-simulator/actions/workflows/test.yml/badge.svg)](https://github.com/gabriardi/fire-simulator/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/github/license/gabriardi/fire-simulator)](LICENSE)
[![Dependencies: none](https://img.shields.io/badge/dependencies-none-brightgreen)](CONTRIBUTING.md#what-the-project-is)
[![Tracking: none](https://img.shields.io/badge/tracking-none-brightgreen)](#your-data-stays-with-you)
[![Buy me a coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-support-ffdd00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/gabriardif)

**When can you stop working, and how much can you spend once you do?**

A Monte Carlo simulator for FIRE plans (financial independence, retire early). It plays out
thousands of possible futures for your savings, retirement accounts and pensions, then tells you
how often the money lasts. Everything runs in your browser, and nothing you type leaves your
device.

Use it at **[whencanistop.fyi](https://whencanistop.fyi)**, or [run your own copy](#run-it-locally).

![The simulator with its made-up example household: the money lasts in 78% of 10,000 futures, above a chart of wealth over time](docs/screenshot.png)

- **Static and free to host.** Plain HTML, CSS and JavaScript, with no build step, no server and
  no dependencies. Put `site/` on any static host.
- **Local first.** Plans are saved in your browser. You can export them to a file, or send one to
  someone as a link.
- **Made for any household.** One to four people, any currency, any pension system.

## Contents

- [What it answers](#what-it-answers)
- [What you can model](#what-you-can-model)
- [Using it](#using-it)
- [Your data stays with you](#your-data-stays-with-you)
- [How it works](#how-it-works)
- [Run it locally](#run-it-locally)
- [Deploy your own copy](#deploy-your-own-copy)
- [Contributing](#contributing)
- [Support](#support)
- [License](#license)

## What it answers

| Question | Where to look |
| --- | --- |
| Will the money last until the end? | **Money lasts in**: the share of futures where it never runs out |
| When could I stop, and at what spending? | **The grid**: FIRE year × yearly spending, the success rate in every cell |
| How much can I safely spend? | **Safe spending by FIRE year**: the highest spending that lasts in 90% and 95% of futures |
| What if the markets crash right after I stop? | **Stress test**: 2008, 2000–2002 and a lost decade, forced into the first FIRE years |
| What does being flexible buy me? | **Same plan, other rules**: the success rate of each spending rule, side by side |
| How bad do the bad futures get? | **Wealth over time**, plus the spread of wealth at the start and of the year the money runs out |

![The grid of FIRE years and spending levels, and the safe spending for each FIRE year](docs/views.png)

## What you can model

- **Household**: one to four people with their birth years, and the currency (CHF unless you pick
  another). The plan runs until one of them
  reaches an age you choose (95 by default). Charts label the years with everyone's age.
- **Money**: investments, cash, and what you save each year until you stop. Savings can grow
  faster than inflation, for example with raises. You can also keep a few years of spending in cash
  at the FIRE start.
- **Retirement accounts you can't touch yet**, up to 12. Think of a 401(k), an IRA, a personal
  pension, a Swiss pillar 2 or 3a, or a German Riester. Each account has:
  - an owner, a balance and a yearly contribution;
  - an unlock age, when the account is paid out into the portfolio;
  - a flat withdrawal tax;
  - growth either like the portfolio or at a fixed interest.
- **Income and costs after you stop**, up to 12 lines. Examples are state pensions, part-time
  work, rent coming in, or a mortgage going out.
  - Each line starts and stops by calendar year, by someone's age, or by years after the FIRE
    start.
  - A line can be fixed in nominal terms, so inflation erodes it, like an unindexed pension or a
    fixed-rate mortgage.
- **One-off events**, up to 20: an inheritance, a house sale, a new roof or a car. Each happens
  in its year, before or after you stop.
- **Spending rules**:
  - **fixed**, the classic safe withdrawal rate;
  - **Guyton-Klinger guardrails**;
  - **Vanguard dynamic spending**;
  - **spend-down**, or "die with zero".

  The flexible rules have a floor and a ceiling, and are explained in
  [How the simulation works](docs/methodology.md#spending-rules).
- **Markets**:
  - a stock/bond mix, with an optional **bond tent** that holds more bonds around the FIRE start;
  - stock and bond returns, volatilities and their correlation;
  - inflation, and an effective tax rate on portfolio withdrawals;
  - **fat tails**, for more frequent extreme years;
  - your own crash sequence for the stress test.

Every input and every chart has a **?** that explains what it means and how to choose a value.
The **Guide** button shows all the explanations in one place.

## Using it

1. **Open it.** A made-up household, Alex and Sam, shows what the simulator does. Nothing about
   them is real.
2. **Set up your plan.** The *Set up my plan* button asks for the essentials: who is in the
   household, the currency, what you have, what you save, what you'd spend, and when you'd like to
   stop. It also asks about state pensions. Everything else starts from sensible defaults.
3. **Fill in the rest** in the left panel: retirement accounts, other income, events, markets.
   Results update as you type.
4. **Save.** *Save* keeps the plan in this browser. *⋯ → Save as a copy* keeps a variant next
   to it, such as "Stop at 50" or "Cautious returns". The plan bar marks unsaved changes, and
   *Revert* discards them.
5. **Back it up.** *⋯ → Export plans* downloads all your plans as one file.

Tips for reading the results:

- **Aim for about 90%** with a plan you can't easily undo. 100% would mean saving for a
  catastrophe that might never come.
- **Try a cautious case.** The stock return moves the answer more than any other input.
  6% nominal with 2% inflation is about 3.9% real, near the middle of long-run forecasts for world
  stocks.
- **Run the stress test.** A crash in the first years after you stop does far more damage than the
  same crash twenty years later.
- **Compare the rules.** If you could cut spending by 10–20% in bad years, a flexible rule often
  lets you stop years earlier.
- **Click a cell in the grid** to try that FIRE year and spending.

Numbers can be typed in the format you're used to: `1,234,567`, `1.234.567`, `1'234'567` or
`1 234 567`, depending on the number format you pick. You can also type `250k` or `1.5M`.

## Your data stays with you

There is no account, no server-side code, no analytics and no request to anyone else. Even the
chart library is served with the site, and a strict Content-Security-Policy (`site/_headers`)
stops the page from loading anything from elsewhere. The site's
[privacy notice](https://whencanistop.fyi/privacy) (`site/privacy.html`) says the same for this
project's copy, with who runs it and how to reach them.

- **Saved plans** live in your browser's local storage, on this device only, and for this web
  address: the same site at another address keeps a list of its own. Browsers can clear that
  storage:
  - when you clear the browsing data, or close a private window;
  - in Safari, after 7 days of use without a visit to the site, unless you added it to the Home
    Screen;
  - in some browsers, when the device runs low on space.

  On the first save, the page asks the browser to keep its storage for good. That covers the
  low-space case. Until an exported file holds your latest saves, a note under the plan reminds
  you to export. The page also warns you when the browser isn't keeping what it saves at all.
- **Export plans** downloads every plan as a JSON file. That file is your backup, and also the way
  to move plans to another device or browser.
- **Import plans** adds a file's plans to the ones already there, and never replaces anything.
- **Share link** (*⋯ → Share link*) packs one plan into the link itself: the plan is compressed
  and placed after the `#`. Browsers don't send that part of a link to the server, so the plan
  isn't uploaded anywhere. Anyone with the link can see the plan's numbers, though, so share it
  like you'd share the numbers themselves. Opening a share link asks first, then adds the plan
  next to yours. Your own plans stay as they are. Opening a link whose plan is already saved
  (a bookmark, or your own link) goes to that plan instead of adding a copy.
- The link also carries the sharer's **seed and number of futures**, as information. If the
  person opening it uses others, a note under the plan says the numbers can differ a little and
  offers *Use the same*. The note goes away when they do, dismiss it, or save changes to the plan.
- **Password** (optional, in the share dialog): the link is encrypted in the browser
  (AES-256-GCM, with the key from the password by PBKDF2-SHA256 at 600,000 rounds), and opens only
  with that password. The plan's name is encrypted too. The password is never part of the link,
  so send it separately. A locked link can be attacked offline by trying passwords, so a few
  random words are better than a short password. There's no recovery: a forgotten password means
  sharing again. [SECURITY.md](SECURITY.md) has the link's format, and what a password does and
  doesn't protect.
- **Offline**: once the site has loaded over https, you can install it as an app, and it keeps
  working without a connection.

### What the host sees

The page is served by a web host: Cloudflare, for this project's own copy at whencanistop.fyi.
As with any website, the host receives what every browser sends with each request: your IP
address, which file was asked for, and browser details (the User-Agent). Cloudflare keeps these
in its logs and traffic statistics, under its own
[privacy policy](https://www.cloudflare.com/privacypolicy/).

This copy also has Cloudflare's Workers Logs turned on, to find problems. Whatever they record
about a request is kept for 3 days (7 on Cloudflare's paid plan), and can be read only in the
Cloudflare account that runs this copy. The site is files only, with no code running on
Cloudflare, and Cloudflare doesn't document whether requests for plain files are logged at all.
Either way, a log holds a request, and your plans are never in one.

Nothing else reaches it. The page loads no analytics or tracking scripts and sets no cookies, and
your plans are never part of a request (a share link keeps the plan after the `#`, which browsers
don't send). Questions about this project's copy: [open an
issue](https://github.com/gabriardi/fire-simulator/issues).

## How it works

Everything is in today's money. Each simulated future goes year by year: retirement accounts
unlock at their owner's age, the spending rule sets each year's spending from the FIRE start,
income and one-off events come in or go out, and the markets move, with a random return for
stocks and one for bonds. A future fails in the first year the money you can reach can't pay the
bills, and the headline number is the share of futures that never fail.

Every comparison runs on the same futures, so a difference between two options comes from the
options, not from luck. At 10,000 futures, the success rate is within about ±1 point of the exact
answer for these assumptions, 19 times in 20.

It is a tool for thinking about a plan, not a forecast, and not financial advice. The return you
assume moves the answer more than anything else, the years are drawn independently of each
other, and taxes are simplified.

**[How the simulation works](docs/methodology.md)** has the details: each step of a year, the
spending rules, precision, every assumption and limit, and how the model is checked.

## Run it locally

You need any static file server. Opening `site/index.html` straight from disk won't work: browsers
don't load ES modules or Web Workers from `file://`.

```bash
git clone https://github.com/gabriardi/fire-simulator.git
cd fire-simulator
node scripts/serve.js          # http://127.0.0.1:8000
```

- `node scripts/serve.js --lan` also makes it reachable from a phone on the same network.
- `PORT=9000 node scripts/serve.js` uses another port.
- `python3 -m http.server -d site` works too.

`scripts/serve.js` has no dependencies. It applies the same headers as production (`site/_headers`),
so you see exactly what the deployed site does, Content-Security-Policy included.

## Deploy your own copy

The site is the `site/` folder, as it is: there is no build command. Nothing else in the
repository (the README, the tests, the scripts) is part of it.

**Cloudflare Workers** (free, no limit on requests for static files, and it applies
`site/_headers`):
1. In the Cloudflare dashboard: *Workers & Pages → Create → Import a repository*, then pick the
   repository. Private repositories work.
2. No build command. The deploy command is the default, `npx wrangler deploy`, which reads
   `wrangler.jsonc`: the files in `site/` are served as they are, and nothing else is uploaded.
3. Every push to the main branch deploys. The site gets a `<name>.<account>.workers.dev` address,
   and a custom domain can be added under the Worker's *Settings → Domains & Routes*.
   `wrangler.jsonc` lists no routes, so deploys leave those domains to the dashboard: this
   project's copy has whencanistop.fyi that way. The `workers.dev` address stays on as well.
4. `wrangler.jsonc` turns on Workers Logs (`observability`). Remove that block to have none, or
   tell your visitors, as *What the host sees* does.

Without Git, `npx wrangler deploy` from the repository's folder does the same. Leave
Cloudflare's Web Analytics off: its script would break the no-third-party promise (and the
Content-Security-Policy blocks it anyway).

**GitHub Pages**: *Settings → Pages → Source: GitHub Actions*, then pick the workflow GitHub
suggests for static HTML, and set its `path` to `site`. Every path in the site is relative, so a
project URL like `user.github.io/fire-simulator/` works. GitHub Pages ignores `site/_headers`, so
the site runs without the Content-Security-Policy. GitHub Pages on a private repository needs a
paid GitHub plan.

**Anywhere else**: copy `site/` to any static host. To match production, serve the headers in
`site/_headers`.

After a new deploy, visitors get the new version the next time they open the page: the service
worker always asks the network first, and uses its stored copy only when offline. A page left
open, such as an installed app resumed from the background, checks for a new version when it
comes back into view and every hour, and loads it; the plan on screen is kept.

### Make it yours

If you publish your own copy, you're the one running that site: tell your visitors who you are,
how to reach you, and which host you use. A few files point at this project, and need yours:

- `site/privacy.html`: the operator, the contact, the host and the logs. It's this project's notice,
  not a template that fits every copy.
- `site/index.html`: the footer's links (the code, Buy me a coffee), and the address in its `<head>`
  (the canonical link, the link-preview tags and the structured data).
- `site/js/help.js`: the guide's last card, "Free and open source", with the same links.
- `site/robots.txt`, `site/sitemap.xml`: the address.

## Contributing

The code is plain ES modules, with no build step and no dependencies, and the tests need only
Node: `node --test "tests/*.test.js"`.

[CONTRIBUTING.md](CONTRIBUTING.md) has the layout, the tests, what to check before a pull request,
and notes for changes. [SECURITY.md](SECURITY.md) says how the site protects what people type, and
how to report a problem privately.

## Support

The simulator is free. If it helped you think through your plan, you can
[buy me a coffee](https://buymeacoffee.com/gabriardif).

## License

[MIT](LICENSE).

The bundled `site/vendor/plotly-cartesian-4.1.1.min.js` is
[plotly.js](https://github.com/plotly/plotly.js), from the npm package
`plotly.js-cartesian-dist-min` unchanged, and also MIT licensed (`site/vendor/PLOTLY-LICENSE`).
