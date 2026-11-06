/*!
 * dsh-table-charts
 * Draw a bar chart under Markdown tables whose columns are mostly numeric.
 * No tool call, no server, no network. MIT License.
 */
window.__ModuleLoader__.load({
  id: 'dsh-table-charts',
  factory() {
    'use strict'

    const SETTLE_MS = 450
    const MAX_ROWS = 24
    const MAX_SERIES = 4
    const MAX_CELL = 24
    const NS = 'table-charts'

    // Columns that hold identifiers, not measurements.
    const NOT_A_MEASURE = /^(year|date|id|#|no|no\.|number|index|rank|version)$/i

    const EN = { chart: 'chart', noData: 'not a number' }
    const ZH = { chart: '图表', noData: '非数值' }

    const CSS = [
      '.dsh-chart{margin:10px 0 12px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);box-sizing:border-box}',
      '.dsh-chart svg{display:block;width:100%;height:auto;font-family:inherit}',
    ].join('\n')

    const states = new WeakMap()
    const timers = new Set()
    let translator = null

    function t(key) {
      if (translator) {
        try {
          const text = translator(key)
          if (text) return text
        } catch {}
      }
      return EN[key] || key
    }

    // ---- model -----------------------------------------------------------

    // Reads "$1,234", "-12%", "(30)" and "1.2k" as numbers, anything else as null.
    function parseNumber(cell) {
      if (cell === undefined || cell === null) return null
      let text = String(cell).trim()
      if (!text || text.length > MAX_CELL) return null
      let negative = false
      if (/^\(.*\)$/.test(text)) {
        negative = true
        text = text.slice(1, -1).trim()
      }
      const match = /^([−-])?\s*([$€£¥])?\s*([\d,]+(?:\.\d+)?)\s*([kKmMbB])?\s*%?$/.exec(text)
      if (!match) return null
      if (match[1]) negative = true
      const amount = Number(match[3].replace(/,/g, ''))
      if (!Number.isFinite(amount)) return null
      const scale = match[4] ? { k: 1e3, m: 1e6, b: 1e9 }[match[4].toLowerCase()] : 1
      const value = amount * scale
      return negative ? -value : value
    }

    function tableParts(table) {
      if (table.querySelector('[colspan],[rowspan]')) return null
      const headCells = [...table.querySelectorAll('thead tr:first-child th')]
      let headers = headCells.map((cell) => cell.textContent.trim())
      let bodyRows = [...table.querySelectorAll('tbody tr')].map((row) =>
        [...row.children].map((cell) => cell.textContent.trim()),
      )
      if (headers.length === 0) {
        const first = table.querySelector('tr')
        if (!first) return null
        headers = [...first.children].map((cell) => cell.textContent.trim())
        bodyRows = bodyRows.slice(1)
      }
      if (headers.length < 2 || bodyRows.length < 2) return null
      bodyRows = bodyRows.filter((row) => row.length === headers.length)
      if (bodyRows.length < 2 || bodyRows.length > MAX_ROWS) return null
      return { headers, rows: bodyRows }
    }

    function planChart(parts) {
      const { headers, rows } = parts
      const series = []
      for (let column = 1; column < headers.length; column++) {
        const header = (headers[column] || '').trim()
        if (NOT_A_MEASURE.test(header)) continue
        const values = rows.map((row) => parseNumber(row[column]))
        const numbers = values.filter((value) => value !== null)
        if (numbers.length < Math.max(2, Math.ceil(rows.length * 0.6))) continue
        const max = Math.max(...numbers.map((value) => Math.abs(value)))
        if (!(max > 0)) continue
        series.push({ column, header: header || `column ${column + 1}`, values, max })
        if (series.length === MAX_SERIES) break
      }
      if (series.length === 0) return null
      return { headers, rows, series }
    }

    // ---- svg -------------------------------------------------------------

    function svgEl(name, attrs, text) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', name)
      for (const key in attrs) {
        if (attrs[key] !== undefined && attrs[key] !== null) el.setAttribute(key, String(attrs[key]))
      }
      if (text !== undefined) el.textContent = text
      return el
    }

    function truncate(text, chars) {
      if (text.length <= chars) return text
      return text.slice(0, Math.max(1, chars - 1)) + '…'
    }

    function buildChartSvg(plan) {
      const pad = 14
      const labelChars = Math.min(
        26,
        Math.max(10, ...plan.rows.map((row) => Math.min(26, (row[0] || '').length))),
      )
      const labelWidth = Math.round(labelChars * 7)
      const columnWidth = 200
      const barWidth = 104
      const rowHeight = 28
      const headerHeight = 22
      const width = pad * 2 + labelWidth + plan.series.length * columnWidth
      const height = pad * 2 + headerHeight + plan.rows.length * rowHeight

      const svg = svgEl('svg', {
        xmlns: 'http://www.w3.org/2000/svg',
        viewBox: `0 0 ${width} ${height}`,
        role: 'img',
        'aria-label': `${t('chart')}: ${plan.series.map((item) => item.header).join(', ')}`,
        style: `display:block;width:100%;max-width:${width}px;height:auto`,
      })

      plan.series.forEach((item, index) => {
        const x = pad + labelWidth + index * columnWidth
        svg.appendChild(
          svgEl(
            'text',
            { x, y: pad + 13, 'font-size': 11, style: 'fill:var(--dsw-alias-label-secondary)' },
            truncate(item.header, 24),
          ),
        )
      })

      plan.rows.forEach((row, rowIndex) => {
        const y = pad + headerHeight + rowIndex * rowHeight
        svg.appendChild(
          svgEl(
            'text',
            { x: pad, y: y + 17, 'font-size': 12.5, style: 'fill:var(--dsw-alias-label-primary)' },
            truncate(row[0] || '', labelChars),
          ),
        )

        plan.series.forEach((item, seriesIndex) => {
          const x = pad + labelWidth + seriesIndex * columnWidth
          const value = item.values[rowIndex]
          if (value === null) {
            svg.appendChild(
              svgEl(
                'text',
                { x, y: y + 17, 'font-size': 11.5, style: 'fill:var(--dsw-alias-label-secondary)' },
                truncate(row[item.column] || '—', 9),
              ),
            )
            return
          }
          svg.appendChild(
            svgEl('rect', {
              x,
              y: y + 6,
              width: barWidth,
              height: 12,
              rx: 6,
              style: 'fill:var(--dsw-alias-bg-layer-2)',
            }),
          )
          const ratio = Math.max(0, Math.min(1, Math.abs(value) / item.max))
          svg.appendChild(
            svgEl('rect', {
              x,
              y: y + 6,
              width: Math.max(3, Math.round(barWidth * ratio)),
              height: 12,
              rx: 6,
              style: `fill:var(--dsw-alias-link, var(--dsw-alias-brand-primary));fill-opacity:${
                [1, 0.72, 0.5, 0.36][seriesIndex] || 0.36
              }`,
            }),
          )
          const raw = (row[item.column] || '').trim()
          svg.appendChild(
            svgEl(
              'text',
              {
                x: x + barWidth + 8,
                y: y + 17,
                'font-size': 11.5,
                style: 'fill:var(--dsw-alias-label-secondary)',
              },
              truncate(raw, 9),
            ),
          )
        })
      })

      return { svg, width, height }
    }

    // ---- placement -------------------------------------------------------

    // DSH wraps a lone table in its own div; place the chart after the wrapper
    // so it never lands inside a horizontal scroller.
    function chartContainer(table) {
      const parent = table.parentElement
      if (parent && parent.tagName === 'DIV' && parent.childElementCount === 1) return parent
      return table
    }

    function destroyChart(table) {
      const state = states.get(table)
      if (!state) return
      if (state.timer !== null) {
        clearTimeout(state.timer)
        timers.delete(state.timer)
      }
      if (state.box) state.box.remove()
      states.delete(table)
    }

    function chartTable(table) {
      const state = states.get(table)
      if (!state || !table.isConnected) return
      const parts = tableParts(table)
      if (!parts) return
      const plan = planChart(parts)
      if (!plan) return
      const built = buildChartSvg(plan)
      if (!built) return

      const box = document.createElement('div')
      box.className = 'dsh-chart'
      box.setAttribute('data-dsh-chart', '1')
      box.__chartOwner = table
      box.appendChild(built.svg)

      const container = chartContainer(table)
      if (!container.isConnected) return
      if (state.box && state.box.isConnected) state.box.remove()
      container.after(box)
      state.box = box
    }

    function scan() {
      for (const box of document.querySelectorAll('[data-dsh-chart]')) {
        const table = box.__chartOwner
        if (!table || !table.isConnected) box.remove()
      }

      for (const table of document.querySelectorAll('table')) {
        if (table.closest('[data-dsh-chart], .dsh-svg-figure-modal')) continue
        if (table.querySelector('table')) continue
        const text = (table.textContent || '').replace(/\s+/g, ' ').trim()
        if (!text) continue
        const state = states.get(table)
        if (state && state.text === text && state.box && state.box.isConnected) continue
        if (state) {
          if (state.timer !== null) {
            clearTimeout(state.timer)
            timers.delete(state.timer)
          }
          if (state.box) {
            state.box.remove()
            state.box = null
          }
        }
        const next = { text, box: state ? state.box : null, timer: null }
        states.set(table, next)
        next.timer = setTimeout(() => {
          next.timer = null
          timers.delete(next.timer)
          if (!table.isConnected) {
            destroyChart(table)
            return
          }
          chartTable(table)
        }, SETTLE_MS)
        timers.add(next.timer)
      }
    }

    function install(ctx) {
      try {
        if (ctx.locale) {
          ctx.locale.register(NS, { en: EN, zh: ZH })
          translator = ctx.locale.bind(NS)
        }
      } catch {}

      const style = document.createElement('style')
      style.setAttribute('data-plugin', 'dsh-table-charts')
      style.textContent = CSS
      document.head.appendChild(style)

      let timer = null
      const schedule = () => {
        if (timer !== null) return
        timer = setTimeout(() => {
          timer = null
          scan()
        }, 120)
      }

      const observer = new MutationObserver(() => schedule())
      observer.observe(document.body, { childList: true, subtree: true, characterData: true })

      scan()

      ctx.effect(
        () => () => {
          observer.disconnect()
          if (timer !== null) clearTimeout(timer)
          if (translator) translator = null
          style.remove()
          for (const timer of timers) clearTimeout(timer)
          timers.clear()
          for (const box of document.querySelectorAll('[data-dsh-chart]')) box.remove()
        },
        'table-charts: markdown tables',
      )
    }

    return {
      apply(ctx) {
        install(ctx)
      },
    }
  },
})
