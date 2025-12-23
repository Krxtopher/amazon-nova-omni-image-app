# Streaming Prompt Enhancement Migration Guide

This document provides a comprehensive guide for migrating from the legacy prompt display system to the new streaming prompt enhancement system with word-by-word display.

## Overview

The streaming prompt enhancement system introduces several new features:

- **Streaming Enhancement**: Real-time prompt enhancement using Amazon Bedrock's streaming API
- **Word-by-Word Display**: Natural text revelation with human-like timing
- **Fade-in Animations**: Smooth visual transitions for each word
- **Error Handling**: Robust fallback mechanisms
- **Performance Monitoring**: Built-in adoption and error tracking

## Migration Phases

### Phase 1: Legacy Only (Completed)
- **Status**: ✅ Complete
- **Description**: Original implementation with non-streaming API
- **Features**: Basic prompt enhancement, instant text display

### Phase 2: Streaming Service Available (Completed)
- **Status**: ✅ Complete
- **Description**: Streaming enhancement service implemented alongside legacy
- **Features**: 
  - `StreamingPromptEnhancementService` available
  - Fallback to legacy enhancement on errors
  - Feature flag controlled

### Phase 3: Word-by-Word Display (Completed)
- **Status**: ✅ Complete
- **Description**: Word-by-word display system implemented
- **Features**:
  - `WordByWordDisplayEngine` for timing control
  - `WordRevealContainer` for visual display
  - Configurable timing and animations

### Phase 4: ImageCard Integration (Completed)
- **Status**: ✅ Complete
- **Description**: Streaming display integrated into ImageCard component
- **Features**:
  - `StreamingPromptDisplay` orchestrator component
  - ImageCard supports `enableStreamingDisplay` prop
  - Backward compatibility maintained

### Phase 5: Default Enabled (Current)
- **Status**: 🔄 Current Phase
- **Description**: Streaming display enabled by default with fallback
- **Features**:
  - All new image generations use streaming display
  - Feature flags allow disabling if needed
  - Comprehensive error handling and monitoring

### Phase 6: Legacy Removed (Future)
- **Status**: ⏳ Planned
- **Description**: Remove legacy non-streaming implementation
- **Timeline**: After 30 days of stable operation in Phase 5

## Feature Flags

The system uses several feature flags for gradual rollout:

```typescript
// Feature flags in StreamingDisplayConfigService
const DEFAULT_FEATURE_FLAGS = {
    enableStreamingEnhancement: true,    // Use streaming API for enhancement
    enableWordByWordDisplay: true,       // Show text word-by-word
    enableFadeInAnimations: true,        // Animate word appearance
    enableTypingCursor: true,            // Show typing indicator
    enablePunctuationDelays: true,       // Add pauses for punctuation
    enableRandomDelays: true,            // Vary timing naturally
};
```

### Controlling Features

```typescript
import { featureRolloutManager } from './config/featureRollout';

// Check if streaming enhancement is enabled for a user
const isEnabled = featureRolloutManager.isFeatureEnabled('streaming-enhancement', userId);

// Disable a feature globally
featureRolloutManager.updateFeatureConfig('fade-in-animations', { enabled: false });
```

## Component Integration

### ImageCard Integration

The `ImageCard` component now supports streaming display:

```typescript
// Enable streaming display (default for generating images)
<ImageCard
    item={image}
    enableStreamingDisplay={true}
    enhancementType="standard"
    // ... other props
/>

// Disable streaming display (backward compatibility)
<ImageCard
    item={image}
    enableStreamingDisplay={false}
    // ... other props
/>
```

### PromptInputArea Integration

The `PromptInputArea` automatically uses streaming enhancement when available:

```typescript
// Streaming service is initialized automatically
// Falls back to legacy enhancement if streaming fails
// No code changes required for basic usage
```

### Direct Component Usage

For custom implementations:

