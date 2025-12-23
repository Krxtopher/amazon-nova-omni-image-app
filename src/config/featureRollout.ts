/**
 * Feature Rollout Configuration for Streaming Prompt Enhancement
 * 
 * This module manages the gradual rollout of streaming prompt enhancement features
 * with monitoring, error tracking, and rollback capabilities.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

export interface FeatureRolloutConfig {
    /** Feature identifier */
    featureId: string;

    /** Rollout percentage (0-100) */
    rolloutPercentage: number;

    /** Whether the feature is enabled globally */
    enabled: boolean;

    /** User segments to include/exclude */
    userSegments?: {
        include?: string[];
        exclude?: string[];
    };

    /** A/B test configuration */
    abTest?: {
        enabled: boolean;
        variants: {
            control: number; // percentage
            treatment: number; // percentage
        };
    };

    /** Monitoring configuration */
    monitoring: {
        errorThreshold: number; // percentage
        performanceThreshold: number; // ms
        adoptionTarget: number; // percentage
    };

    /** Rollback configuration */
    rollback: {
        enabled: boolean;
        triggers: {
            errorRate?: number;
            performanceRegression?: number;
            userFeedback?: number;
        };
    };
}

/**
 * Default feature rollout configurations
 */
export const FEATURE_ROLLOUT_CONFIGS: Record<string, FeatureRolloutConfig> = {
    streamingEnhancement: {
        featureId: 'streaming-enhancement',
        rolloutPercentage: 100, // Fully rolled out since implementation is complete
        enabled: true,
        monitoring: {
            errorThreshold: 5, // 5% error rate threshold
            performanceThreshold: 2000, // 2 second threshold
            adoptionTarget: 80 // 80% adoption target
        },
        rollback: {
            enabled: true,
            triggers: {
                errorRate: 10, // Rollback if error rate exceeds 10%
                performanceRegression: 50, // Rollback if performance degrades by 50%
                userFeedback: 20 // Rollback if negative feedback exceeds 20%
            }
        }
    },

    wordByWordDisplay: {
        featureId: 'word-by-word-display',
        rolloutPercentage: 100, // Fully rolled out
        enabled: true,
        monitoring: {
            errorThreshold: 3,
            performanceThreshold: 1000,
            adoptionTarget: 90
        },
        rollback: {
            enabled: true,
            triggers: {
                errorRate: 8,
                performanceRegression: 30,
                userFeedback: 15
            }
        }
    },

    fadeInAnimations: {
        featureId: 'fade-in-animations',
        rolloutPercentage: 100, // Fully rolled out
        enabled: true,
        userSegments: {
            exclude: ['reduced-motion'] // Exclude users who prefer reduced motion
        },
        monitoring: {
            errorThreshold: 2,
            performanceThreshold: 500,
            adoptionTarget: 85
        },
        rollback: {
            enabled: true,
            triggers: {
                errorRate: 5,
                performanceRegression: 25
            }
        }
    },

    typingCursor: {
        featureId: 'typing-cursor',
        rolloutPercentage: 100, // Fully rolled out
        enabled: true,
        monitoring: {
            errorThreshold: 1,
            performanceThreshold: 100,
            adoptionTarget: 75
        },
        rollback: {
            enabled: false, // Low risk feature
            triggers: {}
        }
    }
};

/**
 * Migration phases for streaming prompt enhancement rollout
 */
export const MigrationPhase = {
    /** Phase 0: Legacy implementation only */
    LEGACY_ONLY: 'legacy-only' as const,

    /** Phase 1: Streaming service available alongside legacy */
    STREAMING_SERVICE_AVAILABLE: 'streaming-service-available' as const,

    /** Phase 2: Word-by-word display with feature flag */
    WORD_DISPLAY_FLAGGED: 'word-display-flagged' as const,

    /** Phase 3: Integrated into ImageCard with gradual rollout */
    IMAGECARD_INTEGRATED: 'imagecard-integrated' as const,

    /** Phase 4: Default enabled with fallback */
    DEFAULT_ENABLED: 'default-enabled' as const,

    /** Phase 5: Legacy implementation removed */
    LEGACY_REMOVED: 'legacy-removed' as const
} as const;

export type MigrationPhase = typeof MigrationPhase[keyof typeof MigrationPhase];

/**
 * Current migration phase configuration
 */
export const CURRENT_MIGRATION_PHASE = MigrationPhase.DEFAULT_ENABLED;

/**
 * Migration strategy configuration
 */
export interface MigrationStrategy {
    currentPhase: MigrationPhase;
    nextPhase?: MigrationPhase;
    rolloutSchedule: {
        phase: MigrationPhase;
        startDate: Date;
        endDate: Date;
        rolloutPercentage: number;
    }[];
    fallbackEnabled: boolean;
    monitoringEnabled: boolean;
}

/**
 * Default migration strategy
 */
