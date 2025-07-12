/* eslint-disable @typescript-eslint/no-unused-vars */
import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { displayMessage } from './interactive-ui-utils.js';

import { createModuleLogger } from '../utils/logger.js';
import { extractVersionInfo } from './extract-version-info.js';
import { getVersionHints } from './get-version-hints.js';
import { generateGroundTruthStats, getDefaultDatabasePath } from './generate-stats.js';
import { displayGroundTruthStats } from './display-stats.js';
import { setShuttingDown } from './index.js';

// TODO: These imports need to be updated when ground truth database functions are extracted
// import { addToGroundTruth, GroundTruthDatabase, groundTruthPath } from './ground-truth-database.js';

const logger = createModuleLogger('interactive-ui');

export function displayVersionAnalysis(data: any): void {
    displayMessage(`\n🔢 Version Analysis:`);
    displayMessage('─'.repeat(40));

    const versionInfo = extractVersionInfo(data);

    if (versionInfo.length > 0) {
        versionInfo.forEach(info => {
            displayMessage(`   ${info.cms} ${info.version} (${info.source})`);
            if (info.confidence) {
                displayMessage(`     Confidence: ${info.confidence}`);
            }
            if (info.pattern) {
                displayMessage(`     Pattern: ${info.pattern}`);
            }
        });
    } else {
        displayMessage('   No version information detected');
    }

    // Show version hints
    const hints = getVersionHints(data);
    if (hints.length > 0) {
        displayMessage(`\n   💡 Version Hints:`);
        hints.forEach(hint => {
            displayMessage(`     - ${hint}`);
        });
    }
}

// DEPRECATED: Use displayVersionAnalysis instead
export function showVersionAnalysis(data: any): void {
    console.warn('showVersionAnalysis is deprecated. Use displayVersionAnalysis instead.');
    displayVersionAnalysis(data);
}

/**
 * Cleanup function for graceful shutdown
 * Called when user interrupts with Ctrl+C or application exits
 */
export async function cleanup(): Promise<void> {
    setShuttingDown(true);
    
    // Remove any active signal listeners to prevent duplicate handling
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGTERM');
    
    // Add a brief delay to allow any pending operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
}

export async function displayStats(): Promise<void> {
    const stats = generateGroundTruthStats(getDefaultDatabasePath());
    displayGroundTruthStats(stats);
}

// DEPRECATED: Use displayStats instead
export async function showStats(): Promise<void> {
    console.warn('showStats is deprecated. Use displayStats instead.');
    await displayStats();
}

