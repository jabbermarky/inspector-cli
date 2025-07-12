import { displayMessage } from './interactive-ui-utils.js';
import { GroundTruthAnalysis } from './generate-ground-truth-analysis.js';

/**
 * Display ground truth analysis in full format
 * 
 * @param analysis - Analysis results from generateGroundTruthAnalysis
 */
export function displayGroundTruthAnalysis(analysis: GroundTruthAnalysis): void {
    // Display header
    displayMessage(`\n Analyzing: ${analysis.url}`);
    displayMessage('═'.repeat(80));

    // Display robots.txt analysis
    displayMessage('\n Robots.txt Analysis:');
    displayMessage('─'.repeat(50));
    
    displayRobotsAnalysisFull(analysis.robotsAnalysis);

    // Display main page detection
    displayMessage('\n🌐 Main Page Detection:');
    displayMessage('─'.repeat(50));
    
    displayMainPageAnalysisFull(analysis.mainPageAnalysis);

    // Display comparison
    displayMessage('\n🔄 Detection Comparison:');
    displayMessage('─'.repeat(50));
    
    displayResultComparisonFull(analysis.robotsAnalysis, analysis.mainPageAnalysis, analysis.finalResult);

    // Display collected data analysis if available
    if (analysis.collectedDataAnalysis?.dataPath) {
        // This will display the full collected data analysis
        // Note: This maintains the existing behavior where analyzeCollectedData handles its own display
        // In a future refactor, this could be changed to use the separated display functions
    }
}

/**
 * Display ground truth analysis in compact format
 * 
 * @param analysis - Analysis results from generateGroundTruthAnalysis
 */
export function displayGroundTruthAnalysisCompact(analysis: GroundTruthAnalysis): void {
    // Display header (compact)
    displayMessage(`\n Analyzing: ${analysis.url}`);

    // Display robots.txt analysis (compact)
    displayRobotsAnalysisCompact(analysis.robotsAnalysis);

    // Display main page detection (compact)
    displayMainPageAnalysisCompact(analysis.mainPageAnalysis);

    // Display final result (compact)
    displayResultComparisonCompact(analysis.finalResult);

    // Display collected data analysis if available (compact)
    if (analysis.collectedDataAnalysis?.dataPath) {
        // This will display the compact collected data analysis
        // Note: This maintains the existing behavior
    }
}

/**
 * Display robots.txt analysis in full format
 */
function displayRobotsAnalysisFull(robotsAnalysis: GroundTruthAnalysis['robotsAnalysis']): void {
    displayMessage(`📍 robots.txt URL: ${robotsAnalysis.url || 'N/A'}`);
    
    if (robotsAnalysis.error) {
        displayMessage(`❌ Error: ${robotsAnalysis.error}`);
    } else {
        const contentLength = robotsAnalysis.content?.length || 0;
        displayMessage(`✅ Success: ${contentLength} bytes`);
        displayMessage(`🎯 Detection: ${robotsAnalysis.cms} (${(robotsAnalysis.confidence * 100).toFixed(1)}%)`);
        
        if (robotsAnalysis.signals.length > 0) {
            displayMessage(`📋 Signals found:`);
            robotsAnalysis.signals.forEach(signal => {
                displayMessage(`   • ${signal}`);
            });
        }
        
        // Show interesting headers
        if (robotsAnalysis.interestingHeaders && Object.keys(robotsAnalysis.interestingHeaders).length > 0) {
            displayMessage(`📊 HTTP Headers:`);
            Object.entries(robotsAnalysis.interestingHeaders).forEach(([key, value]) => {
                displayMessage(`   ${key}: ${value}`);
            });
        }
    }
}

/**
 * Display robots.txt analysis in compact format
 */
