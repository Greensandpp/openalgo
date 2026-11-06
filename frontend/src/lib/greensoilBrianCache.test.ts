import { describe, expect, it } from 'vitest'
import { isCacheableBrianPhrase } from './greensoilBrianCache'
describe('Brian offline cache safety',()=>{
  it('permits fixed welcome and test phrases',()=>{
    expect(isCacheableBrianPhrase('Hello Boss. Brian speaking.')).toBe(true)
    expect(isCacheableBrianPhrase('Good morning, Boss. Welcome back to GreenSoil JARVIS.')).toBe(true)
  })
  it('never persists arbitrary private AI conversation audio',()=>{
    expect(isCacheableBrianPhrase('Remind me of my password')).toBe(false)
    expect(isCacheableBrianPhrase('My secret API key is xyz')).toBe(false)
    expect(isCacheableBrianPhrase('')).toBe(false)
  })
})
