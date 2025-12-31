import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import { Amplify } from 'aws-amplify'
import './index.css'
import App from './App.tsx'

// Import Amplify configuration (will be generated after sandbox deployment)
// import outputs from './amplifyconfiguration.json'

// Configure Amplify (will be uncommented after sandbox deployment)
// Amplify.configure(outputs)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
