/**
 * TechnologyAnalyzerV2 - Phase 4 implementation
 * 
 * Comprehensive technology stack analysis across all analyzer data.
 * Replaces TODO placeholder in FrequencyAggregator to complete V1→V2 migration.
 * 
 * Features:
 * - Cross-analyzer technology detection (headers, meta, scripts)
 * - Technology stack categorization and versioning
 * - Compatibility analysis and trend detection
 * - Integration with vendor and CMS intelligence
 */

import type { 
  FrequencyAnalyzer, 
  PreprocessedData, 
  AnalysisOptions, 
  AnalysisResult, 
  PatternData,
  TechSpecificData 
} from '../types/analyzer-interface.js';
import { createModuleLogger } from '../../utils/logger.js';

const logger = createModuleLogger('technology-analyzer-v2');

/**
 * Technology category types for comprehensive classification
 */
export type TechnologyCategory = 
  | 'frontend'           // React, Vue, Angular, jQuery
  | 'backend'            // Node.js, PHP, Python, Java
  | 'database'           // MySQL, PostgreSQL, MongoDB
  | 'server'             // Apache, Nginx, IIS
  | 'cdn'                // Cloudflare, AWS CloudFront, Fastly
  | 'cms'                // WordPress, Drupal, Joomla
  | 'ecommerce'          // Shopify, Magento, WooCommerce
  | 'analytics'          // Google Analytics, Adobe Analytics
  | 'infrastructure'     // AWS, Google Cloud, Azure
  | 'security'           // Let's Encrypt, Cloudflare SSL
  | 'development'        // webpack, npm, Git
  | 'hosting'            // Vercel, Netlify, GitHub Pages
  | 'other';             // Unclassified technologies

/**
 * Technology detection pattern for cross-analyzer analysis
 */
export interface TechnologyPattern {
  name: string;
  category: TechnologyCategory;
  confidence: number;
  detectionMethods: TechnologyDetectionMethod[];
  version?: string;
  deprecated?: boolean;
  popularity?: 'rising' | 'stable' | 'declining';
}

/**
 * Detection method information
 */
export interface TechnologyDetectionMethod {
  source: 'header' | 'meta' | 'script' | 'vendor' | 'cms';
  pattern: string;
  confidence: number;
  evidence: string[];
}

/**
 * Technology stack analysis results
 */
export interface TechnologyStackAnalysis {
  primaryStack: string[];              // Most confident technology identifications
  stackComplexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
  modernityScore: number;              // 0-1 based on modern vs legacy tech
  compatibilityScore: number;          // 0-1 based on known technology conflicts
  adoptionTrends: Map<string, 'rising' | 'stable' | 'declining'>;
  versionAnalysis: Map<string, VersionAnalysis>;
  stackRecommendations: string[];
}

/**
 * Version analysis for detected technologies
 */
export interface VersionAnalysis {
  detectedVersion?: string;
  latestVersion?: string;
  versionAge: 'current' | 'recent' | 'outdated' | 'legacy';
  securityRisk: 'low' | 'medium' | 'high';
  upgradeRecommended: boolean;
}

/**
 * Enhanced TechSpecificData with comprehensive analysis
 */
export interface EnhancedTechSpecificData extends TechSpecificData {
  detectedTechnologies: Map<string, TechnologyPattern>;
  stackAnalysis: TechnologyStackAnalysis;
  categoryDistribution: Map<string, Set<string>>;
  technologyTrends: Map<string, any>;
  compatibilityMatrix: Map<string, string[]>;
  securityAssessment: Map<string, any>;
}

/**
 * TechnologyAnalyzerV2 - Comprehensive technology stack analysis
 */
export class TechnologyAnalyzerV2 implements FrequencyAnalyzer<EnhancedTechSpecificData> {
  private technologyDatabase: Map<string, TechnologyPattern> = new Map();
  
  constructor() {
    this.initializeTechnologyDatabase();
  }

  getName(): string {
    return 'TechnologyAnalyzerV2';
  }

