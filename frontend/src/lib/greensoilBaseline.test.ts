import { describe, expect, it } from 'vitest'
import { istToday, parseBaseline } from './greensoilBaseline'

function sample() {
  const make = (symbol: string, price: number) => ({
    symbol, pdh: price+80, pdl: price-80, pdc: price,
    ce_entry: price+15, ce_sl: price+5, ce_tp1: price+25, ce_tp2: price+35, ce_tp3: price+45,
    pe_entry: price-15, pe_sl: price-5, pe_tp1: price-25, pe_tp2: price-35, pe_tp3: price-45,
    support_zones: [{low: price-65,high:price-50}],
    resistance_zones: [{low:price+50, high:price+65}],
    no_trade_zone: {low:price-10,high:price+10},
  })
  return {
    timezone: 'Asia/Kolkata', report_date: '2026-11-05',
    generated_at: '2026-11-05T08:30:00+05:30',
    source:'SYNTHETIC_TEST_NOT_MARKET_DATA',
    instruments:[make('NIFTY',25000),make('SENSEX',80000)],
  }
}
describe('strict 8:30 baseline', () => {
  it('accepts only complete structured levels and zones', () => {
    const parsed = parseBaseline(sample(), '2026-11-05')
    expect(parsed.instruments.NIFTY.zones).toHaveLength(3)
    expect(parsed.instruments.SENSEX.levels.CE_TP3).toBe(80045)
  })
  it('rejects stale date, wrong time and duplicate symbols', () => {
    expect(() => parseBaseline(sample(), '2026-11-06')).toThrow()
    const wrongTime = sample()
    wrongTime.generated_at = '2026-11-05T09:35:00+05:30'
    expect(() => parseBaseline(wrongTime, '2026-11-05')).toThrow()
    const repeated = sample()
    repeated.instruments[1].symbol = 'NIFTY'
    expect(() => parseBaseline(repeated, '2026-11-05')).toThrow()
  })
  it('rejects incomplete levels, malformed zone and nonfinite prices', () => {
    const missing = sample()
    delete (missing.instruments[0] as Record<string, unknown>).ce_sl
    expect(() => parseBaseline(missing, '2026-11-05')).toThrow()
    const zone = sample()
    zone.instruments[0].no_trade_zone.low = zone.instruments[0].no_trade_zone.high + 1
    expect(() => parseBaseline(zone, '2026-11-05')).toThrow()
    const bad = sample()
    bad.instruments[0].pdh = Number.NaN
    expect(() => parseBaseline(bad, '2026-11-05')).toThrow()
  })
  it('uses IST rather than local browser timezone', () => {
    expect(istToday(new Date('2026-11-04T20:00:00Z'))).toBe('2026-11-05')
  })
})