export async function promptForGroundTruthDecision(
    url: string,
    detectedCms: string,
    confidence: number,
    detectedVersions: Array<{
        cms: string;
        version: string;
        source: string;
        confidence?: string;
    }> = [],
    bestVersion: { cms: string; version: string; source: string; confidence?: string } | null = null
): Promise<{ shouldContinue: boolean }> {
    try {
        displayMessage(`\n🤔 Add to ground truth?`);

        // Use best version if available, otherwise find first matching version
        const suggestedVersion =
            bestVersion ||
            detectedVersions.find(v => v.cms.toLowerCase() === detectedCms.toLowerCase());
        const versionText = suggestedVersion ? ` ${suggestedVersion.version}` : '';

        // Smart interaction based on confidence
        if (confidence >= 0.9) {
            // Auto-accept for very high confidence
            //displayMessage(`   [Enter] ${detectedCms}${versionText}  [c] Correct  [s] Skip  [?] Help`);
            const choice = await getUserChoice(
                `   [Enter] ${detectedCms}${versionText}  [c] Correct  [s] Skip  [?] Help`,
                ['enter', 'y', 'c', 's', '?'],
                { helpValue: '?', helpFunction: displayHelp, caseSensitive: false }
            );
            if (choice === null) {
                displayMessage('❌ Invalid input, please try again. NULL choice detected.');
                return { shouldContinue: false };
            }

            if (choice === '' || choice.toLowerCase() === 'y' || choice.toLowerCase() === 'enter') {
                // TODO: Import addToGroundTruth when ground truth database functions are extracted
                // await addToGroundTruth(url, detectedCms, confidence, '', suggestedVersion?.version);
                displayMessage(`✅ Auto-accepted: ${detectedCms}${versionText}`);
                return { shouldContinue: true };
            } else if (choice.toLowerCase() === 'c') {
                const result = await handleCorrection(url, confidence, detectedVersions);
                return { shouldContinue: result.shouldContinue };
            } else if (choice.toLowerCase() === 's') {
                displayMessage(`⏭️  Skipped`);
                return { shouldContinue: true };
            } else {
                return { shouldContinue: false }; // If help or invalid input, just continue
            }
        } else if (confidence >= 0.7) {
            // One-key decisions for medium confidence
            //displayMessage(`   [Enter] ${detectedCms}${versionText}  [c] Correct  [s] Skip  [?] Help`);
            //const choice = await askQuestion(rl, '');
            const choice = await getUserChoice(
                `   [Enter] ${detectedCms}${versionText}  [c] Correct  [s] Skip  [?] Help`,
                ['enter', 'y', 'c', 's'],
                { helpValue: '?', helpFunction: displayHelp, caseSensitive: false }
            );
            if (choice === null) {
                displayMessage('❌ Invalid input, please try again. NULL choice detected.');
                return { shouldContinue: false };
            }
            // If user pressed Enter or 'y', add to ground truth
            if (choice === '' || choice.toLowerCase() === 'y' || choice.toLowerCase() === 'enter') {
                // TODO: Import addToGroundTruth when ground truth database functions are extracted
                // await addToGroundTruth(url, detectedCms, confidence, '', suggestedVersion?.version);
                displayMessage(`✅ Added: ${detectedCms}${versionText}`);
                return { shouldContinue: true };
            } else if (choice.toLowerCase() === 'c') {
                const result = await handleCorrection(url, confidence, detectedVersions);
                return { shouldContinue: result.shouldContinue };
            } else if (choice.toLowerCase() === 's') {
                displayMessage(`⏭️  Skipped`);
                return { shouldContinue: true };
            } else {
                displayMessage('❌ Invalid input, please try again.');
                return { shouldContinue: false };
            }
        } else {
            // Explicit choice for low confidence
            //displayMessage(`   [1] WordPress  [2] Drupal  [3] Joomla  [4] Other/Static  [s] Skip`);
            //const choice = await askQuestion(rl, 'Classification needed: ');
            const choice = await getUserChoice(
                `   [w] WordPress  [d] Drupal  [j] Joomla  [o] Other/Static  [s] Skip`,
                ['w', 'd', 'j', 'o', 's']
            );
            if (choice === null) {
                displayMessage('❌ Invalid input, please try again. NULL choice detected.');
                return { shouldContinue: false };
            }

            // Map choices to CMS types
            const cmsMap = { w: 'WordPress', d: 'Drupal', j: 'Joomla', o: 'other' };

            if (choice === 's') {
                displayMessage(`⏭️  Skipped`);
                return { shouldContinue: true };
            } else if (choice in cmsMap) {
                const selectedCms = cmsMap[choice as keyof typeof cmsMap];
                const selectedVersion = detectedVersions.find(
                    v => v.cms.toLowerCase() === selectedCms
                );
                // TODO: Import addToGroundTruth when ground truth database functions are extracted
                // await addToGroundTruth(url, selectedCms, confidence, '', selectedVersion?.version);
                displayMessage(
                    `✅ Added: ${selectedCms}${selectedVersion ? ` v${selectedVersion.version}` : ''}`
                );
                return { shouldContinue: true };
            } else {
                displayMessage('❌ Invalid input, please try again.');
                return { shouldContinue: false };
            }
        }
    } finally {
        // Ensure readline is closed properly
    }
    return { shouldContinue: true };
}

