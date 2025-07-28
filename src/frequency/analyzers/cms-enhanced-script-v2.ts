/**
 * CMSEnhancedScriptV2 - Enhanced Script Analysis with Comprehensive CMS Intelligence
 *
 * Extends ScriptAnalyzerV2 with comprehensive CMS-specific pattern detection across
 * 8+ platform categories including CMS, e-commerce, frameworks, and website builders.
 *
 * Features:
 * - 50+ CMS/platform detection patterns
 * - Confidence scoring and version detection
 * - Cross-platform pattern recognition
 * - Technology stack intelligence
 */

import type {
    FrequencyAnalyzer,
    PreprocessedData,
    AnalysisOptions,
    AnalysisResult,
    PatternData,
    ScriptSpecificData,
} from '../types/analyzer-interface.js';
import { ScriptAnalyzerV2 } from './script-analyzer-v2.js';
import { createModuleLogger } from '../../utils/logger.js';

const logger = createModuleLogger('cms-enhanced-script-v2');

/**
 * CMS Platform Categories
 */
export type CMSCategory =
    | 'cms' // WordPress, Drupal, Joomla, Ghost
    | 'ecommerce' // Shopify, Magento, WooCommerce
    | 'builder' // Wix, Squarespace, Webflow
    | 'framework' // React, Vue, Angular, Next.js
    | 'backend' // Django, Rails, Laravel
    | 'analytics' // Google Analytics, Adobe Analytics
    | 'hosting' // Cloudflare, AWS, CDN services
    | 'library'; // jQuery, Bootstrap, utility libraries

/**
 * Enhanced CMS Pattern with intelligence
 */
export interface CMSPattern {
    pattern: string;
    category: CMSCategory;
    platform: string;
    confidence: number; // Base confidence (0-1)
    version?: string; // Detectable version pattern
    description: string;
    examples: string[]; // Example script URLs/patterns
    conflictsWith?: string[]; // Conflicting patterns (mutual exclusion)
    requiresAll?: string[]; // Patterns that must all be present
}

/**
 * Enhanced Script Analysis Result
 */
export interface CMSEnhancedScriptData extends ScriptSpecificData {
    // Enhanced platform detection
    detectedPlatforms: Map<string, PlatformDetection>;

    // Technology stack analysis
    technologyStack: TechnologyStackAnalysis;

    // CMS-specific insights
    cmsInsights: CMSInsights;

    // Development vs production analysis
    deploymentAnalysis: DeploymentAnalysis;

    // Security and performance insights
    securityAnalysis: SecurityAnalysis;
}

export interface PlatformDetection {
    platform: string;
    category: CMSCategory;
    confidence: number;
    version?: string;
    evidencePatterns: string[];
    conflictingEvidence: string[];
}

export interface TechnologyStackAnalysis {
    frontend: string[]; // React, Vue, Angular, etc.
    backend: string[]; // Inferred from client-side footprints
    cms: string[]; // Content management systems
    ecommerce: string[]; // E-commerce platforms
    analytics: string[]; // Analytics and tracking
    libraries: string[]; // JavaScript libraries
    frameworks: string[]; // Framework patterns
    complexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
    modernityScore: number; // 0-1 based on modern vs legacy patterns
}

export interface CMSInsights {
    primaryCMS?: string;
    cmsConfidence: number;
    multiCMSDetected: boolean;
    migrationPatterns: string[]; // Evidence of CMS migration
    customizations: string[]; // Custom/non-standard implementations
    pluginEcosystem: PluginEcosystem;
}

export interface PluginEcosystem {
    detectedPlugins: string[];
    commercialPlugins: string[];
    securityPlugins: string[];
    performancePlugins: string[];
    totalPluginCount: number;
}

export interface DeploymentAnalysis {
    environment: 'development' | 'staging' | 'production' | 'mixed';
    minificationLevel: number; // 0-1 (unminified to fully minified)
    cachingStrategy: string[]; // CDN, browser caching patterns
    bundlingDetected: boolean; // Webpack, Rollup, etc.
    sourceMapDetected: boolean; // Development artifacts
}

