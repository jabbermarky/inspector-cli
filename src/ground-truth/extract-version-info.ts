import { isValidWordPressVersion, isValidDrupalVersion, isValidJoomlaVersion, isValidDudaVersion } from './match-version.js';

export function extractVersionInfo(
    data: any
): Array<{ cms: string; version: string; source: string; confidence?: string; pattern?: string }> {
    const versions = [];

    // Check generator meta tag
    if (data.metaTags) {
        const generator = data.metaTags.find((tag: any) => tag.name && tag.name.toLowerCase() === 'generator');
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
                // Match both "Drupal 10" (major version) and "Drupal 10.1.2" (full version)
                const drupalMatch = content.match(/drupal[^\d]*(\d+(?:\.\d+)*)/);
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

            // Duda version patterns
            if (content.includes('duda')) {
                const dudaMatch = content.match(/duda[^\d]*(\d+(?:\.\d+)*)/);
                if (dudaMatch) {
                    versions.push({
                        cms: 'Duda',
                        version: dudaMatch[1],
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

    // Check script content for Duda d_version pattern
    if (data.scripts) {
        data.scripts.forEach((script: any) => {
            if (script.content) {
                const content = script.content;
                
                // Look for Duda d_version pattern: var d_version = "production_XXXX"
                const dudaVersionMatch = content.match(/var\s+d_version\s*=\s*["']([^_]+)_(\d{4})["']/);
                if (dudaVersionMatch) {
                    const environment = dudaVersionMatch[1];
                    const version = dudaVersionMatch[2];
                    
                    if (isValidDudaVersion(version)) {
                        // Check for additional pattern confirmations
                        const hasBuildPattern = /var\s+build\s*=\s*["']\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2}["']/.test(content);
                        const hasWindowPattern = /window\[['"]v['"]\s*\+\s*['"]ersion['"]\]\s*=\s*d_version/.test(content);
                        
                        const confidence = (hasBuildPattern && hasWindowPattern) ? 'high' : 'medium';
                        
                        versions.push({
                            cms: 'Duda',
                            version: version,
                            source: 'script-content',
                            confidence: confidence,
                            pattern: `d_version="${environment}_${version}"`,
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
                    /(wordpress|drupal|joomla|duda)[^\d]*(\d+(?:\.\d+)?(?:\.\d+)?)/
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
                    } else if (cms === 'Duda') {
                        isValid = isValidDudaVersion(detectedVersion);
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
