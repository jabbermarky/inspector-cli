import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import { CaptureVersion, ScanSession, ScanHistory } from './types.js';
import { InspectorConfig } from '../config.js';
import { createModuleLogger } from '../logger.js';

const logger = createModuleLogger('version-manager');

/**
 * Manages version information and scan history for data capture
 */
export class VersionManager {
    private static instance: VersionManager;
    private sessionId: string;
    private cachedVersion: CaptureVersion | null = null;
    private scanHistoryPath: string;
    
    private constructor() {
        this.sessionId = this.generateSessionId();
        this.scanHistoryPath = join(process.cwd(), 'data', 'scan-history.json');
        this.ensureDataDirectory();
    }
    
    public static getInstance(): VersionManager {
        if (!VersionManager.instance) {
            VersionManager.instance = new VersionManager();
        }
        return VersionManager.instance;
    }
    
    /**
     * Get current version info (cached per session)
     */
    public getCurrentVersion(): CaptureVersion {
        if (!this.cachedVersion) {
            logger.debug('Generating version info for session', { sessionId: this.sessionId });
            this.cachedVersion = this.generateVersion();
        }
        return this.cachedVersion;
    }
    
    /**
     * Get current session ID
     */
    public getSessionId(): string {
        return this.sessionId;
    }
    
    /**
     * Log a new scan session
     */
    public logScanSession(command: string, urlCount: number, results?: {
        successful: number;
        failed: number;
        blocked: number;
        duration: number;
    }): void {
        logger.debug('Logging scan session', { sessionId: this.sessionId, command, urlCount });
        
        const session: ScanSession = {
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            command,
            urlCount,
            captureVersion: this.getCurrentVersion(),
            results: results || {
                successful: 0,
                failed: 0,
                blocked: 0,
                duration: 0
            }
        };
        
        this.appendToHistory(session);
    }
    
