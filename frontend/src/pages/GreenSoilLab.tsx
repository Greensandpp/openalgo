/** GreenSoil 8:30 offline chart preview. No API, credentials, or trading actions. */
import { createChart, type Chart } from 'openalgo-charts'
import { useEffect, useRef, useState } from 'react'

type SymbolName = 'NIFTY' | 'SENSEX'
type LevelName = 'PDH' | 'PDL' | 'PDC' | 'CE_ENTRY' | 'CE_SL' | 'CE_TP1' | 'CE_TP2' | 'CE_TP3' | 'PE_ENTRY' | 'PE_SL' | 'PE_TP1' | 'PE_TP2' | 'PE_TP3'
type ChartLine = { symbol: SymbolName; level: LevelName; price: number; type: 'horizontal_line'; status: 'PREMARKET_PLAN_NOT_SIGNAL' }
const LEVELS: LevelName[] = ['PDH','PDL','PDC','CE_ENTRY','CE_SL','CE_TP1','CE_TP2','CE_TP3','PE_ENTRY','PE_SL','PE_TP1','PE_TP2','PE_TP3']
const BASE: Record<SymbolName, number> = { NIFTY: 25000, SENSEX: 80000 }
// These are deliberately invented synthetic values, NOT market levels.
const OFFSETS: Record<LevelName, number> = {
  PDH: 80, PDL: -80, PDC: 0,
  CE_ENTRY: 15, CE_SL: 5, CE_TP1: 25, CE_TP2: 35, CE_TP3: 45,
  PE_ENTRY: -15, PE_SL: -5, PE_TP1: -25, PE_TP2: -35, PE_TP3: -45,
}
const TIMES = Array.from({ length: 48 }, (_, i) => 1793850600 + i * 300)

function syntheticLines(symbol: SymbolName): ChartLine[] {
  return LEVELS.map(level => ({
    symbol, level, price: BASE[symbol] + OFFSETS[level],
    type: 'horizontal_line' as const, status: 'PREMARKET_PLAN_NOT_SIGNAL' as const,
  }))
}

function colorFor(level: LevelName): string {
  if (level.startsWith('CE_')) return '#16a34a'
  if (level.startsWith('PE_')) return '#dc2626'
  return '#64748b'
}

function ChartView({ symbol }: { symbol: SymbolName }) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!host.current) return
    const chart: Chart = createChart(host.current, {
      shortcuts: false, timeNavigator: false, branding: false,
      ariaLabel: `GreenSoil synthetic ${symbol} 5 minute chart`,
    })
    const base = BASE[symbol]
    const candle = chart.addSeries('candlestick', { style: { borderVisible: false } })
    candle.setData(TIMES.map((time, i) => {
      const close = base + Math.sin(i / 4) * 28 + (i - 24) * 0.5
      const open = close - Math.cos(i / 3) * 7
      return { time, open, close, high: Math.max(open, close) + 5, low: Math.min(open, close) - 5 }
    }))
    for (const line of syntheticLines(symbol)) {
      const series = chart.addSeries('line', {
        style: { color: colorFor(line.level), lineWidth: 1, priceLineVisible: false },
      })
      series.setData(TIMES.map(time => ({ time, value: line.price })))
    }
    chart.fitContent()
    return () => {
      chart.destroy()
      if (host.current) host.current.innerHTML = ''
    }
  }, [symbol])
  return <div ref={host} className="h-[380px] w-full overflow-hidden rounded-md border" />
}

export default function GreenSoilLab() {
  const [symbol, setSymbol] = useState<SymbolName>('NIFTY')
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
      <header>
        <h1 className="text-xl font-semibold">GreenSoil 8:30 Chart Lab</h1>
        <p className="text-sm text-muted-foreground">
          SYNTHETIC TEST DATA ONLY · READ-ONLY · NOT MARKET DATA · NO ORDER EXECUTION
        </p>
      </header>
      <div className="flex gap-2" role="group" aria-label="Index">
        {(['NIFTY', 'SENSEX'] as const).map(value =>
          <button key={value} type="button" aria-pressed={symbol === value}
            className={`rounded border px-4 py-2 ${symbol === value ? 'bg-primary text-primary-foreground' : ''}`}
            onClick={() => setSymbol(value)}>{value}</button>
        )}
      </div>
      <ChartView symbol={symbol} />
      <p className="text-xs text-muted-foreground">
        Green lines: CE levels · Red lines: PE levels · Gray lines: PDH/PDL/PDC.
        These are demonstration values and are not trade signals.
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {syntheticLines(symbol).map(line =>
          <div key={line.level} className="rounded border p-2">
            <div className="text-muted-foreground">{line.level.replaceAll('_', ' ')}</div>
            <div className="font-semibold tabular-nums">{line.price.toLocaleString('en-IN')}</div>
          </div>
        )}
      </div>
    </main>
  )
}
