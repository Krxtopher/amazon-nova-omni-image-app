import React from 'react';
import { useImageStore } from '@/stores/imageStore';
import { useUIStore } from '@/stores/uiStore';
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';

/**
 * Debug counter component to display image loading statistics and throttling info
 * Helps debug infinite scroll, loading behavior, and API throttling
 */
export const DebugCounter = React.memo(function DebugCounter() {
    const loadedImageCount = useImageStore(state => state.loadedImageCount);
    const totalImageCount = useImageStore(state => state.totalImageCount);
    const hasMoreImages = useImageStore(state => state.hasMoreImages);
    const isLoadingMore = useImageStore(state => state.isLoadingMore);
    const images = useImageStore(state => state.images);

    const { showDebugPanel } = useUIStore();

    // Don't render if debug panel is disabled
    if (!showDebugPanel) {
        return null;
    }

    return (
        <div className="fixed top-4 right-4 z-50 bg-background/90 backdrop-blur-sm border rounded-lg p-3 shadow-lg max-w-sm">
            <div className="text-sm font-mono space-y-1">
                <div className="font-semibold text-primary">Debug Info</div>

                {/* Image Loading Stats */}
                <div className="space-y-1">
                    <div>
                        Loaded: <span className="font-bold text-green-600">{loadedImageCount}</span>
                    </div>
                    <div>
                        In Memory: <span className="text-blue-600">{images.length}</span>
                    </div>
                    <div>
                        Total in DB: <span className="text-purple-600">{totalImageCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${hasMoreImages ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-xs">
                            {hasMoreImages ? 'Has More' : 'No More'}
                        </span>
                    </div>
                    {isLoadingMore && (
                        <div className="text-xs text-yellow-600 animate-pulse">
                            Loading...
                        </div>
                    )}
                </div>

                {/* Throttling Stats - Disabled */}
                <div className="border-t pt-2 mt-2">
                    <div className="font-semibold text-primary flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        Throttling
                    </div>

                    {/* Overall Status */}
                    <div className="flex items-center gap-2 mt-1">
                        <Badge
                            variant="secondary"
                            className="text-xs px-1 py-0"
                        >
                            DISABLED
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                            Direct API calls
                        </span>
                    </div>

                    <div className="text-xs text-muted-foreground mt-1">
                        Throttling has been removed from the app
                    </div>
                </div>

                <div className="text-xs text-gray-500 pt-1 border-t">
                    Viewport loading: ON
                </div>
            </div>
        </div>
    );
});

export default DebugCounter;