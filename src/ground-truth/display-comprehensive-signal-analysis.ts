import { displayMessage } from './interactive-ui-utils.js';
import { 
    analyzeScriptSignals,
    analyzeHtmlSignals,
    analyzeMetaSignals,
    analyzeHeaderSignals,
    analyzeStylesheetSignals,
    analyzeVersionSignals,
    analyzeDudaSignals
} from './signal-analysis.js';
import { displaySignalCategory } from './display-signal-category.js';
import { displaySignalStrengthSummary } from './display-signal-strength-summary.js';

/**
 * Display comprehensive signal analysis for collected data
 * This function orchestrates multiple analysis functions and displays results
 * 
 * @param data - The collected website data
 * 
 * Display functions intentionally have console output side effects
 */
export function displayComprehensiveSignalAnalysis(data: any): void {
    displayMessage(`\n🔬 Discriminative Signal Analysis:`);
    displayMessage('─'.repeat(80));

    // Analyze all signal categories
    const scriptSignals = analyzeScriptSignals(data);
    const htmlSignals = analyzeHtmlSignals(data);
    const metaSignals = analyzeMetaSignals(data);
    const headerSignals = analyzeHeaderSignals(data);
    const stylesheetSignals = analyzeStylesheetSignals(data);
    const dudaSignals = analyzeDudaSignals(data);
    const versionSignals = analyzeVersionSignals(data);

    // Display each category
    displaySignalCategory('SCRIPT PATTERNS', scriptSignals);
    displaySignalCategory('HTML CONTENT PATTERNS', htmlSignals);
    displaySignalCategory('META TAG SIGNALS', metaSignals);
    displaySignalCategory('HTTP HEADERS', headerSignals);
    displaySignalCategory('STYLESHEET PATTERNS', stylesheetSignals);
    displaySignalCategory('DUDA WEBSITE BUILDER', dudaSignals);
    displaySignalCategory('VERSION ANALYSIS', versionSignals);

    // Calculate and display signal strength summary
    displaySignalStrengthSummary(
        scriptSignals,
        htmlSignals,
        metaSignals,
        headerSignals,
        stylesheetSignals,
        dudaSignals
    );
}

// DEPRECATED: Use displayComprehensiveSignalAnalysis instead
export function showComprehensiveSignalAnalysis(data: any): void {
    console.warn('showComprehensiveSignalAnalysis is deprecated. Use displayComprehensiveSignalAnalysis instead.');
    displayComprehensiveSignalAnalysis(data);
}