```typescript
import { StreamingPromptDisplay } from './components/StreamingPromptDisplay';

<StreamingPromptDisplay
    originalPrompt="A beautiful sunset"
    enhancementType="standard"
    onEnhancementComplete={(enhanced) => console.log('Enhanced:', enhanced)}
    onDisplayComplete={() => console.log('Display complete')}
/>
```

## Configuration Options

### Word Display Configuration

```typescript
import { streamingDisplayConfig } from './services/StreamingDisplayConfigService';

// Update timing configuration
streamingDisplayConfig.updateConfig({
    wordDisplay: {
        baseDelay: { min: 50, max: 200 },        // Delay between words
        longWordThreshold: 8,                     // Characters for "long" words
        longWordDelayMultiplier: 1.5,            // Extra delay for long words
        punctuationDelays: {                      // Extra delays for punctuation
            '.': 300,
            '!': 300,
            '?': 300,
            ',': 150,
        },
        fadeInDuration: { min: 100, max: 300 },  // Animation duration
    }
});
```

### Accessibility Configuration

```typescript
// Configure accessibility features
streamingDisplayConfig.updateConfig({
    accessibility: {
        reduceMotion: false,                      // Respect user motion preferences
        enableScreenReaderAnnouncements: true,   // Announce progress to screen readers
        skipAnimations: false,                    // Skip all animations
        useInstantDisplay: false,                 // Show text instantly
        announceProgress: true,                   // Announce word progress
    }
});
```

### Performance Configuration

```typescript
// Configure performance settings
streamingDisplayConfig.updateConfig({
    performance: {
        maxConcurrentDisplays: 10,               // Max simultaneous displays
        tokenBufferSize: 100,                    // Token buffer size
        useRequestAnimationFrame: true,          // Use RAF for animations
        enableGPUAcceleration: true,             // Enable GPU acceleration
        updateDebounceMs: 16,                    // Update frequency (~60fps)
    }
});
```

## Monitoring and Analytics

### Feature Adoption Tracking

```typescript
import { featureAdoptionMonitoring } from './services/FeatureAdoptionMonitoringService';

// Track feature usage
featureAdoptionMonitoring.trackFeatureUsed('streaming-enhancement', userId, sessionId);

// Track errors
featureAdoptionMonitoring.trackFeatureError('word-by-word-display', errorMessage, duration);

// Track performance
featureAdoptionMonitoring.trackFeaturePerformance('fade-in-animations', duration, success);

// Track user feedback
featureAdoptionMonitoring.trackUserFeedback('streaming-enhancement', 4, 'Great feature!');
```

### Getting Statistics

```typescript
// Get feature statistics
const stats = featureAdoptionMonitoring.getFeatureStatistics('streaming-enhancement', 60);
console.log(`Error rate: ${stats.errorRate}%`);
console.log(`Adoption rate: ${stats.adoptionRate}%`);
console.log(`Average performance: ${stats.averagePerformance}ms`);

// Get summary report
const summary = featureAdoptionMonitoring.getSummaryReport();
console.log(`Features with high error rate:`, summary.featuresWithHighErrorRate);
```

## Error Handling and Fallbacks

The system includes comprehensive error handling:

### Streaming Enhancement Errors
- **Network failures**: Falls back to original prompt
- **API timeouts**: Uses partial enhancement if available
- **Authentication errors**: Falls back to original prompt
- **Rate limiting**: Implements exponential backoff

### Display Engine Errors
- **Timer failures**: Falls back to instant display
- **Animation errors**: Shows text without animations
- **Memory pressure**: Reduces concurrent displays

### Circuit Breaker
- Automatically disables features with high error rates
- Configurable thresholds and recovery mechanisms
- Automatic rollback triggers

## Performance Considerations

### Memory Management
- Automatic cleanup of timers and resources
- Bounded event storage (10k events max)
- Periodic cleanup of old data

### Concurrent Displays
- Limited to 10 concurrent displays by default
- Independent resource management per display
- Performance monitoring and throttling

