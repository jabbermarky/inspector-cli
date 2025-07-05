import { BaseCMSDetector } from './base.js';
import { DetectionStrategy, CMSType, PartialDetectionResult, DetectionPage, CMSPluginResult } from '../types.js';
import { MetaTagStrategy } from '../strategies/meta-tag.js';
import { HtmlContentStrategy } from '../strategies/html-content.js';
import { ApiEndpointStrategy } from '../strategies/api-endpoint.js';
import { createModuleLogger } from '../../logger.js';

const logger = createModuleLogger('cms-wordpress-detector');

/**
 * WordPress-specific plugin detection strategy
 */
class WordPressPluginStrategy implements DetectionStrategy {
    private readonly timeout = 5000;

    getName(): string {
        return 'plugin-detection';
    }

    getTimeout(): number {
        return this.timeout;
    }

    async detect(page: DetectionPage, url: string): Promise<PartialDetectionResult> {
        try {
            logger.debug('Executing WordPress plugin detection', { url });

            // Get HTML content for plugin scanning
            const html = await page.content();
            
            // Scan for plugin references in HTML
            const plugins = this.extractPluginsFromHtml(html);
            
            // Try to get additional plugin info from REST API
            const apiPlugins = await this.getPluginsFromRestApi(page, url);
            
            // Merge plugin results
            const allPlugins = [...plugins, ...apiPlugins];
            const uniquePlugins = this.deduplicatePlugins(allPlugins);

            const confidence = uniquePlugins.length > 0 ? 0.7 : 0;

            logger.debug('WordPress plugin detection completed', {
                url,
                pluginCount: uniquePlugins.length,
                confidence
            });

            return {
                confidence,
                plugins: uniquePlugins,
                method: this.getName()
            };

        } catch (error) {
            // Debug: Check if this should be logged at current level
            // console.log('DEBUG: WordPress plugin error, should log WARN?', logger);
            logger.warn('WordPress plugin detection failed', {
                url,
                error: (error as Error).message
            });

            return {
                confidence: 0,
                method: this.getName(),
                error: 'Plugin detection failed'
            };
        }
    }

    /**
     * Extract plugin information from HTML content
     */
    private extractPluginsFromHtml(html: string): CMSPluginResult[] {
        const plugins: CMSPluginResult[] = [];
        
        // Look for plugin paths in wp-content/plugins/
        const pluginRegex = /\/wp-content\/plugins\/([a-zA-Z0-9-_]+)\//g;
        const foundPlugins = new Set<string>();
        let match;

        while ((match = pluginRegex.exec(html)) !== null) {
            foundPlugins.add(match[1]);
        }

        // Convert to plugin objects
        for (const pluginSlug of foundPlugins) {
            plugins.push({
                name: pluginSlug,
                // Try to extract version if available in the path
                version: this.extractPluginVersion(html, pluginSlug)
            });
        }

        return plugins;
    }

    /**
     * Try to extract plugin version from HTML
     */
    private extractPluginVersion(html: string, pluginSlug: string): string | undefined {
        // Look for version in plugin URLs
        const versionRegex = new RegExp(
            `\\/wp-content\\/plugins\\/${pluginSlug}\\/[^"']*\\?ver=([0-9.]+)`, 
            'i'
        );
        const match = html.match(versionRegex);
        return match ? match[1] : undefined;
    }

    /**
     * Attempt to get plugin information from WordPress REST API
     */
    private async getPluginsFromRestApi(page: DetectionPage, url: string): Promise<CMSPluginResult[]> {
        try {
            const baseUrl = url.replace(/\/$/, '');
            const pluginApiUrl = `${baseUrl}/wp-json/wp/v2/plugins`;

            const response = await page.goto(pluginApiUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 3000
            });

            if (response && response.status() === 200) {
                const jsonText = await page.evaluate(() => document.body.textContent || '');
                const pluginData = JSON.parse(jsonText);

                if (Array.isArray(pluginData)) {
                    return pluginData.map((plugin: any) => ({
                        name: plugin.plugin || plugin.name || 'unknown',
                        version: plugin.version,
                        description: plugin.description?.rendered || plugin.description,
                        author: plugin.author,
                        homepage: plugin.plugin_uri || plugin.homepage
                    }));
                }
            }

            return [];
        } catch (error) {
            // REST API not accessible or failed - this is common and not an error
            logger.debug('WordPress REST API plugin endpoint not accessible', {
                url,
                error: (error as Error).message
            });
            return [];
        }
    }

    /**
     * Remove duplicate plugins based on name
     */
    private deduplicatePlugins(plugins: CMSPluginResult[]): CMSPluginResult[] {
        const unique = new Map<string, CMSPluginResult>();
        
        for (const plugin of plugins) {
            const existing = unique.get(plugin.name);
            if (!existing || (plugin.version && !existing.version)) {
                unique.set(plugin.name, plugin);
            }
        }
        
        return Array.from(unique.values());
    }
}

/**
 * WordPress CMS detector with comprehensive detection strategies
 */
export class WordPressDetector extends BaseCMSDetector {
    protected strategies: DetectionStrategy[] = [
        new MetaTagStrategy('WordPress', 3000),
        new HtmlContentStrategy([
            '/wp-content/',
            '/wp-includes/',
            '/wp-json/',
            'wp-',
            'wordpress'
        ], 'WordPress', 4000),
        new ApiEndpointStrategy('/wp-json/', 'WordPress', 6000),
        new WordPressPluginStrategy()
    ];

    getCMSName(): CMSType {
        return 'WordPress';
    }

    getStrategies(): DetectionStrategy[] {
        return this.strategies;
    }

    /**
     * Override strategy weights for WordPress-specific detection
     */
    protected getStrategyWeight(method: string): number {
        const weights: Record<string, number> = {
            'meta-tag': 1.0,          // Highest confidence
            'api-endpoint': 0.95,     // Very high confidence for wp-json
            'html-content': 0.8,      // Good confidence for WordPress signatures
            'plugin-detection': 0.7   // Additional confirmation
        };
        return weights[method] || 0.5;
    }
}