# Bedrock Request Throttling System

This document explains the throttling system implemented to manage Bedrock API request rates and prevent throttling errors.

## Overview

The throttling system provides:
- **Per-model rate limiting**: Configure different limits for each Bedrock model
- **Request queuing**: Automatically queue requests that exceed rate limits
- **Real-time statistics**: Monitor queue status and throttling activity
- **User configuration**: Settings panel for adjusting throttling parameters

## Architecture

### Core Components

1. **ThrottlingService** (`src/services/ThrottlingService.ts`)
   - Singleton service managing request queues per model
   - Processes requests at configured intervals
   - Provides real-time statistics

2. **ThrottlingStore** (`src/stores/throttlingStore.ts`)
   - Zustand store for configuration persistence
   - Manages throttling settings and statistics

3. **ThrottlingSettings** (`src/components/ThrottlingSettings.tsx`)
   - UI component for configuring throttling settings
   - Real-time display of queue statistics

### Integration Points

- **BedrockImageService**: Image generation requests are throttled
- **StreamingPromptEnhancementService**: Streaming enhancement requests are throttled
- **SettingsModal**: Throttling configuration is accessible via settings

## Configuration

### Default Settings

```typescript
{
  globalEnabled: true,
  models: {
    'us.amazon.nova-2-omni-v1:0': {
      maxRequestsPerMinute: 10,
      enabled: true,
    },
    'us.amazon.nova-2-lite-v1:0': {
      maxRequestsPerMinute: 20,
      enabled: true,
    },
  },
}
```

### User Configuration

Users can configure throttling through the Settings panel:

1. **Global Enable/Disable**: Turn throttling on/off for all models
2. **Per-Model Settings**: 
   - Enable/disable throttling for specific models
   - Set maximum requests per minute (1-100)
3. **Real-time Statistics**: View current queue status and throttling activity

## How It Works

### Request Flow

1. **Request Initiated**: Service calls `throttlingService.queueRequest(modelId, requestFunction)`
2. **Throttling Check**: 
   - If throttling disabled → Execute immediately
   - If model not configured → Execute immediately with warning
   - If within rate limit → Execute immediately
   - If rate limit exceeded → Add to queue
3. **Queue Processing**: Background intervals process queued requests at configured rate
4. **Request Execution**: Original request function is called when slot available

### Rate Limiting Algorithm

- **Time Window**: Rolling 1-minute window
- **Request Tracking**: Timestamps of recent requests per model
- **Interval Calculation**: `60,000ms / maxRequestsPerMinute`
- **Queue Processing**: Requests processed at calculated intervals

## Usage Examples

### Basic Usage (Automatic)

The throttling system is automatically integrated into existing services:

```typescript
// This request will be automatically throttled
const response = await bedrockService.generateContent(request);
```

### Manual Configuration

```typescript
import { useThrottlingStore } from '@/stores/throttlingStore';

const { updateModelConfig } = useThrottlingStore();

// Update throttling for a specific model
updateModelConfig('us.amazon.nova-2-omni-v1:0', {
  maxRequestsPerMinute: 15,
  enabled: true,
});
```

### Statistics Monitoring

```typescript
import { useThrottlingStore } from '@/stores/throttlingStore';

const { stats, refreshStats } = useThrottlingStore();

// Get current statistics
refreshStats();
console.log(stats.totalQueuedRequests);
console.log(stats.models['us.amazon.nova-2-omni-v1:0'].isThrottling);
```

## Benefits

1. **Prevents Rate Limit Errors**: Automatically manages request rates to stay within AWS limits
2. **Improved User Experience**: Requests are queued rather than failing
3. **Configurable**: Users can adjust settings based on their AWS account limits
4. **Transparent**: Real-time statistics show system status
5. **Minimal Impact**: When disabled, adds negligible overhead

## Monitoring

The system provides real-time monitoring through:

- **Queue Length**: Number of pending requests per model
- **Requests This Minute**: Current request count in rolling window
- **Throttling Status**: Whether model is currently throttling
- **Next Available Slot**: When next request can be processed

## Error Handling

- **Request Failures**: Failed requests are properly rejected with original error
- **Queue Clearing**: Pending requests are rejected when service is destroyed
- **Configuration Changes**: Queues adapt to new rate limits automatically

## Testing

The system includes comprehensive tests covering:
- Configuration management
- Request queuing behavior
- Statistics accuracy
- Error handling
- Service lifecycle

Run tests with:
```bash
npm test -- src/services/ThrottlingService.test.ts
```

## Future Enhancements

Potential improvements:
- **Burst Handling**: Allow short bursts above rate limit
- **Priority Queues**: Different priority levels for requests
- **Adaptive Rates**: Automatically adjust based on AWS responses
- **Cross-Session Persistence**: Remember rate limit state across app restarts