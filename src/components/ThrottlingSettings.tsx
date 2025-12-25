import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Clock, Zap, RotateCcw } from 'lucide-react';
import { useThrottlingStore } from '@/stores/throttlingStore';
import type { ModelThrottleConfig } from '@/types/throttling';

/**
 * ThrottlingSettings Component
 * 
 * Provides UI for configuring Bedrock API request throttling settings.
 * Allows users to set per-model rate limits and view real-time statistics.
 */
export function ThrottlingSettings() {
    const {
        config,
        stats,
        updateModelConfig,
        setGlobalEnabled,
        refreshStats,
        resetToDefaults,
    } = useThrottlingStore();

    const [localConfigs, setLocalConfigs] = useState<Record<string, ModelThrottleConfig>>({});
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Initialize local configs from store
    useEffect(() => {
        setLocalConfigs({ ...config.models });
        setHasUnsavedChanges(false);
    }, [config.models]);

    // Refresh stats periodically
    useEffect(() => {
        const interval = setInterval(refreshStats, 1000);
        return () => clearInterval(interval);
    }, [refreshStats]);

    // Handle model config changes
    const handleModelConfigChange = (modelId: string, field: keyof ModelThrottleConfig, value: any) => {
        setLocalConfigs(prev => ({
            ...prev,
            [modelId]: {
                ...prev[modelId],
                [field]: value,
            },
        }));
        setHasUnsavedChanges(true);
    };

    // Save changes
    const handleSave = () => {
        Object.entries(localConfigs).forEach(([modelId, modelConfig]) => {
            updateModelConfig(modelId, modelConfig);
        });
        setHasUnsavedChanges(false);
    };

    // Reset to defaults
    const handleReset = () => {
        resetToDefaults();
        setHasUnsavedChanges(false);
    };

    // Discard changes
    const handleDiscard = () => {
        setLocalConfigs({ ...config.models });
        setHasUnsavedChanges(false);
    };

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
        <div className="space-y-6">
            {/* Global Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Request Throttling
                    </CardTitle>
                    <CardDescription>
                        Control the rate of requests sent to Bedrock models to avoid throttling errors.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="global-throttling"
                            checked={config.globalEnabled}
                            onCheckedChange={setGlobalEnabled}
                        />
                        <Label htmlFor="global-throttling">
                            Enable request throttling
                        </Label>
                    </div>
                    {!config.globalEnabled && (
                        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                                <AlertCircle className="h-4 w-4" />
                                <span className="text-sm">
                                    Throttling is disabled. You may encounter rate limit errors.
                                </span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Model-Specific Settings */}
            <Card>
                <CardHeader>
                    <CardTitle>Model Rate Limits</CardTitle>
                    <CardDescription>
                        Configure maximum requests per minute for each model.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {Object.entries(localConfigs).map(([modelId, modelConfig]) => {
                        const modelStats = stats?.models[modelId];
                        const isThrottling = modelStats?.isThrottling || false;

                        return (
                            <div key={modelId} className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium">{formatModelName(modelId)}</h4>
                                        <p className="text-sm text-muted-foreground">{modelId}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isThrottling && (
                                            <Badge variant="destructive" className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                Throttling
                                            </Badge>
                                        )}
                                        {modelStats && !isThrottling && (
                                            <Badge variant="secondary">
                                                Active
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor={`${modelId}-enabled`}>
                                            Enable throttling for this model
                                        </Label>
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                id={`${modelId}-enabled`}
                                                checked={modelConfig.enabled}
                                                onCheckedChange={(checked: boolean) =>
                                                    handleModelConfigChange(modelId, 'enabled', checked)
                                                }
                                                disabled={!config.globalEnabled}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor={`${modelId}-rate`}>
                                            Max requests per minute
                                        </Label>
                                        <Input
                                            id={`${modelId}-rate`}
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={modelConfig.maxRequestsPerMinute}
                                            onChange={(e) =>
                                                handleModelConfigChange(
                                                    modelId,
                                                    'maxRequestsPerMinute',
                                                    parseInt(e.target.value) || 1
                                                )
                                            }
                                            disabled={!config.globalEnabled || !modelConfig.enabled}
                                        />
                                    </div>
                                </div>

                                {/* Real-time Stats */}
                                {modelStats && config.globalEnabled && modelConfig.enabled && (
                                    <div className="p-3 bg-muted/50 rounded-md">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <span className="text-muted-foreground">Queued:</span>
                                                <span className="ml-2 font-medium">
                                                    {modelStats.queuedRequests}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">This minute:</span>
                                                <span className="ml-2 font-medium">
                                                    {modelStats.requestsThisMinute}/{modelStats.maxRequestsPerMinute}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Status:</span>
                                                <span className={`ml-2 font-medium ${isThrottling ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                                                    }`}>
                                                    {isThrottling ? 'Throttling' : 'Available'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Next slot:</span>
                                                <span className="ml-2 font-medium">
                                                    {formatNextAvailable(modelStats.nextAvailableSlot)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <Separator />
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
                <Button
                    variant="outline"
                    onClick={handleReset}
                    className="flex items-center gap-2"
                >
                    <RotateCcw className="h-4 w-4" />
                    Reset to Defaults
                </Button>

                <div className="flex items-center gap-2">
                    {hasUnsavedChanges && (
                        <Button
                            variant="ghost"
                            onClick={handleDiscard}
                        >
                            Discard Changes
                        </Button>
                    )}
                    <Button
                        onClick={handleSave}
                        disabled={!hasUnsavedChanges}
                    >
                        Save Changes
                    </Button>
                </div>
            </div>

            {/* Overall Stats */}
            {stats && config.globalEnabled && (
                <Card>
                    <CardHeader>
                        <CardTitle>System Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-muted/50 rounded-md">
                                <div className="text-2xl font-bold">
                                    {stats.totalQueuedRequests}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Total Queued Requests
                                </div>
                            </div>
                            <div className="text-center p-4 bg-muted/50 rounded-md">
                                <div className={`text-2xl font-bold ${stats.isAnyModelThrottling
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-green-600 dark:text-green-400'
                                    }`}>
                                    {stats.isAnyModelThrottling ? 'THROTTLING' : 'ACTIVE'}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    System Status
                                </div>
                            </div>
                            <div className="text-center p-4 bg-muted/50 rounded-md">
                                <div className="text-2xl font-bold">
                                    {Object.keys(stats.models).length}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Configured Models
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}