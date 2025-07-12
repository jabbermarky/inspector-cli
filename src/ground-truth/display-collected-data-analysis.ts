import { displayMessage } from './interactive-ui-utils.js';
import { CollectedDataAnalysis } from './generate-collected-data-analysis.js';
import { displayComprehensiveSignalAnalysis } from './display-comprehensive-signal-analysis.js';

/**
 * Get confidence indicator icon for display
 */
function getConfidenceIndicator(confidence: number): string {
    if (confidence >= 0.8) return '🟢';
    if (confidence >= 0.5) return '🟡';
    return '🔴';
}

/**
 * Display collected data analysis in full format
 * 
 * @param analysis - Analysis results from generateCollectedDataAnalysis
 * @param rawData - Raw data object for comprehensive analysis (optional)
 */
export function displayCollectedDataAnalysis(
    analysis: CollectedDataAnalysis, 
    rawData?: any
): void {
    // Handle error cases
    if (!analysis.dataExists) {
        displayMessage('❌ No data file found for analysis');
        return;
    }

    if (analysis.error) {
        displayMessage(`❌ Error analyzing data: ${analysis.error}`);
        return;
    }

    // Display discriminative feature analysis
    displayMessage(`\n🔬 Discriminative Feature Analysis:`);
    displayMessage('─'.repeat(80));

    if (analysis.discriminativeFeatures.featuresFound === 0) {
        displayMessage('   ❌ No discriminative features found');
    } else {
        analysis.discriminativeFeatures.detectedFeatures.forEach(feature => {
            const indicator = getConfidenceIndicator(feature.confidence);
            displayMessage(`   ${indicator} ${feature.description} (${feature.cms})`);
        });
    }

    // Display CMS signal strength
    displayMessage(`\n📈 CMS Signal Strength:`);
    displayMessage('─'.repeat(40));

    const sortedSignals = Object.entries(analysis.discriminativeFeatures.cmsSignals)
        .sort(([, a], [, b]) => b - a);

    if (sortedSignals.length > 0) {
        sortedSignals.forEach(([cms, score]) => {
            const percentage = (score * 100).toFixed(1);
            const bar = '█'.repeat(Math.round(score * 20));
            displayMessage(`   ${cms.padEnd(10)} ${bar} ${percentage}%`);
        });
    } else {
        displayMessage('   No clear CMS signals detected');
    }

    // Show comprehensive signal analysis if raw data available
    if (rawData) {
        displayComprehensiveSignalAnalysis(rawData);
    }
}

/**
 * Display collected data analysis in compact format
 * 
 * @param analysis - Analysis results from generateCollectedDataAnalysis
 */
export function displayCollectedDataAnalysisCompact(analysis: CollectedDataAnalysis): void {
    // Handle error cases
    if (!analysis.dataExists) {
        displayMessage('   📊 No data file');
        return;
    }

    if (analysis.error) {
        displayMessage(`   📊 Error: ${analysis.error}`);
        return;
    }

    // Show version info if detected
    if (analysis.versionInfo.length > 0) {
        const bestVersion = analysis.versionInfo[0]; // Already sorted by confidence
        displayMessage(`   🔢 Version: ${bestVersion.version} (${bestVersion.source})`);
    }

    // Show top CMS signal if available
    const sortedSignals = Object.entries(analysis.discriminativeFeatures.cmsSignals)
        .sort(([, a], [, b]) => b - a);
    
    if (sortedSignals.length > 0) {
        const [topCms, score] = sortedSignals[0];
        const percentage = (score * 100).toFixed(1);
        displayMessage(`   📊 Top signal: ${topCms} (${percentage}%)`);
    }
}

/**
 * Display only version information from analysis
 * 
 * @param analysis - Analysis results from generateCollectedDataAnalysis
 */
export function displayVersionInfoOnly(analysis: CollectedDataAnalysis): void {
    if (!analysis.dataExists || analysis.error) {
        return; // Silent fail for version-only display
    }

    if (analysis.versionInfo.length > 0) {
        const bestVersion = analysis.versionInfo[0];
        displayMessage(`   🔢 Version: ${bestVersion.version} (${bestVersion.source})`);
    }
}

/**
 * Display discriminative features summary
 * 
 * @param analysis - Analysis results from generateCollectedDataAnalysis
 */
export function displayDiscriminativeFeaturesSummary(analysis: CollectedDataAnalysis): void {
    if (!analysis.dataExists || analysis.error) {
        displayMessage('   📊 No feature analysis available');
        return;
    }

    const { featuresFound, detectedFeatures } = analysis.discriminativeFeatures;
    
    if (featuresFound === 0) {
        displayMessage('   📊 No discriminative features detected');
        return;
    }

    // Group by CMS
    const cmsCounts: { [cms: string]: number } = {};
    detectedFeatures.forEach(feature => {
        cmsCounts[feature.cms] = (cmsCounts[feature.cms] || 0) + 1;
    });

    const summary = Object.entries(cmsCounts)
        .map(([cms, count]) => `${cms}(${count})`)
        .join(', ');
    
    displayMessage(`   📊 Features: ${featuresFound} total - ${summary}`);
}