  async analyze(
    data: PreprocessedData, 
    options: AnalysisOptions
  ): Promise<AnalysisResult<EnhancedTechSpecificData>> {
    const startTime = Date.now();
    
    logger.info(`Starting comprehensive technology analysis for ${data.totalSites} sites`, {
      minOccurrences: options.minOccurrences,
      technologyPatterns: this.technologyDatabase.size
    });

    // Cross-analyzer technology detection
    const detectedTechnologies = await this.performCrossAnalyzerDetection(data);
    
    // Apply confidence filtering
    const filteredTechnologies = this.filterByConfidence(detectedTechnologies, options);
    
    // Generate technology stack analysis
    const stackAnalysis = this.analyzeStackComplexity(filteredTechnologies, data);
    
    // Create category distribution
    const categoryDistribution = this.generateCategoryDistribution(filteredTechnologies);
    
    // Analyze technology trends
    const technologyTrends = this.analyzeTechnologyTrends(filteredTechnologies, data);
    
    // Generate compatibility matrix
    const compatibilityMatrix = this.generateCompatibilityMatrix(filteredTechnologies);
    
    // Perform security assessment
    const securityAssessment = this.performSecurityAssessment(filteredTechnologies);

    // Create technology patterns for base interface
    const patterns = this.createTechnologyPatterns(filteredTechnologies, data.totalSites, options);

    // Create enhanced analyzer-specific data
    const analyzerSpecific: EnhancedTechSpecificData = {
      categories: categoryDistribution,
      detectedTechnologies: filteredTechnologies,
      stackAnalysis,
      categoryDistribution,
      technologyTrends,
      compatibilityMatrix,
      securityAssessment
    };

    const duration = Date.now() - startTime;
    logger.info(`Technology analysis completed in ${duration}ms`, {
      technologiesDetected: filteredTechnologies.size,
      stackComplexity: stackAnalysis.stackComplexity,
      modernityScore: stackAnalysis.modernityScore
    });

    return {
      patterns,
      totalSites: data.totalSites,
      analyzerSpecific,
      metadata: {
        analyzer: this.getName(),
        analyzedAt: new Date().toISOString(),
        totalPatternsFound: detectedTechnologies.size,
        totalPatternsAfterFiltering: filteredTechnologies.size,
        options
      }
    };
  }

