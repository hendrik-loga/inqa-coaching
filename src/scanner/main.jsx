import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ScannerApp from './ScannerApp'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ScannerApp />
  </StrictMode>
)
