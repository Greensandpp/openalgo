/** Decorative local-only AI core: no orders, AI model, or live market feed.
 * This renderer uses a modest 2D canvas plus 3D-style CSS rings, avoids
 * costly WebGL and halts frames when hidden or reduced motion is requested.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

export type CoreMode = 'idle' | 'listening' | 'thinking' | 'speaking'
type Dot = { phase: number; orbit: number; radius: number; speed: number; size: number; layer: number }
const DOT_COUNT = 220
const DOTS: Dot[] = Array.from({ length: DOT_COUNT }, (_, i) => ({
  phase: i * 2.3999632, orbit: 20 + (i * 47.7) % 114,
  radius: 0.28 + ((i * 19) % 70) / 100,
  speed: .21 + ((i * 13) % 32) / 100,
  size: .45 + (i % 5) * .26,
  layer: i % 3,
}))

export function ReactiveCore({ mode, reducedMotion, onTouch }: {
  mode: CoreMode; reducedMotion: boolean; onTouch: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const modeRef = useRef(mode)
  const [burst, setBurst] = useState(false)
  modeRef.current = mode

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d', { alpha: true })
    if (!canvas || !context) return
    let frame = 0
    let active = true
    const width = 320
    const height = 320
    const center = width / 2
    const drawing = (ms: number) => {
      if (!active) return
      context.clearRect(0, 0, width, height)
      const t = ms / 1000
      const intent = modeRef.current
      const boost = intent === 'thinking' ? 1.5 : intent === 'listening' ? 1.17 : intent === 'speaking' ? 1.3 : 1
      const glow = context.createRadialGradient(center, center, 15, center, center, 130)
      glow.addColorStop(0, intent === 'listening' ? 'rgba(100,246,203,.16)' : 'rgba(85,215,255,.17)')
      glow.addColorStop(.65, 'rgba(91,102,244,.08)')
      glow.addColorStop(1, 'rgba(19,43,122,0)')
      context.fillStyle = glow
      context.beginPath()
      context.arc(center, center, 137, 0, Math.PI * 2)
      context.fill()

      for (const dot of DOTS) {
        const a = dot.phase + t * dot.speed * boost * (dot.layer === 1 ? -1 : 1)
        const phi = dot.phase * .63 + t * .13
        const dx = Math.cos(a) * dot.orbit
        const dy = Math.sin(a) * dot.orbit * (.34 + dot.radius * .43)
        const x = center + dx
        const y = center + dy + Math.cos(phi) * 17
        const twinkle = .38 + .62 * Math.abs(Math.sin(t * 2.4 + dot.phase))
        context.beginPath()
        context.arc(x, y, dot.size * (1 + twinkle * .4), 0, Math.PI * 2)
        context.fillStyle = dot.layer === 2
          ? `rgba(185,150,255,${.24 + twinkle * .6})`
          : dot.layer === 1
            ? `rgba(64,241,236,${.2 + twinkle * .74})`
            : `rgba(232,250,255,${.2 + twinkle * .75})`
        context.shadowBlur = 11 * twinkle
        context.shadowColor = dot.layer === 2 ? '#8e68fd' : '#24dfff'
        context.fill()
      }
      // Holographic architecture rings: segmented arcs + sweeping telemetry.
      context.save()
      context.translate(center, center)
      context.globalCompositeOperation = 'screen'
      const velocity = intent === 'thinking' ? 2.1 : intent === 'speaking' ? 1.55 : 1
      for (let orbit = 0; orbit < 4; orbit++) {
        const radius = 52 + orbit * 17
        const rotation = t * (.17 + orbit * .07) * velocity * (orbit % 2 ? -1 : 1)
        const segments = orbit === 0 ? 22 : 32
        for (let arc = 0; arc < segments; arc++) {
          if ((arc + orbit) % 6 === 0) continue
          const start = rotation + arc * (Math.PI * 2 / segments)
          context.beginPath()
          context.arc(0, 0, radius, start, start + Math.PI * 1.45 / segments)
          context.strokeStyle = orbit % 2
            ? `rgba(255,185,123,${.20 + .26 * Math.sin(t + arc * .45) ** 2})`
            : `rgba(250,143,214,${.21 + .33 * Math.cos(t + arc * .5) ** 2})`
          context.lineWidth = orbit === 0 ? 1.6 : .8
          context.stroke()
        }
      }
      for (let beam = 0; beam < 8; beam++) {
        const angle = beam * Math.PI / 4 + t * .08
        const pulse = .16 + .2 * Math.abs(Math.sin(t * 1.25 + beam))
        context.beginPath()
        context.moveTo(Math.cos(angle) * 18, Math.sin(angle) * 18)
        context.lineTo(Math.cos(angle) * 102, Math.sin(angle) * 102)
        context.strokeStyle = `rgba(255,177,223,${pulse})`
        context.lineWidth = .55
        context.stroke()
      }
      // Hot center; used only as an abstract light source, not a fake market status.
      const spark = 2.6 + Math.sin(t * (intent === 'speaking' ? 13 : 2.8)) * 1.1
      const energy = context.createRadialGradient(0, 0, 0, 0, 0, 42)
      energy.addColorStop(0, 'rgba(255,250,232,.95)')
      energy.addColorStop(.12, 'rgba(255,183,226,.87)')
      energy.addColorStop(.35, 'rgba(235,109,183,.39)')
      energy.addColorStop(1, 'rgba(231,97,169,0)')
      context.fillStyle = energy
      context.beginPath()
      context.arc(0, 0, 42, 0, Math.PI * 2)
      context.fill()
      context.beginPath()
      context.arc(0, 0, spark, 0, Math.PI * 2)
      context.fillStyle = '#fff6e9'
      context.fill()
      context.restore()
      context.shadowBlur = 0
      frame = requestAnimationFrame(drawing)
    }

    const paintStatic = () => {
      context.clearRect(0, 0, width, height)
      for (const dot of DOTS) {
        const x = center + Math.cos(dot.phase) * dot.orbit
        const y = center + Math.sin(dot.phase) * dot.orbit * .55
        context.beginPath()
        context.arc(x, y, dot.size, 0, Math.PI * 2)
        context.fillStyle = dot.layer === 2 ? '#786ac5' : '#44adb9'
        context.fill()
      }
    }
    const resume = () => {
      cancelAnimationFrame(frame)
      if (!reducedMotion && !document.hidden) frame = requestAnimationFrame(drawing)
      else paintStatic()
    }
    resume()
    document.addEventListener('visibilitychange', resume)
    return () => {
      active = false
      cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', resume)
    }
  }, [reducedMotion])

  const activate = useCallback(() => {
    onTouch()
    setBurst(true)
  }, [onTouch])

  return (
    <div className={`gs-reactor gs-reactor-${mode} ${reducedMotion ? 'gs-motion-off' : ''}`}>
      <button className={`gs-reactor-touch ${burst ? 'gs-touched' : ''}`} type="button"
        onClick={activate} onAnimationEnd={() => setBurst(false)}
        aria-label="Activate GreenSoil AI core demo animation"
        title="Touch to activate visual response">
        <canvas ref={canvasRef} width={320} height={320} className="gs-particle-canvas" aria-hidden="true" />
        <div className="gs-reactor-halo" aria-hidden="true" />
        <div className="gs-reactor-orbit gs-reactor-orbit-a" aria-hidden="true" />
        <div className="gs-reactor-orbit gs-reactor-orbit-b" aria-hidden="true" />
        <div className="gs-reactor-orbit gs-reactor-orbit-c" aria-hidden="true" />
        <div className="gs-reactor-sphere" aria-hidden="true">
          <div className="gs-reactor-mesh" />
          <div className="gs-reactor-eye" />
        </div>
        <div className="gs-reactor-trace gs-reactor-trace-a" aria-hidden="true" />
        <div className="gs-reactor-trace gs-reactor-trace-b" aria-hidden="true" />
        <div className="gs-reactor-flash" aria-hidden="true" />
      </button>
      <div className="gs-reactor-status" role="status" aria-live="polite">
        <span className="gs-reactor-live" /> {mode.toUpperCase()} <span>· VISUAL DEMO</span>
      </div>
    </div>
  )
}
