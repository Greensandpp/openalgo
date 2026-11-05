/** GreenSoil 8:30 chart lab: isolated synthetic preview or validated JSON input. */
import { createChart, type Chart } from 'openalgo-charts'
import { useEffect, useRef, useState } from 'react'
import { istToday, LEVELS, parseBaseline, type Baseline, type IndexSymbol, type LevelName, type Zone } from '@/lib/greensoilBaseline'

const BASE: Record<IndexSymbol, number> = { NIFTY: 25000, SENSEX: 80000 }
const OFFSET: Record<LevelName, number> = {
  PDH: 80, PDL: -80, PDC: 0,
  CE_ENTRY: 15, CE_SL: 5, CE_TP1: 25, CE_TP2: 35, CE_TP3: 45,
  PE_ENTRY: -15, PE_SL: -5, PE_TP1: -25, PE_TP2: -35, PE_TP3: -45,
}
const TIMES = Array.from({ length: 48 }, (_, i) => 1793850600 + i * 300)
function synthetic(symbol: IndexSymbol) {
  const base = BASE[symbol]
  return {
    symbol, levels: Object.fromEntries(LEVELS.map(key => [key, base + OFFSET[key]])) as Record<LevelName, number>,
    zones: [
      { name: 'SUPPORT' as const, low: base - 62, high: base - 48 },
      { name: 'RESISTANCE' as const, low: base + 48, high: base + 62 },
      { name: 'NO_TRADE' as const, low: base - 10, high: base + 10 },
    ],
  }
}
function lineColor(level: LevelName): string {
  if (level.startsWith('CE_')) return '#16a34a'
  if (level.startsWith('PE_')) return '#dc2626'
  return '#64748b'
}
function zoneColor(zone: Zone): string {
  if (zone.name === 'SUPPORT') return '#059669'
  if (zone.name === 'RESISTANCE') return '#ea580c'
  return '#ca8a04'
}
function ChartView({ symbol, baseline }: { symbol: IndexSymbol; baseline: Baseline | null }) {
  const host = useRef<HTMLDivElement>(null)
  const instrument = baseline?.instruments[symbol] ?? synthetic(symbol)
  useEffect(() => {
    const element = host.current
    if (!element) return
    const chart: Chart = createChart(element, {
      shortcuts: false, timeNavigator: false, branding: false,
      ariaLabel: `GreenSoil ${symbol} offline five minute chart`,
    })
    // Synthetic candles are ALWAYS used in this lab preview. Overlay values
    // from an imported report must never be confused with current market bars.
    const base = BASE[symbol]
    const candles = chart.addSeries('candlestick', { style: { borderVisible: false } })
    candles.setData(TIMES.map((time, i) => {
      const close = base + Math.sin(i / 4) * 28 + (i - 24) * 0.5
      const open = close - Math.cos(i / 3) * 7
      return { time, open, close, high: Math.max(open, close) + 5, low: Math.min(open, close) - 5 }
    }))
    const draw = (price: number, color: string) => {
      const series = chart.addSeries('line', {
        style: { color, lineWidth: 1, priceLineVisible: false },
      })
      series.setData(TIMES.map(time => ({ time, value: price })))
    }
    for (const key of LEVELS) draw(instrument.levels[key], lineColor(key))
    for (const zone of instrument.zones) {
      draw(zone.low, zoneColor(zone))
      draw(zone.high, zoneColor(zone))
    }
    chart.fitContent()
    return () => {
      chart.destroy()
      element.innerHTML = ''
    }
  }, [symbol, baseline])
  return <div ref={host} className="h-[380px] w-full overflow-hidden rounded-md border" />
}
export default function GreenSoilLab() {
  const [symbol, setSymbol] = useState<IndexSymbol>('NIFTY')
  const [json, setJson] = useState('')
  const [baseline, setBaseline] = useState<Baseline | null>(null)
  const [error, setError] = useState('')
  const active = baseline?.instruments[symbol] ?? synthetic(symbol)
  function load() {
    try {
      const parsed: unknown = JSON.parse(json)
      const result = parseBaseline(parsed, istToday())
      setBaseline(result)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON')
      // Reject stale input rather than continue showing a previous baseline.
      setBaseline(null)
    }
  }
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
      <header>
        <h1 className="text-xl font-semibold">GreenSoil 8:30 Chart Lab</h1>
        <p className="text-sm text-muted-foreground">
          OFFLINE TEST · SYNTHETIC CANDLES ONLY · NO BROKER · NO ORDERS
        </p>
        <p role="status" className="text-sm font-medium">
          {baseline ? `Validated ${baseline.reportDate} 08:30 levels from ${baseline.source}; candles are synthetic`
            : 'DEMO MODE: all candles and levels are synthetic'}
        </p>
      </header>
      <section className="rounded-md border p-3">
        <label htmlFor="baseline-json" className="block text-sm font-medium">Paste canonical 8:30 report JSON (today IST)</label>
        <textarea id="baseline-json" value={json} onChange={event => setJson(event.target.value)}
          rows={3} spellCheck={false} className="mt-2 w-full rounded border bg-background p-2 font-mono text-xs"
          placeholder='{"timezone":"Asia/Kolkata","report_date":"YYYY-MM-DD",...}' />
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className="rounded bg-primary px-3 py-2 text-primary-foreground" onClick={load}>Validate and show report levels</button>
          <button type="button" className="rounded border px-3 py-2" onClick={() => {setBaseline(null);setJson('');setError('')}}>Reset to demo</button>
        </div>
        {error && <p role="alert" className="mt-2 text-sm text-red-600">Rejected: {error}</p>}
      </section>
      <div className="flex gap-2" role="group" aria-label="Index">
        {(['NIFTY', 'SENSEX'] as const).map(value =>
          <button key={value} type="button" aria-pressed={symbol === value}
            className={`rounded border px-4 py-2 ${symbol === value ? 'bg-primary text-primary-foreground' : ''}`}
            onClick={() => setSymbol(value)}>{value}</button>
        )}
      </div>
      <ChartView symbol={symbol} baseline={baseline} />
      <p className="text-xs text-muted-foreground">
        CE green · PE red · PDH/PDL/PDC gray · Support teal · Resistance orange · NO TRADE amber.
        Zone boundaries are lines, not filled areas. Entries are plans, NOT trade signals.
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {LEVELS.map(key =>
          <div key={key} className="rounded border p-2">
            <div className="text-muted-foreground">{key.replaceAll('_', ' ')}</div>
            <div className="font-semibold tabular-nums">{active.levels[key].toLocaleString('en-IN')}</div>
          </div>
        )}
      </div>
      <h2 className="text-base font-semibold">Support, resistance and NO TRADE zones</h2>
      <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
        {active.zones.map((zone, i) =>
          <div key={`${zone.name}-${i}`} className="rounded border p-3">
            <div className="font-medium">{zone.name.replace('_', ' ')}</div>
            <div className="tabular-nums">{zone.low.toLocaleString('en-IN')} – {zone.high.toLocaleString('en-IN')}</div>
          </div>
        )}
      </div>
    </main>
  )
}
