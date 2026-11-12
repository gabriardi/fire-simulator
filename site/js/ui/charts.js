// The charts, drawn with Plotly from what the workers return, and the headline numbers above them.
import { RULE_KINDS, RULE_SHORT, personById } from "../engine.js";
import { $, css, el, esc, isPhone } from "./dom.js";
import { followBand } from "./form.js";
import { helpBtn } from "./messages.js";
import { changed } from "./run.js";
import { explore, fmt, settings, sim, state } from "./state.js";

let unit = "years";

export const setUnit = (u) => {
  unit = u;
};

const VIRIDIS = ["#440154", "#414487", "#2a788e", "#22a884", "#7ad151", "#fde725"];
function viridis(t) {
  const x = Math.min(Math.max(t, 0), 1) * (VIRIDIS.length - 1);
  const i = Math.min(Math.floor(x), VIRIDIS.length - 2);
  const f = x - i;
  const a = VIRIDIS[i].match(/\w\w/g).map((h) => parseInt(h, 16));
  const b = VIRIDIS[i + 1].match(/\w\w/g).map((h) => parseInt(h, 16));
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(",")})`;
}
function alpha(hex, a) {
  const h = hex.replace("#", "");
  const n =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const [r, g, b] = n.match(/\w\w/g).map((x) => parseInt(x, 16));
  return `rgba(${r},${g},${b},${a})`;
}
function layout(extra = {}) {
  const ink = css("--ink");
  const line = css("--line");
  const phone = isPhone();
  const axis = {
    gridcolor: line,
    linecolor: line,
    zerolinecolor: line,
    tickfont: { color: css("--muted") },
    fixedrange: phone,
  };
  return {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: css("--font"), color: ink, size: 12 },
    margin: { l: 58, r: 14, t: 14, b: 44 },
    separators: fmt.plotly,
    hoverlabel: {
      bgcolor: css("--surface"),
      bordercolor: line,
      font: { color: ink, family: css("--font") },
    },
    legend: { orientation: "h", x: 0, y: -0.16, font: { color: css("--muted"), size: 11 } },
    dragmode: phone ? false : "zoom",
    ...extra,
    xaxis: { ...axis, ...(extra.xaxis || {}) },
    yaxis: { ...axis, ...(extra.yaxis || {}) },
  };
}
const CONFIG = { responsive: true, displaylogo: false, displayModeBar: false, scrollZoom: false };

// Short names for the age rows under the year axis: as short as they can be while still telling
// everyone apart. First letters (A, S); else the initials of each word, numbers kept whole (M, P2,
// P3 for "Me", "Person 2", "Person 3"); else the first three letters; else 1, 2, 3.
function shortNames(people) {
  const tries = [
    (n) => [...n][0] ?? "?",
    (n) =>
      n
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => (/^\d+$/.test(w) ? w : [...w][0]))
        .join("") || "?",
    (n) => [...n].slice(0, 3).join("") || "?",
  ];
  for (const f of tries) {
    const short = people.map((x) => f(x.name.trim()));
    if (new Set(short).size === short.length) return short;
  }
  return people.map((_, i) => String(i + 1));
}
let measureCtx = null;
const textWidth = (text, px) => {
  measureCtx ??= document.createElement("canvas").getContext("2d");
  measureCtx.font = `${px}px ${css("--font")}`;
  return measureCtx.measureText(text).width;
};

// Every 5 years (or 10, 20 where the labels wouldn't fit), each with the ages that year, two people
// per line. Never tilted (a tilted label runs into the chart's bottom edge), and none so close to
// either end that it would be cut off: `room` is the margin beside the plot on each side.
function yearTicks(years, people, plotWidth, room) {
  const names = shortNames(people);
  const rowsAt = (y) => {
    const parts = people.map((x, i) =>
      people.length > 1 ? `${names[i]} ${y - x.birth_year}` : `age ${y - x.birth_year}`,
    );
    const rows = [];
    for (let i = 0; i < parts.length; i += 2) rows.push(parts.slice(i, i + 2).join(" · "));
    return rows;
  };
  const last = years[years.length - 1];
  const widest = Math.max(
    textWidth(String(last), 12),
    ...rowsAt(last).map((r) => textWidth(r, 10)),
  );
  const span = Math.max(last - years[0], 1);
  const perYear = plotWidth / span;
  const step = [5, 10, 20].find((st) => perYear * st >= widest + 12) ?? 20;
  const fits = (y) =>
    (y - years[0]) * perYear + room.l >= widest / 2 && (last - y) * perYear + room.r >= widest / 2;
  const vals = [];
  for (let y = Math.ceil(years[0] / step) * step; y <= last; y += step) if (fits(y)) vals.push(y);
  const ticktext = vals.map((y) =>
    [String(y), ...rowsAt(y).map((r) => `<span style="font-size:10px">${esc(r)}</span>`)].join(
      "<br>",
    ),
  );
  return { tickvals: vals, ticktext, tickangle: 0, lines: 1 + Math.ceil(people.length / 2) };
}
const signed = (v) => `${v >= 0 ? "+" : "−"}${fmt.short(Math.abs(v))}`;
function milestoneLabel(m) {
  const parts = [];
  const unlocks = {};
  for (const it of m.items) {
    if (it.type === "fire") parts.push("FIRE start");
    else if (it.type === "unlock") (unlocks[it.owner] ??= []).push(it.name);
    else if (it.type === "income") parts.push(`${it.name} ${signed(it.amount)}`);
    else if (it.type === "income-end") parts.push(`${it.name} ends`);
    else if (it.type === "event") parts.push(`${it.name} ${signed(it.amount)}`);
  }
  for (const [owner, names] of Object.entries(unlocks)) parts.push(`${owner}: ${names.join(", ")}`);
  return esc(parts.join(" · "));
}
function milestoneShapes(milestones, labels = true) {
  const faint = css("--faint");
  const shapes = milestones.map((m) => ({
    type: "line",
    x0: m.year,
    x1: m.year,
    y0: 0,
    y1: 1,
    yref: "paper",
    line: { color: faint, width: 1, dash: "dot" },
  }));
  const annotations = labels
    ? milestones.map((m) => ({
        x: m.year,
        y: 1,
        yref: "paper",
        text: milestoneLabel(m),
        showarrow: false,
        textangle: -90,
        xanchor: "left",
        yanchor: "top",
        xshift: 2,
        font: { size: 10, color: css("--muted") },
      }))
    : [];
  return { shapes, annotations };
}

export function renderPaths() {
  const d = sim;
  const byYears = unit === "years";
  const scale = byYears ? state.spending : 1;
  const conv = (a) => a.map((v) => (v == null ? null : v / scale));
  const P = Object.fromEntries(Object.entries(d.percentiles).map(([k, v]) => [k, conv(v)]));
  const ink = css("--ink");
  const bad = css("--bad");
  const show = (v) =>
    v == null ? "–" : byYears ? `${v.toFixed(1).replace(".", fmt.decimal)} years` : fmt.short(v);
  const ages = d.years.map((y) =>
    esc(d.people.map((x) => `${x.name} ${y - x.birth_year}`).join(", ")),
  );
  const traces = d.paths.map((p) => ({
    x: d.years,
    y: conv(p.values),
    mode: "lines",
    type: "scatter",
    hoverinfo: "skip",
    showlegend: false,
    line: { width: 1, color: p.failed ? bad : viridis(0.08 + 0.9 * p.rank) },
    opacity: p.failed ? 0.55 : 0.45,
  }));
  const band = (lo, hi, a, name) => [
    {
      x: d.years,
      y: P[lo],
      customdata: P[lo].map(show),
      mode: "lines",
      line: { width: 0 },
      hovertemplate: `${lo}th: %{customdata}<extra></extra>`,
      showlegend: false,
    },
    {
      x: d.years,
      y: P[hi],
      customdata: P[hi].map(show),
      mode: "lines",
      line: { width: 0 },
      fill: "tonexty",
      fillcolor: alpha(ink.startsWith("#") ? ink : "#17212b", a),
      name,
      hovertemplate: `${hi}th: %{customdata}<extra></extra>`,
    },
  ];
  traces.push(...band("10", "90", 0.08, "80% of futures"));
  traces.push(...band("25", "75", 0.1, "50% of futures"));
  traces.push({
    x: d.years,
    y: P["10"],
    mode: "lines",
    line: { color: ink, width: 1.3, dash: "dash" },
    name: "10th percentile",
    hoverinfo: "skip",
  });
  traces.push({
    x: d.years,
    y: P["50"],
    customdata: P["50"].map((v, i) => [show(v), ages[i]]),
    mode: "lines",
    line: { color: ink, width: 2.6 },
    name: "median",
    hovertemplate: `median: %{customdata[0]}<br><span style="font-size:11px">%{customdata[1]}</span><extra></extra>`,
  });
  // Scale to the middle of the futures: the richest grow without limit and would squash the part
  // of the chart that matters (the lower half, where futures fail). The median stays in view, and
  // the upper band through the first ten FIRE years.
  const top = (a, upto = a.length) => Math.max(1e-9, ...a.slice(0, upto).filter((v) => v != null));
  const ymax = 1.15 * Math.max(top(P["50"]), top(P["75"], d.fire_index + 11));
  const ms = milestoneShapes(d.milestones, !isPhone());
  ms.shapes.push({
    type: "line",
    x0: d.years[0],
    x1: d.years[d.years.length - 1],
    y0: 0,
    y1: 0,
    line: { color: css("--muted"), width: 1 },
  });
  const room = { l: 58, r: 14 };
  const { lines, ...ticks } = yearTicks(
    d.years,
    d.people,
    $("#ch-paths").clientWidth - room.l - room.r,
    room,
  );
  Plotly.react(
    "ch-paths",
    traces,
    layout({
      hovermode: "x unified",
      margin: { ...room, t: 40, b: 30 + 14 * lines },
      xaxis: { range: [d.years[0], d.years[d.years.length - 1]], ...ticks, showgrid: false },
      yaxis: {
        range: [-0.03 * ymax, ymax],
        tickformat: byYears ? "" : "~s",
        title: {
          text: byYears ? "Years of spending" : `Wealth (${state.currency}, today's)`,
          font: { size: 11, color: css("--muted") },
        },
      },
      shapes: ms.shapes,
      annotations: ms.annotations,
      legend: {
        orientation: "h",
        x: 0,
        y: 1.01,
        yanchor: "bottom",
        font: { size: 11, color: css("--muted") },
        bgcolor: "rgba(0,0,0,0)",
      },
    }),
    CONFIG,
  );
}

