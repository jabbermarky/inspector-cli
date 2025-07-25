import { displayMessage } from './interactive-ui-utils.js';
import { AdditionalContextData } from './generate-additional-context.js';

/**
 * Display additional context information to the user
 * Pure presentation function - handles formatting and display only
 * 
 * @param context - Context data generated by generateAdditionalContext
 * 
 * Display functions intentionally have console output side effects
 */
export function displayAdditionalContext(context: AdditionalContextData): void {
    displayMessage(`\n📋 Additional Context:`);
    displayMessage('─'.repeat(40));

    // Display generator meta tag
    if (context.generator) {
        displayMessage(`   Generator: ${context.generator.content}`);
    }

    // Display powered-by header
    if (context.poweredBy) {
        displayMessage(`   Powered By: ${context.poweredBy}`);
    }

    // Display resource counts
    displayMessage(`   Scripts: ${context.counts.scripts}`);
    displayMessage(`   Stylesheets: ${context.counts.stylesheets}`);
    displayMessage(`   HTML Size: ${context.counts.htmlSizeKB}KB`);

    // Display detected patterns
    if (context.detectedPatterns.length > 0) {
        const patternNames = context.detectedPatterns.map(p => p.name).join(', ');
        displayMessage(`   Patterns: ${patternNames}`);
    }
}

/**
 * Display additional context in a compact format
 * 
 * @param context - Context data generated by generateAdditionalContext
 */
export function displayAdditionalContextCompact(context: AdditionalContextData): void {
    const parts: string[] = [];

    // Add key information
    if (context.generator) {
        parts.push(`Gen: ${context.generator.content}`);
    }
    
    if (context.poweredBy) {
        parts.push(`Powered: ${context.poweredBy}`);
    }

    // Add resource counts if significant
    if (context.counts.scripts > 0) {
        parts.push(`${context.counts.scripts}js`);
    }
    
    if (context.counts.stylesheets > 0) {
        parts.push(`${context.counts.stylesheets}css`);
    }

    if (context.counts.htmlSizeKB > 0) {
        parts.push(`${context.counts.htmlSizeKB}KB`);
    }

    // Add top patterns
    if (context.detectedPatterns.length > 0) {
        const topPatterns = context.detectedPatterns.slice(0, 3).map(p => p.name);
        parts.push(`Tech: ${topPatterns.join(',')}`);
    }

    if (parts.length > 0) {
        displayMessage(`   📋 ${parts.join(' | ')}`);
    }
}

/**
 * Display only the most important context information
 * 
 * @param context - Context data generated by generateAdditionalContext
 */
export function displayAdditionalContextMinimal(context: AdditionalContextData): void {
    const important: string[] = [];

    // Only show generator and patterns - most identifying info
    if (context.generator) {
        important.push(`Generator: ${context.generator.content}`);
    }
    
    if (context.detectedPatterns.length > 0) {
        const patterns = context.detectedPatterns.map(p => p.name).join(', ');
        important.push(`Patterns: ${patterns}`);
    }

    if (important.length > 0) {
        displayMessage(`   📋 ${important.join(' | ')}`);
    }
}