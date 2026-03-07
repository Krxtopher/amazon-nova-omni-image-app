import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Authenticator, ThemeProvider as AmplifyThemeProvider } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { authenticatorTheme, authenticatorFormFields, authenticatorComponents } from '@/components/AuthenticatorConfig';
import { PromptInputArea, GeneratingStatus, Sidebar } from '@/components';
import { SimpleVirtualizedGallery } from '@/components/SimpleVirtualizedGallery';
import { Lightbox } from '@/components/Lightbox';
import { MagicalEffectsDemo } from '@/components/MagicalEffectsDemo';
import WordRevealDemo from '@/pages/WordRevealDemo';

import { DebugCounter } from '@/components/DebugCounter';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider } from '@/components/ThemeProvider';
import { BedrockServiceProvider, useBedrockService } from '@/contexts/BedrockServiceContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { BedrockImageService } from '@/services/BedrockImageService';
import { useImageStore } from '@/stores/imageStore';
import { useEditSourceStore, useUIStore } from '@/stores/uiStore';
import { useThrottlingStore } from '@/stores/throttlingStore';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

import './App.css';

/**
 * Initialize Bedrock service with credentials
 * Requirements: 10.3
 * 
 * Note: In a production application, credentials should be obtained from:
 * - AWS Cognito Identity Pool
 * - AWS Amplify
 * - Environment variables (for server-side)
 * 
 * For this demo, we're using a placeholder configuration.
 * You'll need to configure proper AWS credentials before using the app.
 */
function createBedrockService(): BedrockImageService {
  // TODO: Replace with actual credential configuration
  // Example using Cognito Identity Pool:
  // import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';
  // 
  // const credentials = fromCognitoIdentityPool({
  //     clientConfig: { region: 'us-east-1' },
  //     identityPoolId: 'YOUR_IDENTITY_POOL_ID',
  // });

  return new BedrockImageService({
    region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || '',
      secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || '',
    }
  });
}

/**
 * Main application content component
 * Separated from App to allow access to BedrockService context
 */