export interface SecurityAnalysis {
    securityHeaders: string[];
    trackingIntensity: 'low' | 'moderate' | 'high' | 'aggressive';
    privacyCompliance: string[]; // GDPR, CCPA compliance patterns
    vulnerabilityIndicators: string[];
    contentSecurityPolicy: boolean;
}

/**
 * CMSEnhancedScriptV2 - Comprehensive CMS-aware script analysis
 */
export class CMSEnhancedScriptV2
    extends ScriptAnalyzerV2
    implements FrequencyAnalyzer<CMSEnhancedScriptData>
{
    private cmsPatternDatabase: Map<string, CMSPattern[]> = new Map();

    constructor() {
        super();
        this.initializeCMSPatterns();
    }

    getName(): string {
        return 'CMSEnhancedScriptV2';
    }

    async analyze(
        data: PreprocessedData,
        options: AnalysisOptions
    ): Promise<AnalysisResult<CMSEnhancedScriptData>> {
        const startTime = Date.now();

        logger.info(`Starting enhanced CMS script analysis for ${data.totalSites} sites`, {
            minOccurrences: options.minOccurrences,
            platformPatterns: Array.from(this.cmsPatternDatabase.keys()).length,
        });

        // Get base script analysis
        const baseResult = await super.analyze(data, options);

        // Ensure all base patterns have metadata
        for (const [_patternName, pattern] of baseResult.patterns) {
            if (!pattern.metadata) {
                pattern.metadata = {
                    type: 'script_pattern',
                    source: 'base_analyzer',
                    category: 'library',
                };
            }
        }

        // Enhance with CMS intelligence
        const enhancedPatterns = this.enhanceWithCMSIntelligence(baseResult.patterns, data);

        // Apply filtering to enhanced patterns
        const filteredEnhancedPatterns = new Map<string, PatternData>();
        for (const [patternName, pattern] of enhancedPatterns) {
            if (pattern.siteCount >= options.minOccurrences) {
                filteredEnhancedPatterns.set(patternName, pattern);
            }
        }

        const detectedPlatforms = this.analyzePlatformDetection(filteredEnhancedPatterns, data);
        const technologyStack = this.analyzeTechnologyStack(
            detectedPlatforms,
            filteredEnhancedPatterns
        );
        const cmsInsights = this.generateCMSInsights(detectedPlatforms, data);
        const deploymentAnalysis = this.analyzeDeployment(filteredEnhancedPatterns, data);
        const securityAnalysis = this.analyzeSecurityPatterns(filteredEnhancedPatterns, data);

        // Create enhanced analyzer-specific data
        const analyzerSpecific: CMSEnhancedScriptData = {
            ...baseResult.analyzerSpecific!,
            detectedPlatforms,
            technologyStack,
            cmsInsights,
            deploymentAnalysis,
            securityAnalysis,
        };

        const duration = Date.now() - startTime;
        logger.info(`Enhanced CMS script analysis completed in ${duration}ms`, {
            platformsDetected: detectedPlatforms.size,
            technologyComplexity: technologyStack.complexity,
            cmsConfidence: cmsInsights.cmsConfidence,
        });

        return {
            patterns: filteredEnhancedPatterns,
            totalSites: data.totalSites,
            analyzerSpecific,
            metadata: {
                ...baseResult.metadata,
                analyzer: this.getName(),
                totalPatternsAfterFiltering: filteredEnhancedPatterns.size,
            },
        };
    }

    /**
     * Initialize comprehensive CMS pattern database
     */
    private initializeCMSPatterns(): void {
        this.cmsPatternDatabase = new Map([
            // Content Management Systems
            [
                'WordPress',
                [
                    {
                        pattern: 'wp-admin',
                        category: 'cms',
                        platform: 'WordPress',
                        confidence: 0.95,
                        description: 'WordPress admin interface',
                        examples: ['/wp-admin/'],
                    },
                    {
                        pattern: 'wp-content/plugins',
                        category: 'cms',
                        platform: 'WordPress',
                        confidence: 0.9,
                        description: 'WordPress plugins',
                        examples: ['/wp-content/plugins/'],
                    },
                    {
                        pattern: 'wp-content/themes',
                        category: 'cms',
                        platform: 'WordPress',
                        confidence: 0.85,
                        description: 'WordPress themes',
                        examples: ['/wp-content/themes/'],
                    },
                    {
                        pattern: 'wp-includes',
                        category: 'cms',
                        platform: 'WordPress',
                        confidence: 0.8,
                        description: 'WordPress core includes',
                        examples: ['/wp-includes/js/'],
                    },
                    {
                        pattern: 'woocommerce',
                        category: 'ecommerce',
                        platform: 'WooCommerce',
                        confidence: 0.9,
                        description: 'WooCommerce e-commerce',
                        examples: ['/woocommerce/'],
                    },
                ],
            ],

            [
                'Drupal',
                [
                    {
                        pattern: 'drupal',
                        category: 'cms',
                        platform: 'Drupal',
                        confidence: 0.9,
                        description: 'Drupal core',
                        examples: ['/core/misc/drupal.js'],
                    },
                    {
                        pattern: 'modules/contrib',
                        category: 'cms',
                        platform: 'Drupal',
                        confidence: 0.85,
                        description: 'Drupal contrib modules',
                        examples: ['/modules/contrib/'],
                    },
                    {
                        pattern: 'modules/custom',
                        category: 'cms',
                        platform: 'Drupal',
                        confidence: 0.85,
                        description: 'Drupal custom modules',
                        examples: ['/modules/custom/'],
                    },
                    {
                        pattern: 'themes/contrib',
                        category: 'cms',
                        platform: 'Drupal',
                        confidence: 0.8,
                        description: 'Drupal contrib themes',
                        examples: ['/themes/contrib/'],
                    },
                    {
                        pattern: 'sites/default/files',
                        category: 'cms',
                        platform: 'Drupal',
                        confidence: 0.75,
                        description: 'Drupal files directory',
                        examples: ['/sites/default/files/'],
                    },
                ],
            ],

            [
                'Joomla',
                [
                    {
                        pattern: 'joomla',
                        category: 'cms',
                        platform: 'Joomla',
                        confidence: 0.9,
                        description: 'Joomla core',
                        examples: ['/media/jui/'],
                    },
                    {
                        pattern: 'administrator',
                        category: 'cms',
                        platform: 'Joomla',
                        confidence: 0.85,
                        description: 'Joomla admin',
                        examples: ['/administrator/'],
                    },
                    {
                        pattern: 'components/com_',
                        category: 'cms',
                        platform: 'Joomla',
                        confidence: 0.8,
                        description: 'Joomla components',
                        examples: ['/components/com_content/'],
                    },
                    {
                        pattern: 'modules/mod_',
                        category: 'cms',
                        platform: 'Joomla',
                        confidence: 0.75,
                        description: 'Joomla modules',
                        examples: ['/modules/mod_menu/'],
                    },
                    {
                        pattern: 'templates/',
                        category: 'cms',
                        platform: 'Joomla',
                        confidence: 0.7,
                        description: 'Joomla templates',
                        examples: ['/templates/protostar/'],
                    },
                ],
            ],

            [
                'Ghost',
                [
                    {
                        pattern: 'ghost',
                        category: 'cms',
                        platform: 'Ghost',
                        confidence: 0.9,
                        description: 'Ghost CMS',
                        examples: ['/ghost/'],
                    },
                    {
                        pattern: 'content/themes',
                        category: 'cms',
                        platform: 'Ghost',
                        confidence: 0.85,
                        description: 'Ghost themes',
                        examples: ['/content/themes/'],
                    },
                    {
                        pattern: 'assets/built',
                        category: 'cms',
                        platform: 'Ghost',
                        confidence: 0.8,
                        description: 'Ghost built assets',
                        examples: ['/assets/built/'],
                    },
                ],
            ],

            // E-commerce Platforms
            [
                'Shopify',
                [
                    {
                        pattern: 'shopify',
                        category: 'ecommerce',
                        platform: 'Shopify',
                        confidence: 0.95,
                        description: 'Shopify platform',
                        examples: ['cdn.shopify.com'],
                    },
                    {
                        pattern: 'shopifycloud',
                        category: 'ecommerce',
                        platform: 'Shopify',
                        confidence: 0.9,
                        description: 'Shopify cloud services',
                        examples: ['shopifycloud.com'],
                    },
                    {
                        pattern: 'checkout.shopify',
                        category: 'ecommerce',
                        platform: 'Shopify',
                        confidence: 0.95,
                        description: 'Shopify checkout',
                        examples: ['checkout.shopify.com'],
                    },
                    {
                        pattern: 'shopify-analytics',
                        category: 'ecommerce',
                        platform: 'Shopify',
                        confidence: 0.85,
                        description: 'Shopify analytics',
                        examples: ['/analytics.js'],
                    },
                ],
            ],

            [
                'Magento',
                [
                    {
                        pattern: 'magento',
                        category: 'ecommerce',
                        platform: 'Magento',
                        confidence: 0.9,
                        description: 'Magento e-commerce',
                        examples: ['/js/magento/'],
                    },
                    {
                        pattern: 'pub/static',
                        category: 'ecommerce',
                        platform: 'Magento',
                        confidence: 0.85,
                        description: 'Magento static files',
                        examples: ['/pub/static/'],
                    },
                    {
                        pattern: 'adminhtml',
                        category: 'ecommerce',
                        platform: 'Magento',
                        confidence: 0.8,
                        description: 'Magento admin',
                        examples: ['/adminhtml/'],
                    },
                    {
                        pattern: 'mage/',
                        category: 'ecommerce',
                        platform: 'Magento',
                        confidence: 0.75,
                        description: 'Magento core',
                        examples: ['/js/mage/'],
                    },
                ],
            ],

            // Website Builders
            [
                'Wix',
                [
                    {
                        pattern: 'wix.com',
                        category: 'builder',
                        platform: 'Wix',
                        confidence: 0.95,
                        description: 'Wix website builder',
                        examples: ['static.wixstatic.com'],
                    },
                    {
                        pattern: 'wixstatic',
                        category: 'builder',
                        platform: 'Wix',
                        confidence: 0.9,
                        description: 'Wix static assets',
                        examples: ['wixstatic.com'],
                    },
                    {
                        pattern: 'parastorage',
                        category: 'builder',
                        platform: 'Wix',
                        confidence: 0.85,
                        description: 'Wix storage service',
                        examples: ['parastorage.com'],
                    },
                ],
            ],

            [
                'Squarespace',
                [
                    {
                        pattern: 'squarespace',
                        category: 'builder',
                        platform: 'Squarespace',
                        confidence: 0.95,
                        description: 'Squarespace platform',
                        examples: ['squarespace.com'],
                    },
                    {
                        pattern: 'sqspcdn',
                        category: 'builder',
                        platform: 'Squarespace',
                        confidence: 0.9,
                        description: 'Squarespace CDN',
                        examples: ['sqspcdn.com'],
                    },
                    {
                        pattern: 'squarespace-analytics',
                        category: 'builder',
                        platform: 'Squarespace',
                        confidence: 0.85,
                        description: 'Squarespace analytics',
                        examples: ['/universal/scripts-compressed/'],
                    },
                ],
            ],

            [
                'Webflow',
                [
                    {
                        pattern: 'webflow',
                        category: 'builder',
                        platform: 'Webflow',
                        confidence: 0.95,
                        description: 'Webflow platform',
                        examples: ['webflow.com'],
                    },
                    {
                        pattern: 'uploads-ssl.webflow',
                        category: 'builder',
                        platform: 'Webflow',
                        confidence: 0.9,
                        description: 'Webflow uploads',
                        examples: ['uploads-ssl.webflow.com'],
                    },
                ],
            ],

            // JavaScript Frameworks
            [
                'React',
                [
                    {
                        pattern: 'react.development',
                        category: 'framework',
                        platform: 'React',
                        confidence: 0.85,
                        description: 'React development build',
                        examples: ['react.development.js'],
                    },
                    {
                        pattern: 'react.production',
                        category: 'framework',
                        platform: 'React',
                        confidence: 0.85,
                        description: 'React production build',
                        examples: ['react.production.min.js'],
                    },
                    {
                        pattern: 'react-dom',
                        category: 'framework',
                        platform: 'React',
                        confidence: 0.85,
                        description: 'React DOM',
                        examples: ['react-dom.js'],
                    },
                    {
                        pattern: '_next/static',
                        category: 'framework',
                        platform: 'Next.js',
                        confidence: 0.9,
                        description: 'Next.js static files',
                        examples: ['/_next/static/'],
                    },
                    {
                        pattern: 'next/router',
                        category: 'framework',
                        platform: 'Next.js',
                        confidence: 0.85,
                        description: 'Next.js router',
                        examples: ['/next/router'],
                    },
                ],
            ],

            [
                'Vue',
                [
                    {
                        pattern: 'vue.js',
                        category: 'framework',
                        platform: 'Vue.js',
                        confidence: 0.85,
                        description: 'Vue.js framework',
                        examples: ['vue.js', 'vue.min.js'],
                    },
                    {
                        pattern: 'vuex',
                        category: 'framework',
                        platform: 'Vue.js',
                        confidence: 0.8,
                        description: 'Vue.js state management',
                        examples: ['vuex.js'],
                    },
                    {
                        pattern: 'nuxt',
                        category: 'framework',
                        platform: 'Nuxt.js',
                        confidence: 0.85,
                        description: 'Nuxt.js framework',
                        examples: ['/_nuxt/'],
                    },
                ],
            ],

            [
                'Angular',
                [
                    {
                        pattern: 'angular',
                        category: 'framework',
                        platform: 'Angular',
                        confidence: 0.85,
                        description: 'Angular framework',
                        examples: ['angular.js', '@angular/'],
                    },
                    {
                        pattern: '@angular',
                        category: 'framework',
                        platform: 'Angular',
                        confidence: 0.9,
                        description: 'Angular modules',
                        examples: ['@angular/core'],
                    },
                    {
                        pattern: 'ng-',
                        category: 'framework',
                        platform: 'Angular',
                        confidence: 0.75,
                        description: 'Angular directives',
                        examples: ['ng-app', 'ng-controller'],
                    },
                ],
            ],

            // Analytics & Marketing
            [
                'Google Analytics',
                [
                    {
                        pattern: 'google-analytics',
                        category: 'analytics',
                        platform: 'Google Analytics',
                        confidence: 0.95,
                        description: 'Google Analytics',
                        examples: ['google-analytics.com'],
                    },
                    {
                        pattern: 'googletagmanager',
                        category: 'analytics',
                        platform: 'Google Tag Manager',
                        confidence: 0.9,
                        description: 'Google Tag Manager',
                        examples: ['googletagmanager.com'],
                    },
                    {
                        pattern: 'gtag',
                        category: 'analytics',
                        platform: 'Google Analytics 4',
                        confidence: 0.85,
                        description: 'GA4 gtag',
                        examples: ['/gtag/js'],
                    },
                ],
            ],

            [
                'Adobe Analytics',
                [
                    {
                        pattern: 'omniture',
                        category: 'analytics',
                        platform: 'Adobe Analytics',
                        confidence: 0.9,
                        description: 'Adobe Analytics (Omniture)',
                        examples: ['omniture.com'],
                    },
                    {
                        pattern: 'adobe-analytics',
                        category: 'analytics',
                        platform: 'Adobe Analytics',
                        confidence: 0.85,
                        description: 'Adobe Analytics',
                        examples: ['adobe-analytics.js'],
                    },
                ],
            ],

            // Backend Frameworks (client-side footprints)
            [
                'Django',
                [
                    {
                        pattern: 'django',
                        category: 'backend',
                        platform: 'Django',
                        confidence: 0.8,
                        description: 'Django framework',
                        examples: ['/static/admin/', 'django.js'],
                    },
                    {
                        pattern: 'admin/js',
                        category: 'backend',
                        platform: 'Django',
                        confidence: 0.75,
                        description: 'Django admin',
                        examples: ['/static/admin/js/'],
                    },
                ],
            ],

            [
                'Rails',
                [
                    {
                        pattern: 'rails',
                        category: 'backend',
                        platform: 'Ruby on Rails',
                        confidence: 0.8,
                        description: 'Rails framework',
                        examples: ['rails.js'],
                    },
                    {
                        pattern: 'turbo',
                        category: 'backend',
                        platform: 'Ruby on Rails',
                        confidence: 0.75,
                        description: 'Turbo (Rails)',
                        examples: ['turbo.js'],
                    },
                    {
                        pattern: 'stimulus',
                        category: 'backend',
                        platform: 'Ruby on Rails',
                        confidence: 0.7,
                        description: 'Stimulus (Rails)',
                        examples: ['stimulus.js'],
                    },
                ],
            ],

            // Libraries
            [
                'jQuery',
                [
                    {
                        pattern: 'jquery',
                        category: 'library',
                        platform: 'jQuery',
                        confidence: 0.9,
                        description: 'jQuery library',
                        examples: ['jquery.js', 'jquery.min.js'],
                    },
                    {
                        pattern: 'jquery-ui',
                        category: 'library',
                        platform: 'jQuery UI',
                        confidence: 0.85,
                        description: 'jQuery UI',
                        examples: ['jquery-ui.js'],
                    },
                ],
            ],

            [
                'Bootstrap',
                [
                    {
                        pattern: 'bootstrap',
                        category: 'library',
                        platform: 'Bootstrap',
                        confidence: 0.85,
                        description: 'Bootstrap framework',
                        examples: ['bootstrap.js', 'bootstrap.min.js'],
                    },
                ],
            ],
        ]);
    }

    /**
     * Enhance patterns with CMS intelligence
     */
    private enhanceWithCMSIntelligence(
        patterns: Map<string, PatternData>,
        data: PreprocessedData
    ): Map<string, PatternData> {
        const enhancedPatterns = new Map(patterns);

        // Add CMS-specific patterns based on script analysis
        for (const [siteUrl, siteData] of data.sites) {
            const cmsContext = siteData.cms || 'Unknown';

            for (const scriptSrc of siteData.scripts) {
                const cmsPatterns = this.extractCMSPatterns(scriptSrc, cmsContext);

                for (const patternName of cmsPatterns) {
                    if (!enhancedPatterns.has(patternName)) {
                        enhancedPatterns.set(patternName, {
                            pattern: patternName,
                            siteCount: 0,
                            frequency: 0,
                            sites: new Set(),
                            metadata: {
                                type: 'cms_enhanced',
                                source: 'cms_intelligence',
                                category: this.getCategoryForPattern(patternName),
                            },
                        });
                    }

                    const pattern = enhancedPatterns.get(patternName)!;
                    if (!pattern.sites.has(siteUrl)) {
                        pattern.sites.add(siteUrl);
                        pattern.siteCount++;
                    }
                }
            }
        }

        // Recalculate frequencies
        for (const pattern of enhancedPatterns.values()) {
            pattern.frequency = pattern.siteCount / data.totalSites;
        }

        return enhancedPatterns;
    }

    /**
     * Extract CMS-specific patterns from script sources
     */
    private extractCMSPatterns(scriptSrc: string, cmsContext: string): string[] {
        const patterns: string[] = [];

        try {
            for (const [platform, platformPatterns] of this.cmsPatternDatabase) {
                for (const cmsPattern of platformPatterns) {
                    if (scriptSrc.toLowerCase().includes(cmsPattern.pattern.toLowerCase())) {
                        // Boost confidence if it matches detected CMS context
                        const _confidenceBoost = platform === cmsContext ? 0.1 : 0;
                        const patternName = `${cmsPattern.category}:${cmsPattern.platform.toLowerCase().replace(/\s+/g, '-')}:${cmsPattern.pattern}`;
                        patterns.push(patternName);
                    }
                }
            }
        } catch (error) {
            logger.warn('Error extracting CMS patterns', { scriptSrc, error });
        }

        return patterns;
    }

    /**
     * Get category for pattern name
     */
    private getCategoryForPattern(patternName: string): CMSCategory {
        const categoryMatch = patternName.match(/^([^:]+):/);
        return (categoryMatch?.[1] as CMSCategory) || 'library';
    }

    /**
     * Analyze platform detection from enhanced patterns
     */
    private analyzePlatformDetection(
        patterns: Map<string, PatternData>,
        _data: PreprocessedData
    ): Map<string, PlatformDetection> {
        const detectedPlatforms = new Map<string, PlatformDetection>();

        for (const [patternName, patternData] of patterns) {
            const categoryMatch = patternName.match(/^([^:]+):([^:]+):(.+)$/);
            if (!categoryMatch) continue;

            const [, category, platform, pattern] = categoryMatch;
            const platformKey = platform;

            if (!detectedPlatforms.has(platformKey)) {
                detectedPlatforms.set(platformKey, {
                    platform: platform.replace(/-/g, ' '),
                    category: category as CMSCategory,
                    confidence: 0,
                    evidencePatterns: [],
                    conflictingEvidence: [],
                });
            }

            const detection = detectedPlatforms.get(platformKey)!;
            detection.evidencePatterns.push(pattern);

            // Calculate confidence based on frequency and pattern specificity
            const baseConfidence = this.getPatternConfidence(category as CMSCategory, pattern);
            const frequencyWeight = Math.min(patternData.frequency * 3, 1); // Boost frequency weight
            const combinedConfidence = baseConfidence * (0.7 + 0.3 * frequencyWeight); // 70% base + 30% frequency
            detection.confidence = Math.max(detection.confidence, combinedConfidence);
        }

        return detectedPlatforms;
    }

    /**
     * Get base confidence for pattern
     */
    private getPatternConfidence(category: CMSCategory, pattern: string): number {
        // Platform-specific patterns have higher confidence
        const highConfidencePatterns = [
            'wp-admin',
            'wp-content',
            'shopify',
            'drupal',
            'wix',
            'squarespace',
        ];
        if (highConfidencePatterns.some(p => pattern.includes(p))) {
            return 0.95;
        }

        // Category-based confidence
        const categoryConfidence: Record<CMSCategory, number> = {
            cms: 0.85,
            ecommerce: 0.9,
            builder: 0.95,
            framework: 0.8,
            backend: 0.7,
            analytics: 0.85,
            hosting: 0.6,
            library: 0.7,
        };

        return categoryConfidence[category] || 0.6;
    }

    /**
     * Analyze technology stack from detected platforms
     */
    private analyzeTechnologyStack(
        platforms: Map<string, PlatformDetection>,
        _patterns: Map<string, PatternData>
    ): TechnologyStackAnalysis {
        const stack: TechnologyStackAnalysis = {
            frontend: [],
            backend: [],
            cms: [],
            ecommerce: [],
            analytics: [],
            libraries: [],
            frameworks: [],
            complexity: 'simple',
            modernityScore: 0,
        };

        let modernPatterns = 0;
        let totalPatterns = 0;

        for (const [_platformName, detection] of platforms) {
            totalPatterns++;

            switch (detection.category) {
                case 'cms':
                    stack.cms.push(detection.platform);
                    break;
                case 'ecommerce':
                    stack.ecommerce.push(detection.platform);
                    break;
                case 'framework':
                    {
                        stack.frameworks.push(detection.platform);
                        stack.frontend.push(detection.platform);
                        // Check for modern frameworks (case-insensitive)
                        const platform = detection.platform.toLowerCase();
                        if (
                            platform.includes('react') ||
                            platform.includes('vue') ||
                            platform.includes('angular') ||
                            platform.includes('next')
                        ) {
                            modernPatterns++;
                        }
                    }
                    break;
                case 'backend':
                    stack.backend.push(detection.platform);
                    break;
                case 'analytics':
                    stack.analytics.push(detection.platform);
                    break;
                case 'library':
                    stack.libraries.push(detection.platform);
                    break;
            }
        }

        // Calculate complexity
        const totalTechnologies =
            stack.frontend.length +
            stack.backend.length +
            stack.cms.length +
            stack.ecommerce.length;

        if (totalTechnologies <= 2) stack.complexity = 'simple';
        else if (totalTechnologies <= 5) stack.complexity = 'moderate';
        else if (totalTechnologies <= 8) stack.complexity = 'complex';
        else stack.complexity = 'enterprise';

        // Calculate modernity score
        stack.modernityScore = totalPatterns > 0 ? modernPatterns / totalPatterns : 0;

        return stack;
    }

    /**
     * Generate CMS insights
     */
    private generateCMSInsights(
        platforms: Map<string, PlatformDetection>,
        _data: PreprocessedData
    ): CMSInsights {
        const cmsDetections = Array.from(platforms.values())
            .filter(p => p.category === 'cms')
            .sort((a, b) => b.confidence - a.confidence);

        const primaryCMS = cmsDetections[0]?.platform;
        const cmsConfidence = cmsDetections[0]?.confidence || 0;
        const multiCMSDetected = cmsDetections.length > 1;

        return {
            primaryCMS,
            cmsConfidence,
            multiCMSDetected,
            migrationPatterns: this.detectMigrationPatterns(platforms),
            customizations: this.detectCustomizations(platforms),
            pluginEcosystem: {
                detectedPlugins: [],
                commercialPlugins: [],
                securityPlugins: [],
                performancePlugins: [],
                totalPluginCount: 0,
            },
        };
    }

    /**
     * Detect migration patterns
     */
    private detectMigrationPatterns(platforms: Map<string, PlatformDetection>): string[] {
        const patterns: string[] = [];
        const cmsCount = Array.from(platforms.values()).filter(p => p.category === 'cms').length;

        if (cmsCount > 1) {
            patterns.push('multi-cms-detected');
        }

        return patterns;
    }

    /**
     * Detect customizations
     */
    private detectCustomizations(platforms: Map<string, PlatformDetection>): string[] {
        const customizations: string[] = [];

        // Check for custom patterns
        for (const detection of platforms.values()) {
            if (detection.evidencePatterns.some(p => p.includes('custom'))) {
                customizations.push(`custom-${detection.platform.toLowerCase()}`);
            }
        }

        return customizations;
    }

    /**
     * Analyze deployment environment
     */
    private analyzeDeployment(
        patterns: Map<string, PatternData>,
        data: PreprocessedData
    ): DeploymentAnalysis {
        let minifiedCount = 0;
        let unminifiedCount = 0;
        let sourceMapCount = 0;
        let cdnCount = 0;

        for (const [_siteUrl, siteData] of data.sites) {
            for (const scriptSrc of siteData.scripts) {
                if (scriptSrc.includes('.min.')) minifiedCount++;
                else unminifiedCount++;

                if (scriptSrc.includes('.map')) sourceMapCount++;
                if (scriptSrc.includes('cdn.') || scriptSrc.includes('.cdn.')) cdnCount++;
            }
        }

        const totalScripts = minifiedCount + unminifiedCount;
        const minificationLevel = totalScripts > 0 ? minifiedCount / totalScripts : 0;

        // Check for bundling patterns in script URLs
        let bundlingDetected = false;
        for (const [_siteUrl, siteData] of data.sites) {
            for (const scriptSrc of siteData.scripts) {
                if (
                    scriptSrc.includes('webpack') ||
                    scriptSrc.includes('_next/static') ||
                    scriptSrc.includes('bundle') ||
                    scriptSrc.includes('chunks/')
                ) {
                    bundlingDetected = true;
                    break;
                }
            }
            if (bundlingDetected) break;
        }

        return {
            environment: sourceMapCount > 0 ? 'development' : 'production',
            minificationLevel,
            cachingStrategy: cdnCount > 0 ? ['cdn'] : [],
            bundlingDetected,
            sourceMapDetected: sourceMapCount > 0,
        };
    }

    /**
     * Analyze security patterns
     */
    private analyzeSecurityPatterns(
        patterns: Map<string, PatternData>,
        _data: PreprocessedData
    ): SecurityAnalysis {
        const trackingPatterns = Array.from(patterns.keys()).filter(
            p => p.includes('analytics') || p.includes('tracking') || p.includes('pixel')
        );

        const trackingIntensity =
            trackingPatterns.length > 5
                ? 'aggressive'
                : trackingPatterns.length > 2
                  ? 'high'
                  : trackingPatterns.length > 0
                    ? 'moderate'
                    : 'low';

        return {
            securityHeaders: [],
            trackingIntensity,
            privacyCompliance: [],
            vulnerabilityIndicators: [],
            contentSecurityPolicy: false,
        };
    }
}

/**
 * Factory function for backward compatibility
 */
export function createCMSEnhancedScriptAnalyzer(): CMSEnhancedScriptV2 {
    return new CMSEnhancedScriptV2();
}
