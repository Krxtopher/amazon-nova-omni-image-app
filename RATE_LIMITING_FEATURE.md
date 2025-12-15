# Rate Limiting Feature Implementation

## Overview
This document describes the implementation of rate limiting for image generation requests in the Amazon Nova Omni Image App.

## Features Implemented

### 1. Rate Limit Setting
- Added a "Rate Limit" setting to the Settings Modal
- Default value: 20 requests per minute
- Range: 1-100 requests per minute
- Setting is persisted to SQLite database
- Real-time validation and error handling

### 2. Request States
Image generation requests now support the following states:

- **Queued**: Request is waiting in the client-side queue due to rate limiting
- **Generating**: Request is being processed by the Converse API
- **Complete**: Successful image response received
- **Failed**: Error occurred or text was returned instead of image

### 3. Visual Indicators

#### Queued State
- Displays "Queued..." text with magical shader background effect
- Shows the original prompt below the queued message
- Uses the same beautiful animated background as generating state for visual consistency

#### Generating State
- Shows magical loading animation (shader effects)
- Displays a timer showing elapsed time in MM:SS format
- Timer appears as a prominent overlay on the placeholder
- Shows the original prompt below the timer

### 4. Rate Limiting Logic
- Uses a sliding window approach (60-second window)
- Tracks request timestamps to enforce limits
- Automatically processes queue when slots become available
- Immediate execution if under the rate limit
- Graceful queuing when at or over the limit

## Technical Implementation

### Components Modified

1. **SettingsModal.tsx**
   - Added RateLimitSetting component
   - Input field with validation (1-100 range)
   - Real-time updates with success/error feedback

2. **useRateLimit.ts** (New Hook)
   - Manages rate limiting configuration
   - Handles request queuing and execution
   - Provides queue management functions
   - Persists settings to SQLite database

3. **PromptInputArea.tsx**
   - Integrated rate limiting into image generation flow
   - Creates requests with appropriate initial status (queued vs generating)
   - Queues requests when rate limit is exceeded

4. **MasonryGridImageRenderer.tsx**
   - Added support for "queued" status display
   - Added timer display for "generating" status
   - Enhanced visual feedback for different states

5. **SQLiteService.ts**
   - Enhanced setSetting/getSetting to support number values
   - Automatic type conversion for numeric settings

### Database Schema
The existing `settings` table is used to store the rate limit configuration:
- Key: `rateLimitRequestsPerMinute`
- Value: Number (stored as string, converted on retrieval)

## Usage

### For Users
1. Open Settings Modal (gear icon in sidebar)
2. Locate "Rate Limiting" section
3. Adjust "Rate Limit" value (1-100 requests per minute)
4. Setting is automatically saved when input loses focus or Enter is pressed

### For Developers
```typescript
// Access rate limiting functionality
const { queueRequest, canMakeRequest, rateLimitConfig } = useRateLimit();

// Check if request can be made immediately
if (canMakeRequest) {
  // Execute immediately
} else {
  // Queue for later execution
  queueRequest(requestId, executeFunction);
}
```

## Benefits

1. **API Protection**: Prevents overwhelming the Bedrock API with too many concurrent requests
2. **User Experience**: Clear visual feedback about request status and queue position
3. **Flexibility**: Configurable rate limits to suit different usage patterns
4. **Reliability**: Graceful handling of rate limit scenarios without request loss

## Future Enhancements

1. **Queue Position Display**: Show position in queue for queued requests
2. **Batch Processing**: Optimize queue processing for better throughput
3. **Dynamic Rate Limiting**: Adjust limits based on API response times
4. **Request Cancellation**: Allow users to cancel queued requests
5. **Priority Queuing**: Different priority levels for different types of requests

## Testing

### Manual Testing
1. Navigate to `http://localhost:5174/test-rate-limit` in development mode
2. Set rate limit to 1 request per minute
3. Click "Submit Test Request" twice quickly
4. Observe that:
   - First request executes immediately
   - Second request is queued and waits ~60 seconds
   - Console shows detailed logging of the process

### Automated Testing
The implementation includes:
- TypeScript type safety
- Error handling for invalid rate limit values
- Graceful fallbacks for database errors
- Visual feedback for all request states
- Automatic cleanup of expired timestamps
- Unit tests for rate limiting logic (in `src/hooks/useRateLimit.test.ts`)

## Configuration

Default settings:
- Rate limit: 20 requests per minute
- Timer update interval: 1 second
- Queue processing delay: 100ms between requests
- Timestamp cleanup: Automatic (removes entries older than 60 seconds)