export async function handleCorrection(
    url: string,
    confidence: number,
    detectedVersions: Array<{ cms: string; version: string; source: string; confidence?: string }>
): Promise<{ shouldContinue: boolean }> {
    try {
        const actualCms = await getTextInput('Actual CMS (WordPress/drupal/Joomla/other):');
        if (!actualCms) {
            displayMessage('❌ No CMS entered, skipping correction');
            return { shouldContinue: true };
        }

        // Suggest detected version if available for the corrected CMS
        const suggestedVersion = detectedVersions.find(
            v => v.cms.toLowerCase() === actualCms.toLowerCase()
        );
        const versionPrompt = suggestedVersion
            ? `Version (detected: ${suggestedVersion.version}) or Enter for detected:`
            : 'Version (e.g., 6.1.0) or Enter if unknown:';

        const inputVersion = await getTextInput(versionPrompt);
        const version = inputVersion || suggestedVersion?.version;
        
        const notes = await getTextInput('Notes (optional):');

        // TODO: Import addToGroundTruth when ground truth database functions are extracted
        // await addToGroundTruth(url, actualCms, confidence, notes, version);
        displayMessage(`✅ Corrected to: ${actualCms}${version ? ` v${version}` : ''}`);
        displayMessage('TODO: Add to ground truth database (function not yet extracted)');

        // Only prompt to continue when user made corrections (they might want to review)
        const continueChoice = await getUserChoice(
            'Continue to next URL?',
            ['y', 'n'],
            { caseSensitive: false }
        );
        return { shouldContinue: continueChoice?.toLowerCase() !== 'n' };
    } catch (error) {
        displayMessage(`❌ Error during correction: ${(error as Error).message}`);
        return { shouldContinue: true };
    }
}

export function displayHelp(): void {
    displayMessage(`\nHelp:`);
    displayMessage(`   Enter    = Accept detection as shown`);
    displayMessage(`   c        = Correct the CMS type or version`);
    displayMessage(`   s        = Skip this site (don't add to ground truth)`);
    displayMessage(`   ?        = Show this help`);
    displayMessage(`   \nConfidence levels:`);
    displayMessage(`   90%+     = Auto-suggest (very reliable)`);
    displayMessage(`   70-90%   = One-key accept (reliable)`);
    displayMessage(`   <70%     = Manual classification (uncertain)`);
}

// Better type definitions
export type HelpFunction = () => void;

/**
 * STANDARDIZED INPUT PATTERNS:
 * 
 * Use getUserChoice() for:
 * - Multiple choice selections (y/n, cms types, etc.)
 * - Menu-style options with validation
 * - Cases where you want built-in help and error handling
 * 
 * Use getTextInput() for:
 * - Free-form text entry (version numbers, notes, URLs, etc.)
 * - Open-ended questions
 * - Any input that can't be pre-defined as choices
 */

/**
 * Get free-form text input from user
 * Use this for open-ended questions like version numbers, notes, etc.
 */
export async function getTextInput(promptText: string): Promise<string | null> {
    const rl = createInterface({ input, output });
    
    try {
        // Handle SIGINT (Ctrl+C) gracefully
        const sigintHandler = async () => {
            displayMessage('\n🛑 Interrupted by user');
            await cleanup();
            process.exit(0);
        };
        process.on('SIGINT', sigintHandler);

        const answer = await rl.question(promptText + ' ');
        return answer;
    } catch (error) {
        displayMessage(`Error reading input: ${(error as Error).message}`);
        return null;
    } finally {
        rl.close();
    }
}

// Unified function with optional help
export async function getUserChoice(
    promptText: string,
    allowedValues: string[],
    options?: {
        helpValue?: string;
        helpFunction?: HelpFunction;
        caseSensitive?: boolean;
    }
): Promise<string | null> {
    const rl = createInterface({ input, output });
    const { helpValue, helpFunction, caseSensitive = false } = options || {};

    try {
        // Handle SIGINT (Ctrl+C) gracefully
        const sigintHandler = async () => {
            displayMessage('\n🛑 Interrupted by user');
            await cleanup();
            process.exit(0);
        };
        process.on('SIGINT', sigintHandler);

        while (true) {
            const rawChoice = await rl.question(promptText + ' ');
            const choice = caseSensitive ? rawChoice : rawChoice.toLowerCase();

            // Handle help if configured
            if (helpValue && choice === helpValue.toLowerCase() && helpFunction) {
                helpFunction();
                continue;
            }

            // Check if choice is valid
            const validValues = caseSensitive
                ? allowedValues
                : allowedValues.map(v => v.toLowerCase());
            if (validValues.includes(choice)) {
                return rawChoice; // Return original case
            }

            displayMessage(`Invalid input. Please choose from: ${allowedValues.join(', ')}`);
        }
    } catch (error) {
        displayMessage(`Error reading input: ${(error as Error).message}`);
        return null; // Return null on error
    } finally {
        rl.close();
    }
}