function displayRobotsAnalysisCompact(robotsAnalysis: GroundTruthAnalysis['robotsAnalysis']): void {
    if (robotsAnalysis.error) {
        displayMessage(`   🤖 robots.txt: ❌ ${robotsAnalysis.error}`);
    } else {
        const topSignals = robotsAnalysis.signals.slice(0, 2).join(', ');
        const signalsText = topSignals ? ` via ${topSignals}` : '';
        displayMessage(`   🤖 robots.txt: ${robotsAnalysis.cms} (${(robotsAnalysis.confidence * 100).toFixed(1)}%)${signalsText}`);
    }
}

/**
 * Display main page analysis in full format
 */
function displayMainPageAnalysisFull(mainPageAnalysis: GroundTruthAnalysis['mainPageAnalysis']): void {
    const executionTime = mainPageAnalysis.executionTime || 0;
    displayMessage(`📊 Detection Result: ${mainPageAnalysis.cms} (${(mainPageAnalysis.confidence * 100).toFixed(1)}% confidence) | ${executionTime}ms`);
    
    if (mainPageAnalysis.error) {
        displayMessage(`❌ Error: ${mainPageAnalysis.error}`);
    }
}

/**
 * Display main page analysis in compact format
 */
function displayMainPageAnalysisCompact(mainPageAnalysis: GroundTruthAnalysis['mainPageAnalysis']): void {
    if (mainPageAnalysis.error) {
        displayMessage(`   🌐 main page: ❌ ${mainPageAnalysis.error}`);
    } else {
        const executionTime = mainPageAnalysis.executionTime || 0;
        displayMessage(`   🌐 main page: ${mainPageAnalysis.cms} (${(mainPageAnalysis.confidence * 100).toFixed(1)}%) | ${executionTime}ms`);
    }
}

/**
 * Display result comparison in full format
 */
function displayResultComparisonFull(
    robotsAnalysis: GroundTruthAnalysis['robotsAnalysis'],
    mainPageAnalysis: GroundTruthAnalysis['mainPageAnalysis'],
    finalResult: GroundTruthAnalysis['finalResult']
): void {
    const robotsConf = (robotsAnalysis.confidence * 100).toFixed(1);
    const mainConf = (mainPageAnalysis.confidence * 100).toFixed(1);
    
    displayMessage(`🤖 robots.txt: ${robotsAnalysis.cms} (${robotsConf}%)`);
    displayMessage(`🌐 main page:  ${mainPageAnalysis.cms} (${mainConf}%)`);
    
    if (finalResult.bothDetected) {
        if (finalResult.agreement) {
            displayMessage(`✅ Agreement: Both methods detected ${mainPageAnalysis.cms}`);
        } else {
            displayMessage(`⚠️  Disagreement: robots.txt says ${robotsAnalysis.cms}, main page says ${mainPageAnalysis.cms}`);
        }
    }
}

/**
 * Display result comparison in compact format
 */
function displayResultComparisonCompact(finalResult: GroundTruthAnalysis['finalResult']): void {
    const finalConfidencePercent = (finalResult.confidence * 100).toFixed(1);
    
    if (finalResult.bothDetected) {
        if (finalResult.agreement) {
            displayMessage(`   ✅ Final: ${finalResult.cms} (${finalConfidencePercent}%) - both methods agree`);
        } else {
            displayMessage(`   ⚠️  Final: ${finalResult.cms} (${finalConfidencePercent}%) via ${finalResult.method} - methods disagree`);
        }
    } else {
        displayMessage(`   📊 Final: ${finalResult.cms} (${finalConfidencePercent}%) via ${finalResult.method}`);
    }
}

/**
 * Display error message for failed analysis
 * 
 * @param analysis - Failed analysis results
 */
export function displayGroundTruthAnalysisError(analysis: GroundTruthAnalysis): void {
    if (analysis.error) {
        displayMessage(`\n❌ Error analyzing ${analysis.url}: ${analysis.error}`);
    }
}

/**
 * Display no data file message
 */
export function displayNoDataFileMessage(): void {
    displayMessage('\n❌ No data file found for analysis');
}