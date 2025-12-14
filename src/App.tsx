import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PromptInputArea, GeneratingStatus, Sidebar } from '@/components';
import { SimpleVirtualizedGallery } from '@/components/SimpleVirtualizedGallery';
import { Lightbox } from '@/components/Lightbox';
import { MagicalEffectsDemo } from '@/components/MagicalEffectsDemo';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider } from '@/components/ThemeProvider';
import { BedrockServiceProvider, useBedrockService } from '@/contexts/BedrockServiceContext';
import { BedrockImageService } from '@/services/BedrockImageService';
import { useImageStore } from '@/stores/imageStore';
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
    },
    systemPrompt: 'If you respond with text instead of an image, ignore any aspect ratio details the user may have included at the end of their prompt. Respond based on the other content of their message.',
  });
}

/**
 * Main application content component
 * Separated from App to allow access to BedrockService context
 */
function AppContent() {
  const bedrockService = useBedrockService();
  const { deleteImage, deleteTextItem, setEditSource, initialize, isLoading } = useImageStore();

  const [activeRequests, setActiveRequests] = useState(0);

  // Initialize the store
  useEffect(() => {
    initialize();
  }, [initialize]);

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
  const handleError = (error: string) => {
    // Errors are now handled by showing them in image placeholders
    // This function is kept for compatibility but no longer shows toasts
    console.log('Error handled in placeholder:', error);
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
   * Handle text item deletion
   */
  const handleTextDelete = async (id: string) => {
    deleteTextItem(id);
    toast.success('Text deleted', {
      duration: 2000,
    });
  };

  /**
   * Handle image edit
   * Sets the selected image as edit source and scrolls to prompt input
   * Requirements: 5.2
   */
  const handleImageEdit = (image: any) => {
    setEditSource({
      id: image.id,
      url: image.url,
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
                <section aria-label="Generated images gallery" className="px-4 pt-32 pb-8">
                  <SimpleVirtualizedGallery
                    onImageDelete={handleImageDelete}
                    onTextDelete={handleTextDelete}
                    onImageEdit={handleImageEdit}
                  />
                </section>
              </main>

              {/* Generating Status - Fixed at bottom */}
              <GeneratingStatus activeRequests={activeRequests} />
            </div>

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
 * Requirements: 9.4, 9.5
 */
function App() {
  const bedrockService = createBedrockService();

  useEffect(() => {
    // Log initialization
    console.log('AI Image Generator initialized');
    console.log('AWS Region:', import.meta.env.VITE_AWS_REGION || 'us-east-1');
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BedrockServiceProvider service={bedrockService}>
          <AppContent />
          <Toaster />
        </BedrockServiceProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
