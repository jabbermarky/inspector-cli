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
    const targetUrl = data.url || '';

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
                        tag.name === 'generator' &&
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

        case 'hasBootstrap':
            return (
                data.scripts?.some((script: any) =>
                    script.src?.toLowerCase().includes('bootstrap')
                ) || false
            );

        case 'hasGeneratorMeta':
            return data.metaTags?.some((tag: any) => tag.name === 'generator') || false;

        default:
            return false;
    }
}

