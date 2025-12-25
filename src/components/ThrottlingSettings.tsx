import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap } from 'lucide-react';
import { useThrottlingStore } from '@/stores/throttlingStore';
import type { ModelThrottleConfig } from '@/types/throttling';

/**
 * ThrottlingSettings Component
 * 
 * Provides UI for configuring Bedrock API request throttling settings.
 * Action buttons are handled by the parent SettingsModal.
 */
interface ThrottlingSettingsProps {
    onHasUnsavedChanges?: (hasChanges: boolean) => void;
}

export interface ThrottlingSettingsRef {
    save: () => void;
    reset: () => void;
    discard: () => void;
    hasUnsavedChanges: boolean;
}

export const ThrottlingSettings = forwardRef<ThrottlingSettingsRef, ThrottlingSettingsProps>(
    ({ onHasUnsavedChanges }, ref) => {
        const {
            config,
            updateModelConfig,
            resetToDefaults,
        } = useThrottlingStore();

        const [localConfigs, setLocalConfigs] = useState<Record<string, ModelThrottleConfig>>({});
        const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

        // Initialize local configs from store
        useEffect(() => {
            setLocalConfigs({ ...config.models });
            setHasUnsavedChanges(false);
        }, [config.models]);

        // Notify parent of unsaved changes
        useEffect(() => {
            onHasUnsavedChanges?.(hasUnsavedChanges);
        }, [hasUnsavedChanges, onHasUnsavedChanges]);

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

        // Expose functions to parent via ref
        useImperativeHandle(ref, () => ({
            save: handleSave,
            reset: handleReset,
            discard: handleDiscard,
            hasUnsavedChanges,
        }));

        // Format model name for display
        const formatModelName = (modelId: string): string => {
            if (modelId.includes('nova-2-omni')) return 'Nova 2 Omni';
            if (modelId.includes('nova-2-lite')) return 'Nova 2 Lite';
            return modelId.split(':')[0].split('.').pop() || modelId;
        };

        const getModelUseDescription = (modelId: string): string => {
            if (modelId.includes("amazon.nova-2-omni")) return "Used for prompt enhancment and image generation"
            if (modelId.includes("amazon.nova-2-lite")) return "Used for persona auto-fill"
            return "Not currently used."
        }

        return (
            <div className="flex flex-col gap-4">
                {Object.entries(localConfigs).map(([modelId, modelConfig]) => {
                    return (
                        <div key={modelId} className="flex gap-4 w-full">
                            <div className="flex-1">
                                <h4 className="font-medium">{formatModelName(modelId)}</h4>
                                <p className="text-xs text-muted-foreground">{getModelUseDescription(modelId)}</p>
                            </div>

                            <div className="flex flex-col items-center gap-2">
                                <Input
                                    id={`${modelId}-rate`}
                                    type="number"
                                    min="1"
                                    max="200"
                                    value={modelConfig.maxRequestsPerMinute}
                                    onChange={(e) =>
                                        handleModelConfigChange(
                                            modelId,
                                            'maxRequestsPerMinute',
                                            parseInt(e.target.value) || 1
                                        )
                                    }
                                    className="w-25"
                                />
                                <Label htmlFor={`${modelId}-rate`} className="min-w-fit text-white/50 special-gothic-label">
                                    Requests per min
                                </Label>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }
);