function renderSpending() {
  const card = $("#c-spending");
  const s = sim.spending;
  card.classList.toggle("hidden", !s);
  if (!s) return;
  const accent = css("--accent");
  const bad = css("--bad");
  const traces = s.paths.map((p) => ({
    x: s.years,
    y: p.values,
    mode: "lines",
    hoverinfo: "skip",
    showlegend: false,
    line: { width: 1, color: p.failed ? bad : accent },
    opacity: 0.3,
  }));
  const cd = (a) => a.map((v) => fmt.money(v));
  traces.push({
    x: s.years,
    y: s.percentiles["10"],
    customdata: cd(s.percentiles["10"]),
    mode: "lines",
    line: { width: 0 },
    showlegend: false,
    hovertemplate: "10th: %{customdata}<extra></extra>",
  });
  traces.push({
    x: s.years,
    y: s.percentiles["90"],
    customdata: cd(s.percentiles["90"]),
    mode: "lines",
    line: { width: 0 },
    fill: "tonexty",
    fillcolor: alpha(accent, 0.14),
    name: "80% of lasting futures",
    hovertemplate: "90th: %{customdata}<extra></extra>",
  });
  traces.push({
    x: s.years,
    y: s.percentiles["50"],
    customdata: cd(s.percentiles["50"]),
    mode: "lines",
    line: { color: accent, width: 2.6 },
    name: "median",
    hovertemplate: "median: %{customdata}<extra></extra>",
  });
  const flat = (v, name, dash) => ({
    x: [s.years[0], s.years[s.years.length - 1]],
    y: [v, v],
    mode: "lines",
    line: { color: css("--faint"), width: 1, dash },
    name,
    hoverinfo: "skip",
  });
  const start = sim.summary.first_year ? null : state.spending;
  if (start != null) traces.push(flat(start, "starting spending", "dash"));
  traces.push(flat(s.floor, "floor / ceiling", "dot"), {
    ...flat(s.ceiling, "", "dot"),
    showlegend: false,
  });
  Plotly.react(
    "ch-spending",
    traces,
    layout({
      hovermode: "x unified",
      xaxis: { range: [s.years[0], s.years[s.years.length - 1]], showgrid: false },
      yaxis: {
        tickformat: "~s",
        range: [Math.min(s.floor * 0.9, (start ?? s.floor) * 0.8), s.ceiling * 1.05],
      },
      margin: { l: 58, r: 14, t: 36, b: 44 },
      legend: {
        orientation: "h",
        x: 0,
        y: 1.01,
        yanchor: "bottom",
        font: { size: 11, color: css("--muted") },
      },
    }),
    CONFIG,
  );
}