    /**
     * Generate a new session ID: YYYYMMDD-HHMMSS-XXXX
     */
    private generateSessionId(): string {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 19).replace(/[-:T]/g, '').slice(0, 15);
        const randomChars = Math.random().toString(36).substr(2, 4);
        return `${dateStr.slice(0, 8)}-${dateStr.slice(8, 14)}-${randomChars}`;
    }
    
    /**
     * Generate complete version information
     */
    private generateVersion(): CaptureVersion {
        return {
            schema: '1', // Current schema version
            engine: {
                version: this.getPackageVersion(),
                commit: this.getGitCommitHash(),
                buildDate: new Date().toISOString()
            },
            algorithms: {
                detection: '3', // Current detection algorithm version (baseline)
                confidence: '2'  // Current confidence algorithm version (baseline)
            },
            patterns: {
                lastUpdated: this.getPatternTimestamp()
            },
            features: this.scanConfigFeatures()
        };
    }
    
    /**
     * Get package version from package.json
     */
    private getPackageVersion(): string {
        try {
            const packagePath = join(process.cwd(), 'package.json');
            const packageContent = readFileSync(packagePath, 'utf8');
            const packageData = JSON.parse(packageContent);
            return packageData.version || 'unknown';
        } catch (error) {
            logger.warn('Failed to read package version', error as Error);
            return 'unknown';
        }
    }
    
    /**
     * Get git commit hash
     */
    private getGitCommitHash(): string {
        try {
            const commitHash = execSync('git rev-parse HEAD', { 
                encoding: 'utf8',
                cwd: process.cwd(),
                timeout: 5000
            }).trim();
            return commitHash;
        } catch (error) {
            logger.debug('Failed to get git commit hash', error as Error);
            return 'unknown';
        }
    }
    
    /**
     * Get latest pattern timestamp from all src/utils/cms files
     */
    private getPatternTimestamp(): string {
        try {
            const cmsDir = join(process.cwd(), 'src', 'utils', 'cms');
            const latestTimestamp = this.getLatestFileTimestamp(cmsDir);
            return new Date(latestTimestamp).toISOString();
        } catch (error) {
            logger.warn('Failed to get pattern timestamp', error as Error);
            return new Date().toISOString();
        }
    }
    
    /**
     * Recursively find latest file modification time
     */
    private getLatestFileTimestamp(dir: string): number {
        let latestTime = 0;
        
        try {
            const items = readdirSync(dir, { withFileTypes: true });
            
            for (const item of items) {
                const fullPath = join(dir, item.name);
                
                if (item.isDirectory()) {
                    const subDirLatest = this.getLatestFileTimestamp(fullPath);
                    latestTime = Math.max(latestTime, subDirLatest);
                } else if (item.isFile() && item.name.endsWith('.ts')) {
                    const stat = statSync(fullPath);
                    latestTime = Math.max(latestTime, stat.mtime.getTime());
                }
            }
        } catch (error) {
            logger.debug('Error reading directory', { dir, error: (error as Error).message });
        }
        
        return latestTime || Date.now();
    }
    
    /**
     * Scan configuration for all feature flags
     */
    private scanConfigFeatures(): { [key: string]: any; experimentalFlags: string[] } {
        const features: { [key: string]: any; experimentalFlags: string[] } = {
            experimentalFlags: []
        };
        
        try {
            // Scan config file for features
            const configFeatures = this.scanConfigFile();
            Object.assign(features, configFeatures);
            
            // Scan environment variables for features
            const envFeatures = this.scanEnvironmentFeatures();
            Object.assign(features, envFeatures);
            
            // Look for experimental flags in environment
            const experimentalFlags = this.scanExperimentalFlags();
            features.experimentalFlags = experimentalFlags;
            
        } catch (error) {
            logger.warn('Failed to scan config features', error as Error);
        }
        
        return features;
    }
    
    /**
     * Scan config file for feature values
     */
    private scanConfigFile(): { [key: string]: any } {
        const features: { [key: string]: any } = {};
        
        try {
            const configPath = join(process.cwd(), 'src', 'utils', 'config.ts');
            const configContent = readFileSync(configPath, 'utf8');
            
            // Extract default values from config
            const defaultsMatch = configContent.match(/const defaults: InspectorConfig = {[\s\S]*?};/);
            if (defaultsMatch) {
                // Simple extraction of boolean/string/number values
                const booleanMatches = defaultsMatch[0].match(/(\w+):\s*(true|false)/g);
                if (booleanMatches) {
                    for (const match of booleanMatches) {
                        const [, key, value] = match.match(/(\w+):\s*(true|false)/) || [];
                        if (key && value) {
                            features[key] = value === 'true';
                        }
                    }
                }
                
                const numberMatches = defaultsMatch[0].match(/(\w+):\s*(\d+)/g);
                if (numberMatches) {
                    for (const match of numberMatches) {
                        const [, key, value] = match.match(/(\w+):\s*(\d+)/) || [];
                        if (key && value) {
                            features[key] = parseInt(value, 10);
                        }
                    }
                }
            }
        } catch (error) {
            logger.debug('Error scanning config file', error as Error);
        }
        
        return features;
    }
    
    /**
     * Scan environment variables for feature flags
     */
    private scanEnvironmentFeatures(): { [key: string]: any } {
        const features: { [key: string]: any } = {};
        
        // Look for environment variables that might be feature flags
        const envVars = process.env;
        const featurePatterns = [
            /^ENABLE_/,
            /^DISABLE_/,
            /^EXPERIMENTAL_/,
            /^PUPPETEER_/,
            /^API_/,
            /^LOG_/
        ];
        
        for (const [key, value] of Object.entries(envVars)) {
            if (featurePatterns.some(pattern => pattern.test(key)) && value !== undefined) {
                // Convert string values to appropriate types
                if (value === 'true') {
                    features[key] = true;
                } else if (value === 'false') {
                    features[key] = false;
                } else if (/^\d+$/.test(value)) {
                    features[key] = parseInt(value, 10);
                } else if (/^\d+\.\d+$/.test(value)) {
                    features[key] = parseFloat(value);
                } else {
                    features[key] = value;
                }
            }
        }
        
        return features;
    }
    
    /**
     * Scan for experimental flags
     */
    private scanExperimentalFlags(): string[] {
        const flags: string[] = [];
        
        // Look for experimental flags in environment
        const envVars = process.env;
        for (const [key, value] of Object.entries(envVars)) {
            if (key.startsWith('EXPERIMENTAL_') && value === 'true') {
                flags.push(key);
            }
        }
        
        return flags;
    }
    
    /**
     * Ensure data directory exists
     */
    private ensureDataDirectory(): void {
        try {
            const dataDir = dirname(this.scanHistoryPath);
            if (!existsSync(dataDir)) {
                // Create directory recursively
                const { mkdirSync } = require('fs');
                mkdirSync(dataDir, { recursive: true });
            }
        } catch (error) {
            logger.warn('Failed to create data directory', error as Error);
        }
    }
    
    /**
     * Append session to scan history
     */
    private appendToHistory(session: ScanSession): void {
        try {
            let history: ScanHistory;
            
            if (existsSync(this.scanHistoryPath)) {
                const historyContent = readFileSync(this.scanHistoryPath, 'utf8');
                history = JSON.parse(historyContent);
            } else {
                history = {
                    sessions: [],
                    metadata: {
                        totalSessions: 0,
                        lastUpdated: new Date().toISOString()
                    }
                };
            }
            
            // Add new session
            history.sessions.push(session);
            
            // Update metadata
            history.metadata.totalSessions = history.sessions.length;
            history.metadata.lastUpdated = new Date().toISOString();
            
            // Write back to file
            writeFileSync(this.scanHistoryPath, JSON.stringify(history, null, 2));
            
            logger.debug('Scan session logged to history', { 
                sessionId: session.sessionId,
                totalSessions: history.metadata.totalSessions
            });
            
        } catch (error) {
            logger.error('Failed to append to scan history', error as Error);
        }
    }
}

/**
 * Convenience function to get current version manager instance
 */
export function getVersionManager(): VersionManager {
    return VersionManager.getInstance();
}

/**
 * Convenience function to get current version info
 */
export function getCurrentVersion(): CaptureVersion {
    return getVersionManager().getCurrentVersion();
}

/**
 * Convenience function to log a scan session
 */
export function logScanSession(command: string, urlCount: number, results?: {
    successful: number;
    failed: number;
    blocked: number;
    duration: number;
}): void {
    getVersionManager().logScanSession(command, urlCount, results);
}