import { generateCollectedDataAnalysis, loadCollectedDataFile } from './generate-collected-data-analysis.js';
import { 
    displayCollectedDataAnalysis, 
    displayCollectedDataAnalysisCompact 
} from './display-collected-data-analysis.js';

/**
 * Analyze and display collected data from a JSON file
 * Orchestrates data generation and display (refactored from original monolithic function)
 * 
 * @param dataPath - Path to the JSON data file
 * @param compactMode - Whether to show compact output
 * @returns Array of detected versions with CMS, version, source and confidence
 */
export async function analyzeCollectedData(
    dataPath: string,
    compactMode: boolean
): Promise<Array<{ cms: string; version: string; source: string; confidence?: string }>> {
    // Generate analysis data
    const analysis = generateCollectedDataAnalysis(dataPath);
    
    // Display based on mode
    if (compactMode) {
        displayCollectedDataAnalysisCompact(analysis);
    } else {
        // Load raw data for comprehensive analysis
        const rawData = loadCollectedDataFile(dataPath);
        displayCollectedDataAnalysis(analysis, rawData);
    }

    // Return version information for use in prompts
    return analysis.versionInfo;
}