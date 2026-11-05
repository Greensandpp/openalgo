/** Mobile-first visual identity for GreenSoil PAPER chart lab.
 * Orb is decorative CSS 3D-style motion, NOT a working AI/model feed.
 */
import { useState } from 'react'
import GreenSoilLab from './GreenSoilLab'

function EnergyOrb({ still }: { still: boolean }) {
  return (
    <div className={`gs-orb-stage ${still ? 'gs-motion-off' : ''}`} role="img"
      aria-label="Abstract luminous AI energy sphere decorative visual">
      <div className="gs-orb-aura" />
      <div className="gs-orb-ring gs-orb-ring-one" />
      <div className="gs-orb-ring gs-orb-ring-two" />
      <div className="gs-orb-ring gs-orb-ring-three" />
      <div className="gs-orb-shell">
        <div className="gs-orb-lattice" />
        <div className="gs-orb-core" />
      </div>
      <span className="gs-orb-label">MARKET INTELLIGENCE</span>
    </div>
  )
}

export default function GreenSoilMarketPreview() {
  const [still, setStill] = useState(false)
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
            <div className="gs-eyebrow"><span className="gs-eyebrow-line" /> FUTURE-READY MARKET WORKSPACE / V1 PREVIEW</div>
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
            <EnergyOrb still={still} />
          </div>
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