  /**
   * Initialize comprehensive technology detection database
   */
  private initializeTechnologyDatabase(): void {
    this.technologyDatabase = new Map([
      // Frontend Frameworks & Libraries
      ['React', {
        name: 'React',
        category: 'frontend',
        confidence: 0.9,
        detectionMethods: [
          { source: 'script', pattern: 'react.js', confidence: 0.9, evidence: ['script-url'] },
          { source: 'script', pattern: '_next/static', confidence: 0.85, evidence: ['next-js-build'] },
          { source: 'meta', pattern: 'next-head-count', confidence: 0.8, evidence: ['next-js-meta'] }
        ],
        popularity: 'rising'
      }],
      
      ['Vue.js', {
        name: 'Vue.js',
        category: 'frontend',
        confidence: 0.85,
        detectionMethods: [
          { source: 'script', pattern: 'vue.js', confidence: 0.9, evidence: ['script-url'] },
          { source: 'script', pattern: 'vuex', confidence: 0.8, evidence: ['vuex-state'] },
          { source: 'script', pattern: '_nuxt', confidence: 0.85, evidence: ['nuxt-build'] }
        ],
        popularity: 'rising'
      }],
      
      ['Angular', {
        name: 'Angular',
        category: 'frontend',
        confidence: 0.85,
        detectionMethods: [
          { source: 'script', pattern: 'angular.js', confidence: 0.9, evidence: ['script-url'] },
          { source: 'script', pattern: '@angular/', confidence: 0.95, evidence: ['angular-modules'] },
          { source: 'meta', pattern: 'ng-version', confidence: 0.95, evidence: ['angular-meta'] }
        ],
        popularity: 'stable'
      }],
      
      ['jQuery', {
        name: 'jQuery',
        category: 'frontend',
        confidence: 0.9,
        detectionMethods: [
          { source: 'script', pattern: 'jquery.js', confidence: 0.95, evidence: ['script-url'] },
          { source: 'script', pattern: 'jquery.min.js', confidence: 0.95, evidence: ['script-url'] }
        ],
        popularity: 'declining'
      }],
      
      // Backend Technologies (detected via headers/signatures)
      ['PHP', {
        name: 'PHP',
        category: 'backend',
        confidence: 0.8,
        detectionMethods: [
          { source: 'header', pattern: 'x-powered-by', confidence: 0.8, evidence: ['php-header'] },
          { source: 'header', pattern: 'set-cookie', confidence: 0.6, evidence: ['phpsessid'] }
        ],
        popularity: 'stable'
      }],
      
      ['Node.js', {
        name: 'Node.js',
        category: 'backend',
        confidence: 0.8,
        detectionMethods: [
          { source: 'header', pattern: 'x-powered-by', confidence: 0.8, evidence: ['express-header'] },
          { source: 'script', pattern: 'webpack', confidence: 0.7, evidence: ['webpack-build'] }
        ],
        popularity: 'rising'
      }],
      
      // Web Servers
      ['Apache', {
        name: 'Apache',
        category: 'server',
        confidence: 0.9,
        detectionMethods: [
          { source: 'header', pattern: 'server', confidence: 0.9, evidence: ['apache-server'] }
        ],
        popularity: 'stable'
      }],
      
      ['Nginx', {
        name: 'Nginx',
        category: 'server',
        confidence: 0.9,
        detectionMethods: [
          { source: 'header', pattern: 'server', confidence: 0.9, evidence: ['nginx-server'] }
        ],
        popularity: 'rising'
      }],
      
      // CDN & Infrastructure  
      ['Cloudflare', {
        name: 'Cloudflare',
        category: 'cdn',
        confidence: 0.95,
        detectionMethods: [
          { source: 'header', pattern: 'cf-ray', confidence: 0.95, evidence: ['cf-ray-header'] },
          { source: 'header', pattern: 'cf-cache-status', confidence: 0.9, evidence: ['cf-cache'] }
        ],
        popularity: 'rising'
      }],
      
      ['AWS CloudFront', {
        name: 'AWS CloudFront',
        category: 'cdn',
        confidence: 0.9,
        detectionMethods: [
          { source: 'header', pattern: 'x-amz-cf-id', confidence: 0.95, evidence: ['cloudfront-id'] },
          { source: 'header', pattern: 'x-amz-cf-pop', confidence: 0.9, evidence: ['cloudfront-pop'] }
        ],
        popularity: 'stable'
      }],
      
      // CMS Platforms
      ['WordPress', {
        name: 'WordPress',
        category: 'cms',
        confidence: 0.9,
        detectionMethods: [
          { source: 'script', pattern: 'wp-content', confidence: 0.9, evidence: ['wp-scripts'] },
          { source: 'meta', pattern: 'generator', confidence: 0.85, evidence: ['wp-generator'] },
          { source: 'header', pattern: 'x-wp-total', confidence: 0.95, evidence: ['wp-api'] }
        ],
        popularity: 'stable'
      }],
      
      ['Drupal', {
        name: 'Drupal',
        category: 'cms',
        confidence: 0.9,
        detectionMethods: [
          { source: 'script', pattern: 'drupal.js', confidence: 0.95, evidence: ['drupal-core'] },
          { source: 'meta', pattern: 'generator', confidence: 0.85, evidence: ['drupal-generator'] },
          { source: 'header', pattern: 'x-drupal-cache', confidence: 0.9, evidence: ['drupal-cache'] }
        ],
        popularity: 'stable'
      }],
      
      // E-commerce Platforms
      ['Shopify', {
        name: 'Shopify',
        category: 'ecommerce',
        confidence: 0.95,
        detectionMethods: [
          { source: 'script', pattern: 'shopify.com', confidence: 0.95, evidence: ['shopify-scripts'] },
          { source: 'header', pattern: 'x-shopify-shop-id', confidence: 0.98, evidence: ['shopify-header'] }
        ],
        popularity: 'rising'
      }],
      
      ['Magento', {
        name: 'Magento',
        category: 'ecommerce',
        confidence: 0.9,
        detectionMethods: [
          { source: 'script', pattern: 'magento', confidence: 0.9, evidence: ['magento-scripts'] },
          { source: 'script', pattern: 'pub/static', confidence: 0.8, evidence: ['magento-static'] }
        ],
        popularity: 'stable'
      }],
      
      // Analytics & Tracking
      ['Google Analytics', {
        name: 'Google Analytics',
        category: 'analytics',
        confidence: 0.95,
        detectionMethods: [
          { source: 'script', pattern: 'google-analytics.com', confidence: 0.95, evidence: ['ga-script'] },
          { source: 'script', pattern: 'googletagmanager.com', confidence: 0.9, evidence: ['gtm-script'] }
        ],
        popularity: 'stable'
      }],
      
      // Security & SSL
      ['Let\'s Encrypt', {
        name: 'Let\'s Encrypt',
        category: 'security',
        confidence: 0.8,
        detectionMethods: [
          { source: 'header', pattern: 'strict-transport-security', confidence: 0.7, evidence: ['hsts-header'] }
        ],
        popularity: 'rising'
      }],
      
      // Development Tools
      ['webpack', {
        name: 'webpack',
        category: 'development',
        confidence: 0.85,
        detectionMethods: [
          { source: 'script', pattern: 'webpack', confidence: 0.9, evidence: ['webpack-bundle'] },
          { source: 'script', pattern: 'chunks/', confidence: 0.8, evidence: ['webpack-chunks'] }
        ],
        popularity: 'stable'
      }]
    ]);
  }

