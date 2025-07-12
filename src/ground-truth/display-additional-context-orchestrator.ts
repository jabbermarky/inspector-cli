import { generateAdditionalContext } from './generate-additional-context.js';
import { displayAdditionalContext } from './display-additional-context.js';

/**
 * Display additional context information about the analyzed data
 * Orchestrates data generation and display (renamed from showAdditionalContext)
 * 
 * @param data - The collected website data
 */
export function displayAdditionalContextFromData(data: any): void {
    const context = generateAdditionalContext(data);
    displayAdditionalContext(context);
}

// DEPRECATED: Use displayAdditionalContextFromData instead
export function showAdditionalContext(data: any): void {
    console.warn('showAdditionalContext is deprecated. Use displayAdditionalContextFromData instead.');
    displayAdditionalContextFromData(data);
}