import { displayMessage } from './interactive-ui-utils.js';

/**
 * Display signal strength summary across multiple signal groups
 * 
 * @param signalGroups - Variable number of signal group arrays
 * 
 * Display functions intentionally have console output side effects
 */
export function displaySignalStrengthSummary(
    ...signalGroups: Array<
        Array<{ match: boolean; cms?: string; confidence: 'high' | 'medium' | 'low' }>
    >
): void {
    displayMessage(`\n📈 SIGNAL STRENGTH SUMMARY:`);

    const cmsScores = { WordPress: 0, drupal: 0, Joomla: 0 };
    const cmsCounts = { WordPress: 0, drupal: 0, Joomla: 0 };

    signalGroups.forEach(group => {
        group.forEach(signal => {
            if (signal.cms && signal.match) {
                const weight =
                    signal.confidence === 'high' ? 3 : signal.confidence === 'medium' ? 2 : 1;
                cmsScores[signal.cms as keyof typeof cmsScores] += weight;
            }
            if (signal.cms) {
                cmsCounts[signal.cms as keyof typeof cmsCounts]++;
            }
        });
    });

    // Calculate percentages
    const maxScore = Math.max(...Object.values(cmsScores));

    Object.entries(cmsScores).forEach(([cms, score]) => {
        const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
        const bar = '█'.repeat(Math.round(percentage / 5));
        const matchCount = signalGroups.flat().filter(s => s.cms === cms && s.match).length;
        const totalCount = cmsCounts[cms as keyof typeof cmsCounts];
        displayMessage(
            `   ${cms.padEnd(10)} ${bar.padEnd(20)} ${percentage.toFixed(1)}% (${matchCount}/${totalCount} signals)`
        );
    });
}