  /**
   * Perform cross-analyzer technology detection
   */
  private async performCrossAnalyzerDetection(data: PreprocessedData): Promise<Map<string, TechnologyPattern>> {
    const detectedTechnologies = new Map<string, TechnologyPattern>();
    
    for (const [siteUrl, siteData] of data.sites) {
      // Analyze headers for technology signatures
      for (const [headerName, headerValues] of siteData.headers) {
        for (const headerValue of headerValues) {
          const technologies = this.detectFromHeader(headerName, headerValue);
          for (const tech of technologies) {
            this.addOrUpdateTechnology(detectedTechnologies, tech, siteUrl);
          }
        }
      }
      
      // Analyze meta tags for technology indicators
      for (const [metaName, metaValues] of siteData.metaTags) {
        for (const metaValue of metaValues) {
          const technologies = this.detectFromMeta(metaName, metaValue);
          for (const tech of technologies) {
            this.addOrUpdateTechnology(detectedTechnologies, tech, siteUrl);
          }
        }
      }
      
      // Analyze scripts for technology patterns
      for (const scriptSrc of siteData.scripts) {
        const technologies = this.detectFromScript(scriptSrc);
        for (const tech of technologies) {
          this.addOrUpdateTechnology(detectedTechnologies, tech, siteUrl);
        }
      }
      
      // Use CMS data for additional context
      if (siteData.cms && siteData.cms !== 'Unknown') {
        const cmsPattern = this.getCMSTechnology(siteData.cms);
        if (cmsPattern) {
          this.addOrUpdateTechnology(detectedTechnologies, cmsPattern, siteUrl);
        }
      }
    }
    
    return detectedTechnologies;
  }

  /**
   * Detect technologies from HTTP headers
   */
  private detectFromHeader(headerName: string, headerValue: string): TechnologyPattern[] {
    const technologies: TechnologyPattern[] = [];
    
    // Handle null/undefined values gracefully
    if (!headerName || !headerValue) {
      return technologies;
    }
    
    const headerLower = headerName.toLowerCase();
    const valueLower = headerValue.toLowerCase();
    
    for (const [name, pattern] of this.technologyDatabase) {
      for (const method of pattern.detectionMethods) {
        if (method.source === 'header' && headerLower.includes(method.pattern)) {
          // Server detection
          if (headerLower === 'server') {
            if (valueLower.includes('apache')) {
              technologies.push(this.technologyDatabase.get('Apache')!);
            }
            if (valueLower.includes('nginx')) {
              technologies.push(this.technologyDatabase.get('Nginx')!);
            }
          }
          
          // PHP detection
          if (headerLower === 'x-powered-by' && valueLower.includes('php')) {
            technologies.push(this.technologyDatabase.get('PHP')!);
          }
          
          // Cloudflare detection
          if (headerLower === 'cf-ray') {
            technologies.push(this.technologyDatabase.get('Cloudflare')!);
          }
          
          // AWS CloudFront detection
          if (headerLower.includes('x-amz-cf')) {
            technologies.push(this.technologyDatabase.get('AWS CloudFront')!);
          }
        }
      }
    }
    
    return technologies;
  }

