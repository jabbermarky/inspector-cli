/* eslint-disable @typescript-eslint/no-unused-vars */
import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

import { createModuleLogger } from '../utils/logger.js';
const logger = createModuleLogger('interactive-ui');

export function displayMessage(msg: string): void {
    console.log(msg);
}
/*

export function extractVersionInfo(
    data: any
): Array<{ cms: string; version: string; source: string; confidence?: string; pattern?: string }> {
    const versions = [];

    // Check generator meta tag
    if (data.metaTags) {
        const generator = data.metaTags.find((tag: any) => tag.name === 'generator');
        if (generator && generator.content) {
            const content = generator.content.toLowerCase();

            // WordPress version patterns
            if (content.includes('wordpress')) {
                const wpMatch = content.match(/wordpress[^\d]*(\d+\.\d+(?:\.\d+)?)/);
                if (wpMatch) {
                    versions.push({
                        cms: 'WordPress',
                        version: wpMatch[1],
                        source: 'meta-generator',
                        confidence: 'high',
                        pattern: generator.content,
                    });
                }
            }

            // Drupal version patterns
            if (content.includes('drupal')) {
                const drupalMatch = content.match(/drupal[^\d]*(\d+\.\d+(?:\.\d+)?)/);
                if (drupalMatch) {
                    versions.push({
                        cms: 'Drupal',
                        version: drupalMatch[1],
                        source: 'meta-generator',
                        confidence: 'high',
                        pattern: generator.content,
                    });
                }
            }

            // Joomla version patterns
            if (content.includes('joomla')) {
                const joomlaMatch = content.match(/joomla[^\d]*(\d+\.\d+(?:\.\d+)?)/);
                if (joomlaMatch) {
                    versions.push({
                        cms: 'Joomla',
                        version: joomlaMatch[1],
                        source: 'meta-generator',
                        confidence: 'high',
                        pattern: generator.content,
                    });
                }
            }
        }
    }

    // Check script paths for version hints (highly restrictive to avoid plugin/theme versions)
    if (data.scripts) {
        data.scripts.forEach((script: any) => {
            if (script.src) {
                const src = script.src.toLowerCase();

                // WordPress core version patterns (highly restrictive)
                // Only target specific WordPress core administrative files known to contain WordPress version
                // Avoid wp-includes/js/jquery/* as these contain jQuery versions, not WordPress versions
                // Avoid generic wp-includes files as these often contain plugin/theme versions
                if (
                    src.includes('wp-admin/js/') &&
                    (src.includes('wp-admin/js/common') ||
                        src.includes('wp-admin/js/wp-admin') ||
                        src.includes('wp-admin/js/dashboard'))
                ) {
                    const wpVersionMatch = src.match(/[?&]ver=(\d+\.\d+(?:\.\d+)?)/);
                    if (wpVersionMatch && isValidWordPressVersion(wpVersionMatch[1])) {
                        versions.push({
                            cms: 'WordPress',
                            version: wpVersionMatch[1],
                            source: 'script-path',
                            confidence: 'medium',
                            pattern: script.src,
                        });
                    }
                }

                // Alternative: Look for wp-includes files that are core WordPress system files
                else if (
                    src.includes('wp-includes/js/') &&
                    (src.includes('wp-includes/js/wp-embed.min.js') ||
                        src.includes('wp-includes/js/wp-util.min.js'))
                ) {
                    const wpVersionMatch = src.match(/[?&]ver=(\d+\.\d+(?:\.\d+)?)/);
                    if (wpVersionMatch && isValidWordPressVersion(wpVersionMatch[1])) {
                        versions.push({
                            cms: 'WordPress',
                            version: wpVersionMatch[1],
                            source: 'script-path',
                            confidence: 'low', // Lower confidence for wp-includes
                            pattern: script.src,
                        });
                    }
                }

                // Drupal version in script paths (more specific)
                if (src.includes('/sites/') && src.includes('drupal')) {
                    const drupalVersionMatch = src.match(/drupal[^\d]*(\d+\.\d+(?:\.\d+)?)/);
                    if (drupalVersionMatch && isValidDrupalVersion(drupalVersionMatch[1])) {
                        versions.push({
                            cms: 'Drupal',
                            version: drupalVersionMatch[1],
                            source: 'script-path',
                            confidence: 'medium',
                            pattern: script.src,
                        });
                    }
                }

                // Joomla version in script paths (more specific)
                if (src.includes('/media/system/') || src.includes('/media/jui/')) {
                    const joomlaVersionMatch = src.match(/joomla[^\d]*(\d+\.\d+(?:\.\d+)?)/);
                    if (joomlaVersionMatch && isValidJoomlaVersion(joomlaVersionMatch[1])) {
                        versions.push({
                            cms: 'Joomla',
                            version: joomlaVersionMatch[1],
                            source: 'script-path',
                            confidence: 'medium',
                            pattern: script.src,
                        });
                    }
                }
            }
        });
    }

    // Check HTTP headers
    if (data.httpHeaders) {
        Object.entries(data.httpHeaders).forEach(([name, value]: [string, any]) => {
            if (typeof value === 'string') {
                const headerValue = value.toLowerCase();

                // Check X-Powered-By header
                if (name.toLowerCase() === 'x-powered-by') {
                    const wpMatch = headerValue.match(/wordpress[^\d]*(\d+\.\d+(?:\.\d+)?)/);
                    if (wpMatch) {
                        versions.push({
                            cms: 'WordPress',
                            version: wpMatch[1],
                            source: 'http-header',
                            confidence: 'high',
                            pattern: `${name}: ${value}`,
                        });
                    }
                }

                // Check other headers for version info
                const versionMatch = headerValue.match(
                    /(wordpress|drupal|joomla)[^\d]*(\d+(?:\.\d+)?(?:\.\d+)?)/
                );
                if (versionMatch) {
                    const detectedVersion = versionMatch[2];
                    const cms = versionMatch[1].charAt(0).toUpperCase() + versionMatch[1].slice(1);

                    // Validate version based on CMS
                    let isValid = false;
                    if (cms === 'WordPress') {
                        isValid = isValidWordPressVersion(detectedVersion);
                    } else if (cms === 'Drupal') {
                        isValid = isValidDrupalVersion(detectedVersion);
                    } else if (cms === 'Joomla') {
                        isValid = isValidJoomlaVersion(detectedVersion);
                    }

                    if (isValid) {
                        versions.push({
                            cms: cms,
                            version: detectedVersion,
                            source: 'http-header',
                            confidence: 'high', // HTTP headers are more reliable than script paths
                            pattern: `${name}: ${value}`,
                        });
                    }
                }
            }
        });
    }

    // Remove duplicates and sort by confidence
    const uniqueVersions = versions.filter(
        (version, index, self) =>
            index === self.findIndex(v => v.cms === version.cms && v.version === version.version)
    );

    return uniqueVersions.sort((a, b) => {
        const confidenceOrder = { high: 3, medium: 2, low: 1 };
        return (
            (confidenceOrder[b.confidence as keyof typeof confidenceOrder] || 0) -
            (confidenceOrder[a.confidence as keyof typeof confidenceOrder] || 0)
        );
    });
}

export function showVersionAnalysis(data: any): void {
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

export async function cleanup(): Promise<void> {
    isShuttingDown = true;
    if (rl) {
        try {
            // Remove all listeners first to prevent error events
            rl.removeAllListeners();

            // Close the readline interface
            rl.close();

            // Set to null to prevent further use
            rl = null as any;
        } catch {
            // Ignore errors during cleanup - this is expected
        }
    }
}

export async function showStats(): Promise<void> {
    if (!fs.existsSync(groundTruthPath)) {
        displayMessage('❌ No ground truth database found');
        return;
    }

    const content = fs.readFileSync(groundTruthPath, 'utf8');
    const database: GroundTruthDatabase = JSON.parse(content);

    displayMessage(`\n📊 Ground Truth Statistics:`);
    displayMessage('═'.repeat(50));
    displayMessage(`   Total Sites: ${database.sites.length}`);
    displayMessage(`   Last Updated: ${new Date(database.lastUpdated).toLocaleString()}`);

    const cmsCounts: { [key: string]: number } = {};
    database.sites.forEach(site => {
        cmsCounts[site.cms] = (cmsCounts[site.cms] || 0) + 1;
    });

    displayMessage(`\n📈 CMS Distribution:`);
    Object.entries(cmsCounts).forEach(([cms, count]) => {
        displayMessage(`   ${cms.padEnd(12)} ${count} sites`);
    });

    // Version distribution
    displayMessage(`\n🔢 Version Distribution:`);
    const versionCounts: { [key: string]: { [version: string]: number } } = {};
    database.sites.forEach(site => {
        if (site.version) {
            if (!versionCounts[site.cms]) {
                versionCounts[site.cms] = {};
            }
            versionCounts[site.cms][site.version] =
                (versionCounts[site.cms][site.version] || 0) + 1;
        }
    });

    Object.entries(versionCounts).forEach(([cms, versions]) => {
        displayMessage(`   ${cms}:`);
        Object.entries(versions).forEach(([version, count]) => {
            displayMessage(`     v${version}: ${count} sites`);
        });
    });

    displayMessage(`\n📋 Recent Additions:`);
    const recent = database.sites
        .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
        .slice(0, 5);

    recent.forEach(site => {
        const date = new Date(site.addedAt).toLocaleDateString();
        const versionText = site.version ? ` v${site.version}` : '';
        displayMessage(`   ${date} - ${site.url} (${site.cms}${versionText})`);
    });
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
                { helpValue: '?', helpFunction: showHelp, caseSensitive: false }
            );
            if (choice === null) {
                displayMessage('❌ Invalid input, please try again. NULL choice detected.');
                return { shouldContinue: false };
            }

            if (choice === '' || choice.toLowerCase() === 'y' || choice.toLowerCase() === 'enter') {
                await addToGroundTruth(url, detectedCms, confidence, '', suggestedVersion?.version);
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
                {helpValue: '?', helpFunction:showHelp, caseSensitive: false}
            );
            if (choice === null) {
                displayMessage('❌ Invalid input, please try again. NULL choice detected.');
                return { shouldContinue: false };
            }
            // If user pressed Enter or 'y', add to ground truth
            if (choice === '' || choice.toLowerCase() === 'y' || choice.toLowerCase() === 'enter') {
                await addToGroundTruth(url, detectedCms, confidence, '', suggestedVersion?.version);
                displayMessage(`✅ Added: ${detectedCms}${versionText}`);
                return { shouldContinue: true };
            } else if (choice.toLowerCase() === 'c') {
                const result = await handleCorrection(url, confidence, detectedVersions);
                return { shouldContinue: result.shouldContinue };
            } else if (choice.toLowerCase() === 's') {
                displayMessage(`⏭️  Skipped`);
                return { shouldContinue: true };
            } else if (choice === '?') {
                showHelp();
                return await promptForGroundTruthDecision(
                    url,
                    detectedCms,
                    confidence,
                    detectedVersions
                );
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
                await addToGroundTruth(url, selectedCms, confidence, '', selectedVersion?.version);
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
    const actualCms = await askQuestion('Actual CMS (WordPress/drupal/Joomla/other): ');

    // Suggest detected version if available for the corrected CMS
    const suggestedVersion = detectedVersions.find(
        v => v.cms.toLowerCase() === actualCms.toLowerCase()
    );
    const versionPrompt = suggestedVersion
        ? `Version (detected: ${suggestedVersion.version}) or Enter for detected: `
        : 'Version (e.g., 6.1.0) or Enter if unknown: ';

    const inputVersion = await askQuestion(rl, versionPrompt);
    const version = inputVersion || suggestedVersion?.version;
    const notes = await askQuestion(rl, 'Notes (optional): ');

    await addToGroundTruth(url, actualCms, confidence, notes, version);
    displayMessage(`✅ Corrected to: ${actualCms}${version ? ` v${version}` : ''}`);

    // Only prompt to continue when user made corrections (they might want to review)
    const continueChoice = await askQuestion(rl, 'Continue to next URL? (y/n): ');
    return { shouldContinue: continueChoice.toLowerCase() !== 'n' };
}

export function showHelp(): void {
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
*/
// function askQuestion(rl: any, question: string): Promise<string> {
//     return new Promise(resolve => {
//         rl.question(question, (answer: any) => {
//             resolve(answer);
//         });
//     });
// }

// Better type definitions
export type HelpFunction = () => void;

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