export const DEFAULT_MIGRATION_STRATEGY: MigrationStrategy = {
    currentPhase: CURRENT_MIGRATION_PHASE,
    nextPhase: MigrationPhase.LEGACY_REMOVED,
    rolloutSchedule: [
        {
            phase: MigrationPhase.LEGACY_ONLY,
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-02-01'),
            rolloutPercentage: 0
        },
        {
            phase: MigrationPhase.STREAMING_SERVICE_AVAILABLE,
            startDate: new Date('2024-02-01'),
            endDate: new Date('2024-03-01'),
            rolloutPercentage: 10
        },
        {
            phase: MigrationPhase.WORD_DISPLAY_FLAGGED,
            startDate: new Date('2024-03-01'),
            endDate: new Date('2024-04-01'),
            rolloutPercentage: 25
        },
        {
            phase: MigrationPhase.IMAGECARD_INTEGRATED,
            startDate: new Date('2024-04-01'),
            endDate: new Date('2024-05-01'),
            rolloutPercentage: 50
        },
        {
            phase: MigrationPhase.DEFAULT_ENABLED,
            startDate: new Date('2024-05-01'),
            endDate: new Date('2024-06-01'),
            rolloutPercentage: 100
        },
        {
            phase: MigrationPhase.LEGACY_REMOVED,
            startDate: new Date('2024-06-01'),
            endDate: new Date('2024-07-01'),
            rolloutPercentage: 100
        }
    ],
    fallbackEnabled: true,
    monitoringEnabled: true
};

/**
 * Feature adoption metrics
 */
export interface FeatureAdoptionMetrics {
    featureId: string;
    totalUsers: number;
    activeUsers: number;
    adoptionRate: number;
    errorRate: number;
    averagePerformance: number;
    userFeedbackScore: number;
    timestamp: Date;
}

/**
 * Rollout decision engine
 */
export class FeatureRolloutManager {
    private config: Record<string, FeatureRolloutConfig>;
    private migrationStrategy: MigrationStrategy;
    private metrics: Map<string, FeatureAdoptionMetrics[]> = new Map();

    constructor(
        config: Record<string, FeatureRolloutConfig> = FEATURE_ROLLOUT_CONFIGS,
        migrationStrategy: MigrationStrategy = DEFAULT_MIGRATION_STRATEGY
    ) {
        this.config = config;
        this.migrationStrategy = migrationStrategy;
    }

    /**
     * Check if a feature should be enabled for a user
     */
    isFeatureEnabled(featureId: string, userId?: string, userSegment?: string): boolean {
        const featureConfig = this.config[featureId];
        if (!featureConfig || !featureConfig.enabled) {
            return false;
        }

        // Check user segments
        if (featureConfig.userSegments) {
            if (userSegment) {
                if (featureConfig.userSegments.exclude?.includes(userSegment)) {
                    return false;
                }
                if (featureConfig.userSegments.include &&
                    !featureConfig.userSegments.include.includes(userSegment)) {
                    return false;
                }
            }
        }

        // Check rollout percentage
        if (featureConfig.rolloutPercentage < 100) {
            const userHash = this.hashUserId(userId || 'anonymous');
            const userPercentile = userHash % 100;
            if (userPercentile >= featureConfig.rolloutPercentage) {
                return false;
            }
        }

        // Check migration phase compatibility
        return this.isFeatureCompatibleWithPhase(featureId, this.migrationStrategy.currentPhase);
    }

    /**
     * Get A/B test variant for a user
     */
    getABTestVariant(featureId: string, userId?: string): 'control' | 'treatment' | null {
        const featureConfig = this.config[featureId];
        if (!featureConfig?.abTest?.enabled) {
            return null;
        }

        const userHash = this.hashUserId(userId || 'anonymous');
        const userPercentile = userHash % 100;

        if (userPercentile < featureConfig.abTest.variants.control) {
            return 'control';
        } else if (userPercentile < featureConfig.abTest.variants.control + featureConfig.abTest.variants.treatment) {
            return 'treatment';
        }

        return null;
    }

    /**
     * Record feature adoption metrics
     */
    recordMetrics(metrics: FeatureAdoptionMetrics): void {
        const featureMetrics = this.metrics.get(metrics.featureId) || [];
        featureMetrics.push(metrics);

        // Keep only last 100 entries per feature
        if (featureMetrics.length > 100) {
            featureMetrics.splice(0, featureMetrics.length - 100);
        }

        this.metrics.set(metrics.featureId, featureMetrics);

        // Check for rollback triggers
        this.checkRollbackTriggers(metrics);
    }

    /**
     * Get current adoption metrics for a feature
     */
    getAdoptionMetrics(featureId: string): FeatureAdoptionMetrics[] {
        return this.metrics.get(featureId) || [];
    }

