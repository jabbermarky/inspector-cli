/**
 * Test-specific type definitions
 * 
 * Provides TypeScript interfaces and types that are specific to testing
 * and help with mock type safety and test interface extensions.
 */

import { DetectionPage } from '../utils/cms/types.js';
import { BrowserManagerConfig } from '../utils/browser/types.js';

/**
 * Extended DetectionPage interface for robots.txt testing
 * Adds test-specific properties needed for robots.txt strategy tests
 */
export interface RobotsTxtTestPage extends DetectionPage {
    _robotsTxtData?: {
        accessible: boolean;
        content: string;
        patterns: {
            disallowedPaths: string[];
            sitemapUrls: string[];
            userAgents?: string[];
        } | null;
        size?: number;
        statusCode?: number;
        error?: string;
    } | null;
}

/**
 * Extended DetectionPage interface for HTTP header testing
 * Adds test-specific properties needed for HTTP header strategy tests
 */
export interface HttpHeaderTestPage extends DetectionPage {
    _browserManagerContext?: {
        purpose: 'detection' | 'analysis';
        createdAt: number;
        navigationCount: number;
        lastNavigation: {
            originalUrl: string;
            finalUrl: string;
            redirectChain: any[];
            totalRedirects: number;
            navigationTime: number;
            protocolUpgraded: boolean;
            success: boolean;
            headers: Record<string, string>;
        };
    };
}

/**
 * Combined test page interface with all strategy-specific extensions
 */
export interface ExtendedTestPage extends DetectionPage {
    _robotsTxtData?: RobotsTxtTestPage['_robotsTxtData'];
    _browserManagerContext?: HttpHeaderTestPage['_browserManagerContext'];
}

/**
 * Test configuration interface for mock factories
 */
export interface TestConfig {
    defaultUrl: string;
    defaultTitle: string;
    defaultContent: string;
    defaultUserAgent: string;
    timeouts: {
        default: number;
        browser: number;
        strategy: number;
    };
}

/**
 * Mock configuration for different test scenarios
 */
export interface MockScenario {
    name: string;
    description: string;
    pageOptions: any;
    expectedResult: any;
}

/**
 * Strategy test configuration
 */
export interface StrategyTestConfig {
    strategyName: string;
    cmsType: string;
    positiveTestCases: MockScenario[];
    negativeTestCases: MockScenario[];
    edgeCases: MockScenario[];
}

/**
 * Default test configuration values
 */
export const DEFAULT_TEST_CONFIG: TestConfig = {
    defaultUrl: 'https://example.com',
    defaultTitle: 'Example Title',
    defaultContent: '<html><head><title>Example</title></head><body><h1>Hello</h1></body></html>',
    defaultUserAgent: 'Mozilla/5.0 (compatible; Inspector-CLI/1.0)',
    timeouts: {
        default: 5000,
        browser: 10000,
        strategy: 3000
    }
};