function renderDist() {
  const d = sim;
  const accent = css("--accent");
  const e = d.start_hist.edges;
  const centers = e.slice(0, -1).map((v, i) => (v + e[i + 1]) / 2);
  const median = d.summary.start_median;
  Plotly.react(
    "ch-start",
    [
      {
        x: centers,
        y: d.start_hist.counts.map((c) => c / d.n_sims),
        customdata: centers.map((c) => fmt.short(c)),
        type: "bar",
        marker: { color: alpha(accent, 0.75) },
        hovertemplate: "%{customdata}: %{y:.1%} of futures<extra></extra>",
      },
    ],
    layout({
      bargap: 0.05,
      xaxis: {
        tickformat: "~s",
        title: {
          text: `${state.currency} in ${state.fire_year}, today's`,
          font: { size: 11, color: css("--muted") },
        },
      },
      yaxis: { tickformat: ".0%" },
      shapes: [
        {
          type: "line",
          x0: median,
          x1: median,
          y0: 0,
          y1: 1,
          yref: "paper",
          line: { color: css("--ink"), width: 2 },
        },
      ],
      annotations: [
        {
          x: median,
          y: 1,
          yref: "paper",
          text: `median ${esc(fmt.short(median))}`,
          showarrow: false,
          xanchor: "left",
          xshift: 4,
          yanchor: "top",
          font: { size: 11 },
        },
      ],
    }),
    CONFIG,
  );
  const f = d.fail_hist;
  Plotly.react(
    "ch-fail",
    [
      {
        x: f.years,
        y: f.counts.map((c) => c / d.n_sims),
        type: "bar",
        marker: { color: alpha(css("--bad"), 0.8) },
        hovertemplate: "%{x}: %{y:.2%} of futures run out<extra></extra>",
      },
    ],
    layout({
      bargap: 0.1,
      xaxis: {
        title: {
          text: `${fmt.pct(1 - d.summary.success)} of futures run out`,
          font: { size: 11, color: css("--muted") },
        },
      },
      yaxis: { tickformat: ".1%" },
      shapes: milestoneShapes(
        d.milestones.filter((m) => m.year > state.fire_year),
        false,
      ).shapes,
    }),
    CONFIG,
  );
}

