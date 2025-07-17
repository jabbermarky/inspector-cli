import { loadDiscriminativeFeatures } from './discriminative-features.js';
import { evaluateFeature } from './evaluate-feature.js';

/**
 * Extract standardized hybrid pattern names from collected data analysis
 * 
 * @param data - The collected website data
 * @returns Array of hybrid pattern names that are present in the data
 */
export function extractHybridPatterns(data: any): string[] {
    const discriminativeFeatures = loadDiscriminativeFeatures();
    const foundPatterns: string[] = [];

    discriminativeFeatures.forEach(feature => {
        const present = evaluateFeature(feature, data);
        if (present) {
            foundPatterns.push(feature.hybridPatternName);
        }
    });

    return foundPatterns;
}

/**
 * Extract hybrid patterns grouped by CMS
 * 
 * @param data - The collected website data  
 * @returns Object with patterns grouped by CMS
 */
export function extractHybridPatternsByCMS(data: any): { [cms: string]: string[] } {
    const discriminativeFeatures = loadDiscriminativeFeatures();
    const patternsByCMS: { [cms: string]: string[] } = {};

    discriminativeFeatures.forEach(feature => {
        const present = evaluateFeature(feature, data);
        if (present) {
            if (!patternsByCMS[feature.cms]) {
                patternsByCMS[feature.cms] = [];
            }
            patternsByCMS[feature.cms].push(feature.hybridPatternName);
        }
    });

    return patternsByCMS;
}

/**
 * Get all available hybrid pattern names for a specific CMS
 * 
 * @param cms - CMS name (WordPress, Drupal, Joomla, Duda)
 * @returns Array of all available hybrid pattern names for the CMS
 */
export function getAvailableHybridPatterns(cms: string): string[] {
    const discriminativeFeatures = loadDiscriminativeFeatures();
    return discriminativeFeatures
        .filter(feature => feature.cms === cms)
        .map(feature => feature.hybridPatternName);
}

/**
 * Get discriminative feature details by hybrid pattern name
 * 
 * @param hybridPatternName - The hybrid pattern name to look up
 * @returns Discriminative feature object or null if not found
 */
export function getFeatureByHybridPattern(hybridPatternName: string) {
    const discriminativeFeatures = loadDiscriminativeFeatures();
    return discriminativeFeatures.find(feature => feature.hybridPatternName === hybridPatternName) || null;
}