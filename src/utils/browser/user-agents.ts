/**
 * User agent management and rotation for bot detection evasion
 */

import { createModuleLogger } from '../logger.js';

const logger = createModuleLogger('user-agents');

/**
 * Comprehensive pool of realistic user agents for bot detection evasion
 * Updated regularly to match current browser market share and versions
 */
export const DEFAULT_USER_AGENT_POOL = [
    // Chrome on Windows (most common)
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    
    // Chrome on macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    
    // Chrome on Linux
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    
    // Firefox on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:119.0) Gecko/20100101 Firefox/119.0',
    
    // Firefox on macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0',
    
    // Safari on macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    
    // Edge on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
    
    // Mobile Chrome (Android)
    'Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
    
    // Mobile Safari (iOS)
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    
    // Less common but realistic browsers
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0',
    
    // Slightly older but still common versions
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36'
];

/**
 * User agent manager for rotation and bot detection evasion
 */
export class UserAgentManager {
    private pool: string[];
    private currentIndex: number = 0;
    private requestCount: number = 0;
    private strategy: 'random' | 'sequential';
    private updateFrequency: number;

    constructor(
        pool: string[] = DEFAULT_USER_AGENT_POOL,
        strategy: 'random' | 'sequential' = 'random',
        updateFrequency: number = 1
    ) {
        this.pool = [...pool]; // Clone array to avoid mutations
        this.strategy = strategy;
        this.updateFrequency = updateFrequency;
        
        if (this.pool.length === 0) {
            throw new Error('User agent pool cannot be empty');
        }
        
        logger.debug('UserAgentManager initialized', {
            poolSize: this.pool.length,
            strategy: this.strategy,
            updateFrequency: this.updateFrequency
        });
    }

    /**
     * Get the next user agent based on the configured strategy
     */
    getNext(): string {
        let userAgent: string;
        
        if (this.strategy === 'random') {
            const randomIndex = Math.floor(Math.random() * this.pool.length);
            userAgent = this.pool[randomIndex];
        } else {
            // Sequential strategy
            userAgent = this.pool[this.currentIndex];
            this.currentIndex = (this.currentIndex + 1) % this.pool.length;
        }
        
        this.requestCount++;
        
        logger.debug('Selected user agent', {
            strategy: this.strategy,
            userAgent: userAgent.substring(0, 50) + '...',
            requestCount: this.requestCount
        });
        
        return userAgent;
    }

    /**
     * Check if user agent should be rotated based on update frequency
     */
    shouldRotate(): boolean {
        return this.requestCount % this.updateFrequency === 0;
    }

    /**
     * Get current user agent without advancing the rotation
     */
    getCurrent(): string {
        if (this.strategy === 'random') {
            // For random strategy, just return a random one since there's no "current"
            return this.pool[Math.floor(Math.random() * this.pool.length)];
        } else {
            return this.pool[this.currentIndex];
        }
    }

    /**
     * Reset the rotation state
     */
    reset(): void {
        this.currentIndex = 0;
        this.requestCount = 0;
        logger.debug('UserAgentManager reset');
    }

    /**
     * Get statistics about user agent usage
     */
    getStats(): {
        poolSize: number;
        requestCount: number;
        strategy: string;
        updateFrequency: number;
    } {
        return {
            poolSize: this.pool.length,
            requestCount: this.requestCount,
            strategy: this.strategy,
            updateFrequency: this.updateFrequency
        };
    }

    /**
     * Add new user agents to the pool
     */
    addUserAgents(userAgents: string[]): void {
        this.pool.push(...userAgents);
        logger.debug('Added user agents to pool', {
            added: userAgents.length,
            totalPoolSize: this.pool.length
        });
    }

    /**
     * Get a random user agent for one-off use (doesn't affect rotation state)
     */
    static getRandomUserAgent(pool: string[] = DEFAULT_USER_AGENT_POOL): string {
        const randomIndex = Math.floor(Math.random() * pool.length);
        return pool[randomIndex];
    }

    /**
     * Get user agent information (browser, OS, version) from user agent string
     */
    static parseUserAgent(userAgent: string): {
        browser: string;
        version: string;
        os: string;
        mobile: boolean;
    } {
        let browser = 'Unknown';
        let version = 'Unknown';
        let os = 'Unknown';
        let mobile = false;

        // Detect mobile
        mobile = /Mobile|Android|iPhone|iPad/.test(userAgent);

        // Detect browser
        if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
            browser = 'Chrome';
            const match = userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
            if (match) version = match[1];
        } else if (userAgent.includes('Firefox')) {
            browser = 'Firefox';
            const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
            if (match) version = match[1];
        } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
            browser = 'Safari';
            const match = userAgent.match(/Version\/(\d+\.\d+)/);
            if (match) version = match[1];
        } else if (userAgent.includes('Edg')) {
            browser = 'Edge';
            const match = userAgent.match(/Edg\/(\d+\.\d+\.\d+\.\d+)/);
            if (match) version = match[1];
        }

        // Detect OS
        if (userAgent.includes('Windows NT')) {
            os = 'Windows';
            if (userAgent.includes('Windows NT 10.0')) os = 'Windows 10/11';
        } else if (userAgent.includes('Mac OS X')) {
            os = 'macOS';
            const match = userAgent.match(/Mac OS X (\d+_\d+_?\d*)/);
            if (match) os = `macOS ${match[1].replace(/_/g, '.')}`;
        } else if (userAgent.includes('Linux')) {
            os = 'Linux';
        } else if (userAgent.includes('Android')) {
            os = 'Android';
            const match = userAgent.match(/Android (\d+(?:\.\d+)?)/);
            if (match) os = `Android ${match[1]}`;
        } else if (userAgent.includes('iPhone OS') || userAgent.includes('CPU OS')) {
            os = 'iOS';
            const match = userAgent.match(/OS (\d+_\d+_?\d*)/);
            if (match) os = `iOS ${match[1].replace(/_/g, '.')}`;
        }

        return { browser, version, os, mobile };
    }
}