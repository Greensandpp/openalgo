/** Mobile-first visual identity for GreenSoil PAPER chart lab.
 * Orb is decorative CSS 3D-style motion, NOT a working AI/model feed.
 */
import { useEffect, useRef, useState } from 'react'

/** Browser speech recognition is opt-in and may use a device/browser service. */
type VoiceResult = { results: ArrayLike<ArrayLike<{transcript: string}>> }
type VoiceRecognizer = {
  lang: string; interimResults: boolean
  onresult: ((event: VoiceResult) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start(): void; stop(): void
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => VoiceRecognizer
  webkitSpeechRecognition?: new () => VoiceRecognizer
}
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
  const recognizer = useRef<VoiceRecognizer | null>(null)
  const [micSupported, setMicSupported] = useState(false)
  useEffect(() => {
    setSpeechSupported('speechSynthesis' in window)
    const voiceWindow = window as SpeechWindow
    setMicSupported(Boolean(voiceWindow.SpeechRecognition || voiceWindow.webkitSpeechRecognition))
    return () => { recognizer.current?.stop(); if ('speechSynthesis' in window) window.speechSynthesis.cancel() }
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
    // Touch is visual-only: never claim the microphone is active.
    // Actual listening state belongs exclusively to the user-pressed mic.
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    recognizer.current?.stop()
    recognizer.current = null
    activeSpeech.current = false
    setMode('idle')
    setAnswer('Visual energy pulse activated. Microphone is OFF. Tap Use mic to listen or type a question below.')
  }
  const startMic = () => {
    const voiceWindow = window as SpeechWindow
    const Constructor = voiceWindow.SpeechRecognition || voiceWindow.webkitSpeechRecognition
    if (!Constructor) {
      setAnswer('Mic recognition not supported in this browser. Type your question instead.')
      return
    }
    recognizer.current?.stop()
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    const instance = new Constructor()
    recognizer.current = instance
    instance.lang = 'en-IN'
    instance.interimResults = false
    instance.onresult = event => {
      const phrase = event.results[0]?.[0]?.transcript ?? ''
      if (!phrase) { setMode('idle'); return }
      setQuestion(phrase)
      respond(phrase)
    }
    instance.onerror = () => {
      setMode('idle')
      setAnswer('Voice recognition unavailable or permission denied. Type a question instead.')
    }
    instance.onend = () => {
      if (recognizer.current === instance) recognizer.current = null
      setMode(previous => previous === 'listening' ? 'idle' : previous)
    }
    try {
      setMode('listening')
      setAnswer('Browser microphone listening. Speak your question. No live NSE data connected.')
      instance.start()
    } catch {
      setMode('idle')
      setAnswer('Could not start microphone. Type a question instead.')
    }
  }
  const stop = () => {
    recognizer.current?.stop()
    recognizer.current = null
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
            <div className="gs-eyebrow"><span className="gs-eyebrow-line" /> GREENSoil / OBSIDIAN INTELLIGENCE · V3</div>
            <h1>See beyond price.<br /><em>Read the momentum.</em></h1>
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
            <button className="gs-voice-mic" type="button" disabled={!micSupported} onClick={startMic}>🎙 {micSupported ? 'Use mic' : 'Mic unavailable'}</button>
          </form>
          <div className="gs-voice-reply" role="status" aria-live="polite">{answer}</div>
          <div className="gs-voice-disclaimer">{speechSupported ? 'Browser speech output available. Mic transcription depends on browser support and may use its speech service.' : 'Browser speech output unavailable; text reply still works.'} Real AI agent and live feed are not connected; microphone only transcribes with explicit permission.</div>
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
