/** Strict local-only 08:30 baseline parser; never accepts arbitrary draw commands. */
export type IndexSymbol = 'NIFTY' | 'SENSEX'
export type LevelName = 'PDH'|'PDL'|'PDC'|'CE_ENTRY'|'CE_SL'|'CE_TP1'|'CE_TP2'|'CE_TP3'|'PE_ENTRY'|'PE_SL'|'PE_TP1'|'PE_TP2'|'PE_TP3'
export type ZoneName = 'SUPPORT' | 'RESISTANCE' | 'NO_TRADE'
export type Zone = { name: ZoneName; low: number; high: number }
export type Instrument = { symbol: IndexSymbol; levels: Record<LevelName, number>; zones: Zone[] }
export type Baseline = { reportDate: string; source: string; instruments: Record<IndexSymbol, Instrument> }
export const LEVELS: LevelName[] = ['PDH','PDL','PDC','CE_ENTRY','CE_SL','CE_TP1','CE_TP2','CE_TP3','PE_ENTRY','PE_SL','PE_TP1','PE_TP2','PE_TP3']
const SYMBOLS: IndexSymbol[] = ['NIFTY', 'SENSEX']
const ZONE_FIELDS = ['support_zones', 'resistance_zones', 'no_trade_zone'] as const
function obj(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`)
  return value as Record<string, unknown>
}
function price(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) throw new Error(`${label} must be a positive finite number`)
  return value
}
function zone(value: unknown, name: ZoneName): Zone {
  const z = obj(value, name)
  const low = price(z.low, `${name}.low`)
  const high = price(z.high, `${name}.high`)
  if (low >= high) throw new Error(`${name}: low must be below high`)
  return { name, low, high }
}
/** Caller supplies IST's actual date; do not infer IST from browser locale. */
export function parseBaseline(value: unknown, expectedIstDate: string): Baseline {
  const r = obj(value, 'report')
  if (r.timezone !== 'Asia/Kolkata' || r.report_date !== expectedIstDate) throw new Error('Wrong timezone or report date')
  if (typeof r.generated_at !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(r.generated_at)) throw new Error('Timestamp must include offset')
  const ms = Date.parse(r.generated_at)
  if (!Number.isFinite(ms)) throw new Error('Invalid timestamp')
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const parts = Object.fromEntries(fmt.formatToParts(new Date(ms)).map(x => [x.type, x.value]))
  const day = `${parts.year}-${parts.month}-${parts.day}`
  if (day !== expectedIstDate || parts.hour !== '08' || parts.minute !== '30') throw new Error('Not the canonical 08:30 IST baseline')
  if (typeof r.source !== 'string' || !r.source.trim()) throw new Error('Source attribution required')
  if (!Array.isArray(r.instruments) || r.instruments.length !== 2) throw new Error('Exactly two instruments required')
  const instruments = {} as Record<IndexSymbol, Instrument>
  for (const raw of r.instruments) {
    const item = obj(raw, 'instrument')
    if (!SYMBOLS.includes(item.symbol as IndexSymbol)) throw new Error('Only NIFTY and SENSEX allowed')
    const symbol = item.symbol as IndexSymbol
    if (instruments[symbol]) throw new Error('Duplicate instrument')
    const levels = {} as Record<LevelName, number>
    for (const level of LEVELS) levels[level] = price(item[level.toLowerCase()], `${symbol}.${level}`)
    if (!(levels.PDH > levels.PDL)) throw new Error(`${symbol}: PDH <= PDL`)
    if (!(levels.CE_SL < levels.CE_ENTRY && levels.CE_ENTRY < levels.CE_TP1 && levels.CE_TP1 < levels.CE_TP2 && levels.CE_TP2 < levels.CE_TP3)) throw new Error(`${symbol}: CE targets invalid`)
    if (!(levels.PE_TP3 < levels.PE_TP2 && levels.PE_TP2 < levels.PE_TP1 && levels.PE_TP1 < levels.PE_ENTRY && levels.PE_ENTRY < levels.PE_SL)) throw new Error(`${symbol}: PE targets invalid`)
    const zones: Zone[] = []
    for (const key of ZONE_FIELDS) {
      if (!(key in item)) throw new Error(`${symbol}: ${key} is required`)
      const input = item[key]
      if (key === 'no_trade_zone') zones.push(zone(input, 'NO_TRADE'))
      else {
        if (!Array.isArray(input) || input.length === 0 || input.length > 5) throw new Error(`${symbol}: ${key} needs 1-5 zones`)
        for (const v of input) zones.push(zone(v, key === 'support_zones' ? 'SUPPORT' : 'RESISTANCE'))
      }
    }
    instruments[symbol] = { symbol, levels, zones }
  }
  return { reportDate: expectedIstDate, source: r.source, instruments }
}
export function istToday(date: Date = new Date()): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const parts = Object.fromEntries(p.map(x=>[x.type,x.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}
