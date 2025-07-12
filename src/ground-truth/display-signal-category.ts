import { displayMessage } from './interactive-ui-utils.js';

/**
 * Display a category of signals with their matches and details
 * 
 * @param title - The title of the signal category
 * @param signals - Array of signal objects with match status and details
 * 
 * Display functions intentionally have console output side effects
 */
export function displaySignalCategory(
    title: string,
    signals: Array<{
        signal: string;
        confidence: 'high' | 'medium' | 'low';
        match: boolean;
        cms?: string;
        examples?: string[];
        details?: string;
        content?: string;
        value?: string;
        version?: string;
        hint?: string;
    }>
): void {
    const confidenceIcon = (conf: string) =>
        conf === 'high' ? '🟢' : conf === 'medium' ? '🟡' : '🔴';
    const matchIcon = (match: boolean) => (match ? '✅' : '❌');

    displayMessage(
        `\n${confidenceIcon(signals[0]?.confidence || 'low')} ${title} ${confidenceIcon(signals[0]?.confidence || 'low')}`
    );

    signals.forEach(signal => {
        if (signal.match) {
            displayMessage(`   ${matchIcon(signal.match)} ${signal.signal}`);
            if (signal.examples && signal.examples.length > 0) {
                signal.examples.forEach(example => {
                    displayMessage(`     ${example}`);
                });
            }
            if (signal.details) {
                displayMessage(`     ${signal.details}`);
            }
            if (signal.content) {
                displayMessage(`     ${signal.content}`);
            }
            if (signal.value) {
                displayMessage(`     ${signal.value}`);
            }
            if (signal.version) {
                displayMessage(`     Version: ${signal.version}`);
            }
            if (signal.hint) {
                displayMessage(`     💡 ${signal.hint}`);
            }
        }
    });

    // Show "No patterns found" only if ALL signals are missing
    const matchingSignals = signals.filter(s => s.match);
    const missingSignals = signals.filter(s => !s.match && s.cms);

    if (matchingSignals.length === 0 && missingSignals.length > 0) {
        const missingSummary = missingSignals.map(s => s.signal.split(' ')[0]).join(', ');
        displayMessage(`   ${matchIcon(false)} No ${missingSummary} patterns found`);
    }
}