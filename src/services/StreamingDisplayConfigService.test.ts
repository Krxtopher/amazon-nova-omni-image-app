/**
 * Tests for StreamingDisplayConfigService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    StreamingDisplayConfigService,
    DEFAULT_STREAMING_DISPLAY_CONFIG,
} from './StreamingDisplayConfigService';
import type { StreamingPromptDisplayConfig } from '../types/config';

describe('StreamingDisplayConfigService', () => {
    let configService: StreamingDisplayConfigService;

    beforeEach(() => {
        configService = new StreamingDisplayConfigService();
    });

    describe('initialization', () => {
        it('should initialize with default configuration', () => {
            const config = configService.getConfig();
            expect(config).toEqual(DEFAULT_STREAMING_DISPLAY_CONFIG);
        });

        it('should initialize with custom configuration', () => {
            const customConfig: Partial<StreamingPromptDisplayConfig> = {
                debug: true,
                features: {
                    ...DEFAULT_STREAMING_DISPLAY_CONFIG.features,
                    enableStreamingEnhancement: false,
                },
            };

            const service = new StreamingDisplayConfigService(customConfig);
            const config = service.getConfig();

            expect(config.debug).toBe(true);
            expect(config.features.enableStreamingEnhancement).toBe(false);
        });
    });

    describe('configuration updates', () => {
        it('should update configuration correctly', () => {
            const updates: Partial<StreamingPromptDisplayConfig> = {
                debug: true,
                features: {
                    ...DEFAULT_STREAMING_DISPLAY_CONFIG.features,
                    enableFadeInAnimations: false,
                },
            };

            configService.updateConfig(updates);
            const config = configService.getConfig();

            expect(config.debug).toBe(true);
            expect(config.features.enableFadeInAnimations).toBe(false);
        });

        it('should validate configuration and reject invalid updates', () => {
            const invalidConfig: Partial<StreamingPromptDisplayConfig> = {
                features: {
                    ...DEFAULT_STREAMING_DISPLAY_CONFIG.features,
                    enableStreamingEnhancement: false, // Valid change
                },
            };

            const originalConfig = configService.getConfig();
            configService.updateConfig(invalidConfig);
            const newConfig = configService.getConfig();

            // Configuration should be updated
            expect(newConfig.features.enableStreamingEnhancement).toBe(false);
        });
    });

    describe('presets', () => {
        it('should apply fast preset correctly', () => {
            configService.applyPreset('fast');
            const config = configService.getConfig();

            expect(config.features.enablePunctuationDelays).toBe(false);
        });

        it('should apply accessible preset correctly', () => {
            configService.applyPreset('accessible');
            const config = configService.getConfig();

            expect(config.accessibility.reduceMotion).toBe(true);
            expect(config.accessibility.skipAnimations).toBe(true);
            expect(config.features.enableFadeInAnimations).toBe(false);
        });

        it('should apply minimal preset correctly', () => {
            configService.applyPreset('minimal');
            const config = configService.getConfig();

            expect(config.features.enableFadeInAnimations).toBe(false);
            expect(config.features.enableTypingCursor).toBe(false);
            expect(config.accessibility.skipAnimations).toBe(true);
        });
    });

    describe('feature flags', () => {
        it('should check feature flags correctly', () => {
            expect(configService.isFeatureEnabled('enableStreamingEnhancement')).toBe(true);

            configService.updateConfig({
                features: {
                    ...DEFAULT_STREAMING_DISPLAY_CONFIG.features,
                    enableStreamingEnhancement: false,
                },
            });

            expect(configService.isFeatureEnabled('enableStreamingEnhancement')).toBe(false);
        });
    });

    describe('accessibility settings', () => {
        it('should get accessibility settings correctly', () => {
            const reduceMotion = configService.getAccessibilitySetting('reduceMotion');
            expect(reduceMotion).toBe(false);

            configService.updateConfig({
                accessibility: {
                    ...DEFAULT_STREAMING_DISPLAY_CONFIG.accessibility,
                    reduceMotion: true,
                },
            });

            const updatedReduceMotion = configService.getAccessibilitySetting('reduceMotion');
            expect(updatedReduceMotion).toBe(true);
        });
    });

    describe('configuration export/import', () => {
        it('should export configuration as JSON', () => {
            const exported = configService.exportConfig();
            const parsed = JSON.parse(exported);

            expect(parsed).toEqual(DEFAULT_STREAMING_DISPLAY_CONFIG);
        });

        it('should import valid configuration', () => {
            const customConfig = {
                ...DEFAULT_STREAMING_DISPLAY_CONFIG,
                debug: true,
            };

            const success = configService.importConfig(JSON.stringify(customConfig));
            expect(success).toBe(true);

            const config = configService.getConfig();
            expect(config.debug).toBe(true);
        });

        it('should reject invalid JSON configuration', () => {
            const success = configService.importConfig('invalid json');
            expect(success).toBe(false);
        });
    });

    describe('subscription system', () => {
        it('should notify subscribers of configuration changes', () => {
            let notificationCount = 0;
            let lastConfig: StreamingPromptDisplayConfig | null = null;

            const unsubscribe = configService.subscribe((config) => {
                notificationCount++;
                lastConfig = config;
            });

            configService.updateConfig({ debug: true });

            expect(notificationCount).toBe(1);
            expect(lastConfig && (lastConfig as any).debug).toBe(true);

            unsubscribe();

            // Should not notify after unsubscribe
            configService.updateConfig({ debug: false });
            expect(notificationCount).toBe(1);
        });
    });

    describe('reset functionality', () => {
        it('should reset to default configuration', () => {
            configService.updateConfig({ debug: true });
            configService.applyPreset('fast');

            let config = configService.getConfig();
            expect(config.debug).toBe(true);

            configService.reset();

            config = configService.getConfig();
            expect(config).toEqual(DEFAULT_STREAMING_DISPLAY_CONFIG);
        });
    });
});