const ageIn = (year) => {
  const x = personById(state, state.end_person);
  return `${x.name} ${Math.round(year) - x.birth_year}`;
};

function renderHero() {
  const s = sim.summary;
  const big = $("#k-success");
  big.textContent = fmt.pct(s.success);
  big.className = `big ${s.success >= 0.9 ? "good" : s.success >= 0.75 ? "warn" : "bad"}`;
  const rule = sim.rule === "Fixed" ? "fixed spending" : sim.rule.toLowerCase();
  const first = s.first_year;
  $("#k-what").textContent = first
    ? `of ${fmt.num(sim.n_sims)} simulated futures, spending down from ${state.fire_year}: typically ${fmt.money(first.p50)} in the first year, never below ${fmt.money(sim.spending.floor)}.`
    : `of ${fmt.num(sim.n_sims)} simulated futures, spending ${fmt.money(state.spending)} a year from ${state.fire_year} (${rule}).`;
  $("#rail-live").replaceChildren(
    "Money lasts in ",
    el("strong", { text: fmt.pct(s.success) }),
    ` · ${sim.ms} ms`,
  );
  const tile = (k, v, sub, help) =>
    el(
      "div",
      { class: "tile" },
      el("span", { class: "k" }, k, " ", helpBtn(help)),
      el("span", { class: "v", text: v }),
      sub ? el("span", { class: "s", text: sub }) : null,
    );
  const who = personById(state, state.end_person);
  const failSub = s.fail_median_year
    ? `in those, typically by ${s.fail_median_year} (${ageIn(s.fail_median_year)})${s.bridge_end ? ` · ${fmt.pct(s.fail_in_bridge, 1)} before ${s.bridge_end}` : ""}`
    : "";
  const tiles = [
    tile(
      "Wealth at the FIRE start",
      fmt.short(s.start_median),
      `median · 10th pct ${fmt.short(s.start_p10)}`,
      "result.start",
    ),
    ...(first
      ? [
          tile(
            "First-year spending",
            fmt.money(first.p50),
            first.p90 - first.p10 < 1
              ? "the same in every future: it starts from these balances"
              : `typical · bad 10%: ${fmt.money(first.p10)} · good 10%: ${fmt.money(first.p90)}`,
            "result.first",
          ),
        ]
      : []),
    tile(
      "Starting withdrawal rate",
      fmt.pct(s.withdrawal_rate, 2),
      "of the median wealth",
      "result.rate",
    ),
    tile(
      "Runs out",
      s.fail_median_year ? `in ${fmt.pct(1 - s.success)} of futures` : "in no future",
      failSub,
      "result.fail",
    ),
    tile(
      `Wealth when ${who.name} is ${state.end_age}`,
      fmt.short(s.end_median),
      `median of all futures · worst 10%: ${fmt.short(s.end_p10)}`,
      "result.end",
    ),
  ];
  if (s.avg_spending_median != null) {
    tiles.push(
      tile(
        "Average spending",
        fmt.money(s.avg_spending_median),
        "median lasting future",
        "result.flex",
      ),
      tile("Leanest year", fmt.money(s.lowest_p10), "10th percentile", "result.flex"),
      tile(
        "Ever spending at the floor",
        fmt.pct(s.floor_share),
        "of lasting futures",
        "result.flex",
      ),
    );
  }
  $("#tiles").replaceChildren(...tiles);
  const chips = sim.compare.map((c) =>
    el(
      "button",
      {
        type: "button",
        class: "chip",
        "aria-pressed": String(c.kind === state.rule.kind),
        title:
          c.success == null
            ? "the spending is outside this rule's floor and ceiling"
            : c.avg_spending
              ? `average spending ${fmt.money(c.avg_spending)}`
              : "same amount every year",
        disabled: c.success == null,
        onclick: () => {
          state.rule.kind = c.kind;
          changed();
        },
      },
      `${c.name} ${c.success == null ? "n/a" : fmt.pct(c.success)}`,
    ),
  );
  $("#compare").replaceChildren(
    el("span", { class: "k" }, "Same plan, other rules: ", helpBtn("result.compare")),
    ...chips,
  );
  $("#sub").textContent =
    `${state.currency}, today's money · ${fmt.num(sim.n_sims)} futures · seed ${settings.seed} · until ${sim.years[sim.years.length - 1]}`;
  $("#unit-money").textContent = state.currency;
}

