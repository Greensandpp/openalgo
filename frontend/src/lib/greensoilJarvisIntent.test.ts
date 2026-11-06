import { describe, expect, it } from 'vitest'
import { parseJarvisIntent as intent } from './greensoilJarvisIntent'

describe('JARVIS multilingual offline intents (PAPER demo only)', () => {
  it.each([
    ['Jarvis trading mode activate','NIFTY'],
    ['trade mode on pannu','NIFTY'],
    ['open nifty chart','NIFTY'],
    ['Nifty chart kaattu','NIFTY'],
    ['சென்செக்ஸ் சார்ட் காட்டு','SENSEX'],
    ['Sensex chart venum','SENSEX'],
    ['show SENSEX','SENSEX'],
    ['switch to NIFTY chart','NIFTY'],
    ['trading mode','NIFTY'],
  ] as const)('opens only the requested offline demo chart: %s', (input,symbol) => {
    expect(intent(input)).toEqual({kind:'open_chart',symbol})
  })
  it.each([
    'Jarvis home-ku thirumba',
    'close trading mode',
    'go back to core',
    'மெயின் ஹோம் திரும்ப',
    'exit chart',
  ])('returns to core: %s', input => expect(intent(input)).toEqual({kind:'close_chart'}))
  it.each([
    'NIFTY next target enna?',
    'Sensex stop loss sollu',
    'new entry eppo?',
    'current price',
    'nifty option chain',
    'நிஃப்டி டார்கெட் சொல்லு',
  ])('does not treat financial questions as navigation: %s', input =>
    expect(intent(input)).toEqual({kind:'unavailable_market'}))
  it.each(['latest news', 'இன்றைய செய்தி', 'market news'])('fails closed on live news: %s', input =>
    expect(intent(input)).toEqual({kind:'unavailable_news'}))
  it.each(['Vanakkam JARVIS', 'How are you?', 'explain Fibonacci', 'tell me a story'])
    ('routes conversational requests only to optional paired AI: %s', input =>
      expect(intent(input)).toEqual({kind:'conversation'}))
  it('uses the existing index for the trading-mode command', () =>
    expect(intent('trading mode activate','SENSEX')).toEqual({kind:'open_chart',symbol:'SENSEX'}))
})
