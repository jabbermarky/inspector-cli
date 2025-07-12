import * as fs from 'fs';
import { extractVersionInfo } from './extract-version-info.js';
import { loadDiscriminativeFeatures } from './discriminative-features.js';
import { evaluateFeature } from './evaluate-feature.js';

/**
 * Types for collected data analysis results
 */
export interface CollectedDataAnalysis {
    versionInfo: Array<{ cms: string; version: string; source: string; confidence?: string }>;
    discriminativeFeatures: {
        featuresFound: number;
        cmsSignals: { [cms: string]: number };
        detectedFeatures: Array<{
            description: string;
            cms: string;
            confidence: number;
        }>;
    };
    error?: string;
    dataExists: boolean;
}

/**
 * Generate analysis data from collected website data JSON file
 * Pure function - no side effects, just data processing
 * 
 * @param dataPath - Path to the JSON data file
 * @returns Structured analysis results or error information
 */
export function generateCollectedDataAnalysis(dataPath: string): CollectedDataAnalysis {
    // Check if data file exists
    if (!fs.existsSync(dataPath)) {
        return {
            versionInfo: [],
            discriminativeFeatures: {
                featuresFound: 0,
                cmsSignals: {},
                detectedFeatures: []
            },
            dataExists: false,
            error: 'Data file not found'
        };
    }

    try {
        // Read and parse data
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

        // Extract version information
        const versionInfo = extractVersionInfo(data);

        // Analyze discriminative features
        const discriminativeFeatures = loadDiscriminativeFeatures();
        let featuresFound = 0;
        const cmsSignals: { [key: string]: number } = {};
        const detectedFeatures: Array<{ description: string; cms: string; confidence: number }> = [];

        discriminativeFeatures.forEach(feature => {
            const present = evaluateFeature(feature, data);
            if (present) {
                featuresFound++;
                cmsSignals[feature.cms] = (cmsSignals[feature.cms] || 0) + feature.confidence;
                detectedFeatures.push({
                    description: feature.description,
                    cms: feature.cms,
                    confidence: feature.confidence
                });
            }
        });

        return {
            versionInfo,
            discriminativeFeatures: {
                featuresFound,
                cmsSignals,
                detectedFeatures
            },
            dataExists: true
        };

    } catch (error) {
        return {
            versionInfo: [],
            discriminativeFeatures: {
                featuresFound: 0,
                cmsSignals: {},
                detectedFeatures: []
            },
            dataExists: true,
            error: `Error reading data: ${(error as Error).message}`
        };
    }
}

/**
 * Get the raw data object from a file for comprehensive analysis
 * Used by display functions that need the full data object
 * 
 * @param dataPath - Path to the JSON data file
 * @returns Parsed data object or null if error
 */
export function loadCollectedDataFile(dataPath: string): any | null {
    try {
        if (!fs.existsSync(dataPath)) {
            return null;
        }
        return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (error) {
        return null;
    }
}