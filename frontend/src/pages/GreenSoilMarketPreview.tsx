/** GreenSoil Intelligent: mobile-first, JARVIS-first PAPER LAB.
 * All local navigation works offline. Gemini gateway remains private STAGING,
 * so no AI/news/market claims are made by the public demo.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import GreenSoilLab from './GreenSoilLab'
import { ReactiveCore, type CoreMode } from './GreenSoilReactiveCore'
import { parseJarvisIntent } from '../lib/greensoilJarvisIntent'
import { jarvisGreeting } from '../lib/greensoilGreeting'
import { forgetDevicePairing, restoreDevicePairing, saveDevicePairing } from '../lib/greensoilSecurePairing'

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
const PREFERENCES_KEY = 'gs-jarvis-preferences-v1'
const TAB_PAIRING_KEY = 'gs-jarvis-tab-pairing-v1'
const DEFAULT_GATEWAY_URL = 'https://jarvis-gemini-gateway-staging.up.railway.app/'
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
  const [greeting, setGreeting] = useState('Welcome back, Boss')
  const [mode, setMode] = useState<CoreMode>('idle')
  const [trading, setTrading] = useState(false)
  const [symbol, setSymbol] = useState<Index>('NIFTY')
  const [command, setCommand] = useState('')
  const [answer, setAnswer] = useState('JARVIS initializing…')
  const [settings, setSettings] = useState(false)
  const [soundEffects, setSoundEffects] = useState(false)
  const [spokenReplies, setSpokenReplies] = useState(true)
  const [voicePreference, setVoicePreference] = useState('auto')
  const [voiceOptions, setVoiceOptions] = useState<Array<{id:string;label:string}>>([])
  const [voiceSpeed, setVoiceSpeed] = useState(.96)
  const [voiceProvider, setVoiceProvider] = useState<'browser'|'elevenlabs'>('elevenlabs')
  const [audioStatus, setAudioStatus] = useState('Browser voice ready. ElevenLabs connection not configured.')
  const [micSupported, setMicSupported] = useState(false)
  const [preset, setPreset] = useState<Preset>(DEFAULT_PRESET)
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null)
  const [themeNotice, setThemeNotice] = useState('')
  const [gatewayUrl, setGatewayUrl] = useState(DEFAULT_GATEWAY_URL)
  const [gatewayToken, setGatewayToken] = useState('')
  const [gatewayConnected, setGatewayConnected] = useState(false)
  const [rememberTab, setRememberTab] = useState(false)
  const [rememberDevice, setRememberDevice] = useState(true)
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)
  const [gatewayStatus, setGatewayStatus] = useState('Private Gemini staging pairing pending')
  const [askingGemini, setAskingGemini] = useState(false)
  const micRef = useRef<VoiceRecognizer | null>(null)
  const timersRef = useRef<number[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const playingAudio = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)
  const sessionRef = useRef(0)
  const requestRef = useRef<AbortController | null>(null)
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null)
  const activePairRef = useRef(0)

  useEffect(() => {
    let clearVoiceListener: (()=>void) | undefined
    const w = window as SpeechWindow
    setMicSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition))
    const welcome = jarvisGreeting(new Date().getHours())
    setGreeting(welcome)
    setAnswer(welcome)
    if ('speechSynthesis' in window) {
      const listVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        setVoiceOptions(voices.map((v,i)=>({id:String(i),label:v.name+' · '+v.lang})))
      }
      listVoices()
      window.speechSynthesis.addEventListener('voiceschanged',listVoices)
      clearVoiceListener = () => window.speechSynthesis.removeEventListener('voiceschanged',listVoices)
    }
    try {
      const raw = window.localStorage.getItem(LOCAL_KEY)
      if (raw) setPreset(validatePreset(JSON.parse(raw) as unknown))
    } catch { /* Ignore invalid local settings; use safe default. */ }
    try {
      const raw = window.localStorage.getItem(PREFERENCES_KEY)
      const stored: unknown = raw ? JSON.parse(raw) : null
      if (stored && typeof stored === 'object') {
        const p = stored as Record<string, unknown>
        if (p.voiceProvider === 'elevenlabs' || p.voiceProvider === 'browser') setVoiceProvider(p.voiceProvider)
        if (typeof p.spokenReplies === 'boolean') setSpokenReplies(p.spokenReplies)
        if (typeof p.soundEffects === 'boolean') setSoundEffects(p.soundEffects)
        if (typeof p.reducedMotion === 'boolean') setReducedMotion(p.reducedMotion)
        if (typeof p.voicePreference === 'string' && /^(auto|[0-9]{1,3})$/.test(p.voicePreference)) setVoicePreference(p.voicePreference)
        if (typeof p.voiceSpeed === 'number' && Number.isFinite(p.voiceSpeed) && p.voiceSpeed >= .75 && p.voiceSpeed <= 1.15) setVoiceSpeed(p.voiceSpeed)
        if (typeof p.gatewayUrl === 'string' && p.gatewayUrl === DEFAULT_GATEWAY_URL) setGatewayUrl(p.gatewayUrl)
      }
    } catch { /* Storage may be blocked or stale. */ }
    try {
      // Session storage survives a same-tab reload, not closing the browser tab.
      // The Google and ElevenLabs API keys are never stored here.
      const tabToken = window.sessionStorage.getItem(TAB_PAIRING_KEY)
      if (tabToken && tabToken.length >= 32 && tabToken.length <= 200) {
        setGatewayToken(tabToken)
        setRememberTab(true)
        setGatewayStatus('Saved tab token restored. Tap Connect Gemini to verify it again.')
      }
    } catch { /* Browsers may block sessionStorage. */ }
    setPreferencesLoaded(true)
    // Reconnect only to the trusted, fixed Railway STAGING origin. Restore
    // never silently issues provider/API secrets or any broker action.
    const restoreVersion = ++activePairRef.current
    void restoreDevicePairing().then(async token => {
      if (!token || restoreVersion !== activePairRef.current) return
      setGatewayStatus('Restoring saved device pairing...')
      const response = await fetch(DEFAULT_GATEWAY_URL.replace(/\/$/,'') + '/api/config', {
        headers:{Authorization:'Bearer '+token}, credentials:'omit',cache:'no-store',
        signal:AbortSignal.timeout(12000),
      })
      if (!response.ok) throw Error('Pairing expired')
      const doc:unknown = await response.json()
      if (!doc || typeof doc !== 'object' || (doc as {orders_enabled?:unknown}).orders_enabled !== false)
        throw Error('Gateway safety verification failed')
      if (restoreVersion !== activePairRef.current) return
      setGatewayToken(token)
      setGatewayConnected(true)
      setRememberDevice(true)
      setGatewayStatus('Private Gemini gateway reconnected automatically on this device.')
    }).catch(()=>{
      if (restoreVersion === activePairRef.current)
        setGatewayStatus('Saved pairing unavailable or expired. Pair once in Settings to restore access.')
    })
    return () => {
      activePairRef.current += 1
      clearVoiceListener?.()
      micRef.current?.stop()
      requestRef.current?.abort()
      playingAudio.current?.pause()
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
      timersRef.current.forEach(window.clearTimeout)
    }
  }, [])

  useEffect(() => {
    if (!preferencesLoaded) return
    try {
      window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify({
        voiceProvider, spokenReplies, soundEffects, reducedMotion,
        voicePreference, voiceSpeed,
        gatewayUrl: gatewayUrl === DEFAULT_GATEWAY_URL ? gatewayUrl : DEFAULT_GATEWAY_URL,
      }))
    } catch { /* Settings remain usable even when storage is blocked. */ }
  }, [preferencesLoaded, voiceProvider, spokenReplies, soundEffects, reducedMotion,
      voicePreference, voiceSpeed, gatewayUrl])

  const saveTabPairing = (token: string, enabled: boolean) => {
    try {
      if (enabled && token.length >= 32 && token.length <= 200) {
        window.sessionStorage.setItem(TAB_PAIRING_KEY, token)
      } else {
        window.sessionStorage.removeItem(TAB_PAIRING_KEY)
      }
    } catch { /* Token remains memory-only when sessionStorage is blocked. */ }
  }

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
  const playElevenLabs = async (text: string, session: number): Promise<boolean> => {
    if (!gatewayConnected || !validGatewayUrl(gatewayUrl) || !gatewayToken) {
      setAudioStatus('ElevenLabs not paired. Using device voice fallback.')
      return false
    }
    try {
      if (session !== sessionRef.current) return true
      setMode('processing')
      const response = await fetch(gatewayUrl.replace(/\/$/, '') + '/api/tts', {
        method: 'POST', credentials: 'omit', cache: 'no-store',
        headers: {Authorization: 'Bearer '+gatewayToken, 'Content-Type': 'application/json'},
        body: JSON.stringify({text:text.slice(0,200)}),
        signal: AbortSignal.any([AbortSignal.timeout(24000), requestRef.current?.signal ?? new AbortController().signal]),
      })
      if (!response.ok) throw Error('ElevenLabs unavailable')
      if (session !== sessionRef.current) return true
      const blob = await response.blob()
      if (session !== sessionRef.current) return true
      if (!blob.type.startsWith('audio/') || blob.size > 384000 || !blob.size) throw Error('Invalid TTS audio')
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
      const url = URL.createObjectURL(blob)
      audioUrlRef.current = url
      const audio = new Audio(url)
      playingAudio.current?.pause()
      playingAudio.current = audio
      audio.onended = () => {
        if (playingAudio.current === audio) { playingAudio.current = null; if (session === sessionRef.current) setMode('idle') }
        URL.revokeObjectURL(url)
        if (audioUrlRef.current===url) audioUrlRef.current=null
      }
      audio.onerror = () => {
        if (playingAudio.current === audio) { playingAudio.current=null; if (session === sessionRef.current) setMode('idle') }
        URL.revokeObjectURL(url)
        if (audioUrlRef.current===url) audioUrlRef.current=null
      }
      if (session !== sessionRef.current) { URL.revokeObjectURL(url); return true }
      await audio.play()
      if (session !== sessionRef.current) { audio.pause(); return true }
      setAudioStatus('Playing Brian ElevenLabs voice')
      setMode('speaking')
      return true
    } catch {
      if (session !== sessionRef.current) return true
      setAudioStatus('ElevenLabs unavailable or quota exhausted. Using device voice fallback.')
      return false
    }
  }
  const speak = (text: string, session: number) => {
    if (session !== sessionRef.current) return
    if (!spokenReplies) { setMode('idle'); return }
    if (voiceProvider === 'elevenlabs') { void playElevenLabs(text, session).then(ok => { if (!ok && session === sessionRef.current) speakDevice(text, session) }); return }
    speakDevice(text, session)
  }
  const speakDevice = (text: string, session: number) => {
    if (!('speechSynthesis' in window)) { setMode('idle'); return }
    window.speechSynthesis.cancel()
    const say = new SpeechSynthesisUtterance(text)
    const voices = window.speechSynthesis.getVoices()
    const chosen = voicePreference === 'auto' ? null : voices[Number(voicePreference)]
    if (chosen) say.voice = chosen
    say.lang = chosen?.lang ?? 'en-IN'
    say.rate = voiceSpeed
    speechRef.current = say
    say.onstart = () => { if (session === sessionRef.current) { setMode('speaking'); setAudioStatus('Speaking via device browser voice') } }
    say.onend = () => { if (session === sessionRef.current) setMode('idle') }
    say.onerror = () => { if (session === sessionRef.current) { setMode('idle'); setAudioStatus('Voice output unavailable; answer remains visible as text') } }
    window.speechSynthesis.speak(say)
  }
  const cancelCurrent = () => {
    sessionRef.current += 1
    requestRef.current?.abort()
    requestRef.current = null
    micRef.current?.stop()
    micRef.current = null
    playingAudio.current?.pause()
    playingAudio.current = null
    if (audioUrlRef.current) { URL.revokeObjectURL(audioUrlRef.current); audioUrlRef.current = null }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    timersRef.current.forEach(window.clearTimeout)
    timersRef.current = []
  }
  const transition = (reply: string, session = sessionRef.current) => {
    if (session !== sessionRef.current) return
    timersRef.current.forEach(window.clearTimeout)
    timersRef.current = []
    setMode('processing')
    sfx()
    timersRef.current.push(window.setTimeout(() => {
      if (session !== sessionRef.current) return
      setMode('completed')
      setAnswer(reply)
      timersRef.current.push(window.setTimeout(() => speak(reply, session), reducedMotion ? 50 : 450))
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
      saveTabPairing(gatewayToken, rememberTab)
      if (rememberDevice) {
        try {
          await saveDevicePairing(gatewayToken)
          setGatewayStatus('Connected. Encrypted device pairing saved for automatic reconnect.')
        } catch {
          setGatewayStatus('Connected, but this browser blocked device storage. Pairing may be needed next time.')
        }
      } else {
        await forgetDevicePairing().catch(()=>undefined)
        setGatewayStatus('Connected for this session. Device saving is turned off.')
      }
    } catch {
      setGatewayConnected(false)
      setGatewayStatus('Pairing failed. Check URL, token, gateway availability and browser permissions.')
    }
  }
  const askGemini = async (input: string, session: number) => {
    if (!gatewayConnected || !validGatewayUrl(gatewayUrl)) return
    const controller = new AbortController()
    requestRef.current = controller
    setAskingGemini(true); setMode('thinking')
    setAnswer('Private Gemini Flash-Lite reasoning...')
    try {
      const response = await fetch(gatewayUrl.replace(/\/$/, '') + '/api/chat', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + gatewayToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({message: input}),
        cache: 'no-store', credentials: 'omit',
        signal: AbortSignal.any([AbortSignal.timeout(35000), controller.signal]),
      })
      const doc: unknown = await response.json()
      if (!response.ok || !doc || typeof doc !== 'object' ||
          typeof (doc as {answer?: unknown}).answer !== 'string') {
        throw Error('No safe AI reply')
      }
      if (session === sessionRef.current) transition((doc as {answer:string}).answer.slice(0,1800), session)
    } catch {
      if (session === sessionRef.current) { setMode('idle'); setAnswer('Gemini gateway unavailable, unauthorized, or daily quota reached. No live signals.') }
    } finally { if (requestRef.current === controller) requestRef.current = null; if (session === sessionRef.current) setAskingGemini(false) }
  }
  const execute = (input: string) => {
    const q = input.trim()
    if (!q) return
    setCommand('')
    cancelCurrent()
    setAskingGemini(false)
    const session = sessionRef.current
    const intent = parseJarvisIntent(q, symbol)
    if (intent.kind === 'open_chart') {
      setTrading(true); setSymbol(intent.symbol)
      transition(`${intent.symbol} PAPER chart opened. Candles are synthetic; live market feed not connected.`, session)
    } else if (intent.kind === 'close_chart') {
      setTrading(false)
      transition('JARVIS core mode activated.', session)
    } else if (intent.kind === 'unavailable_news') {
      transition('Verified live news feed not connected. Current headlines cannot be confirmed.', session)
    } else if (intent.kind === 'unavailable_market') {
      transition('Verified live NSE and options data unavailable. No target or entry confirmation. NO TRADE.', session)
    } else {
      if (gatewayConnected) void askGemini(q, session)
      else transition('Gemini AI is available after private gateway pairing. Offline chart commands work now.', session)
    }
  }
  const startMic = () => {
    const w = window as SpeechWindow
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Ctor) { setAnswer('Mic recognition unavailable in this browser. Use text input.'); return }
    cancelCurrent()
    setAskingGemini(false)
    const recognition = new Ctor()
    micRef.current = recognition
    recognition.lang = 'en-IN'
    recognition.interimResults = false
    recognition.onresult = event => {
      const phrase = event.results[0]?.[0]?.transcript ?? ''
      execute(phrase)
    }
    recognition.onerror = () => {
      if (micRef.current !== recognition) return
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
    cancelCurrent()
    setAskingGemini(false)
    setMode('idle')
    setAudioStatus('Voice stopped')
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
          <div className="gs-jarvis-kicker">{trading ? 'TRADING MODE • SYNTHETIC PAPER' : 'JARVIS CORE • ONLINE'}</div>
          {!trading && <div className="gs-jarvis-greeting" aria-label="JARVIS welcome message">{greeting}</div>}
          <div className="gs-jarvis-core"><ReactiveCore mode={mode} reducedMotion={reducedMotion} onTouch={() => { setMode('idle'); setAnswer('Energy pulse activated. Tap microphone to speak.'); }} particleCount={preset.particleCount} /></div>
          <div className="gs-jarvis-status">{answer}</div>
          {reducedMotion && <button className="gs-jarvis-resume" type="button" onClick={()=>setReducedMotion(false)}>✦ Resume AI core animation</button>}
          {!trading && <button type="button" className="gs-jarvis-welcome" onClick={()=>{cancelCurrent();speak(greeting,sessionRef.current)}} aria-label="Play JARVIS welcome greeting">◉ Hear welcome</button>}
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
        <label><input type="checkbox" checked={reducedMotion} onChange={e=>setReducedMotion(e.target.checked)}/> Reduce animation {reducedMotion ? '(ON — static core)' : '(OFF — animated core)'}</label>
        <label><input type="checkbox" checked={spokenReplies} onChange={e=>setSpokenReplies(e.target.checked)}/> Spoken responses (selected voice)</label>
        <label><input type="checkbox" checked={soundEffects} onChange={e=>setSoundEffects(e.target.checked)}/> Sound effects (optional)</label>
        <div className="gs-jarvis-voice-settings">
          <strong>Voice engine</strong>
          <label htmlFor="gs-voice-provider">Provider</label>
          <select id="gs-voice-provider" value={voiceProvider} onChange={e=>{
            const next=e.target.value as 'browser'|'elevenlabs'
            setVoiceProvider(next)
            setAudioStatus(next==='elevenlabs' ?
              'ElevenLabs is optional and needs a separate API key in Railway staging. Browser voice remains fallback.' :
              'Browser voice selected. No API credits used.')
          }}>
            <option value="browser">Device voice — free / available now</option>
            <option value="elevenlabs">ElevenLabs — optional (requires secure API key)</option>
          </select>
          <label htmlFor="gs-voice-choice">Device voice</label>
          <select id="gs-voice-choice" value={voicePreference} onChange={e=>setVoicePreference(e.target.value)}>
            <option value="auto">Automatic (device default)</option>
            {voiceOptions.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
          <label htmlFor="gs-voice-speed">Voice speed · {voiceSpeed.toFixed(2)}×</label>
          <input type="range" id="gs-voice-speed" min=".75" max="1.15" step=".05" value={voiceSpeed}
            onChange={e=>setVoiceSpeed(Number(e.target.value))}/>
          <p role="status">{audioStatus}</p>
        </div>
        <div className="gs-jarvis-settings-actions">
          <button type="button" onClick={()=>fileRef.current?.click()}>Import JSON / HTML</button>
          <input ref={fileRef} type="file" accept=".json,.html,.htm" hidden onChange={e=>void importTheme(e.currentTarget.files?.[0])}/>
          <button type="button" onClick={exportTheme}>Export preset</button>
          <button type="button" onClick={()=>{setPreset(DEFAULT_PRESET);setHtmlPreview(null);try{localStorage.removeItem(LOCAL_KEY)}catch{/* optional */}setThemeNotice('Original theme restored.')}}>Reset</button>
        </div>
        <div className="gs-jarvis-gateway-settings">
          <strong>Gemini AI — Private staging pairing</strong>
          <p>Gemini and ElevenLabs API keys stay on Railway. On your own phone, the separate gateway token can be encrypted in browser device storage and automatically revalidated on future visits. Avoid this on shared phones; clearing browser site data will remove the pairing.</p>
          <label className="gs-jarvis-gateway-label" htmlFor="gs-gateway-url">Railway HTTPS URL</label>
          <input id="gs-gateway-url" inputMode="url" autoComplete="off"
            placeholder="https://your-gateway.up.railway.app/"
            value={gatewayUrl} onChange={e=>{setGatewayConnected(false);setGatewayUrl(e.target.value)}} />
          <label className="gs-jarvis-gateway-label" htmlFor="gs-gateway-token">Private gateway access token (not Gemini key)</label>
          <input id="gs-gateway-token" type="password" autoComplete="off"
            placeholder="Enter private Railway gateway token"
            value={gatewayToken} onChange={e=>{setGatewayConnected(false);setGatewayToken(e.target.value);saveTabPairing('', false)}} />
          <label className="gs-jarvis-remember-tab"><input type="checkbox" checked={rememberDevice} onChange={e=>{
            setRememberDevice(e.target.checked)
            if (!e.target.checked) void forgetDevicePairing()
          }}/> Save encrypted pairing on this device and reconnect automatically (personal phone only)</label>
          <label className="gs-jarvis-remember-tab"><input type="checkbox" checked={rememberTab} onChange={e=>{setRememberTab(e.target.checked);saveTabPairing(gatewayToken,e.target.checked)}}/> Remember token in current tab only (optional)</label>
          <div className="gs-jarvis-settings-actions">
            <button type="button" onClick={()=>void pairGateway()}>Connect Gemini</button>
            <button type="button" onClick={()=>{
              activePairRef.current+=1
              setGatewayConnected(false);setGatewayToken('');setRememberTab(false)
              saveTabPairing('',false)
              void forgetDevicePairing().catch(()=>undefined)
              setGatewayStatus('Disconnected. Saved device and tab pairing cleared.')
            }}>Disconnect & forget device</button>
          </div>
          <p role="status" className="gs-jarvis-theme-notice">{gatewayStatus}</p>
        </div>
        <p className="gs-jarvis-theme-notice" role="status">{themeNotice || `Theme: ${preset.name} · ${preset.particleCount} particles`}</p>
        {htmlPreview && <iframe sandbox="" title="Untrusted HTML design preview, scripts blocked" srcDoc={htmlPreview} className="gs-jarvis-html-preview"/>}
      </section>}
      <form aria-busy={askingGemini} className="gs-jarvis-commandbar" onSubmit={event=>{event.preventDefault();execute(command)}}>
        <label className="gs-jarvis-sr" htmlFor="gs-jarvis-command">Command</label>
        <input id="gs-jarvis-command" value={command} onChange={e=>setCommand(e.target.value)} placeholder="Ask JARVIS or activate Trading Mode..." maxLength={180}/>
        <button type="submit" className="gs-jarvis-send" title="Send command" aria-label="Send command">➤</button>
        <button type="button" className="gs-jarvis-mic" title={micSupported ? 'Voice command' : 'Mic not supported'} aria-label="Use microphone" disabled={!micSupported} onClick={startMic}>🎙</button>
        <button type="button" className="gs-jarvis-stop" title="Stop voice" aria-label="Stop voice" onClick={stop}>■</button>
      </form>
    </div>
  )
}