  /**
   * Detect technologies from meta tags
   */
  private detectFromMeta(metaName: string, metaValue: string): TechnologyPattern[] {
    const technologies: TechnologyPattern[] = [];
    
    // Handle null/undefined values gracefully
    if (!metaName || !metaValue) {
      return technologies;
    }
    
    const nameLower = metaName.toLowerCase();
    const valueLower = metaValue.toLowerCase();
    
    // Generator meta tag analysis
    if (nameLower === 'generator') {
      if (valueLower.includes('wordpress')) {
        technologies.push(this.technologyDatabase.get('WordPress')!);
      }
      if (valueLower.includes('drupal')) {
        technologies.push(this.technologyDatabase.get('Drupal')!);
      }
    }
    
    // Next.js detection
    if (nameLower === 'next-head-count') {
      technologies.push(this.technologyDatabase.get('React')!);
    }
    
    // Angular detection
    if (nameLower === 'ng-version') {
      technologies.push(this.technologyDatabase.get('Angular')!);
    }
    
    return technologies;
  }

  /**
   * Detect technologies from script sources
   */
  private detectFromScript(scriptSrc: string): TechnologyPattern[] {
    const technologies: TechnologyPattern[] = [];
    
    // Handle null/undefined/empty values gracefully
    if (!scriptSrc || typeof scriptSrc !== 'string') {
      return technologies;
    }
    
    const srcLower = scriptSrc.toLowerCase();
    
    // React/Next.js detection
    if (srcLower.includes('react') || srcLower.includes('_next/static')) {
      technologies.push(this.technologyDatabase.get('React')!);
    }
    
    // Vue.js detection
    if (srcLower.includes('vue') || srcLower.includes('_nuxt')) {
      technologies.push(this.technologyDatabase.get('Vue.js')!);
    }
    
    // Angular detection
    if (srcLower.includes('angular') || srcLower.includes('@angular/')) {
      technologies.push(this.technologyDatabase.get('Angular')!);
    }
    
    // jQuery detection
    if (srcLower.includes('jquery')) {
      technologies.push(this.technologyDatabase.get('jQuery')!);
    }
    
    // WordPress detection
    if (srcLower.includes('wp-content')) {
      technologies.push(this.technologyDatabase.get('WordPress')!);
    }
    
    // Drupal detection
    if (srcLower.includes('drupal.js')) {
      technologies.push(this.technologyDatabase.get('Drupal')!);
    }
    
    // Shopify detection
    if (srcLower.includes('shopify.com') || srcLower.includes('shopifycloud.com')) {
      technologies.push(this.technologyDatabase.get('Shopify')!);
    }
    
    // Google Analytics detection
    if (srcLower.includes('google-analytics.com') || srcLower.includes('googletagmanager.com')) {
      technologies.push(this.technologyDatabase.get('Google Analytics')!);
    }
    
    // webpack detection
    if (srcLower.includes('webpack') || srcLower.includes('chunks/')) {
      technologies.push(this.technologyDatabase.get('webpack')!);
    }
    
    return technologies;
  }

  /**
   * Get technology pattern from CMS detection
   */
  private getCMSTechnology(cms: string): TechnologyPattern | null {
    const cmsMap: Record<string, string> = {
      'WordPress': 'WordPress',
      'Drupal': 'Drupal',
      'Joomla': 'Drupal' // Fallback mapping
    };
    
    const techName = cmsMap[cms];
    return techName ? this.technologyDatabase.get(techName) || null : null;
  }

  /**
   * Add or update technology in detection results
   */
  private addOrUpdateTechnology(
    technologies: Map<string, TechnologyPattern>, 
    pattern: TechnologyPattern, 
    siteUrl: string
  ): void {
    if (!technologies.has(pattern.name)) {
      // Create a copy with site tracking
      technologies.set(pattern.name, {
        ...pattern,
        sites: new Set([siteUrl])
      } as any);
    } else {
      // Add site to existing pattern
      const existing = technologies.get(pattern.name)! as any;
      if (!existing.sites) {
        existing.sites = new Set();
      }
      existing.sites.add(siteUrl);
    }
  }