export function renderSim() {
  renderHero();
  renderPaths();
  renderSpending();
  renderDist();
}

const GRID_TEXT = {
  spending: {
    title: "When can you stop, at which spending?",
    desc: "How often the money lasts for each FIRE year and spending level, on the same random markets throughout. Around 90% is a common target for a plan you can't easily undo. Tap a cell to try that plan.",
    axis: () => `Spending per year (${state.currency}, today's)`,
    hover: "Stop in %{y}, spend %{x} a year",
  },
  floor: {
    title: "When can you stop, with which floor?",
    desc: "The spend-down works out its own spending, so the columns are its floor: how often the floor could always be paid, for each FIRE year. Same random markets throughout. Tap a cell to try that plan.",
    axis: () => `Floor: the least you'd spend (${state.currency}, today's)`,
    hover: "Stop in %{y}, never below %{x}",
  },
};
function renderGrid() {
  const g = explore.grid;
  if (!g) return;
  const text = GRID_TEXT[g.axis];
  $("#grid-title").textContent = text.title;
  $("#grid-desc").textContent = text.desc;
  const labels = g.values.map((v) => esc(fmt.short(v)));
  const ys = g.fire_years.map(String);
  const cs = [
    [0, css("--bad")],
    [0.5, css("--warn")],
    [1, css("--good")],
  ];
  const shapes = [];
  const mine = g.axis === "floor" ? state.rule.floor : state.spending;
  const j = g.values.findIndex((v) => Math.abs(v - mine) <= g.step / 2);
  const i = g.fire_years.indexOf(state.fire_year);
  if (i >= 0 && j >= 0)
    shapes.push({
      type: "rect",
      x0: j - 0.5,
      x1: j + 0.5,
      y0: i - 0.5,
      y1: i + 0.5,
      line: { color: css("--ink"), width: 2.5 },
    });
  Plotly.react(
    "ch-grid",
    [
      {
        type: "heatmap",
        z: g.success,
        x: labels,
        y: ys,
        zmin: 0.5,
        zmax: 1,
        colorscale: cs,
        texttemplate: "%{z:.0%}",
        textfont: { size: isPhone() ? 9 : 11, color: css("--surface") },
        xgap: 2,
        ygap: 2,
        showscale: false,
        hoverongaps: false, // an empty cell has no rate: Plotly would show it as 0.0%
        hovertemplate: `${text.hover}<br>money lasts in <b>%{z:.1%}</b><extra></extra>`,
      },
    ],
    layout({
      margin: { l: 52, r: 8, t: 8, b: 48 },
      xaxis: {
        title: { text: text.axis(), font: { size: 11, color: css("--muted") } },
        showgrid: false,
        fixedrange: true,
        type: "category",
      },
      yaxis: {
        title: { text: "FIRE start", font: { size: 11, color: css("--muted") } },
        showgrid: false,
        fixedrange: true,
        type: "category",
      },
      shapes,
      dragmode: false,
    }),
    CONFIG,
  );
  wireGridClicks();
}

