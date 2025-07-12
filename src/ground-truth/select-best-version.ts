/**
 * Select the best version from detected versions based on priority and confidence
 * 
 * @param detectedVersions - Array of detected versions with CMS, version, source and confidence
 * @param cms - The CMS to filter versions for
 * @returns Best version for the specified CMS or null if none found
 * 
 */
export function selectBestVersion(
    detectedVersions: Array<{
        cms: string;
        version: string;
        source: string;
        confidence?: string;
    }>,
    cms: string
): { cms: string; version: string; source: string; confidence?: string } | null {
    // Filter versions for the detected CMS
    const cmsVersions = detectedVersions.filter(v => v.cms.toLowerCase() === cms.toLowerCase());

    if (cmsVersions.length === 0) {
        return null;
    }

    // Priority order: meta-generator (highest) > http-header > script-path (lowest)
    const priorityOrder = {
        'meta-generator': 3,
        'http-header': 2,
        'script-path': 1,
    };

    // Sort by priority and confidence
    const sortedVersions = cmsVersions.sort((a, b) => {
        const aPriority = priorityOrder[a.source as keyof typeof priorityOrder] || 0;
        const bPriority = priorityOrder[b.source as keyof typeof priorityOrder] || 0;

        if (aPriority !== bPriority) {
            return bPriority - aPriority; // Higher priority first
        }

        // If same priority, sort by confidence
        const confidenceOrder = { high: 3, medium: 2, low: 1 };
        const aConf = confidenceOrder[a.confidence as keyof typeof confidenceOrder] || 0;
        const bConf = confidenceOrder[b.confidence as keyof typeof confidenceOrder] || 0;

        return bConf - aConf;
    });

    return sortedVersions[0];
}