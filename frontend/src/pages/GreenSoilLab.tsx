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
type Overlay = {
  version: number; symbol: IndexSymbol; direction: 'CE'|'PE'
  status: 'PROPOSED'|'INVALIDATED'; as_of: string; reason: string
  entry: number; sl: number; tp1: number; tp2: number; tp3: number
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
function ChartView({ symbol, baseline, overlays }: { symbol: IndexSymbol; baseline: Baseline | null; overlays: Overlay[] }) {
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
    // Revised intraday levels are a separate purple overlay. Never replace
    // original 08:30 plan lines or draw invalidated scenarios.
    if (baseline) {
      const current = overlays.filter(x => x.symbol === symbol).at(-1)
      if (current?.status === 'PROPOSED') {
        for (const level of ['entry', 'sl', 'tp1', 'tp2', 'tp3'] as const)
          draw(current[level], '#a855f7')
      }
    }
    chart.fitContent()
    return () => {
      chart.destroy()
      element.innerHTML = ''
    }
  }, [symbol, baseline, overlays])
  return <div ref={host} className="gs-price-chart h-[380px] w-full overflow-hidden rounded-md border" />
}
export default function GreenSoilLab({ selectedSymbol }: { selectedSymbol?: IndexSymbol } = {}) {
  const [symbol, setSymbol] = useState<IndexSymbol>(selectedSymbol ?? 'NIFTY')
  useEffect(() => { if (selectedSymbol) setSymbol(selectedSymbol) }, [selectedSymbol])
  const [json, setJson] = useState('')
  const [baseline, setBaseline] = useState<Baseline | null>(null)
  const [error, setError] = useState('')
  const [sourceMode, setSourceMode] = useState<'auto' | 'manual'>('auto')
  const [feedStatus, setFeedStatus] = useState('Checking today’s local baseline…')
  const [watchStatus, setWatchStatus] = useState('Intraday watch feed not verified')
  const [watchRows, setWatchRows] = useState<Array<{index:string;status:string;bias?:string;reason?:string;as_of?:string}>>([])
  const [spikeRows, setSpikeRows] = useState<Array<{index:string;status:string;direction?:string;index_change_pct_delta?:number;as_of?:string}>>([])
  const [events, setEvents] = useState<string[]>([])
  const eventKeys = useRef(new Set<string>())
  const [overlays, setOverlays] = useState<Overlay[]>([])
  const [overlayStatus, setOverlayStatus] = useState('No verified intraday revisions')
  useEffect(() => {
    let disposed = false
    let controller: AbortController | null = null
    const refresh = async () => {
      controller?.abort()
      controller = new AbortController()
      try {
        const response = await fetch('/greensoil/api/revisions', {
          method: 'GET', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        })
        if (disposed) return
        if (!response.ok) throw new Error('Revisions unavailable')
        const raw: unknown = await response.json()
        if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('Invalid revisions')
        const doc = raw as Record<string, unknown>
        if (doc.status !== 'WATCH_ONLY' || doc.report_date !== istToday() ||
            !Array.isArray(doc.revisions) || doc.revisions.length > 50) {
          setOverlays([])
          setOverlayStatus('No current verified revisions')
          return
        }
        const rows: Overlay[] = []
        let previous = 0
        for (const record of doc.revisions) {
          if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Invalid revision record')
          const x = record as Record<string, unknown>
          if (typeof x.version !== 'number' || !Number.isInteger(x.version) || x.version <= previous ||
              !['NIFTY', 'SENSEX'].includes(x.symbol as string) ||
              !['CE','PE'].includes(x.direction as string) ||
              !['PROPOSED','INVALIDATED'].includes(x.status as string) ||
              typeof x.as_of !== 'string' || typeof x.reason !== 'string' ||
              !(['entry','sl','tp1','tp2','tp3'] as const).every(k => typeof x[k] === 'number' && Number.isFinite(x[k]) && (x[k] as number) > 0)) {
            throw new Error('Revision validation failed')
          }
          previous = x.version
          rows.push(x as Overlay)
        }
        setOverlays(rows)
        setOverlayStatus('Versioned intraday proposals loaded; no order execution')
      } catch (error) {
        if (disposed || (error instanceof DOMException && error.name === 'AbortError')) return
        setOverlays([])
        setOverlayStatus('Revisions missing/invalid/stale — no live scenario')
      }
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 30_000)
    return () => { disposed = true; controller?.abort(); window.clearInterval(timer) }
  }, [])
  useEffect(() => {
    let disposed = false
    let controller: AbortController | null = null
    const refresh = async () => {
      controller?.abort()
      controller = new AbortController()
      try {
        const response = await fetch('/greensoil/api/watch', {
          method: 'GET', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        })
        if (disposed) return
        if (!response.ok) throw new Error('No valid watch feed')
        const raw: unknown = await response.json()
        if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('Invalid watch response')
        const data = raw as Record<string, unknown>
        if (data.status !== 'WATCH_ONLY' || !Array.isArray(data.warnings) || data.warnings.length !== 2) {
          setWatchRows([])
          setSpikeRows([])
          setWatchStatus('No verified real-time feed — NO PREDICTION')
          return
        }
        const rows = data.warnings
        if (!rows.every(x => typeof x === 'object' && x !== null && ['NIFTY','SENSEX'].includes((x as Record<string, unknown>).index as string))) throw new Error('Invalid watch indexes')
        setWatchRows(rows as Array<{index:string;status:string;bias?:string;reason?:string;as_of?:string}>)
        const spikes = Array.isArray(data.spikes) ? data.spikes : []
        const validSpikes = spikes.filter((x): x is {
          index: string; status: string; direction?: string; index_change_pct_delta?: number; as_of?: string
        } => typeof x === 'object' && x !== null &&
          ['NIFTY', 'SENSEX'].includes((x as { index?: string }).index ?? '') &&
          typeof (x as { status?: unknown }).status === 'string')
        setSpikeRows(validSpikes)
        for (const spike of validSpikes) {
          if (spike.status !== 'EARLY_WARNING_TO_REVIEW') continue
          const key = [spike.index, spike.as_of, spike.direction].join('|')
          if (eventKeys.current.has(key)) continue
          eventKeys.current.add(key)
          setEvents(current => [`${spike.as_of ?? ''} · ${spike.index} · ${spike.direction ?? ''} · WATCH ONLY`, ...current].slice(0, 20))
        }
        setWatchStatus('Local index-pressure snapshot received; NEWS AI NOT CONNECTED')
      } catch (err) {
        if (disposed || (err instanceof DOMException && err.name === 'AbortError')) return
        setWatchRows([])
        setSpikeRows([])
        setWatchStatus('No verified real-time feed — NO PREDICTION')
      }
    }
    void refresh()
    const interval = window.setInterval(() => void refresh(), 30_000)
    return () => { disposed = true; controller?.abort(); window.clearInterval(interval) }
  }, [])
  useEffect(() => {
    if (sourceMode !== 'auto') return
    let disposed = false
    let controller: AbortController | null = null
    const refresh = async () => {
      controller?.abort()
      controller = new AbortController()
      try {
        const response = await fetch('/greensoil/api/baseline', {
          method: 'GET', credentials: 'same-origin', cache: 'no-store',
          signal: controller.signal,
        })
        if (disposed) return
        if (response.status === 404) {
          setBaseline(null)
          setFeedStatus('Today’s 8:30 report not delivered to local source — demo only')
          return
        }
        if (!response.ok) {
          setBaseline(null)
          setFeedStatus('Today’s baseline unavailable or invalid — demo only')
          return
        }
        const raw: unknown = await response.json()
        if (disposed) return
        const parsed = parseBaseline(raw, istToday())
        setBaseline(parsed)
        setError('')
        setFeedStatus('Automatic local baseline loaded')
      } catch (err) {
        if (disposed || (err instanceof DOMException && err.name === 'AbortError')) return
        setBaseline(null)
        setFeedStatus('Automatic source unavailable — demo only')
      }
    }
    void refresh()
    const interval = window.setInterval(() => void refresh(), 60_000)
    return () => { disposed = true; controller?.abort(); window.clearInterval(interval) }
  }, [sourceMode])
  const active = baseline?.instruments[symbol] ?? synthetic(symbol)
  function load() {
    try {
      const parsed: unknown = JSON.parse(json)
      const result = parseBaseline(parsed, istToday())
      setSourceMode('manual')
      setBaseline(result)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON')
      // Reject stale input rather than continue showing a previous baseline.
      setSourceMode('manual')
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
        <p className="text-xs text-muted-foreground">{sourceMode === 'auto' ? feedStatus : 'Manual input mode'}</p>
        <p role="status" className="text-sm font-medium">
          {baseline ? `Validated ${baseline.reportDate} 08:30 levels from ${baseline.source}; candles are synthetic`
            : 'DEMO MODE: all candles and levels are synthetic'}
        </p>
      </header>
      <details className="gs-feed-settings">
        <summary>8:30 baseline feed settings (optional)</summary>
        <div className="gs-feed-settings-inner">
        <label htmlFor="baseline-json" className="block text-sm font-medium">Paste canonical 8:30 report JSON (today IST)</label>
        <textarea id="baseline-json" value={json} onChange={event => setJson(event.target.value)}
          rows={3} spellCheck={false} className="mt-2 w-full rounded border bg-background p-2 font-mono text-xs"
          placeholder='{"timezone":"Asia/Kolkata","report_date":"YYYY-MM-DD",...}' />
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className="rounded bg-primary px-3 py-2 text-primary-foreground" onClick={load}>Validate and show report levels</button>
          <button type="button" className="rounded border px-3 py-2" onClick={() => {setSourceMode('auto');setBaseline(null);setJson('');setError('')}}>Resume automatic feed</button>
        </div>
        {error && <p role="alert" className="mt-2 text-sm text-red-600">Rejected: {error}</p>}
        </div>
      </details>
      <div className="flex gap-2" role="group" aria-label="Index">
        {(['NIFTY', 'SENSEX'] as const).map(value =>
          <button key={value} type="button" aria-pressed={symbol === value}
            className={`rounded border px-4 py-2 ${symbol === value ? 'bg-primary text-primary-foreground' : ''}`}
            onClick={() => setSymbol(value)}>{value}</button>
        )}
      </div>
      <details className="gs-monitor-details" aria-label="Intraday event watch">
        <summary>OI + spike radar <span>· {watchRows.length ? "Evidence available" : "Offline"}</span></summary>
        <div className="gs-monitor-content">
        <h2 className="font-semibold">Intraday Spike + OI Watch (monitor only)</h2>
        <p role="status" className="text-xs text-muted-foreground">{watchStatus}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {watchRows.length ? watchRows.map(row => (
            <div key={row.index} className="rounded border p-2 text-sm">
              <strong>{row.index}</strong>: {row.status} {row.bias ?? ''}
              <div className="text-xs text-muted-foreground">{row.reason ?? 'No verified directional conclusion'}</div>
              {row.as_of && <div className="text-xs">As of: {row.as_of}</div>}
            </div>
          )) : <p className="text-sm">Feed unavailable; automatic predictions and revised levels disabled.</p>}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {spikeRows.map(spike => <div key={spike.index} className="rounded border p-2 text-xs">
            <strong>{spike.index} spike monitor:</strong> {spike.status}
            {spike.direction && spike.direction !== 'NONE' && <p>{spike.direction} · Δ {spike.index_change_pct_delta?.toFixed(2) ?? '–'}%</p>}
          </div>)}
        </div>
        <h3 className="mt-3 text-sm font-semibold">Recent verified observation changes (session only)</h3>
        <div className="max-h-28 overflow-y-auto text-xs" aria-live="polite">
          {events.length ? events.map(event => <p key={event} className="py-1">{event}</p>) : 'No corroborated spike observations'}
        </div>
        <p className="mt-2 text-xs">No news provider connected. Early warnings are not entries; 5-minute candle confirmation required. No new price targets generated. Log remains in this browser tab only.</p>
        </div>
      </details>
      <details className="gs-monitor-details" aria-label="Versioned intraday proposals">
        <summary>Intraday scenario history <span>· {overlays.length} revisions</span></summary>
        <div className="gs-monitor-content">
        <h2 className="font-semibold">Intraday revised scenarios (watch only)</h2>
        <p className="text-xs text-muted-foreground" role="status">{overlayStatus}</p>
        <p className="text-xs">Original 8:30 baseline remains unchanged. Purple marks = latest proposed levels, not predictions or orders.</p>
        {overlays.filter(x => x.symbol === symbol).map(x =>
          <div key={x.version} className="mt-2 rounded border p-2 text-xs">
            V{x.version} · {x.symbol} {x.direction} · {x.status} · {x.as_of}
            <div>{x.reason}</div>
            <div>Entry {x.entry} · SL {x.sl} · TP1 {x.tp1} · TP2 {x.tp2} · TP3 {x.tp3}</div>
          </div>
        )}
        </div>
      </details>
      <ChartView symbol={symbol} baseline={baseline} overlays={overlays} />
      <p className="text-xs text-muted-foreground">
        CE green · PE red · PDH/PDL/PDC gray · Support teal · Resistance orange · NO TRADE amber.
        Zone boundaries are lines, not filled areas. Entries are plans, NOT trade signals.
      </p>
      <details className="gs-level-details">
        <summary>View all 8:30 levels and zones <span>({LEVELS.length} levels)</span></summary>
        <div className="gs-levels-grid">
          {LEVELS.map(key =>
            <div key={key} className="gs-level-tile">
              <div className="gs-level-name">{key.replaceAll('_', ' ')}</div>
              <div className="gs-level-price">{active.levels[key].toLocaleString('en-IN')}</div>
            </div>
          )}
        </div>
        <h2 className="gs-zones-heading">Support, resistance and NO TRADE zones</h2>
        <div className="gs-zone-list">
          {active.zones.map((zone, i) =>
            <div key={`${zone.name}-${i}`} className="gs-zone-tile">
              <span>{zone.name.replace('_', ' ')}</span>
              <strong>{zone.low.toLocaleString('en-IN')} – {zone.high.toLocaleString('en-IN')}</strong>
            </div>
          )}
        </div>
      </details>
    </main>
  )
}