const SAFE_TEXT = {
  safe: {
    title: "Safe spending by FIRE year",
    desc: "The highest yearly spending that lasts in 90% and 95% of futures. Hover for the withdrawal rate it implies (spending ÷ median wealth at the start, retirement accounts included).",
  },
  spenddown: {
    title: "What the spend-down allows, by FIRE year",
    desc: "The first year's spending the spend-down works out if you stop in each year: in a typical future, and when the years until then went badly or well (worst and best 10%). Below the floor you'd still spend the floor, with more risk.",
  },
};
function renderSafe() {
  const s = explore.safe;
  if (!s) return;
  const x = s.map((r) => r.fire_year);
  const spendDown = s.length > 0 && "p50" in s[0];
  const text = SAFE_TEXT[spendDown ? "spenddown" : "safe"];
  $("#safe-title").textContent = text.title;
  $("#safe-desc").textContent = text.desc;
  const line = (key, color, dash, name) => ({
    x,
    y: s.map((r) => r[key]),
    customdata: s.map((r) => [
      r[key] == null ? "–" : fmt.money(r[key]),
      r[key] ? fmt.pct(r[key] / r.median_start, 2) : "–",
    ]),
    mode: "lines+markers",
    name,
    line: { color, width: 2.2, dash },
    marker: { size: 6 },
    hovertemplate: `${name}: %{customdata[0]} a year · %{customdata[1]} of median wealth<extra></extra>`,
  });
  const accent = css("--accent");
  const level = (v, name) => ({
    x: [x[0], x[x.length - 1]],
    y: [v, v],
    mode: "lines",
    line: { color: css("--faint"), dash: "dash", width: 1 },
    name,
    hoverinfo: "skip",
  });
  const traces = spendDown
    ? [
        line("p50", accent, "solid", "typical"),
        line("p10", accent, "dot", "bad 10%"),
        line("p90", accent, "dash", "good 10%"),
        level(state.rule.floor, "floor"),
      ]
    : [
        line("90", accent, "solid", "lasts in 90%"),
        line("95", accent, "dot", "lasts in 95%"),
        level(state.spending, "your spending"),
      ];
  Plotly.react(
    "ch-safe",
    traces,
    layout({
      hovermode: "x unified",
      xaxis: { dtick: 1, showgrid: false },
      yaxis: { tickformat: "~s" },
      shapes: [
        {
          type: "line",
          x0: state.fire_year,
          x1: state.fire_year,
          y0: 0,
          y1: 1,
          yref: "paper",
          line: { color: css("--faint"), dash: "dot", width: 1 },
        },
      ],
      margin: { l: 58, r: 14, t: 36, b: 36 },
      legend: {
        orientation: "h",
        x: 0,
        y: 1.01,
        yanchor: "bottom",
        font: { size: 11, color: css("--muted") },
      },
    }),
    CONFIG,
  );
}

