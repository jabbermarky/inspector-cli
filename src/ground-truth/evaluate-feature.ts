import { DiscriminativeFeature } from './types.js';
import { hasSameDomainHtmlPattern } from './same-domain-html-pattern.js';
import { isSameDomainScript } from './same-domain-script.js';

/**
 * Evaluates whether a discriminative feature is present in the collected data
 * 
 * @param feature - The discriminative feature to evaluate
 * @param data - The collected website data
 * @returns true if the feature is present, false otherwise
 * 
 */
export function evaluateFeature(feature: DiscriminativeFeature, data: any): boolean {
    const targetUrl = data.finalUrl || data.url || '';

    switch (feature.feature) {
        case 'hasWpContent':
            return (
                data.scripts?.some(
                    (script: any) =>
                        script.src?.toLowerCase().includes('/wp-content/') &&
                        isSameDomainScript(script.src, targetUrl)
                ) || false
            );

        case 'hasWpContentInHtml':
            // For HTML content, we need to check if wp-content references are same-domain
            return hasSameDomainHtmlPattern(data.htmlContent, 'wp-content', targetUrl);

        case 'hasWpJsonLink':
            return hasSameDomainHtmlPattern(data.htmlContent, 'wp-json', targetUrl);

        case 'hasDrupalSites':
            return (
                data.scripts?.some(
                    (script: any) =>
                        script.src?.toLowerCase().includes('/sites/') &&
                        isSameDomainScript(script.src, targetUrl)
                ) || false
            );


        case 'hasJoomlaTemplates':
            return (
                data.stylesheets?.some(
                    (stylesheet: any) =>
                        stylesheet.href?.toLowerCase().includes('/templates/') &&
                        isSameDomainScript(stylesheet.href, targetUrl)
                ) || false
            );

        case 'hasJoomlaScriptOptions':
            return data.htmlContent?.includes('joomla-script-options new') || false;

        case 'generatorContainsJoomla':
            return (
                data.metaTags?.some(
                    (tag: any) =>
                        tag.name && tag.name.toLowerCase() === 'generator' &&
                        tag.content?.toLowerCase().includes('joomla')
                ) || false
            );

        case 'hasJoomlaJUI':
            return (
                data.scripts?.some(
                    (script: any) =>
                        script.src?.toLowerCase().includes('/media/jui/js/') &&
                        isSameDomainScript(script.src, targetUrl)
                ) || false
            );

        case 'hasJoomlaMedia':
            return (
                data.scripts?.some(
                    (script: any) =>
                        script.src?.toLowerCase().includes('/media/') &&
                        isSameDomainScript(script.src, targetUrl)
                ) || false
            );



        case 'generatorContainsDrupal':
            return (
                data.metaTags?.some((tag: any) => 
                    tag.name && tag.name.toLowerCase() === 'generator' && 
                    tag.content && tag.content.toLowerCase().includes('drupal')
                ) || false
            );

        case 'hasDrupalDynamicCacheHeader':
            // Check both main page headers and robots.txt headers
            const mainHeaders = data.httpHeaders || {};
            const robotsHeaders = data.robotsTxt?.httpHeaders || {};
            
            const hasDrupalCacheMain = Object.keys(mainHeaders).some(key => 
                key.toLowerCase().includes('x-drupal')
            );
            const hasDrupalCacheRobots = Object.keys(robotsHeaders).some(key => 
                key.toLowerCase().includes('x-drupal')
            );
            
            return hasDrupalCacheMain || hasDrupalCacheRobots;

        case 'hasDrupalSettingsJson':
            // Check for drupal-settings-json data attribute in scripts
            return (
                data.scripts?.some((script: any) =>
                    script.content && script.content.includes('data-drupal-selector="drupal-settings-json"')
                ) ||
                data.htmlContent?.includes('data-drupal-selector="drupal-settings-json"') ||
                false
            );

        case 'hasDrupalMessagesFallback':
            // Check for data-drupal-messages-fallback div in HTML content
            return data.htmlContent?.includes('data-drupal-messages-fallback') || false;

        case 'hasDrupalSettingsExtend':
            // Check for jQuery.extend(Drupal.settings pattern in scripts or HTML
            return (
                data.scripts?.some((script: any) =>
                    script.content && script.content.includes('jQuery.extend(Drupal.settings')
                ) ||
                data.htmlContent?.includes('jQuery.extend(Drupal.settings') ||
                false
            );

        case 'hasDrupalJavaScript':
            // Check for Drupal JavaScript namespace usage and Drupal-specific attributes
            const drupalJsPatterns = [
                'Drupal.behaviors',
                'Drupal.toolbar',
                'typeof Drupal',
                'if (Drupal',
                'window.Drupal',
                'Drupal &&',
                'init_drupal_core_settings',
                'jQuery.holdReady',
                'window.Drupal){',
                'Drupal.settings,'
            ];
            
            const drupalHtmlPatterns = [
                'data-drupal-link-system-path',
                'data-drupal-link-query',
                'data-drupal-selector',
                'data-off-canvas',
                'data-responsive-menu'
            ];
            
            const hasJsPattern = (
                data.scripts?.some((script: any) => 
                    script.content && drupalJsPatterns.some(pattern => 
                        script.content.includes(pattern)
                    )
                ) ||
                (data.htmlContent && drupalJsPatterns.some(pattern => 
                    data.htmlContent.includes(pattern)
                )) ||
                false
            );
            
            const hasHtmlPattern = data.htmlContent && drupalHtmlPatterns.some(pattern => 
                data.htmlContent.includes(pattern)
            );
            
            return hasJsPattern || hasHtmlPattern;

        default:
            return false;
    }
}

