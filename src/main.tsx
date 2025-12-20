import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Debug: Mark app start time
console.time('🚀 App Load Time');
console.log('🚀 App starting to load at:', new Date().toISOString());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
