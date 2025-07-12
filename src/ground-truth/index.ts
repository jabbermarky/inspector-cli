export * from './types.js';
export { displayMessage } from './interactive-ui-utils.js';
export { getUserChoice, getTextInput, displayVersionAnalysis, displayStats, cleanup } from './interactive-ui.js';
export { generateGroundTruthStats, getDefaultDatabasePath } from './generate-stats.js';
export { displayGroundTruthStats, displayStatsummary } from './display-stats.js';
export { generateAdditionalContext, hasAdditionalContext } from './generate-additional-context.js';
export { 
    displayAdditionalContext, 
    displayAdditionalContextCompact, 
    displayAdditionalContextMinimal 
} from './display-additional-context.js';
export { displayAdditionalContextFromData } from './display-additional-context-orchestrator.js';
export { displayComprehensiveSignalAnalysis } from './display-comprehensive-signal-analysis.js';
export { generateCollectedDataAnalysis, loadCollectedDataFile } from './generate-collected-data-analysis.js';
export { 
    displayCollectedDataAnalysis, 
    displayCollectedDataAnalysisCompact,
    displayVersionInfoOnly,
    displayDiscriminativeFeaturesSummary 
} from './display-collected-data-analysis.js';
export { generateGroundTruthAnalysis } from './generate-ground-truth-analysis.js';
export { 
    displayGroundTruthAnalysis, 
    displayGroundTruthAnalysisCompact,
    displayGroundTruthAnalysisError,
    displayNoDataFileMessage 
} from './display-ground-truth-analysis.js';
export { analyzeGroundTruth } from './analyze-ground-truth.js';
export { promptForGroundTruthDecision } from './interactive-ui.js';
export { 
    displayBatchStart, 
    displayUrlProgress, 
    displayBatchComplete, 
    displayBatchInterrupted, 
    displayProcessingError 
} from './display-batch-progress.js';
export { 
    displayShutdownReceived, 
    displayInputValidationError, 
    displayCommandError 
} from './display-shutdown-messages.js';

// Instance variables moved from GroundTruthDiscovery class
export let isShuttingDown: boolean = false;
export let compactMode: boolean = false;

// Setters for the instance variables
export function setShuttingDown(value: boolean): void {
    isShuttingDown = value;
}

export function setCompactMode(value: boolean): void {
    compactMode = value;
}
