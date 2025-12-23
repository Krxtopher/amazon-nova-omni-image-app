/**
 * Feature Adoption Monitoring Service
 * 
 * Tracks feature usage, performance, and error rates for streaming prompt enhancement
 * rollout monitoring and decision making.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import { featureRolloutManager, type FeatureAdoptionMetrics } from '../config/featureRollout';

/**
 * Feature usage event types
 */
export type FeatureUsageEvent =
    | 'feature_enabled'
    | 'feature_used'
    | 'feature_error'
    | 'feature_performance'
    | 'user_feedback';

/**
 * Feature usage data
 */
export interface FeatureUsageData {
    featureId: string;
    userId?: string;
    sessionId: string;
    event: FeatureUsageEvent;
    timestamp: Date;
    metadata?: Record<string, any>;
    performance?: {
        duration: number;
        success: boolean;
        errorMessage?: string;
    };
    userFeedback?: {
        rating: number; // 1-5 scale
        comment?: string;
    };
}

/**
 * Aggregated feature statistics
 */
export interface FeatureStatistics {
    featureId: string;
    timeWindow: {
        start: Date;
        end: Date;
    };
    totalEvents: number;
    uniqueUsers: number;
    usageEvents: number;
    errorEvents: number;
    errorRate: number;
    averagePerformance: number;
    userFeedbackScore: number;
    adoptionRate: number;
}

/**
 * Service for monitoring feature adoption and performance
 */
export class FeatureAdoptionMonitoringService {
    private events: FeatureUsageData[] = [];
    private readonly maxEvents = 10000; // Keep last 10k events in memory
    private readonly aggregationInterval = 5 * 60 * 1000; // 5 minutes
    private aggregationTimer?: NodeJS.Timeout;

    constructor() {
        this.startAggregation();
    }

    /**
     * Track a feature usage event
     */
    trackEvent(data: FeatureUsageData): void {
        // Add to events array
        this.events.push(data);

        // Trim events if we exceed max
        if (this.events.length > this.maxEvents) {
            this.events.splice(0, this.events.length - this.maxEvents);
        }

        // Log significant events
        if (data.event === 'feature_error') {
            console.warn(`Feature error tracked:`, {
                featureId: data.featureId,
                error: data.performance?.errorMessage,
                userId: data.userId,
                timestamp: data.timestamp
            });
        }
    }

    /**
     * Track feature enablement
     */
    trackFeatureEnabled(featureId: string, userId?: string, sessionId?: string): void {
        this.trackEvent({
            featureId,
            userId,
            sessionId: sessionId || this.generateSessionId(),
            event: 'feature_enabled',
            timestamp: new Date()
        });
    }

    /**
     * Track feature usage
     */
    trackFeatureUsed(featureId: string, userId?: string, sessionId?: string, metadata?: Record<string, any>): void {
        this.trackEvent({
            featureId,
            userId,
            sessionId: sessionId || this.generateSessionId(),
            event: 'feature_used',
            timestamp: new Date(),
            metadata
        });
    }

    /**
     * Track feature error
     */
    trackFeatureError(
        featureId: string,
        error: string,
        duration?: number,
        userId?: string,
        sessionId?: string
    ): void {
        this.trackEvent({
            featureId,
            userId,
            sessionId: sessionId || this.generateSessionId(),
            event: 'feature_error',
            timestamp: new Date(),
            performance: {
                duration: duration || 0,
                success: false,
                errorMessage: error
            }
        });
    }

    /**
     * Track feature performance
     */
    trackFeaturePerformance(
        featureId: string,
        duration: number,
        success: boolean,
        userId?: string,
        sessionId?: string,
        errorMessage?: string
    ): void {
        this.trackEvent({
            featureId,
            userId,
            sessionId: sessionId || this.generateSessionId(),
            event: 'feature_performance',
            timestamp: new Date(),
            performance: {
                duration,
                success,
                errorMessage
            }
        });
    }

    /**
     * Track user feedback
     */
    trackUserFeedback(
        featureId: string,
        rating: number,
        comment?: string,
        userId?: string,
        sessionId?: string
    ): void {
        this.trackEvent({
            featureId,
            userId,
            sessionId: sessionId || this.generateSessionId(),
            event: 'user_feedback',
            timestamp: new Date(),
            userFeedback: {
                rating,
                comment
            }
        });
    }

    /**
     * Get feature statistics for a time window
     */
    getFeatureStatistics(featureId: string, timeWindowMinutes: number = 60): FeatureStatistics {
        const now = new Date();
        const start = new Date(now.getTime() - (timeWindowMinutes * 60 * 1000));

        const relevantEvents = this.events.filter(event =>
            event.featureId === featureId &&
            event.timestamp >= start &&
            event.timestamp <= now
        );

        const totalEvents = relevantEvents.length;
        const uniqueUsers = new Set(relevantEvents.map(e => e.userId).filter(Boolean)).size;
        const usageEvents = relevantEvents.filter(e => e.event === 'feature_used').length;
        const errorEvents = relevantEvents.filter(e => e.event === 'feature_error').length;
        const performanceEvents = relevantEvents.filter(e => e.event === 'feature_performance' && e.performance);
        const feedbackEvents = relevantEvents.filter(e => e.event === 'user_feedback' && e.userFeedback);

        const errorRate = totalEvents > 0 ? (errorEvents / totalEvents) * 100 : 0;

        const averagePerformance = performanceEvents.length > 0
            ? performanceEvents.reduce((sum, e) => sum + (e.performance?.duration || 0), 0) / performanceEvents.length
            : 0;

        const userFeedbackScore = feedbackEvents.length > 0
            ? (feedbackEvents.reduce((sum, e) => sum + (e.userFeedback?.rating || 0), 0) / feedbackEvents.length) * 20 // Convert 1-5 to 0-100
            : 0;

        // Calculate adoption rate (users who used the feature vs users who had it enabled)
        const enabledEvents = relevantEvents.filter(e => e.event === 'feature_enabled').length;
        const adoptionRate = enabledEvents > 0 ? (usageEvents / enabledEvents) * 100 : 0;

        return {
            featureId,
            timeWindow: { start, end: now },
            totalEvents,
            uniqueUsers,
            usageEvents,
            errorEvents,
            errorRate,
            averagePerformance,
            userFeedbackScore,
            adoptionRate
        };
    }

