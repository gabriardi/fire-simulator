# The site's words

For anyone writing a text for the site, or translating one. The English is the source: one word
for each idea, the same everywhere, on the page, in the "?" explanations and in the docs. A
translation keeps the same terms: one word in its language for each line below, and no synonyms
for variety.

Where the texts are: [CONTRIBUTING.md](../CONTRIBUTING.md#notes-for-changes) (the catalog, `npm run strings`).

## Terms

### The plan and its years

| Term                                         | What it means                                                                                                                  | Not                        |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| **FIRE**                                     | Financial independence, retire early: living from your savings instead of a salary. Explained in the "?" of the FIRE start.    |                            |
| **stop**, **stop working**                   | Plain words for reaching the FIRE start, as in the site's name.                                                                |                            |
| **FIRE start**                               | The first year you live from your savings: the plan's input, and each year to stop in on the grid and the safe-spending chart. | FIRE year, retirement year |
| **after stopping**, **after the FIRE start** | The years from the FIRE start on. "Retirement" is fine in passing.                                                             | the FIRE years             |
| **today's money**                            | Amounts in today's purchasing power, in every year. **Real** for a rate after inflation, **nominal** before it.                | inflation-adjusted         |
| **plan**                                     | Everything entered, saved under a name in this browser.                                                                        | scenario                   |
| **household**, **people**                    | Everyone whose age matters to the plan.                                                                                        |                            |

### Money

| Term                                     | What it means                                                                                                                                               | Not                                     |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **portfolio**                            | The investments you can sell at any time. Its input is "Invested today".                                                                                    |                                         |
| **cash**                                 | Bank balances, spent first.                                                                                                                                 |                                         |
| **cash cushion**                         | Years of spending moved from the portfolio to cash at the FIRE start.                                                                                       | cash buffer                             |
| **retirement account**                   | Money you can't reach until an age: it **unlocks** at its **unlock age**, is taxed and joins the portfolio.                                                 | pension account                         |
| **reachable money**                      | The portfolio and the cash: what can pay the bills before an account unlocks.                                                                               |                                         |
| **the bridge**                           | The years from the FIRE start until the last retirement account unlocks, carried by the reachable money alone.                                              |                                         |
| **wealth**                               | Everything: the portfolio, the cash, and the retirement accounts after their tax.                                                                           | net worth                               |
| **spending**                             | What the household spends in a year after stopping, taxes included.                                                                                         | withdrawal (that's the money taken out) |
| **saved per year**, **paid in per year** | What goes into the portfolio, and into a retirement account, each year until the FIRE start. **Saving rises by**: how much more each year, above inflation. | savings growth                          |
| **income line**, **cost line**           | A yearly amount, coming in or going out, from when it starts to when it stops. A **line** for short.                                                        |                                         |
| **one-off event**                        | A single amount in a single year.                                                                                                                           |                                         |

### The simulation

| Term                                      | What it means                                                                                                                 | Not                                    |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **future**, **simulated future**          | One of the thousands of random market histories the plan is played through.                                                   | simulation, scenario, path, run, trial |
| **the money lasts**, **a lasting future** | Every year's spending could be paid until the end of the plan. The headline: "Money lasts in 85%".                            | success                                |
| **runs out**, **fails**                   | The first year the reachable money can't pay the bills. "Runs out" in labels, "fails" in explanations: the same.              |                                        |
| **seed**                                  | Which set of random futures: the same seed always gives the same futures.                                                     |                                        |
| **stress test**, **crash**                | A crash forced into the first years after the FIRE start. The four crashes are **scenarios**.                                 |                                        |
| **extreme years**, **fat tails**          | Rare big years made more frequent.                                                                                            |                                        |
| **median**                                | Half the futures are above it. "Typical", "typically" in a sentence.                                                          | average (that's the mean)              |
| **worst 10%**, **best 10%**               | The 10th and 90th percentiles, on the tiles and in the charts' legends. "10th percentile" only where a chart lists its lines. | bad 10%, good 10%, 10th pct            |

### Spending rules

| Term                       | What it means                                                                                                       | Not                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **spending rule**          | How each year's spending is set: **Fixed**, **Guardrails**, **Vanguard dynamic** (short: Vanguard), **Spend-down**. |                        |
| **flexible rules**         | Guardrails, Vanguard and the spend-down: their spending moves with the markets.                                     |                        |
| **floor**, **ceiling**     | The least and the most a flexible rule spends. Together: **the floor and ceiling**, **the floor–ceiling range**.    | band, minimum, maximum |
| **guardrail band**         | How far the withdrawal rate may drift before guardrails cut or raise spending. The only "band".                     |                        |
| **cut / raise by**         | How much guardrails change spending when they act.                                                                  | adjustment             |
| **max raise**, **max cut** | The most Vanguard and the spend-down change spending in a year, written "+raise / −cut".                            | up, down               |
| **withdrawal rate**        | Spending ÷ wealth. The **starting withdrawal rate**; the **safe withdrawal rate (SWR)** of the "4% rule".           |                        |
| **assumed return**         | The real return the spend-down works its amount out with.                                                           |                        |
| **bond tent**              | A lower stock share only around the FIRE start.                                                                     |                        |

### The page

| Term                                           | What it means                                                              |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| **Parameters**                                 | The panel with the form (on a phone, the sheet "Adjust parameters" opens). |
| **the grid**                                   | "When can you stop, at which spending?": FIRE starts × spending levels.    |
| **safe spending**                              | "Safe spending by FIRE start".                                             |
| **"?"**, **the Guide**                         | An explanation of one thing; all of them, in order.                        |
| **share link**, **locked**                     | A plan inside a link; locked with a password.                              |
| **Export plans**, **Import plans**, **backup** | All plans to a file, and back; the file is the backup.                     |

## Style

- **British spelling**: colour, modelled, neighbour, centre.
- **Sentence case** everywhere: labels, buttons, headings, menu items.
- A **label** is a noun or a short phrase, with no full stop. A **hint** that isn't a sentence
  starts in lower case, with no full stop ("costs you can't cut"); a sentence starts with a
  capital and ends with a full stop.
- **"…"** ends a menu item or button that opens a dialog ("New plan…", "Share link…").
- **Quotes**: curly double quotes around a name or a quoted word (“Example”); the apostrophe
  stays straight (can't, today's).
- **Numbers**: an en dash for a range (15–18%), the minus sign for a negative (−40%), × and ÷,
  → for "gives". Amounts in examples have no currency: they read as dollars, euros, francs or
  pounds alike.
- **Units**: "years"; "yrs" and "/ yr" only where space is tight (an input's unit, a label beside
  another).
- **"You"** for the reader. Plain words before jargon, and a "?" explains each term the first time
  it's met.
- **Messages** are whole sentences with `{values}` in them, never glued from pieces
  ([CONTRIBUTING.md](../CONTRIBUTING.md#notes-for-changes)).

## For translators

- **The meaning, not the words.** "Future" also means a financial contract in English: take the
  word your language uses for a possible course of events.
- **Left as they are**: FIRE, Vanguard and Guyton & Klinger (names), Monte Carlo, the product
  names (GitHub, Cloudflare, Safari, iCloud). The site's name is still to be decided.
- **Decide once per language**, with the reviewer: the informal or formal "you" (du or Sie, tu or
  vous, tu or Lei, tú or usted), and whether the rules' names (Guardrails, Spend-down) are
  translated or kept.
- **The HTML stays as it is** in the help texts and the pages: translate the words between the
  tags and a link's text, not its address (unless the address has a version in the language,
  such as the FDPIC's `/en`).
- **The language's own typography**: its quotes („…“, « … »), the space French puts before
  `: ; ? !`, its number separators in the examples.
