import { useState } from 'react';
import { useRateLimit } from '@/hooks/useRateLimit';
import { Button } from '@/components/ui/button';

/**
 * Simple test component to verify rate limiting functionality
 */
export function RateLimitTest() {
    const [testResults, setTestResults] = useState<string[]>([]);
    const { queueRequest, canMakeRequest, rateLimitConfig, updateRateLimit, queueLength, timeUntilNextSlot } = useRateLimit();

    const addTestResult = (message: string) => {
        const timestamp = new Date().toISOString();
        setTestResults(prev => [...prev, `${timestamp}: ${message}`]);
    };

    const runTest = () => {
        const testId = `test-${Date.now()}`;

        addTestResult(`Submitting test request ${testId}`);

        if (canMakeRequest) {
            addTestResult(`Request ${testId} can execute immediately`);
            // Simulate immediate execution
            setTimeout(() => {
                addTestResult(`Request ${testId} completed immediately`);
            }, 1000);
        } else {
            addTestResult(`Request ${testId} will be queued (rate limit exceeded)`);
            queueRequest(testId, async () => {
                addTestResult(`Request ${testId} is now executing from queue`);
                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 1000));
                addTestResult(`Request ${testId} completed from queue`);
            });
        }
    };

    const clearResults = () => {
        setTestResults([]);
    };

    const setRateLimit1 = () => {
        updateRateLimit(1);
        addTestResult('Rate limit set to 1 request per minute');
    };

    const setRateLimit5 = () => {
        updateRateLimit(5);
        addTestResult('Rate limit set to 5 requests per minute');
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Rate Limiting Test</h2>

            <div className="mb-6 p-4 bg-muted rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Current Status</h3>
                <p><strong>Rate Limit:</strong> {rateLimitConfig.requestsPerMinute} requests per minute</p>
                <p><strong>Can Make Request:</strong> <span className={canMakeRequest ? 'text-green-600' : 'text-red-600'}>{canMakeRequest ? 'Yes' : 'No'}</span></p>
                <p><strong>Queue Length:</strong> {queueLength}</p>
                <p><strong>Time Until Next Slot:</strong> {timeUntilNextSlot > 0 ? `${Math.ceil(timeUntilNextSlot / 1000)}s` : 'Available now'}</p>
            </div>

            <div className="mb-6 flex gap-2 flex-wrap">
                <Button onClick={runTest}>
                    Submit Test Request
                </Button>
                <Button onClick={setRateLimit1} variant="outline">
                    Set Rate Limit to 1/min
                </Button>
                <Button onClick={setRateLimit5} variant="outline">
                    Set Rate Limit to 5/min
                </Button>
                <Button onClick={clearResults} variant="outline">
                    Clear Results
                </Button>
            </div>

            <div className="bg-muted p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Test Results</h3>
                <div className="max-h-96 overflow-y-auto">
                    {testResults.length === 0 ? (
                        <p className="text-muted-foreground">No test results yet. Click "Submit Test Request" to start testing.</p>
                    ) : (
                        <div className="space-y-1">
                            {testResults.map((result, index) => (
                                <div key={index} className="text-sm font-mono">
                                    {result}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Test Instructions</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Set rate limit to 1 request per minute</li>
                    <li>Click "Submit Test Request" twice quickly</li>
                    <li>First request should execute immediately</li>
                    <li>Second request should be queued and execute after ~60 seconds</li>
                    <li>Watch the console for detailed logging</li>
                </ol>
            </div>
        </div>
    );
}