function AppContent() {
  const bedrockService = useBedrockService();
  const { deleteImage, initialize, isLoading } = useImageStore();
  const { setEditSource } = useEditSourceStore();
  const { refreshStats } = useThrottlingStore();

  // Wrapped refreshStats with logging
  const loggedRefreshStats = () => {
    console.log('[1000ms Interval] App.tsx - refreshStats called at', new Date().toISOString());
    refreshStats();
  };
  const { showDebugPanel } = useUIStore();

  const [activeRequests, setActiveRequests] = useState(0);

  // Initialize the store
  useEffect(() => {
    initialize().then(() => {
      // Initialization complete
    }).catch((error) => {
      console.error('App initialization failed:', error);
    });
  }, [initialize]);

  // Initialize throttling stats refresh when debug panel is visible
  useEffect(() => {
    if (showDebugPanel) {
      const interval = setInterval(loggedRefreshStats, 1000);
      return () => clearInterval(interval);
    }
  }, [refreshStats, showDebugPanel]);

  /**
   * Handle successful image generation
   * Requirements: 1.5, 10.5
   */
  const handleSuccess = (message: string) => {
    toast.success(message, {
      duration: 3000,
    });
  };

  /**
   * Handle image generation errors
   * Requirements: 1.5, 10.5
   * Note: Errors are now shown in image placeholders instead of toasts
   */
  const handleError = (_error: string) => {
    // Errors are now handled by showing them in image placeholders
    // This function is kept for compatibility but no longer shows toasts
  };

  /**
   * Handle image deletion
   * Requirements: 4.2
   */
  const handleImageDelete = async (id: string) => {
    deleteImage(id);
    toast.success('Image deleted', {
      duration: 2000,
    });
  };



  /**
   * Handle image edit
   * Sets the selected image as edit source and scrolls to prompt input
   * Requirements: 5.2
   */
  const handleImageEdit = async (image: any) => {
    // Load the image URL if not already available
    let imageUrl = image.url;
    if (!imageUrl) {
      const { loadImageData } = useImageStore.getState();
      imageUrl = await loadImageData(image.id);
    }

    // Only set edit source if we have a valid URL
    if (imageUrl) {
      setEditSource({
        id: image.id,
        url: imageUrl,
        aspectRatio: image.aspectRatio,
        width: image.width,
        height: image.height,
      });

      // Scroll to prompt input area
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });

      toast.info('Image set as edit source', {
        duration: 2000,
      });
    } else {
      toast.error('Failed to load image for editing', {
        duration: 3000,
      });
    }
  };

  // Show loading state while initializing
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Demo route - standalone */}
        <Route path="/demo" element={<MagicalEffectsDemo />} />

        {/* Word Reveal Demo */}
        <Route path="/word-reveal" element={<WordRevealDemo />} />





        {/* Main app layout */}
        <Route path="/*" element={
          <div className="min-h-screen bg-background flex">
            {/* Left Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 ml-16 flex flex-col">
              {/* Fixed Prompt Input Area */}
              <section
                aria-label="Image generation controls"
                className="fixed top-0 left-16 right-0 z-40"
              >
                <PromptInputArea
                  bedrockService={bedrockService}
                  onSuccess={handleSuccess}
                  onError={handleError}
                  onActiveRequestsChange={setActiveRequests}
                />
              </section>

              {/* Scrollable Gallery */}
              <main className="flex-1 overflow-y-auto">
                <section aria-label="Generated images gallery" className="px-4 pt-40 pb-8">
                  <SimpleVirtualizedGallery
                    onImageDelete={handleImageDelete}
                    onTextDelete={() => { }} // No-op since we no longer use text items
                    onImageEdit={handleImageEdit}
                  />
                </section>
              </main>

              {/* Generating Status - Fixed at bottom */}
              <GeneratingStatus activeRequests={activeRequests} />
            </div>

            {/* Debug Counter - Fixed at top right */}
            <DebugCounter />

            {/* Nested routes for lightbox */}
            <Routes>
              <Route path="/image/:imageId" element={<Lightbox />} />
            </Routes>
          </div>
        } />
      </Routes>
    </Router>
  );
}

/**
 * Main App component
 * Sets up the application with all necessary providers and error boundaries
 * Requirements: 9.4, 9.5, 1.1, 1.4, 1.6
 */
function App() {
  const bedrockService = createBedrockService();

  useEffect(() => {
    // Initialize application
  }, []);

  // Check if Amplify backend is configured by checking if we have auth config
  const [isAmplifyConfigured, setIsAmplifyConfigured] = useState(false);

  useEffect(() => {
    // Check if Amplify is configured by trying to get the current config
    try {
      const config = (window as any).amplifyConfig || {};
      setIsAmplifyConfigured(config.auth && Object.keys(config.auth).length > 0);
    } catch {
      setIsAmplifyConfigured(false);
    }
  }, []);

  // Render without authentication if backend is not configured
  if (!isAmplifyConfigured) {
    return (
      <ErrorBoundary>
        <ThemeProvider>
          <BedrockServiceProvider service={bedrockService}>
            <div className="min-h-screen bg-background">
              {/* Development mode banner */}
              <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-yellow-500/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-yellow-500/20">
                <span className="text-sm text-yellow-600 dark:text-yellow-400">
                  🚧 Frontend-only mode (Backend not configured)
                </span>
              </div>

              <AppContent />
            </div>
            <Toaster />
          </BedrockServiceProvider>
        </ThemeProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AmplifyThemeProvider theme={authenticatorTheme}>
          <Authenticator
            formFields={authenticatorFormFields}
            components={authenticatorComponents}
            hideSignUp={true}
          >
            {({ signOut, user }) => (
              <AuthProvider value={{ signOut, userEmail: user?.signInDetails?.loginId }}>
              <BedrockServiceProvider service={bedrockService}>
                <div className="min-h-screen bg-background">
                  <AppContent />
                </div>
                <Toaster />
              </BedrockServiceProvider>
              </AuthProvider>
            )}
          </Authenticator>
        </AmplifyThemeProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
