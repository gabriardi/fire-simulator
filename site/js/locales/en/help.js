// The "?" explanations and the guide's cards, in English: { title, html } by key. Plain, trusted
// HTML. Keep each entry short: what it is, how it's used, an example. Amounts are in no currency
// in particular: they read as dollars, euros, francs or pounds alike. Which entries the guide
// shows, in which order, and which "?" share an entry are in ../../help.js, for every language.

export default {
  // ---- concepts (guide only) ---------------------------------------------------------------------
  "concept.todays-money": {
    title: "Everything is in today's money",
    html: `<p>All amounts mean <b>today's purchasing power</b>, in every year. The simulator takes
      inflation out of the returns instead of adding it to the prices.</p>
      <p class="ex">40,000 a year in 2050 buys what 40,000 buys today, even though the bills in
      2050 will show bigger numbers.</p>
      <p>So enter spending, savings and pensions at today's prices. Returns and interest rates are
      entered as usual (nominal); the simulator subtracts the inflation you set.</p>`,
  },
  "concept.monte-carlo": {
    title: "What a simulated future is",
    html: `<p>The simulator plays your plan through thousands of possible market histories, each
      year getting a random return. “Money lasts in 85%” means: in 85 of 100 of those futures,
      the money paid every year's spending until the end of the plan.</p>
      <p>It's not a forecast of one future, but a measure of how robust the plan is across many.</p>`,
  },
  "concept.sequence": {
    title: "Why the first years matter most",
    html: `<p>A crash right after you stop working does far more damage than the same crash 20 years
      later: you sell at low prices to pay the bills, and that money never recovers. This is
      called <b>sequence-of-returns risk</b>. The stress test shows it.</p>`,
  },
  "concept.swr": {
    title: "Safe withdrawal rate (SWR)",
    html: `<p>The share of your wealth you can take out in the first year, then keep spending the
      same real amount, and still not run out. The famous “4% rule” comes from 30-year US
      retirements; for 40+ years, or for markets around the world, studies of the past find around
      3–3.5%.</p>
      <p>The simulator finds less with its default returns: about 3% over 30 years and 2–2.5% over
      45, in 90% of futures. Its returns are below the past century's, and each year is drawn on
      its own, so nothing pulls a bad decade back towards the average. “Safe spending by FIRE
      start” shows the rate for your plan.</p>
      <p class="ex">1,200,000 × 3% = 36,000 a year.</p>`,
  },
  "concept.privacy": {
    title: "Your numbers stay with you",
    html: `<p>Everything runs in your browser: the simulation, the charts, the saving. Nothing you
      type is sent anywhere, there are no accounts and no tracking.</p>
      <ul>
        <li>Plans are kept in <b>this browser</b> (its local storage). Clearing the site's data,
          a private window, or Safari's clean-up of sites you haven't visited lately loses them: use
          <b>Export plans</b> to keep a copy.</li>
        <li>To move plans to another device, export them there and import the file.</li>
        <li>A <b>share link</b> carries one plan inside the link itself, after the “#”: browsers
          never send that part to the site. Whoever gets the link can see the numbers.</li>
        <li>You don't have to take this on trust: the code is public, so anyone can check that
          nothing is sent, <a href="https://github.com/gabriardi/fire-simulator" target="_blank" rel="noopener">on GitHub</a>.</li>
      </ul>
      <p>The <a href="privacy" target="_blank" rel="noopener">privacy notice</a> says who runs this
      site, what its host receives, and how to reach them.</p>`,
  },
  "concept.about": {
    title: "Free and open source",
    html: `<p>No ads, no accounts, no tracking. The code is public,
      <a href="https://github.com/gabriardi/fire-simulator" target="_blank" rel="noopener">on GitHub</a>,
      under the MIT license.</p>
      <ul>
        <li>Something broken, or a number that looks wrong?
          <a href="https://github.com/gabriardi/fire-simulator/issues/new/choose" target="_blank" rel="noopener">Open an issue</a>,
          with made-up numbers: issues are public.</li>
        <li>No GitHub account, or rather not post in public? Write to
          <a href="mailto:hello@whencanistop.fyi">hello@whencanistop.fyi</a>.</li>
        <li>If it's useful to you, you can support it:
          <a class="coffee" href="https://buymeacoffee.com/gabriardif" target="_blank" rel="noopener"><span aria-hidden="true">☕</span> Buy me a coffee</a></li>
      </ul>`,
  },

  // ---- plans ---------------------------------------------------------------------------------------
  plans: {
    title: "Plans",
    html: `<p>A plan is your situation and the choices you're trying, saved under a name in this
      browser. Keep several to compare: “Stop at 50”, “Stop at 55, part-time”, “Spend less”.</p>
      <ul>
        <li><b>Pick</b> one in the list to load it.</li>
        <li><b>Change</b> any value: the plan shows as <b>edited</b>, and a dot marks each changed
          field. <b>Save</b> (or ⌘S / Ctrl+S) keeps the changes; <b>Revert</b> brings back the saved
          values. Unsaved changes survive a reload.</li>
        <li>Under <b>⋯</b>: a new plan from scratch, a copy of this one, rename, delete, share,
          export and import.</li>
        <li>Deleting, reverting, or switching away from unsaved changes shows an <b>Undo</b> for a
          few seconds.</li>
      </ul>
      <p>The random seed and the number of futures aren't part of a plan: switching keeps the same
      futures, so the comparison is fair.</p>`,
  },
  backup: {
    title: "Backups",
    html: `<p>Saved plans live in this browser's storage, on this device only. Browsers can clear it:</p>
      <ul>
        <li>clearing the browsing data or the site's data;</li>
        <li>a private window, when it closes;</li>
        <li><b>Safari</b> (on a Mac, iPhone or iPad) deletes a site's data once you've used it for
          7 days without visiting the site, unless you added the site to the Home Screen;</li>
        <li>some browsers free space when the device runs low.</li>
      </ul>
      <p>When you first save, the page asks the browser to keep its storage for good (Firefox asks
      you; Chrome and Edge decide on their own). That protects against the last case, not the
      others.</p>
      <p><b>Export plans</b> writes every plan to a file: the only backup that survives a cleared
      browser or a lost device. A note under the plan reminds you when saved changes aren't in an
      exported file yet. To restore, use <b>Import plans</b>.</p>`,
  },
  share: {
    title: "Share link",
    html: `<p>A link that opens a copy of this plan in someone else's browser (or yours, on another
      device). The plan is packed into the link itself, after the “#”, which browsers never send
      to the site: nothing is uploaded. The person opening it gets their own copy; changes on
      either side don't reach the other. Opening the same link again goes to that copy instead
      of adding another.</p>
      <p>The link also says which seed and how many futures you used. If theirs are different,
      a note under their plan says so, since the numbers can then differ a little, and offers to
      use the same.</p>
      <p>Anyone with the link sees every number in the plan, unless you give it a <b>password</b>:
      the plan and its name are then encrypted in your browser, and the link opens only with that
      password. The password isn't in the link, so send it another way, not in the same message.</p>
      <p>Whoever holds a locked link can try passwords on their own computer, as many as they
      like, so pick a long one: a few unrelated words beat a short word with symbols. A forgotten
      password can't be recovered: share the plan again with a new one.</p>
      <p class="ex"><code>maple tunnel violet seven</code> → good. <code>Fire2026!</code> → guessed
      quickly.</p>`,
  },
  files: {
    title: "Export and import",
    html: `<p><b>Export plans</b> downloads all saved plans as one file: your backup, and the way to
      move them to another browser or device. <b>Import plans</b> adds the plans in such a file to
      the ones here (nothing is replaced).</p>`,
  },

  // ---- plan ----------------------------------------------------------------------------------------
  fire_year: {
    title: "FIRE start",
    html: `<p>The first year you live from your savings: <b>FIRE</b> stands for financial
      independence, retire early. Until then you keep earning and saving; from then on, savings
      stop and spending starts.</p>
      <p class="ex">Each year later adds a year of savings and growth, and is one year less to fund.
      The grid below shows the neighbouring years side by side.</p>`,
  },
  spending: {
    title: "Spending per year",
    html: `<p>What the household will spend each year after stopping, in today's money,
      <b>including</b> the taxes of those years (income tax on withdrawals, health insurance you'll
      now pay yourself). Leave out costs that stop with work, such as commuting.</p>
      <p class="ex">40,000 a year = 3,333 a month. With a flexible rule this is the
      <b>starting</b> amount. The spend-down works out its own and doesn't use it.</p>
      <p>Costs that come and go (a mortgage until it's paid off, children's school) are better as
      lines under “Income and costs after stopping”.</p>
      <p>A tax on wealth (a wealth tax, a yearly stamp duty on investments) shrinks as the portfolio
      does: take its rate off the stock and bond returns instead.</p>
      <p class="ex">A 0.3% wealth tax: stocks 6% → 5.7%, bonds 3% → 2.7%.</p>`,
  },
  end_person: {
    title: "Money must last until",
    html: `<p>How long the plan has to work: until this person reaches this age. Pick the youngest
      person, and an age you'd be unlucky to outlive: longer horizons need a lower withdrawal
      rate.</p>
      <p>For a couple, the chance that at least one of you lives into their 90s is much higher than
      either one's alone: plan for the longest-lived of you.</p>`,
  },

  // ---- spending rules ------------------------------------------------------------------------------
  "rule.fixed": {
    title: "Fixed spending",
    html: `<p>The same real amount every year, whatever the markets do. Simple and predictable, but
      it must survive the worst decades unchanged, so it's the strictest test: the classic “safe
      withdrawal rate”.</p>`,
  },
  "rule.guardrails": {
    title: "Guardrails (Guyton & Klinger)",
    html: `<p>Your <b>withdrawal rate</b> (what the portfolio pays ÷ wealth) at the start is the
      reference. Each year:</p>
      <ul><li>rate more than the <b>band</b> above the start (wealth fell) → spending is cut by the
      percentage in <b>Cut / raise by</b>;</li>
      <li>rate more than the band below the start (wealth grew) → spending is raised by it;</li>
      <li>otherwise unchanged. Always between floor and ceiling.</li></ul>
      <p class="ex">1,200,000 and 42,000 → rate 3.5%. With a 20% band and a 10% cut / raise: below
      about 1,000,000 (rate 4.2%) spending is cut to 37,800; above 1,500,000 (rate 2.8%) it rises
      to 46,200. Cuts can repeat in a long bad stretch.</p>`,
  },
  "rule.vanguard": {
    title: "Vanguard dynamic spending",
    html: `<p>Each year the <b>target</b> is your starting withdrawal rate × current wealth (plus
      income). Spending moves towards it, but by at most the <b>max raise</b> or the <b>max cut</b>
      a year. Always between floor and ceiling.</p>
      <p class="ex">Markets −30% → the target drops 30%, but spending only falls 2.5% a year while
      it stays down. Smoother than guardrails, slower to react to a deep crash.</p>`,
  },
  "rule.spenddown": {
    title: "Spend-down (die with zero)",
    html: `<p>Each year it works out what you could spend <b>every year until the end</b>, the same
      each year, if the money earned the <b>assumed return</b>, and aims at that. Counted as money
      today: what you can reach, the retirement accounts still locked (after their tax), and all
      future income and costs. Until an account unlocks only the reachable money pays the bills,
      so the amount is never more than that money alone can carry until then.</p>
      <p>Every year the amount is worked out again from the actual balances. Spending doesn't jump
      to it: it moves towards it by at most +raise / −cut a year, always between floor and ceiling.
      The spending per year above isn't used.</p>
      <p>It doesn't plan to keep money, so it spends more and leaves less. A crash right after you
      stop hurts it more, because it spends more in the first years.</p>
      <p><b>Once you've stopped</b>, it gives the year's amount: enter that January's balances, set
      the FIRE start to that year, and read “First-year spending”.</p>`,
  },
  "rule.floor": {
    title: "Floor",
    html: `<p>The lowest spending you'd accept: the costs you can't cut (housing, health, food,
      taxes). A flexible rule never goes below it, and a future <b>fails</b> only when even the
      floor can't be paid.</p>
      <p class="ex">32,000 under a 40,000 plan: the essentials, with travel and extras cut.</p>`,
  },
  "rule.ceiling": {
    title: "Ceiling",
    html: `<p>The most you'd want to spend in good times. Without it, a flexible rule could keep
      raising spending in very good futures.</p>
      <p>Guardrails and Vanguard start at your spending, so it has to sit between the floor and
      the ceiling. Until you set them yourself they sit around the spending (−20%, +25%) and
      move with it. Once you set them, they stay, and the spending slider keeps within them.</p>`,
  },
  "rule.band": {
    title: "Guardrail band",
    html: `<p>How far the withdrawal rate may drift from where it started before spending changes.
      Smaller = more frequent adjustments.</p>
      <p class="ex">20% → with a 3.5% start, nothing happens between 2.8% and 4.2%.</p>`,
  },
  "rule.adjust": {
    title: "Cut / raise by",
    html: `<p>How much spending changes when a guardrail is crossed.</p>
      <p class="ex">10% → 42,000 becomes 37,800 after a cut, 46,200 after a raise.</p>`,
  },
  "rule.up": {
    title: "Max raise per year",
    html: `<p>The most spending may rise in one year, however good the markets were. Vanguard uses
      5% in nominal terms, about 3% in today's money.</p>`,
  },
  "rule.down": {
    title: "Max cut per year",
    html: `<p>The most spending may fall in one year, however bad the markets were. Vanguard uses
      2.5% in nominal terms.</p>`,
  },
  "rule.assumed_return": {
    title: "Assumed return (spend-down)",
    html: `<p>The real yearly return the spend-down works out its amount with. If the money earns
      exactly this, spending stays the same every year; if more, it rises; if less, it falls.
      Below the stocks' median it is a safety margin: about 2 points below is a sensible start.</p>`,
  },
  "rule.max_raise": {
    title: "Max raise per year (spend-down)",
    html: `<p>The most spending may rise in one year. What isn't spent yet stays for the following
      years.</p>`,
  },
  "rule.max_cut": {
    title: "Max cut per year (spend-down)",
    html: `<p>The most spending may fall in one year. A smaller limit means gentler cuts, but they
      come later, so the money runs out more often. With no limit (100%) and no floor it can never
      run out: spending takes all the bad luck.</p>`,
  },

  // ---- household -----------------------------------------------------------------------------------
  currency: {
    title: "Currency",
    html: `<p>The currency of all the plan's amounts. It only changes how numbers are shown:
      there's no conversion, and the market assumptions are yours to set for it.</p>`,
  },
  people: {
    title: "People",
    html: `<p>Everyone whose age matters to the plan: whose retirement accounts unlock at an age,
      whose pension starts at an age, and who the money has to last for. Up to four.</p>
      <p>Only the birth year is used: the simulation moves a year at a time.</p>`,
  },

  // ---- savings and portfolio ----------------------------------------------------------------------
  portfolio: {
    title: "Invested today",
    html: `<p>Today's value of the investments you can sell at any time: brokerage accounts, funds,
      shares. They grow at the random return of the stock/bond mix under “Portfolio mix”.</p>
      <p>Retirement accounts you can't touch until an age go under “Retirement accounts” instead.</p>`,
  },
  cash: {
    title: "Cash today",
    html: `<p>Today's bank balances. They grow at the cash interest minus inflation, so in today's
      money they usually shrink. Spending is paid from cash first.</p>`,
  },
  contrib: {
    title: "Saved per year until the FIRE start",
    html: `<p>What you add to the investments each year until you stop, in today's money (so in
      real life it rises with inflation). Contributions to retirement accounts are set on each
      account.</p>`,
  },
  contrib_growth: {
    title: "Saving rises by",
    html: `<p>How much more you save each year, above inflation: raises and promotions. Applies to
      the retirement accounts' contributions too.</p>
      <p class="ex">2% → 20,000 this year, 20,400 next year, about 26,900 in 15 years.</p>`,
  },
  cash_interest: {
    title: "Cash interest",
    html: `<p>What your bank accounts pay, before inflation.</p>
      <p class="ex">1% with 2% inflation → cash loses about 1% a year in today's money.</p>`,
  },
  cash_buffer_years: {
    title: "Cash cushion",
    html: `<p>At the FIRE start, this many years of spending are moved from the portfolio to cash,
      and spent first, whatever the markets do. The idea: not having to sell in an early crash.
      In this model it usually helps little, because cash loses value to inflation and misses the
      recovery.</p>`,
  },
  portfolio_tax: {
    title: "Tax on portfolio withdrawals",
    html: `<p>An effective tax rate on what you take out of the portfolio (not cash), for countries
      that tax capital gains or dividends when you sell. Each withdrawal is grossed up: to spend
      100 you sell 100 ÷ (1 − rate).</p>
      <p class="ex">A 25% tax on gains when about half of what you sell is gain → about 12%.</p>
      <p>If your taxes in retirement are already in the spending, leave it at 0.</p>`,
  },

  // ---- retirement accounts -------------------------------------------------------------------------
  accounts: {
    title: "Retirement accounts",
    html: `<p>Money you can't reach until an age: a 401(k) or IRA, a workplace pension taken as a
      lump sum, a personal pension, a pillar 2 or 3a. Until its owner reaches the unlock age it
      counts in your wealth but <b>can't pay the bills</b>; then it is withdrawn, taxed, and added
      to the portfolio.</p>
      <p>Pensions paid as a monthly amount for life go under “Income and costs after stopping”.</p>`,
  },
  "account.contrib": {
    title: "Paid in per year",
    html: `<p>What goes into the account each year until the FIRE start (yours and your employer's),
      in today's money.</p>`,
  },
  "account.growth": {
    title: "Grows",
    html: `<p><b>Like the portfolio</b>: invested in the same stock/bond mix, with the same random
      returns. <b>At a fixed interest</b>: credited a steady rate every year (a pension fund that
      guarantees an interest, a savings account).</p>`,
  },
  "account.unlock_age": {
    title: "Unlocks at age",
    html: `<p>The owner's age when the account is taken out and added to the portfolio. Until then a
      future in which the reachable money runs out fails, even if this account would have saved it.</p>
      <p class="ex">Typical: 59½ in the US, 57 in the UK (from 2028), 60 for Swiss 3a and 58–65 for
      pillar 2. Check your own rules.</p>`,
  },
  "account.tax": {
    title: "Tax when withdrawn",
    html: `<p>The tax on taking the money out, as one blended rate on the whole balance.</p>
      <p class="ex">15% of 200,000 = 30,000 tax, 170,000 into the portfolio.</p>`,
  },

  // ---- income and costs ----------------------------------------------------------------------------
  income: {
    title: "Income and costs after stopping",
    html: `<p>Money that comes in, or goes out on top of the spending, for a stretch of the
      retirement: a state pension, a company pension paid monthly, part-time work, rent from a flat;
      or a mortgage until it's paid off, children at university. In Switzerland, someone who stops
      working before 65 still pays AHV contributions, set by their wealth: a cost until 65.</p>
      <ul>
        <li>A <b>positive</b> amount is income, a <b>negative</b> one an extra cost. Per year, in
          today's money.</li>
        <li>It counts from the FIRE start at the earliest: before that, your savings already reflect
          what you earn.</li>
        <li>It reduces (or adds to) what the portfolio has to pay each year.</li>
      </ul>`,
  },
  "income.when": {
    title: "Starts and stops",
    html: `<p>When a line starts and when it stops, in one of three ways:</p>
      <ul><li><b>In the year</b>: a calendar year.</li>
      <li><b>When someone turns</b>: an age, so it follows their birth year.</li>
      <li><b>FIRE start + years</b>: moves with the FIRE start, so every FIRE start on the grid
        keeps “part-time for the first 5 years” right.</li></ul>
      <p>A line stops <b>in</b> its stop year: stopping at “FIRE start + 5” pays for 5 years.</p>`,
  },
  "income.indexed": {
    title: "Rises with inflation",
    html: `<p>Most state pensions are raised with prices: they keep their value in today's money.
      A pension that pays the same amount of money for ever loses value every year: untick it, and
      enter the amount in money as it will be paid.</p>`,
  },
  "income.change": {
    title: "Changes by",
    html: `<p>How much the line rises each year after its first, or falls if it's negative: on top
      of inflation if it rises with inflation, in money if it doesn't. A line that started before
      this year changes from this year on.</p>
      <ul>
        <li>A pension raised by less than prices: a negative change, such as −1%.</li>
        <li>Costs that rise faster than prices, such as care late in life: a positive one.</li>
      </ul>
      <p class="ex">A cost of 6,000 from age 80, +3% a year → about 8,100 at 90.</p>`,
  },

  // ---- one-off events ------------------------------------------------------------------------------
  events: {
    title: "One-off events",
    html: `<p>A single amount in a single year, before or after the FIRE start: an inheritance or the
      sale of a house (positive), a new roof, a car, a wedding, help for a child (negative). In
      today's money, after any tax. A cost the money can't pay is a failure in its year.</p>
      <p>To leave money to someone, enter it as a cost in the year the plan ends: a future that
      ends with less than that fails.</p>`,
  },

  // ---- markets -------------------------------------------------------------------------------------
  stock_return: {
    title: "Stock return (nominal median)",
    html: `<p>The typical yearly growth of stocks, before inflation. It is the <b>compound</b> growth
      rate: half the simulated years are better, half worse, and over the long run wealth grows at
      this rate (the simple average of the years is higher). The simulator subtracts inflation.</p>
      <p class="ex">6% with 2% inflation ≈ 3.9% real: around the middle of long-run forecasts for
      world stocks (about 3.5–5% real). World stocks have earned about 5% real a year since 1900.</p>
      <p>A return from elsewhere may be the <b>simple average</b> of the years instead: for the
      same stocks it's higher by about half the volatility squared.</p>
      <p class="ex">An average of 7.4% with 17% volatility ≈ 6% here.</p>
      <p>This one input moves the result more than any other: try a cautious case.</p>`,
  },
  stock_vol: {
    title: "Stock volatility",
    html: `<p>How much stock returns swing from year to year (their standard deviation). Higher
      volatility hurts a withdrawal plan, even with the same median.</p>
      <p class="ex">17% (world stocks) → 2 years in 3 between about −11% and +22% real.</p>
      <p>Don't lower it to model a calmer portfolio: lower volatility only comes with a lower
      return. Lower the stock share instead, which changes both together.</p>`,
  },
  inflation: {
    title: "Inflation",
    html: `<p>Turns the nominal inputs (returns, interest) into today's money. It doesn't raise your
      spending: that's already in today's money.</p>`,
  },
  _tails: {
    title: "Extreme years",
    html: `<p>With a normal distribution, a −40% year almost never happens. “Fat tails” make extreme
      years several times more frequent (and ordinary years a bit calmer), capped at −60% and +60%
      real in a year. A stress test, not a forecast.</p>
      <p>The number in “(t, 6)” sets how fat: it's a Student-t distribution with that many degrees
      of freedom. The lower it is, the fatter the tails.</p>`,
  },

  // ---- portfolio mix -------------------------------------------------------------------------------
  stock_share: {
    title: "Stock share",
    html: `<p>How much of the portfolio (and of the retirement accounts invested like it) is in
      stocks; the rest is in bonds. Every year it is brought back to this share (rebalanced). Less
      in stocks = smaller swings, but slower growth, before and after you stop.</p>`,
  },
  tent_share: {
    title: "Bond tent",
    html: `<p>A lower stock share only around the FIRE start, the moment a crash hurts most. Before
      and after, you're back at the normal stock share.</p>
      <p class="ex">Normally 100%, 70% at the start, 4 years to get there, 8 back: 92.5%, 85%,
      77.5% in the years before, 70% in the year of the FIRE start, then up 3.75 points a year.</p>
      <p>Set it equal to the stock share for no tent.</p>`,
  },
  tent_years: {
    title: "Years to get there, years back",
    html: `<p>How gradually the stock share moves down to the tent before the FIRE start, and back up
      afterwards, in equal steps. 0 years before = the switch happens at the start.</p>`,
  },
  bond_return: {
    title: "Bond return (nominal)",
    html: `<p>The compound yearly growth of the bond part, before inflation. What counts is the return
      after inflation: high-quality bonds have often earned about 0–2% real.</p>`,
  },
  bond_vol: {
    title: "Bond volatility",
    html: `<p>How much bond returns swing from year to year. Broad high-quality bond funds: roughly
      4–7%.</p>`,
  },
  stock_bond_corr: {
    title: "Stock/bond correlation",
    html: `<p>Whether stocks and bonds tend to move together: −1 opposite, 0 independent, +1
      together. Negative helps a mix (bonds rise when stocks crash). It was negative most of
      2000–2020 and positive in inflation years such as 2022.</p>`,
  },

  // ---- stress --------------------------------------------------------------------------------------
  _stress: {
    title: "Force a crash at the FIRE start",
    html: `<p>Replaces the first years after the FIRE start with a historical-style crash in every
      future; the years after it stay random. Shows how the plan copes with the worst moment for a crash.</p>`,
  },
  "stress-custom": {
    title: "Custom crash",
    html: `<p>Real returns in %, one per year from the FIRE start, separated by commas. Where the
      decimal mark is a comma, put a space after the commas between years: <code>-12,5, -20</code>.</p>
      <p class="ex"><code>-30, 10, -15</code> → −30% in the first year, +10% in the second, −15%
      in the third.</p>`,
  },

  // ---- simulation ----------------------------------------------------------------------------------
  n_sims: {
    title: "Simulated futures",
    html: `<p>How many futures to simulate. More = more precise, but slower.</p>
      <p class="ex">10,000 → “money lasts” is within about ±1 point, 19 times in 20; 50,000 → about
      ±0.4.</p>`,
  },
  seed: {
    title: "Random seed",
    html: `<p>Picks the set of random futures. The same seed always gives the same futures, so when
      you change the plan you compare it on the same markets. <b>New seed</b> draws a different set:
      if the result moves more than about a point, use more futures.</p>`,
  },
  start_year: {
    title: "Balances as of",
    html: `<p>The year and month your balances are from. The simulation starts there, and only the
      rest of that year still grows and saves. Update it whenever you update the balances.</p>`,
  },
  locale: {
    title: "Number format",
    html: `<p>How numbers are written and read: which mark separates thousands and which one
      decimals. Your browser's language by default. It's a setting of this browser, not of a plan.</p>`,
  },

  // ---- results -------------------------------------------------------------------------------------
  "result.success": {
    title: "Money lasts in …",
    html: `<p>The share of simulated futures in which every year's spending could be paid until the
      end. Green from 90%, amber from 75%. About 90% is a common target for a plan you can't easily
      undo.</p>
      <p>Careful when comparing rules: with <b>fixed</b> spending it means the full amount was always
      paid; with a <b>flexible</b> rule only that spending never had to go below the floor.</p>`,
  },
  "result.start": {
    title: "Wealth at the FIRE start",
    html: `<p>What you'd have when you stop: investments, cash, and the retirement accounts (net of
      their withdrawal tax). Uncertain too, because the years until then have random markets.</p>`,
  },
  "result.rate": {
    title: "Starting withdrawal rate",
    html: `<p>First year's spending ÷ the median wealth at the start. Comparable with an SWR, but the
      income lines and the retirement accounts unlocking later also help.</p>`,
  },
  "result.fail": {
    title: "Runs out",
    html: `<p>The share of futures in which the money runs out, and <b>in those futures only</b> the
      typical (median) year it happens. The last part: how many run out before the last retirement
      account unlocks (the “bridge” the reachable money has to carry alone).</p>`,
  },
  "result.end": {
    title: "Wealth at the end",
    html: `<p>The wealth left when the plan ends, in today's money, across <b>all</b> futures (failed
      ones count as 0). The typical future often ends rich: over many decades an average market
      compounds a lot. It's the same plan that runs out in the bad futures, which is why flexible
      rules let you spend more in the good ones.</p>`,
  },
  "result.first": {
    title: "First-year spending (spend-down)",
    html: `<p>Only for the spend-down: what it works out for the year of the FIRE start, before the
      floor and ceiling. It depends on how the markets go until you stop. With the FIRE start in the year
      of the balances it is one number, the same in every future.</p>`,
  },
  "result.flex": {
    title: "Average spending, leanest year, reaching the floor",
    html: `<p>Only for flexible rules, among the futures that last: the typical spending over the
      whole retirement, the lowest yearly spending (in the worst 10% of futures), and how many
      futures spend at least one year at the floor.</p>`,
  },
  "result.compare": {
    title: "Same plan, other rules",
    html: `<p>Your plan with each spending rule, on the same markets. Tap one to switch. “n/a”: your
      spending is outside that rule's floor–ceiling range.</p>`,
  },

  // ---- charts --------------------------------------------------------------------------------------
  "chart.paths": {
    title: "Wealth over time",
    html: `<p>Each thin line is one future: purple = poorest, yellow = richest, <b>red = runs out</b>.
      Black line: median; dashed: 10th percentile; shaded: middle 50% and 80% of futures. Dotted
      lines mark the FIRE start, accounts unlocking, income starting and one-off events.</p>
      <p><b>Years of spending</b> = wealth ÷ yearly spending: 25 means 25 years of spending in the
      bank.</p>`,
  },
  "chart.spending": {
    title: "What you'd get to spend",
    html: `<p>For flexible rules: each line is one future's yearly spending. The shaded area holds 80%
      of the futures that last. Dashed: your starting spending (not for the spend-down, where each future
      starts at its own); dotted: floor and ceiling.</p>`,
  },
  "chart.grid": {
    title: "When can you stop, at which spending?",
    html: `<p>Each cell: how often the money lasts if you stop in that year (row) and spend that much
      (column). The outlined cell is your plan. <b>Tap a cell</b> to try that plan.</p>
      <p>With guardrails or Vanguard, a floor and ceiling you set yourself keep the columns between
      them. Left as they came, around the spending, they move with it: each column has its own,
      as when you change the spending.</p>
      <p>With the spend-down, which works out its own spending, the columns are its <b>floor</b>,
      up to its ceiling.</p>`,
  },
  "chart.safe": {
    title: "Safe spending by FIRE start",
    html: `<p>The highest yearly spending that lasts in 90% (solid) and 95% (dotted) of futures, for
      each FIRE start. Hover or tap for the withdrawal rate it implies.</p>
      <p>With the spend-down it shows what the spend-down allows in the first year if you stop in
      each year instead: in the median future, and in the worst and best 10%, depending on how
      the years until then went.</p>`,
  },
  "chart.stress": {
    title: "Stress test",
    html: `<p>Your plan with a crash forced into the first years after the FIRE start, for every rule. Shows which
      rule holds up best when things go wrong at the worst moment.</p>`,
  },
  "chart.dist": {
    title: "Distributions",
    html: `<p>Left: how wealth at the FIRE start is spread across futures. Right: in which years the
      failing futures run out. Bars before the last account unlocks mean the bridge was too thin.</p>`,
  },
};
