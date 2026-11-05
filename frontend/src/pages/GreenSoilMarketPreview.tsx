/** GreenSoil Intelligent: mobile-first, JARVIS-first PAPER LAB.
 * All local navigation works offline. Gemini gateway remains private STAGING,
 * so no AI/news/market claims are made by the public demo.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import GreenSoilLab from './GreenSoilLab'
import { ReactiveCore, type CoreMode } from './GreenSoilReactiveCore'

type Index = 'NIFTY' | 'SENSEX'
type Preset = {
  name: string; primaryColor: string; secondaryColor: string
  backgroundColor: string; geometry: 'orbital' | 'hud' | 'matrix' | 'vortex' | 'wave' | 'plasma'
  particleCount: number
}
type VoiceResult = { results: ArrayLike<ArrayLike<{ transcript: string }>> }
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
const DEFAULT_PRESET: Preset = {
  name: 'GreenSoil Plasma', primaryColor: '#00FF66', secondaryColor: '#FFD700',
  backgroundColor: '#050B07', geometry: 'plasma', particleCount: 380,
}
const LOCAL_KEY = 'gs-intelligent-safe-theme-v1'
const GEOMETRIES = ['orbital', 'hud', 'matrix', 'vortex', 'wave', 'plasma']
const COLORS = /^#[0-9a-fA-F]{6}$/
function validatePreset(v: unknown): Preset {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error('Invalid JSON theme')
  const a = v as Record<string, unknown>
  if (typeof a.name !== 'string' || a.name.length < 1 || a.name.length > 60 ||
    !COLORS.test(String(a.primaryColor)) || !COLORS.test(String(a.secondaryColor)) ||
    !COLORS.test(String(a.backgroundColor)) || !GEOMETRIES.includes(String(a.geometry)) ||
    typeof a.particleCount !== 'number' || !Number.isInteger(a.particleCount) ||
    a.particleCount < 80 || a.particleCount > 800) throw Error('Invalid preset values')
  return { name: a.name, primaryColor: String(a.primaryColor),
    secondaryColor: String(a.secondaryColor), backgroundColor: String(a.backgroundColor),
    geometry: a.geometry as Preset['geometry'], particleCount: a.particleCount }
}
function hue(hex: string): number {
  const a = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255)
  const high = Math.max(...a), low = Math.min(...a), d = high-low
  if (d === 0) return 0
  let h = high === a[0] ? ((a[1]-a[2])/d)%6 :
    high === a[1] ? (a[2]-a[0])/d+2 : (a[0]-a[1])/d+4
  return (h*60+360)%360
}

export default function GreenSoilMarketPreview() {
  const [reducedMotion, setReducedMotion] = useState(false)
  const [mode, setMode] = useState<CoreMode>('idle')
  const [trading, setTrading] = useState(false)
  const [symbol, setSymbol] = useState<Index>('NIFTY')
  const [command, setCommand] = useState('')
  const [answer, setAnswer] = useState('Ready. Say “Trading mode activate” to open the PAPER chart lab.')
  const [settings, setSettings] = useState(false)
  const [soundEffects, setSoundEffects] = useState(false)
  const [spokenReplies, setSpokenReplies] = useState(true)
  const [micSupported, setMicSupported] = useState(false)
  const [preset, setPreset] = useState<Preset>(DEFAULT_PRESET)
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null)
  const [themeNotice, setThemeNotice] = useState('')
  const [gatewayUrl, setGatewayUrl] = useState('https://jarvis-gemini-gateway-staging.up.railway.app/')
  const [gatewayToken, setGatewayToken] = useState('')
  const [gatewayConnected, setGatewayConnected] = useState(false)
  const [gatewayStatus, setGatewayStatus] = useState('Private Gemini staging pairing pending')
  const [askingGemini, setAskingGemini] = useState(false)
  const micRef = useRef<VoiceRecognizer | null>(null)
  const timersRef = useRef<number[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const w = window as SpeechWindow
    setMicSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition))
    try {
      const raw = window.localStorage.getItem(LOCAL_KEY)
      if (raw) setPreset(validatePreset(JSON.parse(raw) as unknown))
    } catch { /* Ignore invalid local settings; use safe default. */ }
    return () => {
      micRef.current?.stop()
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
      timersRef.current.forEach(window.clearTimeout)
    }
  }, [])

  const sfx = () => {
    if (!soundEffects || typeof window.AudioContext === 'undefined') return
    try {
      const context = new window.AudioContext()
      const oscillator = context.createOscillator()
      const volume = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(480, context.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(820, context.currentTime + .13)
      volume.gain.setValueAtTime(.025, context.currentTime)
      volume.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .15)
      oscillator.connect(volume).connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + .16)
      void oscillator.onended
      oscillator.onended = () => { void context.close() }
    } catch { /* Sound is optional and never blocks commands. */ }
  }
  const speak = (text: string) => {
    if (!spokenReplies || !('speechSynthesis' in window)) { setMode('idle'); return }
    window.speechSynthesis.cancel()
    const say = new SpeechSynthesisUtterance(text)
    say.lang = 'en-IN'
    say.rate = .96
    say.onstart = () => setMode('speaking')
    say.onend = () => setMode('idle')
    say.onerror = () => setMode('idle')
    window.speechSynthesis.speak(say)
  }
  const transition = (reply: string) => {
    timersRef.current.forEach(window.clearTimeout)
    timersRef.current = []
    setMode('processing')
    sfx()
    timersRef.current.push(window.setTimeout(() => {
      setMode('completed')
      setAnswer(reply)
      timersRef.current.push(window.setTimeout(() => speak(reply), reducedMotion ? 50 : 450))
    }, reducedMotion ? 50 : 620))
  }
  const validGatewayUrl = (value: string) => {
    try {
      const u = new URL(value)
      return u.protocol === 'https:' &&
        u.hostname.endsWith('.up.railway.app') &&
        u.pathname === '/' && !u.search && !u.hash
    } catch { return false }
  }
  const pairGateway = async () => {
    if (!validGatewayUrl(gatewayUrl) || gatewayToken.length < 32 || gatewayToken.length > 200) {
      setGatewayStatus('Invalid secure Railway URL or private access token.')
      return
    }
    setGatewayStatus('Checking private gateway...')
    try {
      const response = await fetch(gatewayUrl.replace(/\/$/, '') + '/api/config', {
        method: 'GET',
        headers: { Authorization: 'Bearer ' + gatewayToken },
        cache: 'no-store', credentials: 'omit',
        signal: AbortSignal.timeout(12000),
      })
      if (!response.ok) throw Error('Gateway authorization failed (' + response.status + ')')
      const doc: unknown = await response.json()
      if (!doc || typeof doc !== 'object' || (doc as {orders_enabled?: unknown}).orders_enabled !== false) {
        throw Error('Gateway safety status could not be verified')
      }
      setGatewayConnected(true)
      setGatewayStatus('Paired with private staging Gemini gateway. Requests limited.')
    } catch {
      setGatewayConnected(false)
      setGatewayStatus('Pairing failed. Check URL, token, gateway availability and browser permissions.')
    }
  }
  const askGemini = async (input: string) => {
    if (!gatewayConnected || askingGemini || !validGatewayUrl(gatewayUrl)) return
    setAskingGemini(true); setMode('thinking')
    setAnswer('Private Gemini Flash-Lite reasoning...')
    try {
      const response = await fetch(gatewayUrl.replace(/\/$/, '') + '/api/chat', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + gatewayToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({message: input}),
        cache: 'no-store', credentials: 'omit',
        signal: AbortSignal.timeout(35000),
      })
      const doc: unknown = await response.json()
      if (!response.ok || !doc || typeof doc !== 'object' ||
          typeof (doc as {answer?: unknown}).answer !== 'string') {
        throw Error('No safe AI reply')
      }
      transition((doc as {answer:string}).answer.slice(0,1800))
    } catch {
      setMode('idle')
      setAnswer('Gemini gateway unavailable, unauthorized, or daily quota reached. No live signals.')
    } finally { setAskingGemini(false) }
  }
  const execute = (input: string) => {
    const q = input.trim()
    if (!q) return
    setCommand('')
    const x = q.toLowerCase()
    if (/(trading|trade|market|chart|nifty|sensex).*(on|open|activate|show|start|pannu|kattu|thira)|(?:open|show|start|activate).*(trading|trade|market|chart|nifty|sensex)/i.test(x) ||
        /^\s*(nifty|sensex|trading mode)\s*$/i.test(q)) {
      const target: Index = /sensex/i.test(x) ? 'SENSEX' : 'NIFTY'
      setTrading(true); setSymbol(target)
      transition(`${target} PAPER chart opened. Prices are synthetic; live feed not connected.`)
    } else if (/(back|home|close|exit|stop).*?(trading|trade|chart|mode)|(?:jarvis|greensoil).*?(home|normal)/i.test(x)) {
      setTrading(false)
      transition('JARVIS core mode activated.')
    } else if (/(news|headlines|current market|today.?s market)/i.test(x)) {
      transition('Verified live news feed not connected. Current headlines cannot be confirmed.')
    } else if (/(target|entry|sl|stop.loss|buy|sell|reversal|premium|option)/i.test(x)) {
      transition('Verified NSE and options feeds unavailable. No target or new entry confirmation. NO TRADE.')
    } else {
      if (gatewayConnected) void askGemini(q)
      else transition('Gemini AI staging verified. Connect your private gateway in Settings for conversational AI. Local commands work offline.')
    }
  }
  const startMic = () => {
    const w = window as SpeechWindow
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Ctor) { setAnswer('Mic recognition unavailable in this browser. Use text input.'); return }
    micRef.current?.stop()
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    const recognition = new Ctor()
    micRef.current = recognition
    recognition.lang = 'en-IN'
    recognition.interimResults = false
    recognition.onresult = event => {
      const phrase = event.results[0]?.[0]?.transcript ?? ''
      execute(phrase)
    }
    recognition.onerror = () => {
      setMode('idle')
      setAnswer('Microphone unavailable or permission denied. Type your command.')
    }
    recognition.onend = () => {
      if (micRef.current === recognition) micRef.current = null
      setMode(p => p === 'listening' ? 'idle' : p)
    }
    try { setMode('listening'); recognition.start() }
    catch { setMode('idle'); setAnswer('Could not start microphone. Use text input.') }
  }
  const stop = () => {
    micRef.current?.stop()
    micRef.current = null
    timersRef.current.forEach(window.clearTimeout)
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    setMode('idle')
  }
  const importTheme = async (file: File | undefined) => {
    if (!file) return
    if (file.size > 100_000) { setThemeNotice('File too large (maximum 100 KB).'); return }
    try {
      const contents = await file.text()
      if (/\.json$/i.test(file.name)) {
        const next = validatePreset(JSON.parse(contents) as unknown)
        setPreset(next)
        setHtmlPreview(null)
        try { window.localStorage.setItem(LOCAL_KEY, JSON.stringify(next)) } catch { /* private mode */ }
        setThemeNotice('Custom theme applied: ' + next.name)
      } else if (/\.html?$/i.test(file.name)) {
        const csp = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:">'
        setHtmlPreview(csp + contents)
        setThemeNotice('HTML visual preview only. Scripts and external resources blocked.')
      } else setThemeNotice('Only .json or .html themes supported.')
    } catch { setThemeNotice('Cannot read or validate that file.') }
    if (fileRef.current) fileRef.current.value = ''
  }
  const exportTheme = () => {
    const blob = new Blob([JSON.stringify(preset,null,2)], {type:'application/json'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href=url; a.download='greensoil-core-preset.json'; a.click()
    window.setTimeout(() => URL.revokeObjectURL(url),1000)
  }
  const cssVars = {
    '--gs-user-green': preset.primaryColor, '--gs-user-gold': preset.secondaryColor,
    '--gs-user-dark': preset.backgroundColor, '--gs-orb-hue': `${Math.round(hue(preset.primaryColor)-30)}deg`,
  } as CSSProperties
  return (
    <div className="gs-jarvis-shell" style={cssVars} data-geometry={preset.geometry}>
      <header className="gs-jarvis-header">
        <div className="gs-jarvis-brand"><span className="gs-jarvis-diamond" aria-hidden="true">✦</span><span><strong>GreenSoil <em>Intelligent</em></strong><small>PERSONAL AI • PAPER LAB</small></span></div>
        <button type="button" className="gs-jarvis-settings" aria-label="Open JARVIS settings" onClick={() => setSettings(s => !s)}>⚙</button>
      </header>
      <main className="gs-jarvis-main">
        <section className={`gs-jarvis-hero ${trading ? 'gs-jarvis-hero-compact' : ''}`} aria-label="JARVIS AI reactor">
          <div className="gs-jarvis-kicker">{trading ? 'TRADING MODE • SYNTHETIC PAPER' : 'JARVIS CORE • READY'}</div>
          <div className="gs-jarvis-core"><ReactiveCore mode={mode} reducedMotion={reducedMotion} onTouch={() => { setMode('idle'); setAnswer('Energy pulse activated. Tap microphone to speak.'); }} particleCount={preset.particleCount} /></div>
          <div className="gs-jarvis-status">{answer}</div>
          {!trading && <button type="button" className="gs-jarvis-activate" onClick={() => execute('trading mode activate')}>◈ Activate Trading Mode</button>}
          {trading && <div className="gs-jarvis-trade-controls">
            <button type="button" aria-pressed={symbol==='NIFTY'} onClick={()=>execute('open nifty chart')}>NIFTY</button>
            <button type="button" aria-pressed={symbol==='SENSEX'} onClick={()=>execute('open sensex chart')}>SENSEX</button>
            <button type="button" onClick={()=>execute('close trading mode')}>⌂ Core</button>
          </div>}
        </section>
        {trading && <section className="gs-jarvis-chart-panel" aria-label="Trading mode charts">
          <div className="gs-jarvis-paper-warning">DEMO DATA • NO BROKER ORDERS • NO LIVE NSE FEED</div>
          <div className="gs-chart-workspace"><GreenSoilLab selectedSymbol={symbol}/></div>
        </section>}
      </main>
      {settings && <section className="gs-jarvis-settings-sheet" aria-label="Core settings">
        <div className="gs-jarvis-sheet-header"><strong>Core Settings</strong><button type="button" onClick={()=>setSettings(false)}>✕</button></div>
        <label><input type="checkbox" checked={reducedMotion} onChange={e=>setReducedMotion(e.target.checked)}/> Reduce animation</label>
        <label><input type="checkbox" checked={spokenReplies} onChange={e=>setSpokenReplies(e.target.checked)}/> Spoken responses (browser voice)</label>
        <label><input type="checkbox" checked={soundEffects} onChange={e=>setSoundEffects(e.target.checked)}/> Sound effects (optional)</label>
        <div className="gs-jarvis-settings-actions">
          <button type="button" onClick={()=>fileRef.current?.click()}>Import JSON / HTML</button>
          <input ref={fileRef} type="file" accept=".json,.html,.htm" hidden onChange={e=>void importTheme(e.currentTarget.files?.[0])}/>
          <button type="button" onClick={exportTheme}>Export preset</button>
          <button type="button" onClick={()=>{setPreset(DEFAULT_PRESET);setHtmlPreview(null);try{localStorage.removeItem(LOCAL_KEY)}catch{/* optional */}setThemeNotice('Original theme restored.')}}>Reset</button>
        </div>
        <div className="gs-jarvis-gateway-settings">
          <strong>Gemini AI — Private staging pairing</strong>
          <p>Never paste Google Gemini API keys here. Enter only the separate private Railway gateway access token. Token stays in page memory and is cleared on reload.</p>
          <label className="gs-jarvis-gateway-label" htmlFor="gs-gateway-url">Railway HTTPS URL</label>
          <input id="gs-gateway-url" inputMode="url" autoComplete="off"
            placeholder="https://your-gateway.up.railway.app/"
            value={gatewayUrl} onChange={e=>{setGatewayConnected(false);setGatewayUrl(e.target.value)}} />
          <label className="gs-jarvis-gateway-label" htmlFor="gs-gateway-token">Private gateway access token (not Gemini key)</label>
          <input id="gs-gateway-token" type="password" autoComplete="off"
            placeholder="Enter private Railway gateway token"
            value={gatewayToken} onChange={e=>{setGatewayConnected(false);setGatewayToken(e.target.value)}} />
          <div className="gs-jarvis-settings-actions">
            <button type="button" onClick={()=>void pairGateway()}>Connect Gemini</button>
            <button type="button" onClick={()=>{setGatewayConnected(false);setGatewayToken('');setGatewayStatus('Disconnected. Token cleared.')}}>Disconnect</button>
          </div>
          <p role="status" className="gs-jarvis-theme-notice">{gatewayStatus}</p>
        </div>
        <p className="gs-jarvis-theme-notice" role="status">{themeNotice || `Theme: ${preset.name} · ${preset.particleCount} particles`}</p>
        {htmlPreview && <iframe sandbox="" title="Untrusted HTML design preview, scripts blocked" srcDoc={htmlPreview} className="gs-jarvis-html-preview"/>}
      </section>}
      <form className="gs-jarvis-commandbar" onSubmit={event=>{event.preventDefault();execute(command)}}>
        <label className="gs-jarvis-sr" htmlFor="gs-jarvis-command">Command</label>
        <input id="gs-jarvis-command" value={command} onChange={e=>setCommand(e.target.value)} placeholder="Ask JARVIS or activate Trading Mode..." maxLength={180}/>
        <button type="submit" className="gs-jarvis-send" title="Send command" aria-label="Send command">➤</button>
        <button type="button" className="gs-jarvis-mic" title={micSupported ? 'Voice command' : 'Mic not supported'} aria-label="Use microphone" disabled={!micSupported} onClick={startMic}>🎙</button>
        <button type="button" className="gs-jarvis-stop" title="Stop voice" aria-label="Stop voice" onClick={stop}>■</button>
      </form>
    </div>
  )
}
