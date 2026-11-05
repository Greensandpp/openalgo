/** Decorative local-only AI core: no orders, AI model, or live market feed.
 * This renderer uses a modest 2D canvas plus 3D-style CSS rings, avoids
 * costly WebGL and halts frames when hidden or reduced motion is requested.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

export type CoreMode = 'idle' | 'listening' | 'thinking' | 'processing' | 'completed' | 'speaking'
type Dot = { phase: number; orbit: number; radius: number; speed: number; size: number; layer: number }
const DOT_COUNT = 380
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
      const boost = intent === 'processing' ? 2.5 : intent === 'thinking' ? 1.8 : intent === 'listening' ? 1.22 : intent === 'completed' ? .65 : intent === 'speaking' ? 1.45 : 1
      const glow = context.createRadialGradient(center, center, 15, center, center, 130)
      glow.addColorStop(0, intent === 'listening' ? 'rgba(255,194,67,.21)' : 'rgba(255,111,18,.23)')
      glow.addColorStop(.65, 'rgba(255,87,15,.13)')
      glow.addColorStop(1, 'rgba(89,25,4,0)')
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
          ? `rgba(255,226,132,${.25 + twinkle * .73})`
          : dot.layer === 1
            ? `rgba(255,100,28,${.2 + twinkle * .74})`
            : `rgba(255,249,214,${.3 + twinkle * .68})`
        context.shadowBlur = 11 * twinkle
        context.shadowColor = dot.layer === 2 ? '#ffd65a' : '#ff651c'
        context.fill()
      }
      // Holographic architecture rings: segmented arcs + sweeping telemetry.
      context.save()
      context.translate(center, center)
      context.globalCompositeOperation = 'screen'
      const velocity = intent === 'processing' ? 2.9 : intent === 'thinking' ? 2.1 : intent === 'speaking' ? 1.55 : 1
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
            ? `rgba(255,212,100,${.20 + .35 * Math.sin(t + arc * .45) ** 2})`
            : `rgba(255,105,26,${.21 + .43 * Math.cos(t + arc * .5) ** 2})`
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
        context.strokeStyle = `rgba(255,194,82,${pulse})`
        context.lineWidth = .55
        context.stroke()
      }
      // Hot center; used only as an abstract light source, not a fake market status.
      const spark = 2.6 + Math.sin(t * (intent === 'speaking' ? 13 : 2.8)) * 1.1
      const energy = context.createRadialGradient(0, 0, 0, 0, 0, 42)
      energy.addColorStop(0, 'rgba(255,250,232,.95)')
      energy.addColorStop(.12, 'rgba(255,201,83,.87)')
      energy.addColorStop(.35, 'rgba(255,102,18,.43)')
      energy.addColorStop(1, 'rgba(255,75,8,0)')
      context.fillStyle = energy
      context.beginPath()
      context.arc(0, 0, 42, 0, Math.PI * 2)
      context.fill()
      context.beginPath()
      context.arc(0, 0, spark, 0, Math.PI * 2)
      context.fillStyle = '#fff9d8'
      context.fill()
      context.restore()
      // Rotating plasma filaments are volumetric-looking layered Bézier arcs.
      // Deterministic motion avoids random frame flicker on mobile devices.
      context.save()
      context.translate(center, center)
      context.globalCompositeOperation = 'screen'
      for (let filament = 0; filament < 18; filament++) {
        const phase = filament * Math.PI * 2 / 18 + t * .24 * boost
        const twist = Math.sin(t * .9 + filament * 2.1)
        const innerRadius = 16 + 9 * Math.abs(twist)
        const outerRadius = 57 + 42 * Math.abs(Math.sin(t * .28 + filament))
        const startX = Math.cos(phase) * innerRadius
        const startY = Math.sin(phase) * innerRadius
        const endX = Math.cos(phase + .6 * twist) * outerRadius
        const endY = Math.sin(phase + .6 * twist) * outerRadius * .82
        context.beginPath()
        context.moveTo(startX, startY)
        context.bezierCurveTo(
          Math.cos(phase + .75) * 65, Math.sin(phase + .75) * 43,
          Math.cos(phase - .9) * 83, Math.sin(phase - .9) * 69,
          endX, endY
        )
        const intensity = .18 + .49 * Math.abs(Math.sin(t * 1.6 + filament * 1.7))
        context.lineWidth = filament % 4 === 0 ? 1.5 : .65
        context.strokeStyle = `rgba(255,${filament % 3 === 0 ? 224 : 116},38,${intensity})`
        context.shadowBlur = filament % 4 === 0 ? 18 : 8
        context.shadowColor = filament % 3 === 0 ? '#ffdc65' : '#ff611b'
        context.stroke()
      }
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
        context.fillStyle = dot.layer === 2 ? '#f5b754' : '#ff742c'
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
