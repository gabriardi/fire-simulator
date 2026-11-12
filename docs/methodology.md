# How the simulation works

What [When can I stop?](https://whencanistop.fyi) computes, the choices behind it, and what it
leaves out. The page's **Guide** explains the same, input by input. The code is
`site/js/engine.js` (the model, one future at a time) and `site/js/views.js` (what each chart
shows), and both start with a description of what they do.

## Today's money

Everything is in **today's money**. Returns are drawn net of inflation, so a spending of 40,000 a
year means today's purchasing power in every year. The nominal inputs (returns, interest) are
turned into real ones with the inflation you set.

## One year at a time

One step is one calendar year. The first year counts only from the month your balances are
from. In every simulated future, each year goes like this:

1. **Retirement accounts unlock.** When its owner reaches the unlock age, an account is paid out,
   its tax is deducted, and the rest joins the portfolio.
2. **Money goes out, or comes in.**
   - One-off events happen in their year.
   - From the FIRE year, the spending rule sets the year's spending.
   - Income lines that are active that year reduce what the portfolio has to pay.
   - The money comes from cash first, then from the portfolio, grossed up for the withdrawal tax.
     If you keep a cash buffer, it moves into cash at the FIRE start.
3. **A future fails** in the first year the money you can reach can't pay the bills, even if a
   retirement account would unlock later.
4. **Markets move.**
   - The portfolio, and any retirement account invested like it, is a stock/bond mix rebalanced
     every year.
   - Stocks and bonds each get one random real return. By default it's log-normal, with the
     median and volatility you set. With fat tails it follows a Student-t distribution instead,
     capped at −60% and +60%.
   - Cash and fixed-interest accounts grow at their rate minus inflation.
5. **Savings arrive.** Until the FIRE year, the year's savings are added at the end of the year.

The headline number is the share of futures that never fail before the plan's end.

## Reproducible

Every future draws from its own random stream, seeded from the seed and the future's number. The
same seed always gives the same futures. Every comparison (rules, FIRE years, spending levels,
plans) is therefore made on the same markets, so a difference between two options comes from the
options themselves, not from luck. _New seed_ draws a fresh set of futures.

## Precision

At 10,000 futures, the default, the success rate is within about ±1 point of the exact answer for
these assumptions, 19 times in 20 (±0.6 near 90%). You can choose 1,000 to 50,000. To stay fast,
the grid and safe spending use at most 4,000 futures, and the stress test and the comparison of
rules at most 20,000.

## Spending rules

| Rule                              | What it does                                                                                                                                                                   | When it fails                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| **Fixed**                         | Spends the same real amount every year, whatever the markets do. This is the classic "4% rule" setup.                                                                          | When the money can't pay that amount |
| **Guardrails** (Guyton & Klinger) | Cuts spending (by 10% by default) when the withdrawal rate rises too far above where it started, and raises it when the rate falls too far below.                              | When even the floor can't be paid    |
| **Vanguard dynamic**              | Aims at the starting withdrawal rate applied to the current wealth, but changes spending by at most +5% or −2.5% a year (by default).                                          | When even the floor can't be paid    |
| **Spend-down** (die with zero)    | Each year, aims at the amount that could be spent every year until the end, counting locked accounts and future income as money today. It moves towards that amount gradually. | When even the floor can't be paid    |

The flexible rules stay between a **floor** (the costs you can't cut) and a **ceiling**. They
start at your spending, so that has to sit between the two. Until you set them yourself, they
are a band around the spending (−20%, +25%, rounded) that moves with it. Once you set them, they
stay, and the spending slider keeps within them; a spending typed outside them gets an error that
offers to set a band around it.

## Assumptions and limits

The simulator is a tool for thinking about a plan. It is not a forecast, and not financial
advice.

- **Independent years.** Each year's return is drawn independently. Real markets have long bad
  stretches and recoveries. The stress test covers the worst case that matters most, a bad start.
- **The return assumption dominates.** Compare a cautious case with an optimistic one before
  trusting any single number.
- **Taxes are simplified.** There is a flat rate on each retirement account when it unlocks, and
  an optional effective rate on portfolio withdrawals. Put every other tax, plus health insurance,
  into the spending.
- **Not modelled**:
  - changes to pension rules;
  - costs that rise faster than prices, such as health care late in life;
  - inflation that varies: it's the rate you set, in every year, and only the returns are random;
  - how long each person actually lives: the plan simply runs to the age you set;
  - currency risk, and fees beyond what you subtract from the returns.

## How the model is checked

The tests (`tests/`, described in [CONTRIBUTING.md](../CONTRIBUTING.md#tests)) check the model
three ways:

- **Against results worked out by hand.** Without volatility, the most a portfolio can spend each
  year is an annuity's payment, W (1 − 1/g) / (1 − g^−N): the engine lasts just below it and runs
  out just above, and the safe-spending search finds it. In a two-year plan the money runs out
  exactly when the first year's growth is below a threshold, so the share of futures that last
  must be 50% at the median, and Φ(1) ≈ 84.13% one standard deviation below.
- **Against the model it was ported from**, a Python/numpy simulation that isn't published. On
  fictional plans, without volatility the two agree year by year to within 1e-9; with it, within
  sampling noise. That shows the port is faithful, not that the model is right, and its numbers
  are frozen: they can't be made again.
- **Mechanics, case by case**: accounts unlocking, income lines and events, taxes, the spending
  rules' limits, the statistics of the random draws, and the charts agreeing with direct runs of
  the engine on the same futures.