function renderStress() {
  const st = explore.stress;
  if (!st) return;
  const labels = st.map((r) => r.short);
  const colors = {
    fixed: "--faint",
    guardrails: "--accent",
    vanguard: "--good",
    spenddown: "--warn",
  };
  const traces = RULE_KINDS.map((k) => ({
    type: "bar",
    orientation: "h",
    name: RULE_SHORT[k],
    y: labels,
    x: st.map((r) => r.rates[k]),
    marker: { color: css(colors[k]), opacity: k === state.rule.kind ? 1 : 0.55 },
    text: st.map((r) => (r.rates[k] == null ? "n/a" : fmt.pct(r.rates[k]))),
    textposition: "outside",
    cliponaxis: false,
    hovertemplate: `${RULE_SHORT[k]}, %{y}: money lasts in %{x:.1%}<extra></extra>`,
  }));
  Plotly.react(
    "ch-stress",
    traces,
    layout({
      barmode: "group",
      bargap: 0.25,
      margin: { l: 8, r: 36, t: 8, b: 36 },
      xaxis: { range: [0, 1.08], tickformat: ".0%", fixedrange: true },
      yaxis: {
        autorange: "reversed",
        fixedrange: true,
        gridcolor: "rgba(0,0,0,0)",
        automargin: true,
      },
      legend: { orientation: "h", x: 0, y: -0.14, traceorder: "normal" },
      dragmode: false,
    }),
    CONFIG,
  );
}
export const RENDER = { grid: renderGrid, safe: renderSafe, stress: renderStress };

export function renderAll() {
  if (sim) renderSim();
  for (const r of Object.values(RENDER)) r();
}

function wireGridClicks() {
  const gd = document.getElementById("ch-grid");
  if (gd.dataset.wired) return;
  gd.dataset.wired = "1";
  gd.on("plotly_click", (ev) => {
    const pt = ev.points?.[0];
    if (!pt || pt.z == null || !explore.grid) return; // an empty cell isn't a valid plan
    const v = explore.grid.values[pt.pointIndex[1]];
    if (explore.grid.axis === "floor") state.rule.floor = v;
    else {
      followBand(v, state.spending);
      state.spending = v;
    }
    state.fire_year = explore.grid.fire_years[pt.pointIndex[0]];
    changed();
  });
}
