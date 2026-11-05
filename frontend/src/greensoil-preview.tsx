/** Dedicated standalone demo entrypoint — never imports broker/production app. */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import GreenSoilLab from './pages/GreenSoilLab'

const root = document.getElementById('root')
if (!root) throw new Error('GreenSoil preview root missing')
createRoot(root).render(
  <StrictMode>
    <div className="min-h-screen bg-background text-foreground">
      <GreenSoilLab />
    </div>
  </StrictMode>
)
