# dsh-table-charts

[English](README.md) | [中文](README.zh.md)

[![npm](https://img.shields.io/npm/v/dsh-table-charts)](https://www.npmjs.com/package/dsh-table-charts)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![ci](https://img.shields.io/github/actions/workflow/status/chandra447/dsh-table-charts/ci.yml?label=ci)](https://github.com/chandra447/dsh-table-charts/actions)

![A Markdown table with a bar chart drawn under it in DeepSeek Harness](assets/chart-dark.png)

The assistant answered with a table. Tables are fine, but you still read the trend with your eyes closed.

This plugin draws the bar chart under the table. In the transcript. Half a second after the table stops changing. No tool call, no tokens spent, no localhost server.

```
┌──────────┬──────┬──────┐     ┌────────────────────────────────┐
│ Region   │ Q3   │ Q4   │     │ Q3            Q4               │
├──────────┼──────┼──────┤     │ APAC   ████▉    █████          │
│ APAC     │ 1240 │ 1880 │ ──▶ │ EMEA   ███▉     ████▉          │
│ EMEA     │  980 │ 1320 │     │ …                              │
└──────────┴──────┴──────┘     └────────────────────────────────┘
```

## Install

From the DSH Plugins window, or from a terminal:

```sh
dsh plugin --profile web add dsh-table-charts
dsh plugin --profile desktop add dsh-table-charts
```

Prebuilt package. No install script, no build approval prompt.

## What counts as data

- At least two body rows and two columns.
- A column where at least 60% of the cells parse as numbers.
- Up to four numeric columns, drawn as up to four bar series.
- Up to 24 rows. Bigger tables stay as tables.
- Identifier columns are skipped by header name: `year`, `date`, `id`, `#`, `no`, `number`, `index`, `rank`, `version`.

These all parse:

| Cell | Value |
|---|---|
| `1,240` | 1240 |
| `$980` | 980 |
| `-12%` | -12 |
| `(30)` | -30 |
| `1.2k` | 1200 |
| `3M` | 3000000 |

Negative values are drawn by magnitude, with the signed value printed next to the bar. The chart is a reading aid, not an axis-accurate plot.

## Why not a tool call?

Because it would cost a model turn to draw a picture of text that is already on screen. A tool call spends tokens, needs a server, and only works on messages sent after you install it. This plugin reads the Markdown DSH already rendered, including old messages, and draws locally.

## What you get

- A chart card under the table, with one column per numeric series.
- Bars follow the theme. They use the app's blue accent and repaint instantly on a theme switch because the SVG uses live CSS variables.
- The chart waits 450 ms for a table to settle, so streaming replies do not flicker.
- It redraws when the table changes and disappears when the message unmounts.
- About 11 KB of client JavaScript. No dependencies, no network, no host code.
- Width is capped at the chart's natural size, so it does not turn into a billboard on a wide monitor.

## When it stays out of the way

- Text tables, comparison tables, and tables with merged cells are left alone.
- A column of zeroes is not a chart.
- It never edits the table, never adds a scrollbar, and never blocks the message from streaming.

## How it works

1. A `MutationObserver` watches the transcript for tables.
2. For each table, the plugin reads the header row and body cells from the DOM that DSH already rendered.
3. It scores each column: enough numeric cells, a non-zero range, and not an identifier header.
4. It waits for the table to stop changing, then builds an inline SVG and inserts it after the table's scroll wrapper.
5. Colors are CSS variables, so the browser repaints the chart on a theme switch with no JavaScript.

## Credits

The table-to-chart idea came from the figure pipeline in [oh-my-pi](https://github.com/can1357/oh-my-pi). This is the browser-side version for DSH, with no rasterizer and no tool call.

The hero animation was rendered with [fframes](https://github.com/dmtrKovalenko/fframes).

## Also from this pair

[dsh-svg-fences](https://github.com/chandra447/dsh-svg-fences) renders SVG code fences as themed inline figures. Source, copy, download, zoom.

## License

MIT. Copyright 2026 Chandra Doredla.
