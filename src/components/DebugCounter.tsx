import React from 'react';
import { useImageStore } from '@/stores/imageStore';
import { useThrottlingStore } from '@/stores/throttlingStore';
import { useUIStore } from '@/stores/uiStore';
import { Badge } from '@/components/ui/badge';
import { Clock, Zap } from 'lucide-react';

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
    const { config, stats } = useThrottlingStore();

    // Don't render if debug panel is disabled
    if (!showDebugPanel) {
        return null;
    }

    // Format model name for display
    const formatModelName = (modelId: string): string => {
        if (modelId.includes('nova-2-omni')) return 'Nova 2 Omni';
        if (modelId.includes('nova-2-lite')) return 'Nova 2 Lite';
        return modelId.split(':')[0].split('.').pop() || modelId;
    };

    // Format next available time
    const formatNextAvailable = (timestamp?: number): string => {
        if (!timestamp) return 'Now';
        const diff = timestamp - Date.now();
        if (diff <= 0) return 'Now';
        return `${Math.ceil(diff / 1000)}s`;
    };

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

                {/* Throttling Stats */}
                {config.globalEnabled && stats && (
                    <>
                        <div className="border-t pt-2 mt-2">
                            <div className="font-semibold text-primary flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                Throttling
                            </div>

                            {/* Overall Status */}
                            <div className="flex items-center gap-2 mt-1">
                                <Badge
                                    variant={stats.isAnyModelThrottling ? "destructive" : "secondary"}
                                    className="text-xs px-1 py-0"
                                >
                                    {stats.isAnyModelThrottling ? 'THROTTLING' : 'ACTIVE'}
                                </Badge>
                                <span className="text-xs">
                                    Queue: {stats.totalQueuedRequests}
                                </span>
                            </div>

                            {/* Per-Model Stats */}
                            <div className="space-y-1 mt-2">
                                {Object.entries(stats.models).map(([modelId, modelStats]) => {
                                    const isThrottling = modelStats.isThrottling;
                                    const modelConfig = config.models[modelId];

                                    if (!modelConfig?.enabled) return null;

                                    return (
                                        <div key={modelId} className="text-xs">
                                            <div className="flex items-center justify-between">
                                                <span className="truncate max-w-20">
                                                    {formatModelName(modelId)}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    {isThrottling && (
                                                        <Clock className="h-2 w-2 text-red-500" />
                                                    )}
                                                    <span className={isThrottling ? 'text-red-500' : 'text-green-500'}>
                                                        {modelStats.requestsThisMinute}/{modelStats.maxRequestsPerMinute}
                                                    </span>
                                                </div>
                                            </div>
                                            {modelStats.queuedRequests > 0 && (
                                                <div className="text-yellow-600">
                                                    Queued: {modelStats.queuedRequests}
                                                </div>
                                            )}
                                            {isThrottling && (
                                                <div className="text-red-500">
                                                    Next: {formatNextAvailable(modelStats.nextAvailableSlot)}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

                <div className="text-xs text-gray-500 pt-1 border-t">
                    Viewport loading: ON
                </div>
            </div>
        </div>
    );
});

export default DebugCounter;