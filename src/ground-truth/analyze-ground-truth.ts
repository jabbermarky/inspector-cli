
import { GroundTruthOptions, GroundTruthResult } from './types.js';
import { generateGroundTruthAnalysis } from './generate-ground-truth-analysis.js';
import { 
    displayGroundTruthAnalysis, 
    displayGroundTruthAnalysisCompact,
    displayGroundTruthAnalysisError,
    displayNoDataFileMessage
} from './display-ground-truth-analysis.js';
import { analyzeCollectedData } from './analyze-collected-data.js';
import { promptForGroundTruthDecision } from './interactive-ui.js';
import { isShuttingDown } from './index.js';

export async function analyzeGroundTruth(
    url: string,
    options: GroundTruthOptions
): Promise<GroundTruthResult> {
    try {
        // Generate analysis data
        const analysis = await generateGroundTruthAnalysis(url, options);
        
        // Handle analysis failure
        if (!analysis.success) {
            if (!isShuttingDown) {
                displayGroundTruthAnalysisError(analysis);
            }
            return { shouldContinue: true };
        }

        // Display based on mode
        if (options.compact) {
            displayGroundTruthAnalysisCompact(analysis);
        } else {
            displayGroundTruthAnalysis(analysis);
        }

        // Analyze collected data if available
        if (analysis.collectedDataAnalysis?.dataPath) {
            // This maintains the existing behavior where analyzeCollectedData handles display
            const detectedVersions = await analyzeCollectedData(
                analysis.collectedDataAnalysis.dataPath, 
                options.compact || false
            );
            
            // Prompt for ground truth decision
            return await promptForGroundTruthDecision(
                url, 
                analysis.finalResult.cms, 
                analysis.finalResult.confidence, 
                detectedVersions, 
                analysis.collectedDataAnalysis.bestVersion
            );
        } else {
            displayNoDataFileMessage();
            return { shouldContinue: true };
        }

    } catch (error) {
        // Only show error if not shutting down
        if (!isShuttingDown) {
            const failedAnalysis = {
                url,
                error: (error as Error).message,
                success: false
            } as any;
            displayGroundTruthAnalysisError(failedAnalysis);
        }
        return { shouldContinue: true };
    }
}
