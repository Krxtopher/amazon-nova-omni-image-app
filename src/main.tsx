import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import { parseAmplifyConfig } from 'aws-amplify/utils'
import './index.css'
import App from './App.tsx'

// Configure Amplify with dynamic import to avoid build issues
async function configureAmplify() {
  try {
    const outputs = await import(`../amplify_outputs.json`)
    if (outputs.default && Object.keys(outputs.default).length > 0) {
      // Parse the Amplify configuration
      const amplifyConfig = parseAmplifyConfig(outputs.default)

      // Configure Amplify with custom REST API support
      Amplify.configure({
        ...amplifyConfig,
        API: {
          ...amplifyConfig.API,
          REST: outputs.default.custom?.API, // Required for custom REST APIs
        },
      })

        // Store config globally for App.tsx to check
        ; (window as any).amplifyConfig = outputs.default
      console.log('Amplify configured with backend and REST API')
    } else {
      console.warn('Amplify configuration is empty - running in frontend-only mode')
    }
  } catch (error) {
    console.warn('Could not load Amplify configuration - running in frontend-only mode', error)
  }
}

// Configure Amplify before rendering
configureAmplify().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