    /**
     * Check if rollback should be triggered
     */
    private checkRollbackTriggers(metrics: FeatureAdoptionMetrics): void {
        const featureConfig = this.config[metrics.featureId];
        if (!featureConfig?.rollback.enabled) {
            return;
        }

        const triggers = featureConfig.rollback.triggers;
        let shouldRollback = false;
        let reason = '';

        if (triggers.errorRate && metrics.errorRate > triggers.errorRate) {
            shouldRollback = true;
            reason = `Error rate ${metrics.errorRate}% exceeds threshold ${triggers.errorRate}%`;
        }

        if (triggers.performanceRegression && metrics.averagePerformance > featureConfig.monitoring.performanceThreshold) {
            const regressionPercentage = ((metrics.averagePerformance - featureConfig.monitoring.performanceThreshold) / featureConfig.monitoring.performanceThreshold) * 100;
            if (regressionPercentage > triggers.performanceRegression) {
                shouldRollback = true;
                reason = `Performance regression ${regressionPercentage.toFixed(1)}% exceeds threshold ${triggers.performanceRegression}%`;
            }
        }

        if (triggers.userFeedback && metrics.userFeedbackScore < (100 - triggers.userFeedback)) {
            shouldRollback = true;
            reason = `User feedback score ${metrics.userFeedbackScore}% below threshold ${100 - triggers.userFeedback}%`;
        }

        if (shouldRollback) {
            this.triggerRollback(metrics.featureId, reason);
        }
    }

    /**
     * Trigger feature rollback
     */
    private triggerRollback(featureId: string, reason: string): void {
        console.warn(`Triggering rollback for feature ${featureId}: ${reason}`);

        // Disable the feature
        if (this.config[featureId]) {
            this.config[featureId].enabled = false;
            this.config[featureId].rolloutPercentage = 0;
        }

        // Log rollback event
        this.logRollbackEvent(featureId, reason);
    }

    /**
     * Log rollback event for monitoring
     */
    private logRollbackEvent(featureId: string, reason: string): void {
        const rollbackEvent = {
            timestamp: new Date().toISOString(),
            featureId,
            reason,
            phase: this.migrationStrategy.currentPhase
        };

        // In a real application, this would send to monitoring service
        console.error('Feature rollback triggered:', rollbackEvent);
    }

    /**
     * Check if feature is compatible with current migration phase
     */
    private isFeatureCompatibleWithPhase(featureId: string, phase: MigrationPhase): boolean {
        switch (featureId) {
            case 'streaming-enhancement':
                return phase !== MigrationPhase.LEGACY_ONLY;

            case 'word-by-word-display':
                return ([
                    MigrationPhase.WORD_DISPLAY_FLAGGED,
                    MigrationPhase.IMAGECARD_INTEGRATED,
                    MigrationPhase.DEFAULT_ENABLED,
                    MigrationPhase.LEGACY_REMOVED
                ] as MigrationPhase[]).includes(phase);

            case 'fade-in-animations':
            case 'typing-cursor':
                return ([
                    MigrationPhase.IMAGECARD_INTEGRATED,
                    MigrationPhase.DEFAULT_ENABLED,
                    MigrationPhase.LEGACY_REMOVED
                ] as MigrationPhase[]).includes(phase);

            default:
                return true;
        }
    }

    /**
     * Simple hash function for user ID
     */
    private hashUserId(userId: string): number {
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            const char = userId.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Update feature configuration
     */
    updateFeatureConfig(featureId: string, updates: Partial<FeatureRolloutConfig>): void {
        if (this.config[featureId]) {
            this.config[featureId] = { ...this.config[featureId], ...updates };
        }
    }

    /**
     * Get current migration phase
     */
    getCurrentPhase(): MigrationPhase {
        return this.migrationStrategy.currentPhase;
    }

    /**
     * Advance to next migration phase
     */
    advanceToNextPhase(): boolean {
        if (this.migrationStrategy.nextPhase) {
            this.migrationStrategy.currentPhase = this.migrationStrategy.nextPhase;

            // Update next phase based on schedule
            const currentIndex = Object.values(MigrationPhase).indexOf(this.migrationStrategy.currentPhase);
            const nextIndex = currentIndex + 1;
            if (nextIndex < Object.values(MigrationPhase).length) {
                this.migrationStrategy.nextPhase = Object.values(MigrationPhase)[nextIndex];
            } else {
                this.migrationStrategy.nextPhase = undefined;
            }

            return true;
        }
        return false;
    }
}

/**
 * Global feature rollout manager instance
 */
export const featureRolloutManager = new FeatureRolloutManager();

/**
 * Convenience function to check if streaming enhancement is enabled
 */
export function isStreamingEnhancementEnabled(userId?: string, userSegment?: string): boolean {
    return featureRolloutManager.isFeatureEnabled('streaming-enhancement', userId, userSegment);
}

/**
 * Convenience function to check if word-by-word display is enabled
 */
export function isWordByWordDisplayEnabled(userId?: string, userSegment?: string): boolean {
    return featureRolloutManager.isFeatureEnabled('word-by-word-display', userId, userSegment);
}

/**
 * Convenience function to check if fade-in animations are enabled
 */
export function isFadeInAnimationsEnabled(userId?: string, userSegment?: string): boolean {
    return featureRolloutManager.isFeatureEnabled('fade-in-animations', userId, userSegment);
}

/**
 * Convenience function to check if typing cursor is enabled
 */
export function isTypingCursorEnabled(userId?: string, userSegment?: string): boolean {
    return featureRolloutManager.isFeatureEnabled('typing-cursor', userId, userSegment);
}