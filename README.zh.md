# dsh-table-charts

[English](README.md) | [中文](README.zh.md)

[![npm](https://img.shields.io/npm/v/dsh-table-charts)](https://www.npmjs.com/package/dsh-table-charts)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![ci](https://img.shields.io/github/actions/workflow/status/chandra447/dsh-table-charts/ci.yml?label=ci)](https://github.com/chandra447/dsh-table-charts/actions)

![在 DeepSeek Harness 中，Markdown 表格下方自动出现的条形图](assets/chart-dark.png)

助手用表格回答了问题。表格没问题，但趋势还是得靠脑补。

这个插件把条形图画在表格下面。就在对话里。表格停止变化半秒后出现。不需要工具调用，不消耗 token，不起本地服务。

```
┌──────────┬──────┬──────┐     ┌────────────────────────────────┐
│ 地区     │ Q3   │ Q4   │     │ Q3            Q4               │
├──────────┼──────┼──────┤     │ APAC   ████▉    █████          │
│ APAC     │ 1240 │ 1880 │ ──▶ │ EMEA   ███▉     ████▉          │
│ EMEA     │  980 │ 1320 │     │ …                              │
└──────────┴──────┴──────┘     └────────────────────────────────┘
```

## 安装

在 DSH 的插件窗口里安装，或者用命令行：

```sh
dsh plugin --profile web add dsh-table-charts
dsh plugin --profile desktop add dsh-table-charts
```

预构建包。没有安装脚本，不会弹构建确认。

## 什么样的表格算数据

- 至少两行正文、两列。
- 某一列至少有 60% 的单元格能解析为数字。
- 最多四列数字，画成最多四组条形。
- 最多 24 行。更大的表格保持原样。
- 按表头跳过标识类列：`year`、`date`、`id`、`#`、`no`、`number`、`index`、`rank`、`version`。

下面这些都能解析：

| 单元格 | 值 |
|---|---|
| `1,240` | 1240 |
| `$980` | 980 |
| `-12%` | -12 |
| `(30)` | -30 |
| `1.2k` | 1200 |
| `3M` | 3000000 |

负数按绝对值画长度，旁边仍然显示带符号的原值。这是一张阅读辅助图，不是精确坐标图。

## 为什么不调用工具？

因为画一张屏幕上已经有的表格的图，代价是一次模型回合。工具调用花 token，需要服务，而且只对你安装之后发送的消息生效。这个插件直接读 DSH 已经渲染好的 Markdown，老消息也算，在本地画。

## 你会得到

- 表格下方的一张图表卡片，每个数值列一组条形。
- 条形跟随主题。使用应用的蓝色强调色，主题切换时立即重绘，因为 SVG 里用的是活的 CSS 变量。
- 表格稳定 450 ms 后才画，流式回复不会闪。
- 表格变化时重画，消息卸载时删除。
- 客户端 JavaScript 约 11 KB。没有依赖，没有网络，没有宿主代码。
- 宽度封顶在自然尺寸，不会在宽屏上铺成广告牌。

## 什么时候它不出现

- 文字表格、对比表格、带合并单元格的表格，保持原样。
- 整列都是零，不算图。
- 它不修改表格，不加滚动条，不阻塞消息流式输出。

## 实现方式

1. `MutationObserver` 监听对话里的表格。
2. 对每个表格，从 DSH 已渲染的 DOM 里读表头和正文单元格。
3. 给每一列打分：数字够多、取值范围不为零、表头不是标识列。
4. 等表格停止变化，生成内联 SVG，插到表格滚动容器的后面。
5. 颜色是 CSS 变量，主题切换时由浏览器直接重绘，不需要 JavaScript。

## 致谢

表格转图表的思路来自 [oh-my-pi](https://github.com/can1357/oh-my-pi) 的 figure pipeline。这里是 DSH 上的浏览器版本，没有光栅化器，也没有工具调用。

演示动画由 [fframes](https://github.com/dmtrKovalenko/fframes) 渲染。

## 同一对里的另一个

[dsh-svg-fences](https://github.com/chandra447/dsh-svg-fences) 把 SVG 代码块渲染成跟随主题的内联图形，支持源码、复制、下载和缩放。

## 许可证

MIT。Copyright 2026 Chandra Doredla.