### Animation Performance
- Uses CSS transitions for GPU acceleration
- RequestAnimationFrame for smooth timing
- Debounced updates to prevent blocking

## Troubleshooting

### Common Issues

#### Streaming Enhancement Not Working
1. Check AWS credentials configuration
2. Verify network connectivity
3. Check feature flags: `enableStreamingEnhancement`
4. Review error logs for API failures

#### Word-by-Word Display Not Showing
1. Check feature flag: `enableWordByWordDisplay`
2. Verify component props: `enableStreamingDisplay={true}`
3. Check for JavaScript errors in console
4. Verify accessibility settings aren't forcing instant display

#### Animations Not Working
1. Check feature flag: `enableFadeInAnimations`
2. Verify user hasn't disabled animations in browser/OS
3. Check accessibility settings: `reduceMotion`, `skipAnimations`
4. Verify CSS transitions are supported

#### Performance Issues
1. Check concurrent display count
2. Review performance monitoring metrics
3. Adjust timing configuration for faster display
4. Consider disabling animations for better performance

### Debug Mode

Enable debug mode for detailed logging:

```typescript
streamingDisplayConfig.updateConfig({ debug: true });
```

### Monitoring Dashboard

Access monitoring data:

```typescript
// Get real-time statistics
const stats = featureAdoptionMonitoring.getAllFeatureStatistics();

// Export events for analysis
const events = featureAdoptionMonitoring.exportEvents('streaming-enhancement', 60);

// Get rollout manager status
const phase = featureRolloutManager.getCurrentPhase();
const metrics = featureRolloutManager.getAdoptionMetrics('word-by-word-display');
```

## Rollback Procedures

### Automatic Rollback
The system automatically rolls back features when:
- Error rate exceeds 10%
- Performance degrades by more than 50%
- User feedback score drops below 80%

### Manual Rollback

#### Disable Streaming Enhancement
```typescript
featureRolloutManager.updateFeatureConfig('streaming-enhancement', { 
    enabled: false,
    rolloutPercentage: 0 
});
```

#### Disable Word-by-Word Display
```typescript
streamingDisplayConfig.updateConfig({
    features: { enableWordByWordDisplay: false }
});
```

#### Emergency Rollback (All Features)
```typescript
// Disable all streaming features
streamingDisplayConfig.applyPreset('minimal');

// Or disable individual features
featureRolloutManager.updateFeatureConfig('streaming-enhancement', { enabled: false });
featureRolloutManager.updateFeatureConfig('word-by-word-display', { enabled: false });
featureRolloutManager.updateFeatureConfig('fade-in-animations', { enabled: false });
```

## Testing

### Unit Tests
- Component rendering and behavior
- Service functionality and error handling
- Configuration management
- Performance optimization utilities

### Integration Tests
- End-to-end user flows
- Component interaction
- Error scenarios and recovery
- Backward compatibility

### Performance Tests
- Concurrent display handling
- Memory usage and cleanup
- Animation performance
- Token processing speed

## Support and Documentation

### Additional Resources
- [Design Document](./design.md) - Technical architecture and design decisions
- [Requirements Document](./requirements.md) - Feature requirements and acceptance criteria
- [API Documentation](./src/services/) - Service and component APIs
- [Configuration Reference](./src/types/config.ts) - Configuration options and types

### Getting Help
1. Check this migration guide first
2. Review error logs and monitoring data
3. Test with feature flags disabled
4. Check for known issues in the repository
5. Contact the development team with specific error details

## Conclusion

The streaming prompt enhancement system provides a significantly improved user experience with natural text revelation and robust error handling. The migration has been designed to be seamless with comprehensive fallback mechanisms and monitoring.

The system is currently in Phase 5 (Default Enabled) and has been thoroughly tested across all major user flows. Feature flags allow for fine-grained control and quick rollback if needed.

For any issues or questions, refer to the troubleshooting section above or contact the development team.