    /**
     * Get all feature statistics
     */
    getAllFeatureStatistics(timeWindowMinutes: number = 60): FeatureStatistics[] {
        const featureIds = [...new Set(this.events.map(e => e.featureId))];
        return featureIds.map(featureId => this.getFeatureStatistics(featureId, timeWindowMinutes));
    }

    /**
     * Start automatic aggregation and reporting
     */
    private startAggregation(): void {
        this.aggregationTimer = setInterval(() => {
            this.aggregateAndReport();
        }, this.aggregationInterval);
    }

    /**
     * Stop automatic aggregation
     */
    stopAggregation(): void {
        if (this.aggregationTimer) {
            clearInterval(this.aggregationTimer);
            this.aggregationTimer = undefined;
        }
    }

    /**
     * Aggregate statistics and report to rollout manager
     */
    private aggregateAndReport(): void {
        const statistics = this.getAllFeatureStatistics(5); // Last 5 minutes

        statistics.forEach(stats => {
            const metrics: FeatureAdoptionMetrics = {
                featureId: stats.featureId,
                totalUsers: stats.uniqueUsers,
                activeUsers: stats.usageEvents,
                adoptionRate: stats.adoptionRate,
                errorRate: stats.errorRate,
                averagePerformance: stats.averagePerformance,
                userFeedbackScore: stats.userFeedbackScore,
                timestamp: new Date()
            };

            // Report to rollout manager for rollback decision making
            featureRolloutManager.recordMetrics(metrics);
        });
    }

    /**
     * Generate a session ID
     */
    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Export events for external analysis
     */
    exportEvents(featureId?: string, timeWindowMinutes?: number): FeatureUsageData[] {
        let events = this.events;

        if (featureId) {
            events = events.filter(e => e.featureId === featureId);
        }

        if (timeWindowMinutes) {
            const cutoff = new Date(Date.now() - (timeWindowMinutes * 60 * 1000));
            events = events.filter(e => e.timestamp >= cutoff);
        }

        return events;
    }

    /**
     * Clear old events to free memory
     */
    clearOldEvents(olderThanHours: number = 24): void {
        const cutoff = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
        this.events = this.events.filter(e => e.timestamp >= cutoff);
    }

    /**
     * Get summary report for all features
     */
    getSummaryReport(): {
        totalFeatures: number;
        totalEvents: number;
        totalUsers: number;
        overallErrorRate: number;
        featuresWithHighErrorRate: string[];
        featuresWithLowAdoption: string[];
    } {
        const statistics = this.getAllFeatureStatistics(60); // Last hour

        const totalFeatures = statistics.length;
        const totalEvents = statistics.reduce((sum, s) => sum + s.totalEvents, 0);
        const totalUsers = statistics.reduce((sum, s) => sum + s.uniqueUsers, 0);
        const totalErrors = statistics.reduce((sum, s) => sum + s.errorEvents, 0);
        const overallErrorRate = totalEvents > 0 ? (totalErrors / totalEvents) * 100 : 0;

        const featuresWithHighErrorRate = statistics
            .filter(s => s.errorRate > 5) // More than 5% error rate
            .map(s => s.featureId);

        const featuresWithLowAdoption = statistics
            .filter(s => s.adoptionRate < 50) // Less than 50% adoption
            .map(s => s.featureId);

        return {
            totalFeatures,
            totalEvents,
            totalUsers,
            overallErrorRate,
            featuresWithHighErrorRate,
            featuresWithLowAdoption
        };
    }
}

/**
 * Global monitoring service instance
 */
export const featureAdoptionMonitoring = new FeatureAdoptionMonitoringService();

/**
 * Convenience functions for tracking streaming prompt enhancement features
 */

export function trackStreamingEnhancementUsed(userId?: string, sessionId?: string, metadata?: Record<string, any>): void {
    featureAdoptionMonitoring.trackFeatureUsed('streaming-enhancement', userId, sessionId, metadata);
}

export function trackStreamingEnhancementError(error: string, duration?: number, userId?: string, sessionId?: string): void {
    featureAdoptionMonitoring.trackFeatureError('streaming-enhancement', error, duration, userId, sessionId);
}

export function trackWordByWordDisplayUsed(userId?: string, sessionId?: string, metadata?: Record<string, any>): void {
    featureAdoptionMonitoring.trackFeatureUsed('word-by-word-display', userId, sessionId, metadata);
}

export function trackWordByWordDisplayPerformance(duration: number, success: boolean, userId?: string, sessionId?: string): void {
    featureAdoptionMonitoring.trackFeaturePerformance('word-by-word-display', duration, success, userId, sessionId);
}

export function trackFadeInAnimationUsed(userId?: string, sessionId?: string): void {
    featureAdoptionMonitoring.trackFeatureUsed('fade-in-animations', userId, sessionId);
}

export function trackUserFeedbackForFeature(featureId: string, rating: number, comment?: string, userId?: string): void {
    featureAdoptionMonitoring.trackUserFeedback(featureId, rating, comment, userId);
}