import React from 'react';
import { useImageStore } from '@/stores/imageStore';

/**
 * Debug counter component to display image loading statistics
 * Helps debug infinite scroll and loading behavior
 */
export const DebugCounter = React.memo(function DebugCounter() {
    const loadedImageCount = useImageStore(state => state.loadedImageCount);
    const totalImageCount = useImageStore(state => state.totalImageCount);
    const hasMoreImages = useImageStore(state => state.hasMoreImages);
    const isLoadingMore = useImageStore(state => state.isLoadingMore);
    const images = useImageStore(state => state.images);

    return (
        <div className="fixed top-4 right-4 z-50 bg-background/90 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
            <div className="text-sm font-mono space-y-1">
                <div className="font-semibold text-primary">Debug Info</div>
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
                <div className="text-xs text-gray-500 pt-1 border-t">
                    Viewport opt: OFF
                </div>
            </div>
        </div>
    );
});

export default DebugCounter;