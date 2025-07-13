// src/ground-truth/discriminative-features.ts
import { DiscriminativeFeature } from './types.js';

export function loadDiscriminativeFeatures(): DiscriminativeFeature[] {
        // Based on our ground truth analysis, these are the most discriminative features
        return [
            {
                feature: 'hasWpContent',
                description: 'Scripts loaded from /wp-content/ directory',
                cms: 'WordPress',
                confidence: 0.9,
                type: 'script-src',
            },
            {
                feature: 'hasWpContentInHtml',
                description: 'HTML contains wp-content references',
                cms: 'WordPress',
                confidence: 0.9,
                type: 'html-content',
            },
            {
                feature: 'hasWpJsonLink',
                description: 'HTML contains wp-json API references',
                cms: 'WordPress',
                confidence: 0.8,
                type: 'html-content',
            },
            {
                feature: 'hasDrupalSites',
                description: 'Scripts loaded from /sites/ directory',
                cms: 'Drupal',
                confidence: 0.8,
                type: 'script-src',
            },
            {
                feature: 'generatorContainsDrupal',
                description: 'Generator meta tag contains Drupal',
                cms: 'Drupal',
                confidence: 0.95,
                type: 'meta-tag',
            },
            {
                feature: 'hasDrupalDynamicCacheHeader',
                description: 'X-Drupal-Dynamic-Cache HTTP header present',
                cms: 'Drupal',
                confidence: 0.95,
                type: 'header',
            },
            {
                feature: 'hasDrupalSettingsJson',
                description: 'drupal-settings-json script tag present',
                cms: 'Drupal',
                confidence: 0.98,
                type: 'script-src',
            },
            {
                feature: 'hasDrupalMessagesFallback',
                description: 'data-drupal-messages-fallback div present (Drupal 8.7+)',
                cms: 'Drupal',
                confidence: 0.97,
                type: 'html-content',
            },
            {
                feature: 'hasDrupalSettingsExtend',
                description: 'jQuery.extend(Drupal.settings script pattern (Drupal 7)',
                cms: 'Drupal',
                confidence: 0.99,
                type: 'script-src',
            },
            {
                feature: 'hasDrupalJavaScript',
                description: 'Drupal JavaScript namespace usage',
                cms: 'Drupal',
                confidence: 0.95,
                type: 'script-src',
            },
            {
                feature: 'hasJoomlaTemplates',
                description: 'Stylesheets loaded from /templates/ directory',
                cms: 'Joomla',
                confidence: 0.9,
                type: 'script-src',
            },
            {
                feature: 'hasJoomlaScriptOptions',
                description: 'joomla-script-options new class (100% Joomla signature)',
                cms: 'Joomla',
                confidence: 1.0,
                type: 'dom-structure',
            },
            {
                feature: 'generatorContainsJoomla',
                description: 'Generator meta tag contains Joomla',
                cms: 'Joomla',
                confidence: 0.8,
                type: 'meta-tag',
            },
            {
                feature: 'hasJoomlaJUI',
                description: 'Scripts loaded from /media/jui/js/ (Joomla UI library)',
                cms: 'Joomla',
                confidence: 0.95,
                type: 'script-src',
            },
            {
                feature: 'hasJoomlaMedia',
                description: 'Scripts loaded from /media/ directory',
                cms: 'Joomla',
                confidence: 0.6,
                type: 'script-src',
            },
        ];
    }
