/**
 * Feature Configuration Panel
 * 
 * Provides a UI for managing streaming prompt enhancement feature flags
 * and monitoring adoption metrics.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Settings, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { featureRolloutManager, FEATURE_ROLLOUT_CONFIGS, type FeatureRolloutConfig } from '../config/featureRollout';
import { featureAdoptionMonitoring, type FeatureStatistics } from '../services/FeatureAdoptionMonitoringService';
import { useStreamingDisplayConfig } from '../contexts/StreamingDisplayConfigContext';

interface FeatureConfigPanelProps {
    className?: string;
}

/**
 * Feature configuration and monitoring panel
 */
export function FeatureConfigPanel({ className = '' }: FeatureConfigPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [statistics, setStatistics] = useState<FeatureStatistics[]>([]);
    const [configs, setConfigs] = useState<Record<string, FeatureRolloutConfig>>(FEATURE_ROLLOUT_CONFIGS);
    const { config: streamingConfig, updateConfig, applyPreset } = useStreamingDisplayConfig();

    // Refresh statistics periodically
    useEffect(() => {
        if (isOpen) {
            const refreshStats = () => {
                const stats = featureAdoptionMonitoring.getAllFeatureStatistics(60);
                setStatistics(stats);
            };

            refreshStats();
            const interval = setInterval(refreshStats, 30000); // Every 30 seconds

            return () => clearInterval(interval);
        }
    }, [isOpen]);

    const handleFeatureToggle = (featureId: string, enabled: boolean) => {
        featureRolloutManager.updateFeatureConfig(featureId, { enabled });
        setConfigs({ ...configs, [featureId]: { ...configs[featureId], enabled } });
    };

    const handleRolloutPercentageChange = (featureId: string, percentage: number) => {
        featureRolloutManager.updateFeatureConfig(featureId, { rolloutPercentage: percentage });
        setConfigs({ ...configs, [featureId]: { ...configs[featureId], rolloutPercentage: percentage } });
    };

    const getStatusIcon = (stats: FeatureStatistics) => {
        if (stats.errorRate > 5) {
            return <AlertTriangle className="h-4 w-4 text-red-500" />;
        } else if (stats.adoptionRate > 80) {
            return <CheckCircle className="h-4 w-4 text-green-500" />;
        } else {
            return <TrendingUp className="h-4 w-4 text-yellow-500" />;
        }
    };

    const getFeatureStats = (featureId: string): FeatureStatistics | undefined => {
        return statistics.find(s => s.featureId === featureId);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${className}`}
                    title="Feature Configuration"
                >
                    <Settings className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Streaming Prompt Enhancement Configuration</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Migration Phase Status */}
                    <div className="bg-muted/50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">Migration Status</h3>
                        <p className="text-sm text-muted-foreground">
                            Current Phase: <span className="font-medium">{featureRolloutManager.getCurrentPhase()}</span>
                        </p>
                    </div>

                    {/* Quick Presets */}
                    <div>
                        <h3 className="font-semibold mb-3">Quick Presets</h3>
                        <div className="flex gap-2 flex-wrap">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => applyPreset('default')}
                            >
                                Default
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => applyPreset('fast')}
                            >
                                Fast
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => applyPreset('accessible')}
                            >
                                Accessible
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => applyPreset('minimal')}
                            >
                                Minimal
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => applyPreset('performance')}
                            >
                                Performance
                            </Button>
                        </div>
                    </div>

                    {/* Feature Flags */}
                    <div>
                        <h3 className="font-semibold mb-3">Feature Flags</h3>
                        <div className="grid gap-4">
                            {Object.entries(configs).map(([featureId, config]) => {
                                const stats = getFeatureStats(featureId);
                                return (
                                    <div key={featureId} className="border rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Label className="font-medium capitalize">
                                                    {featureId.replace(/-/g, ' ')}
                                                </Label>
                                                {stats && getStatusIcon(stats)}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Label className="text-sm text-muted-foreground">
                                                    {config.rolloutPercentage}%
                                                </Label>
                                                <input
                                                    type="checkbox"
                                                    checked={config.enabled}
                                                    onChange={(e) => handleFeatureToggle(featureId, e.target.checked)}
                                                    className="rounded"
                                                />
                                            </div>
                                        </div>

                                        {/* Rollout Percentage Slider */}
                                        <div className="mb-2">
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                step="5"
                                                value={config.rolloutPercentage}
                                                onChange={(e) => handleRolloutPercentageChange(featureId, parseInt(e.target.value))}
                                                className="w-full"
                                                disabled={!config.enabled}
                                            />
                                        </div>

                                        {/* Statistics */}
                                        {stats && (
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                                                <div>
                                                    <span className="font-medium">Users:</span> {stats.uniqueUsers}
                                                </div>
                                                <div>
                                                    <span className="font-medium">Adoption:</span> {stats.adoptionRate.toFixed(1)}%
                                                </div>
                                                <div>
                                                    <span className="font-medium">Errors:</span> {stats.errorRate.toFixed(1)}%
                                                </div>
                                                <div>
                                                    <span className="font-medium">Perf:</span> {stats.averagePerformance.toFixed(0)}ms
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Streaming Display Configuration */}
                    <div>
                        <h3 className="font-semibold mb-3">Display Configuration</h3>
                        <div className="grid gap-4">
                            <div className="border rounded-lg p-4">
                                <h4 className="font-medium mb-2">Accessibility</h4>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={streamingConfig.accessibility.reduceMotion}
                                            onChange={(e) => updateConfig({
                                                accessibility: {
                                                    ...streamingConfig.accessibility,
                                                    reduceMotion: e.target.checked
                                                }
                                            })}
                                        />
                                        <span className="text-sm">Reduce Motion</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={streamingConfig.accessibility.skipAnimations}
                                            onChange={(e) => updateConfig({
                                                accessibility: {
                                                    ...streamingConfig.accessibility,
                                                    skipAnimations: e.target.checked
                                                }
                                            })}
                                        />
                                        <span className="text-sm">Skip Animations</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={streamingConfig.accessibility.enableScreenReaderAnnouncements}
                                            onChange={(e) => updateConfig({
                                                accessibility: {
                                                    ...streamingConfig.accessibility,
                                                    enableScreenReaderAnnouncements: e.target.checked
                                                }
                                            })}
                                        />
                                        <span className="text-sm">Screen Reader Announcements</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary Statistics */}
                    {statistics.length > 0 && (
                        <div>
                            <h3 className="font-semibold mb-3">System Overview</h3>
                            <div className="bg-muted/50 p-4 rounded-lg">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <div className="font-medium">Total Features</div>
                                        <div className="text-2xl font-bold">{statistics.length}</div>
                                    </div>
                                    <div>
                                        <div className="font-medium">Active Users</div>
                                        <div className="text-2xl font-bold">
                                            {statistics.reduce((sum, s) => sum + s.uniqueUsers, 0)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-medium">Avg Error Rate</div>
                                        <div className="text-2xl font-bold">
                                            {statistics.length > 0
                                                ? (statistics.reduce((sum, s) => sum + s.errorRate, 0) / statistics.length).toFixed(1)
                                                : '0'
                                            }%
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-medium">Avg Performance</div>
                                        <div className="text-2xl font-bold">
                                            {statistics.length > 0
                                                ? Math.round(statistics.reduce((sum, s) => sum + s.averagePerformance, 0) / statistics.length)
                                                : '0'
                                            }ms
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}