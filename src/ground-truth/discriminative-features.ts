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
                cms: 'drupal',
                confidence: 0.8,
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
            {
                feature: 'hasBootstrap',
                description: 'Bootstrap framework detected',
                cms: 'Joomla',
                confidence: 0.8,
                type: 'script-src',
            },
            {
                feature: 'hasGeneratorMeta',
                description: 'Generator meta tag present',
                cms: 'multiple',
                confidence: 0.7,
                type: 'meta-tag',
            },
        ];
    }
