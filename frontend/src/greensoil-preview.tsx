/** Dedicated standalone demo entrypoint — never imports broker/production app. */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import GreenSoilMarketPreview from './pages/GreenSoilMarketPreview'
import './greensoil-market.css'

const root = document.getElementById('root')
if (!root) throw new Error('GreenSoil preview root missing')
createRoot(root).render(
  <StrictMode>
    <GreenSoilMarketPreview />
  </StrictMode>
)
