/**
 * Jest extensions and custom matchers
 * 
 * Provides custom Jest matchers and extensions to improve test
 * readability and provide domain-specific assertions for CMS detection.
 */

declare global {
    namespace jest {
        interface Matchers<R> {
            toBeValidCMSResult(): R;
            toBeValidPartialResult(): R;
            toHaveConfidenceAbove(threshold: number): R;
            toHaveConfidenceBelow(threshold: number): R;
            toHaveDetectedCMS(cms: string): R;
            toHaveExecutedWithin(minTime: number, maxTime: number): R;
            toHaveUsedMethods(methods: string[]): R;
            toBeFailedDetection(): R;
            toHaveRedirected(): R;
            toBeValidCMSType(): R;
        }
    }
}

/**
 * Custom Jest matchers for CMS detection testing
 */
export function setupJestExtensions(): void {
    expect.extend({
        /**
         * Validates that a detection result has all required properties
         */
        toBeValidCMSResult(received: any) {
            const pass = received && 
                typeof received.cms === 'string' &&
                typeof received.confidence === 'number' &&
                received.confidence >= 0 && received.confidence <= 1 &&
                typeof received.originalUrl === 'string' &&
                typeof received.finalUrl === 'string' &&
                typeof received.executionTime === 'number' &&
                received.executionTime >= 0 &&
                Array.isArray(received.detectionMethods);

            if (pass) {
                return {
                    message: () => `Expected object not to be a valid CMS detection result`,
                    pass: true
                };
            } else {
                const issues: string[] = [];
                if (!received) issues.push('received is null/undefined');
                if (typeof received?.cms !== 'string') issues.push('cms is not a string');
                if (typeof received?.confidence !== 'number') issues.push('confidence is not a number');
                if (received?.confidence < 0 || received?.confidence > 1) issues.push('confidence is not between 0 and 1');
                if (typeof received?.originalUrl !== 'string') issues.push('originalUrl is not a string');
                if (typeof received?.finalUrl !== 'string') issues.push('finalUrl is not a string');
                if (typeof received?.executionTime !== 'number') issues.push('executionTime is not a number');
                if (received?.executionTime < 0) issues.push('executionTime is negative');
                if (!Array.isArray(received?.detectionMethods)) issues.push('detectionMethods is not an array');

                return {
                    message: () => `Expected object to be a valid CMS detection result.\nIssues found: ${issues.join(', ')}`,
                    pass: false
                };
            }
        },

        /**
         * Validates that a partial detection result has all required properties
         */
        toBeValidPartialResult(received: any) {
            const pass = received && 
                typeof received.confidence === 'number' &&
                received.confidence >= 0 && received.confidence <= 1 &&
                typeof received.method === 'string' &&
                received.method.length > 0 &&
                typeof received.executionTime === 'number' &&
                received.executionTime >= 0 &&
                (received.evidence === undefined || Array.isArray(received.evidence));

            if (pass) {
                return {
                    message: () => `Expected object not to be a valid partial detection result`,
                    pass: true
                };
            } else {
                const issues: string[] = [];
                if (!received) issues.push('received is null/undefined');
                if (typeof received?.confidence !== 'number') issues.push('confidence is not a number');
                if (received?.confidence < 0 || received?.confidence > 1) issues.push('confidence is not between 0 and 1');
                if (typeof received?.method !== 'string') issues.push('method is not a string');
                if (received?.method?.length === 0) issues.push('method is empty string');
                if (typeof received?.executionTime !== 'number') issues.push('executionTime is not a number');
                if (received?.executionTime < 0) issues.push('executionTime is negative');
                if (received?.evidence !== undefined && !Array.isArray(received.evidence)) issues.push('evidence is not an array');

                return {
                    message: () => `Expected object to be a valid partial detection result.\nIssues found: ${issues.join(', ')}`,
                    pass: false
                };
            }
        },

        /**
         * Checks if confidence is above a threshold
         */
        toHaveConfidenceAbove(received: any, threshold: number) {
            const pass = received && 
                typeof received.confidence === 'number' && 
                received.confidence > threshold;

            if (pass) {
                return {
                    message: () => `Expected confidence ${received.confidence} not to be above ${threshold}`,
                    pass: true
                };
            } else {
                return {
                    message: () => `Expected confidence to be above ${threshold}, but got ${received?.confidence}`,
                    pass: false
                };
            }
        },

        /**
         * Checks if confidence is below a threshold
         */
        toHaveConfidenceBelow(received: any, threshold: number) {
            const pass = received && 
                typeof received.confidence === 'number' && 
                received.confidence < threshold;

            if (pass) {
                return {
                    message: () => `Expected confidence ${received.confidence} not to be below ${threshold}`,
                    pass: true
                };
            } else {
                return {
                    message: () => `Expected confidence to be below ${threshold}, but got ${received?.confidence}`,
                    pass: false
                };
            }
        },

        /**
         * Checks if the detected CMS matches expected value
         */
        toHaveDetectedCMS(received: any, cms: string) {
            const pass = received && received.cms === cms;

            if (pass) {
                return {
                    message: () => `Expected CMS not to be ${cms}`,
                    pass: true
                };
            } else {
                return {
                    message: () => `Expected CMS to be ${cms}, but got ${received?.cms}`,
                    pass: false
                };
            }
        },

        /**
         * Checks if execution time is within a range
         */
        toHaveExecutedWithin(received: any, minTime: number, maxTime: number) {
            const pass = received && 
                typeof received.executionTime === 'number' &&
                received.executionTime >= minTime && 
                received.executionTime <= maxTime;

            if (pass) {
                return {
                    message: () => `Expected execution time ${received.executionTime} not to be between ${minTime} and ${maxTime}`,
                    pass: true
                };
            } else {
                return {
                    message: () => `Expected execution time to be between ${minTime} and ${maxTime}, but got ${received?.executionTime}`,
                    pass: false
                };
            }
        },

        /**
         * Checks if detection methods include all expected methods
         */
        toHaveUsedMethods(received: any, methods: string[]) {
            const pass = received && 
                Array.isArray(received.detectionMethods) &&
                methods.every(method => received.detectionMethods.includes(method));

            if (pass) {
                return {
                    message: () => `Expected detection methods not to include all of: ${methods.join(', ')}`,
                    pass: true
                };
            } else {
                const missing = methods.filter(method => 
                    !received?.detectionMethods?.includes(method)
                );
                return {
                    message: () => `Expected detection methods to include: ${methods.join(', ')}\nMissing: ${missing.join(', ')}\nActual: ${received?.detectionMethods?.join(', ') || 'none'}`,
                    pass: false
                };
            }
        },

        /**
         * Checks if result represents a failed detection
         */
        toBeFailedDetection(received: any) {
            const pass = received && 
                received.cms === 'Unknown' &&
                received.confidence === 0 &&
                (received.error !== undefined || received.detectionMethods?.length === 0);

            if (pass) {
                return {
                    message: () => `Expected result not to be a failed detection`,
                    pass: true
                };
            } else {
                const issues: string[] = [];
                if (received?.cms !== 'Unknown') issues.push(`cms is '${received?.cms}', not 'Unknown'`);
                if (received?.confidence !== 0) issues.push(`confidence is ${received?.confidence}, not 0`);
                if (!received?.error && received?.detectionMethods?.length > 0) issues.push('no error field and detection methods present');

                return {
                    message: () => `Expected result to be a failed detection.\nIssues: ${issues.join(', ')}`,
                    pass: false
                };
            }
        },

        /**
         * Checks if result shows URL redirection occurred
         */
        toHaveRedirected(received: any) {
            const pass = received && 
                received.originalUrl !== received.finalUrl ||
                (received.redirectCount && received.redirectCount > 0) ||
                received.protocolUpgraded === true;

            if (pass) {
                return {
                    message: () => `Expected result not to show redirection`,
                    pass: true
                };
            } else {
                return {
                    message: () => `Expected result to show redirection (originalUrl != finalUrl, redirectCount > 0, or protocolUpgraded = true)`,
                    pass: false
                };
            }
        },

        /**
         * Checks if value is a valid CMS type
         */
        toBeValidCMSType(received: any) {
            const validCMSTypes = ['WordPress', 'Drupal', 'Joomla', 'Unknown'];
            const pass = typeof received === 'string' && validCMSTypes.includes(received);

            if (pass) {
                return {
                    message: () => `Expected '${received}' not to be a valid CMS type`,
                    pass: true
                };
            } else {
                return {
                    message: () => `Expected '${received}' to be a valid CMS type. Valid types: ${validCMSTypes.join(', ')}`,
                    pass: false
                };
            }
        }
    });
}

/**
 * Sets up all Jest extensions - call this in test setup files
 */
export function setupAllJestExtensions(): void {
    setupJestExtensions();
}

/**
 * Utility to verify Jest extensions are working
 */
export function verifyJestExtensions(): boolean {
    try {
        // Test that our matchers are available
        const mockResult = {
            cms: 'WordPress',
            confidence: 0.9,
            originalUrl: 'https://example.com',
            finalUrl: 'https://example.com',
            executionTime: 100,
            detectionMethods: ['meta-tag']
        };

        // This should not throw if extensions are loaded
        expect(mockResult).toBeValidCMSResult();
        return true;
    } catch (error) {
        console.warn('Jest extensions not properly loaded:', error);
        return false;
    }
}