  /**
   * Filter technologies by confidence and occurrence thresholds
   */
  private filterByConfidence(
    technologies: Map<string, TechnologyPattern>, 
    options: AnalysisOptions
  ): Map<string, TechnologyPattern> {
    const filtered = new Map<string, TechnologyPattern>();
    
    for (const [name, pattern] of technologies) {
      const patternWithSites = pattern as any;
      const siteCount = patternWithSites.sites ? patternWithSites.sites.size : 1;
      
      // Apply minimum occurrence filter
      if (siteCount >= options.minOccurrences) {
        filtered.set(name, pattern);
      }
    }
    
    return filtered;
  }

  /**
   * Analyze technology stack complexity and characteristics
   */
  private analyzeStackComplexity(
    technologies: Map<string, TechnologyPattern>, 
    data: PreprocessedData
  ): TechnologyStackAnalysis {
    const categoryCount = new Map<TechnologyCategory, number>();
    const modernTechs = ['React', 'Vue.js', 'Angular', 'Node.js', 'webpack'];
    const legacyTechs = ['jQuery', 'PHP'];
    
    let modernCount = 0;
    let legacyCount = 0;
    const primaryStack: string[] = [];
    const adoptionTrends = new Map<string, 'rising' | 'stable' | 'declining'>();
    const versionAnalysis = new Map<string, VersionAnalysis>();
    
    for (const [name, pattern] of technologies) {
      // Count by category
      categoryCount.set(pattern.category, (categoryCount.get(pattern.category) || 0) + 1);
      
      // Track modernity
      if (modernTechs.includes(name)) modernCount++;
      if (legacyTechs.includes(name)) legacyCount++;
      
      // Build primary stack (high confidence technologies)
      if (pattern.confidence > 0.8) {
        primaryStack.push(name);
      }
      
      // Track adoption trends
      if (pattern.popularity) {
        adoptionTrends.set(name, pattern.popularity);
      }
      
      // Version analysis (simplified)
      versionAnalysis.set(name, {
        versionAge: 'recent',
        securityRisk: 'low',
        upgradeRecommended: false
      });
    }
    
    // Calculate complexity
    const totalCategories = categoryCount.size;
    let complexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
    
    if (totalCategories <= 2) complexity = 'simple';
    else if (totalCategories <= 4) complexity = 'moderate';
    else if (totalCategories <= 6) complexity = 'complex';
    else complexity = 'enterprise';
    
    // Calculate modernity score
    const totalTechs = modernCount + legacyCount;
    const modernityScore = totalTechs > 0 ? modernCount / totalTechs : 0.5;
    
    // Calculate compatibility score (simplified)
    const compatibilityScore = 0.8; // Default good compatibility
    
    return {
      primaryStack,
      stackComplexity: complexity,
      modernityScore,
      compatibilityScore,
      adoptionTrends,
      versionAnalysis,
      stackRecommendations: this.generateStackRecommendations(technologies)
    };
  }

  /**
   * Generate category distribution for TechSpecificData
   */
  private generateCategoryDistribution(technologies: Map<string, TechnologyPattern>): Map<string, Set<string>> {
    const distribution = new Map<string, Set<string>>();
    
    for (const [name, pattern] of technologies) {
      const categoryKey = pattern.category as string;
      if (!distribution.has(categoryKey)) {
        distribution.set(categoryKey, new Set());
      }
      distribution.get(categoryKey)!.add(name);
    }
    
    return distribution;
  }

  /**
   * Analyze technology trends across the dataset
   */
  private analyzeTechnologyTrends(
    technologies: Map<string, TechnologyPattern>, 
    data: PreprocessedData
  ): Map<string, any> {
    const trends = new Map<string, any>();
    
    for (const [name, pattern] of technologies) {
      const patternWithSites = pattern as any;
      const adoptionRate = patternWithSites.sites ? patternWithSites.sites.size / data.totalSites : 0;
      
      trends.set(name, {
        adoptionRate,
        trend: pattern.popularity || 'stable',
        category: pattern.category,
        confidence: pattern.confidence
      });
    }
    
    return trends;
  }

