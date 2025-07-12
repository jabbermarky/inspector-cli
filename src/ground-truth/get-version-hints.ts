/**
 * Get version hints based on patterns found in the collected data
 * 
 * @param data - The collected website data
 * @returns Array of version hint strings
 * 
 */
export function getVersionHints(data: any): string[] {
    const hints = [];

    // Check for modern WordPress patterns
    if (data.htmlContent && data.htmlContent.toLowerCase().includes('wp-json')) {
        hints.push('REST API suggests WordPress 4.7+');
    }

    // Check for Gutenberg blocks
    if (data.htmlContent && data.htmlContent.toLowerCase().includes('wp-block-')) {
        hints.push('Block editor suggests WordPress 5.0+');
    }

    // Check for Drupal 8+ patterns
    if (data.scripts && data.scripts.some((s: any) => s.src && s.src.includes('/core/'))) {
        hints.push('Core directory suggests Drupal 8+');
    }

    // Check for Joomla 4+ patterns
    if (
        data.scripts &&
        data.scripts.some((s: any) => s.src && s.src.includes('/media/system/js/'))
    ) {
        hints.push('Media system structure suggests Joomla 3.0+');
    }

    // Check for jQuery version hints
    if (data.scripts) {
        const jqueryScript = data.scripts.find((s: any) => s.src && s.src.includes('jquery'));
        if (jqueryScript) {
            const versionMatch = jqueryScript.src.match(/jquery[^\d]*(\d+\.\d+(?:\.\d+)?)/);
            if (versionMatch) {
                hints.push(`jQuery ${versionMatch[1]} detected`);
            }
        }
    }

    return hints;
}