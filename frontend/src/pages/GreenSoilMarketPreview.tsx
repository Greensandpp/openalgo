/** Mobile-first visual identity for GreenSoil PAPER chart lab.
 * Orb is decorative CSS 3D-style motion, NOT a working AI/model feed.
 */
import { useEffect, useRef, useState } from 'react'
import GreenSoilLab from './GreenSoilLab'
import { ReactiveCore, type CoreMode } from './GreenSoilReactiveCore'

/** Offline demo only. No market API, model, secrets or trade instructions. */
function safeDemoAnswer(question: string): string {
  if (/target|entry|buy|sell|stop|sl|oi|nifty|sensex|reversal|trade/i.test(question))
    return 'GreenSoil PAPER Lab demo. No verified live market data connected. New entry, stop loss or next target confirm panna mudiyathu. Current state: NO TRADE.'
  return 'GreenSoil AI core demo active. Animation and voice sample only. Real AI agent and live market feed not connected.'
}

export default function GreenSoilMarketPreview() {
  const [still, setStill] = useState(false)
  const [mode, setMode] = useState<CoreMode>('idle')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('Tap the core for a visual reaction. Ask a question for an offline demo reply.')
  const [speechSupported, setSpeechSupported] = useState(false)
  const activeSpeech = useRef(false)
  useEffect(() => {
    setSpeechSupported('speechSynthesis' in window)
    return () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel() }
  }, [])
  const respond = (prompt: string) => {
    const reply = safeDemoAnswer(prompt)
    setAnswer(reply)
    setMode('thinking')
    if (!('speechSynthesis' in window)) { setMode('idle'); return }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(reply)
    utterance.lang = 'en-IN'
    utterance.rate = .92
    utterance.onstart = () => { activeSpeech.current = true; setMode('speaking') }
    utterance.onend = () => { activeSpeech.current = false; setMode('idle') }
    utterance.onerror = () => { activeSpeech.current = false; setMode('idle') }
    window.speechSynthesis.speak(utterance)
  }
  const touch = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    activeSpeech.current = false
    setMode('listening')
    setAnswer('Core activated. This is a visual listening simulation. Type a question below for the demo voice response.')
  }
  const stop = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    activeSpeech.current = false
    setMode('idle')
  }
  return (
    <div className="gs-market-shell">
      <div className="gs-ambient gs-ambient-a" aria-hidden="true" />
      <div className="gs-ambient gs-ambient-b" aria-hidden="true" />
      <div className="gs-market-content">
        <header className="gs-topbar">
          <div className="gs-mark">
            <span className="gs-mark-symbol" aria-hidden="true">◈</span>
            <span><strong>GREEN<span>SOIL</span></strong><small>INTELLIGENCE TERMINAL</small></span>
          </div>
          <div className="gs-header-right">
            <span className="gs-paper-chip"><i /> PAPER LAB</span>
            <button className="gs-motion-control" type="button" aria-pressed={still}
              onClick={() => setStill(s => !s)}>
              {still ? 'Enable motion' : 'Reduce motion'}
            </button>
          </div>
        </header>
        <section className="gs-command" aria-label="AI intelligence dashboard introduction">
          <div className="gs-command-copy">
            <div className="gs-eyebrow"><span className="gs-eyebrow-line" /> FUTURE-READY MARKET WORKSPACE / V2 REACTIVE CORE</div>
            <h1>Observe the market.<br /><em>Decode the signal.</em></h1>
            <p>NIFTY &amp; SENSEX scenario maps, OI pressure, and evolving market structure—one intelligent cockpit.</p>
            <div className="gs-command-tags">
              <span>◉ NIFTY + SENSEX</span>
              <span>◇ 5 MIN STRUCTURE</span>
              <span>↗ VERSIONED LEVELS</span>
            </div>
            <div className="gs-warning">SIMULATION ONLY · Synthetic chart candles · AI, news &amp; live market feeds not connected</div>
          </div>
          <div className="gs-command-visual">
            <ReactiveCore mode={mode} reducedMotion={still} onTouch={touch} />
          </div>
        </section>
        <section className="gs-voice-demo" aria-label="Voice AI demonstration">
          <div className="gs-voice-heading">
            <div><span className="gs-voice-eyebrow">02 / AGENT COMMUNICATION</span><h2>AI Voice Interface <small>· OFFLINE DEMO</small></h2></div>
            <button className="gs-voice-stop" type="button" onClick={stop}>Stop voice</button>
          </div>
          <p className="gs-voice-note">Try “NIFTY next target?” or “New CE entry eppo?” — without verified NSE data, agent correctly answers NO TRADE. No live trading advice.</p>
          <form className="gs-voice-form" onSubmit={event => { event.preventDefault(); respond(question || 'Next target?') }}>
            <label className="gs-voice-input-label" htmlFor="gs-voice-query">Ask the demo agent</label>
            <input id="gs-voice-query" value={question} onChange={event => setQuestion(event.target.value)}
              placeholder="Next target enna?" autoComplete="off" maxLength={180} />
            <button type="submit">Ask &amp; Speak</button>
          </form>
          <div className="gs-voice-reply" role="status" aria-live="polite">{answer}</div>
          <div className="gs-voice-disclaimer">{speechSupported ? 'Browser speech output available. Mic recognition is not enabled yet.' : 'Browser speech output unavailable; text reply still works.'} AI agent, voice recognition, and live feed are not connected.</div>
        </section>
        <div className="gs-section-heading">
          <div><small>01 / CHART INTELLIGENCE</small><h2>Market workspace</h2></div>
          <span className="gs-section-meta">READ-ONLY / DEMO DATA</span>
        </div>
        <div className="gs-chart-workspace">
          <GreenSoilLab />
        </div>
        <footer className="gs-footer">
          <span>GREEN<span>SOIL</span> / AI MARKET</span>
          <span>PREVIEW ONLY · NO EXECUTION · NO LIVE DATA</span>
        </footer>
      </div>
    </div>
  )
}