  /**
   * Generate technology compatibility matrix
   */
  private generateCompatibilityMatrix(technologies: Map<string, TechnologyPattern>): Map<string, string[]> {
    const matrix = new Map<string, string[]>();
    
    // Simplified compatibility rules
    const compatibilityRules: Record<string, string[]> = {
      'React': ['Node.js', 'webpack', 'Cloudflare'],
      'Vue.js': ['Node.js', 'webpack', 'Cloudflare'],
      'Angular': ['Node.js', 'webpack', 'Cloudflare'],
      'WordPress': ['PHP', 'Apache', 'MySQL'],
      'Drupal': ['PHP', 'Apache', 'MySQL'],
      'Shopify': ['Cloudflare', 'AWS CloudFront']
    };
    
    for (const [name, pattern] of technologies) {
      const compatibleTechs = compatibilityRules[name] || [];
      const actualCompatible = compatibleTechs.filter(tech => technologies.has(tech));
      matrix.set(name, actualCompatible);
    }
    
    return matrix;
  }

  /**
   * Perform security assessment of detected technologies
   */
  private performSecurityAssessment(technologies: Map<string, TechnologyPattern>): Map<string, any> {
    const assessment = new Map<string, any>();
    
    for (const [name, pattern] of technologies) {
      // Simplified security assessment
      let securityScore = 0.8; // Default good security
      let risks: string[] = [];
      
      // Adjust based on technology type and age
      if (pattern.popularity === 'declining') {
        securityScore -= 0.2;
        risks.push('Potentially outdated technology');
      }
      
      if (pattern.category === 'cms' && !pattern.version) {
        securityScore -= 0.1;
        risks.push('Unknown CMS version');
      }
      
      assessment.set(name, {
        securityScore: Math.max(0, securityScore),
        risks,
        recommendation: securityScore < 0.5 ? 'Review and update' : 'Monitor regularly'
      });
    }
    
    return assessment;
  }

  /**
   * Generate stack recommendations
   */
  private generateStackRecommendations(technologies: Map<string, TechnologyPattern>): string[] {
    const recommendations: string[] = [];
    
    const hasModernFrontend = Array.from(technologies.keys()).some(name => 
      ['React', 'Vue.js', 'Angular'].includes(name)
    );
    
    const hasLegacyJquery = technologies.has('jQuery');
    
    if (hasLegacyJquery && hasModernFrontend) {
      recommendations.push('Consider migrating from jQuery to modern framework patterns');
    }
    
    if (!technologies.has('Cloudflare') && !technologies.has('AWS CloudFront')) {
      recommendations.push('Consider implementing CDN for improved performance');
    }
    
    const hasAnalytics = technologies.has('Google Analytics');
    if (!hasAnalytics) {
      recommendations.push('Consider implementing web analytics for insights');
    }
    
    return recommendations;
  }

  /**
   * Create technology patterns for base FrequencyAnalyzer interface
   */
  private createTechnologyPatterns(
    technologies: Map<string, TechnologyPattern>, 
    totalSites: number,
    options: AnalysisOptions
  ): Map<string, PatternData> {
    const patterns = new Map<string, PatternData>();
    
    for (const [name, pattern] of technologies) {
      const patternWithSites = pattern as any;
      const sites = patternWithSites.sites || new Set();
      const siteCount = sites.size;
      
      patterns.set(name, {
        pattern: name,
        siteCount,
        frequency: siteCount / totalSites,
        sites,
        examples: options.includeExamples ? new Set([name]) : undefined,
        metadata: {
          type: 'technology',
          category: pattern.category,
          confidence: pattern.confidence,
          source: 'technology_analyzer',
          popularity: pattern.popularity
        }
      });
    }
    
    return patterns;
  }
}

/**
 * Factory function for TechnologyAnalyzerV2
 */
export function createTechnologyAnalyzer(): TechnologyAnalyzerV2 {
  return new TechnologyAnalyzerV2();
}