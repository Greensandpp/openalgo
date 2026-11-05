/** Decorative local-only AI core: no orders, AI model, or live market feed.
 * This renderer uses a modest 2D canvas plus 3D-style CSS rings, avoids
 * costly WebGL and halts frames when hidden or reduced motion is requested.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

export type CoreMode = 'idle' | 'listening' | 'thinking' | 'speaking'
type Dot = { phase: number; orbit: number; radius: number; speed: number; size: number; layer: number }
const DOT_COUNT = 145
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
        <div className="gs-reactor-flash" aria-hidden="true" />
      </button>
      <div className="gs-reactor-status" role="status" aria-live="polite">
        <span className="gs-reactor-live" /> {mode.toUpperCase()} <span>· VISUAL DEMO</span>
      </div>
    </div>
  )
}
