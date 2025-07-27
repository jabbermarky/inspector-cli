/**
 * VendorAnalyzerV2 - Native V2 Implementation
 * 
 * Provides comprehensive vendor detection, technology stack inference,
 * and vendor statistics analysis using V2 architecture patterns.
 * 
 * Migrated from V1 vendor-patterns.ts with V2 enhancements.
 */

import type { 
  FrequencyAnalyzer, 
  PreprocessedData, 
  AnalysisOptions, 
  AnalysisResult, 
  PatternData
} from '../types/analyzer-interface.js';
import { createModuleLogger } from '../../utils/logger.js';

const logger = createModuleLogger('vendor-analyzer-v2');

/**
 * V2 Vendor Pattern - Enhanced from V1 with confidence scoring
 */
export interface VendorPattern {
  name: string;
  category: 'cdn' | 'cms' | 'ecommerce' | 'analytics' | 'security' | 'framework' | 'hosting';
  headerPatterns: string[];
  description: string;
  website?: string;
}

/**
 * V2 Vendor Detection Result
 */
export interface VendorDetection {
  vendor: VendorPattern;
  confidence: number;           // 0-1 based on frequency and discriminativeness
  matchedHeaders: string[];     // Headers that matched this vendor
  matchedSites: string[];       // Sites where this vendor was detected
  frequency: number;            // Frequency across all sites (0-1)
}

/**
 * V2 Vendor Statistics - Enhanced from V1
 */
export interface VendorStats {
  totalHeaders: number;
  vendorHeaders: number;
  vendorCoverage: number;       // Percentage of headers that map to known vendors
  vendorDistribution: Array<{
    vendor: string;
    category: string;
    headerCount: number;
    percentage: number;
    headers: string[];
    confidence: number;         // V2 enhancement
  }>;
  categoryDistribution: Record<string, number>;
}

/**
 * V2 Technology Stack - Enhanced from V1
 */
export interface TechnologyStack {
  cms?: string;
  ecommerce?: string;
  cdn?: string[];
  analytics?: string[];
  framework?: string;
  hosting?: string;
  security?: string[];
  confidence: number;
  conflicts?: TechnologyConflict[];  // V2 enhancement
  complexity: 'simple' | 'moderate' | 'complex';  // V2 enhancement
}

/**
 * V2 Technology Signature - Multi-header vendor patterns
 */
export interface TechnologySignature {
  name: string;
  vendor: string;
  category: string;
  requiredHeaders: string[];
  optionalHeaders: string[];
  conflictingHeaders: string[];
  confidence: number;
  sites: string[];
}

/**
 * V2 Technology Conflict Detection
 */
export interface TechnologyConflict {
  type: 'cms_conflict' | 'framework_conflict' | 'incompatible_stack';
  vendors: string[];
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Validation-enhanced header data for Phase 3.3 integration
 */
export interface ValidationEnhancedHeader {
  originalHeader: string;
  qualityScore: number;           // From ValidationPipelineV2Native
  isStatisticallySignificant: boolean;
  validationPassed: boolean;
  frequency: number;
  confidence: number;             // Enhanced confidence based on validation
}

/**
 * Vendor analyzer specific data
 */
export interface VendorSpecificData {
  // Direct vendor detection
  vendorsByHeader: Map<string, VendorDetection>;
  
  // Vendor statistics  
  vendorStats: VendorStats;
  
  // Technology stack inference
  technologyStack: TechnologyStack;
  
  // V2-specific enhancements
  vendorConfidence: Map<string, number>;
  technologySignatures: TechnologySignature[];
  conflictingVendors: TechnologyConflict[];
  
  // Summary metrics
  summary: {
    totalVendorsDetected: number;
    highConfidenceVendors: number;
    technologyCategories: string[];
    stackComplexity: 'simple' | 'moderate' | 'complex';
  };
}

/**
 * Comprehensive vendor pattern database - Migrated from V1
 */
const VENDOR_PATTERNS: VendorPattern[] = [
  // CDN Providers
  {
    name: 'Cloudflare',
    category: 'cdn',
    headerPatterns: [
      'cf-ray',
      'cf-cache-status',
      'cf-request-id',
      'cf-visitor',
      'cf-connecting-ip',
      'cf-ipcountry',
      'cf-worker',
      'cf-edge-cache'
    ],
    description: 'Cloudflare CDN and security services',
    website: 'https://cloudflare.com'
  },
  {
    name: 'AWS CloudFront',
    category: 'cdn',
    headerPatterns: [
      'x-amz-cf-id',
      'x-amz-cf-pop',
      'x-amzn-requestid',
      'x-amzn-trace-id',
      'x-amz-apigw-id'
    ],
    description: 'Amazon Web Services CloudFront CDN',
    website: 'https://aws.amazon.com/cloudfront/'
  },
  {
    name: 'Fastly',
    category: 'cdn',
    headerPatterns: [
      'x-fastly-request-id',
      'x-served-by',
      'x-cache',
      'x-cache-hits',
      'x-timer',
      'fastly-debug-digest'
    ],
    description: 'Fastly edge cloud platform',
    website: 'https://fastly.com'
  },
  {
    name: 'Akamai',
    category: 'cdn',
    headerPatterns: [
      'x-akamai-edgescape',
      'x-akamai-request-id',
      'akamai-origin-hop',
      'x-akamai-transformed'
    ],
    description: 'Akamai content delivery network',
    website: 'https://akamai.com'
  },

  // CMS Platforms
  {
    name: 'WordPress',
    category: 'cms',
    headerPatterns: [
      'x-wp-total',
      'x-wp-totalpages',
      'x-pingback',
      'x-wp-nonce',
      'x-robots-tag'
    ],
    description: 'WordPress content management system',
    website: 'https://wordpress.org'
  },
  {
    name: 'Shopify',
    category: 'ecommerce',
    headerPatterns: [
      'x-shopify-shop-id',
      'x-shopify-stage',
      'x-shopify-request-id',
      'shopify-checkout-api-token',
      'x-sorting-hat-podid',
      'x-sorting-hat-shopid'
    ],
    description: 'Shopify e-commerce platform',
    website: 'https://shopify.com'
  },
  {
    name: 'Drupal',
    category: 'cms',
    headerPatterns: [
      'x-drupal-cache',
      'x-drupal-dynamic-cache',
      'x-generator'
    ],
    description: 'Drupal content management system',
    website: 'https://drupal.org'
  },
  {
    name: 'Duda',
    category: 'cms',
    headerPatterns: [
      'd-geo',
      'd-cache', 
      'd-sid',
      'd-rid',
      'd-cache-status'
    ],
    description: 'Duda website builder platform',
    website: 'https://duda.co'
  },

  // Analytics Providers
  {
    name: 'Google Analytics',
    category: 'analytics',
    headerPatterns: [
      'x-google-analytics-id',
      'x-ga-measurement-id',
      'x-gtm-server-preview'
    ],
    description: 'Google Analytics web analytics service',
    website: 'https://analytics.google.com'
  },

  // Web Frameworks
  {
    name: 'Laravel',
    category: 'framework',
    headerPatterns: [
      'x-laravel-session',
      'laravel_session'
    ],
    description: 'Laravel PHP web framework',
    website: 'https://laravel.com'
  },
  {
    name: 'ASP.NET',
    category: 'framework',
    headerPatterns: [
      'x-aspnetmvc-version',
      'x-aspnet-version',
      'x-powered-by' // when value contains ASP.NET
    ],
    description: 'Microsoft ASP.NET web framework',
    website: 'https://dotnet.microsoft.com/apps/aspnet'
  },

  // Security Services
  {
    name: 'reCAPTCHA',
    category: 'security',
    headerPatterns: [
      'x-recaptcha-action',
      'recaptcha-token'
    ],
    description: 'Google reCAPTCHA bot protection',
    website: 'https://www.google.com/recaptcha/'
  }
];

export class VendorAnalyzerV2 implements FrequencyAnalyzer<VendorSpecificData> {
  getName(): string {
    return 'VendorAnalyzerV2';
  }

  async analyze(
    data: PreprocessedData, 
    options: AnalysisOptions
  ): Promise<AnalysisResult<VendorSpecificData>> {
    logger.info('Starting V2 vendor analysis', {
      totalSites: data.totalSites,
      vendorPatterns: VENDOR_PATTERNS.length,
      hasValidationData: !!data.metadata?.validation
    });

    const startTime = Date.now();

    // Extract all unique headers with validation context
    const allHeaders = this.extractUniqueHeaders(data);
    
    // Phase 3.3: Use validation results to improve vendor detection
    const validationEnhancedHeaders = this.applyValidationContext(allHeaders, data);
    
    // Perform vendor detection for each header with validation enhancement
    const vendorsByHeader = this.detectVendorsByHeader(allHeaders, data, validationEnhancedHeaders);
    
    // Calculate vendor statistics
    const vendorStats = this.calculateVendorStats(allHeaders, vendorsByHeader);
    
    // Infer technology stack
    const technologyStack = this.inferTechnologyStack(vendorsByHeader, data);
    
    // Detect technology signatures
    const technologySignatures = this.detectTechnologySignatures(data);
    
    // Detect conflicts
    const conflictingVendors = this.detectVendorConflicts(vendorsByHeader);
    
    // Phase 3.3: Cross-analyzer consistency checks
    this.performCrossAnalyzerConsistencyChecks(vendorsByHeader, data);
    
    // Generate summary
    const summary = this.generateSummary(vendorsByHeader, technologyStack);
    
    // Create vendor confidence map
    const vendorConfidence = this.calculateVendorConfidence(vendorsByHeader);

    // Create V2 patterns for interface compatibility
    const patterns = this.createVendorPatterns(vendorsByHeader, options);

    const analyzerSpecific: VendorSpecificData = {
      vendorsByHeader,
      vendorStats,
      technologyStack,
      vendorConfidence,
      technologySignatures,
      conflictingVendors,
      summary
    };

    const duration = Date.now() - startTime;
    logger.info('V2 vendor analysis completed', {
      duration,
      vendorsDetected: vendorsByHeader.size,
      totalVendors: summary.totalVendorsDetected
    });

    return {
      patterns,
      totalSites: data.totalSites,
      metadata: {
        analyzer: 'VendorAnalyzerV2',
        analyzedAt: new Date().toISOString(),
        totalPatternsFound: patterns.size,
        totalPatternsAfterFiltering: vendorsByHeader.size,
        options
      },
      analyzerSpecific
    };
  }

  /**
   * Extract unique headers from preprocessed data
   */
  private extractUniqueHeaders(data: PreprocessedData): string[] {
    const headerSet = new Set<string>();
    
    for (const [_, siteData] of data.sites) {
      for (const headerName of siteData.headers.keys()) {
        headerSet.add(headerName.toLowerCase());
      }
    }
    
    return Array.from(headerSet);
  }

  /**
   * Phase 3.3: Apply validation context to improve vendor detection quality
   */
  private applyValidationContext(
    headers: string[], 
    data: PreprocessedData
  ): Map<string, ValidationEnhancedHeader> {
    const enhancedHeaders = new Map<string, ValidationEnhancedHeader>();
    
    // Check if validation metadata is available
    const validationData = data.metadata?.validation;
    
    for (const headerName of headers) {
      const enhancement: ValidationEnhancedHeader = {
        originalHeader: headerName,
        qualityScore: 0.5, // Default neutral quality
        isStatisticallySignificant: false,
        validationPassed: false,
        frequency: this.calculateHeaderFrequency(headerName, data),
        confidence: 0.5 // Default confidence
      };
      
      // Enhance with validation data if available
      if (validationData?.validatedHeaders) {
        const validationResult = validationData.validatedHeaders.get(headerName);
        if (validationResult) {
          enhancement.qualityScore = validationData.qualityScore || 0.5;
          enhancement.validationPassed = validationData.validationPassed || false;
          enhancement.isStatisticallySignificant = true; // If in validated set, it passed significance tests
          
          // Boost confidence for validated headers
          enhancement.confidence = Math.min(1.0, enhancement.confidence + 0.3);
          
          logger.debug('Enhanced header with validation context', {
            header: headerName,
            qualityScore: enhancement.qualityScore,
            validationPassed: enhancement.validationPassed
          });
        }
      }
      
      enhancedHeaders.set(headerName, enhancement);
    }
    
    logger.info('Applied validation context to headers', {
      totalHeaders: headers.length,
      validatedHeaders: validationData?.validatedHeaders?.size || 0,
      enhancedHeaders: enhancedHeaders.size
    });
    
    return enhancedHeaders;
  }

  /**
   * Calculate frequency of a specific header across sites
   */
  private calculateHeaderFrequency(headerName: string, data: PreprocessedData): number {
    let count = 0;
    const normalizedHeader = headerName.toLowerCase();
    
    for (const [_, siteData] of data.sites) {
      if (siteData.headers.has(normalizedHeader)) {
        count++;
      }
    }
    
    return data.totalSites > 0 ? count / data.totalSites : 0;
  }

  /**
   * Detect vendors for each header - Migrated from V1 with V2 validation enhancement
   */
  private detectVendorsByHeader(
    headers: string[], 
    data: PreprocessedData,
    validationEnhancements?: Map<string, ValidationEnhancedHeader>
  ): Map<string, VendorDetection> {
    const vendorDetections = new Map<string, VendorDetection>();

    for (const headerName of headers) {
      const vendor = this.findVendorByHeader(headerName);
      if (vendor) {
        // Calculate sites where this header appears
        const matchedSites = this.findSitesWithHeader(headerName, data);
        const frequency = matchedSites.length / data.totalSites;
        
        // Get validation enhancement for this header
        const validationEnhancement = validationEnhancements?.get(headerName);
        
        // Calculate confidence with validation enhancement
        const confidence = this.calculateHeaderVendorConfidence(vendor, frequency, validationEnhancement);

        vendorDetections.set(headerName, {
          vendor,
          confidence,
          matchedHeaders: [headerName],
          matchedSites,
          frequency
        });

        // Log enhanced vendor detection
        if (validationEnhancement?.validationPassed) {
          logger.debug('Enhanced vendor detection with validation', {
            header: headerName,
            vendor: vendor.name,
            baseConfidence: 0.7,
            enhancedConfidence: confidence,
            qualityScore: validationEnhancement.qualityScore
          });
        }
      }
    }

    return vendorDetections;
  }

  /**
   * Find vendor by header name - Migrated from V1
   */
  private findVendorByHeader(headerName: string): VendorPattern | undefined {
    const normalizedHeader = headerName.toLowerCase();
    
    // Direct lookup first
    for (const vendor of VENDOR_PATTERNS) {
      for (const pattern of vendor.headerPatterns) {
        if (normalizedHeader === pattern.toLowerCase()) {
          return vendor;
        }
      }
    }

    // Partial match for complex patterns
    for (const vendor of VENDOR_PATTERNS) {
      for (const pattern of vendor.headerPatterns) {
        if (normalizedHeader.includes(pattern.toLowerCase()) && pattern.length > 3) {
          return vendor;
        }
      }
    }

    return undefined;
  }

  /**
   * Find sites that have a specific header
   */
  private findSitesWithHeader(headerName: string, data: PreprocessedData): string[] {
    const sites: string[] = [];
    const normalizedHeader = headerName.toLowerCase();
    
    for (const [siteUrl, siteData] of data.sites) {
      if (siteData.headers.has(normalizedHeader)) {
        sites.push(siteUrl);
      }
    }
    
    return sites;
  }

  /**
   * Calculate confidence for header-vendor association (V2 enhanced with validation)
   */
  private calculateHeaderVendorConfidence(
    vendor: VendorPattern, 
    frequency: number,
    validationEnhancement?: ValidationEnhancedHeader
  ): number {
    // Base confidence from pattern specificity
    let confidence = 0.7;
    
    // Phase 3.3: Apply validation enhancements if available
    if (validationEnhancement) {
      // Use validation-derived confidence as base if available
      confidence = Math.max(confidence, validationEnhancement.confidence);
      
      // Boost confidence for statistically significant headers
      if (validationEnhancement.isStatisticallySignificant) {
        confidence += 0.15;
      }
      
      // Boost confidence for high-quality validated headers
      if (validationEnhancement.validationPassed && validationEnhancement.qualityScore > 0.7) {
        confidence += 0.1;
      }
      
      logger.debug('Applied validation enhancement to vendor confidence', {
        vendor: vendor.name,
        originalConfidence: 0.7,
        enhancedConfidence: confidence,
        qualityScore: validationEnhancement.qualityScore,
        validationPassed: validationEnhancement.validationPassed
      });
    }
    
    // Boost confidence for high-frequency patterns (but not too high to avoid false positives)
    if (frequency > 0.1) confidence += 0.2;
    if (frequency > 0.3) confidence += 0.1;
    
    // Reduce confidence for very rare patterns
    if (frequency < 0.01) confidence -= 0.3;
    
    // Category-specific adjustments
    switch (vendor.category) {
      case 'cms':
      case 'ecommerce':
        confidence += 0.1; // CMS headers tend to be more reliable
        break;
      case 'framework':
        confidence -= 0.1; // Framework headers can be ambiguous
        break;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Phase 3.3: Perform cross-analyzer consistency checks with semantic analysis
   */
  private performCrossAnalyzerConsistencyChecks(
    vendorDetections: Map<string, VendorDetection>,
    data: PreprocessedData
  ): void {
    // Check if semantic analysis metadata is available
    const semanticData = data.metadata?.semantic;
    
    if (!semanticData) {
      logger.debug('No semantic analysis data available for consistency checks');
      return;
    }
    
    logger.info('Performing cross-analyzer consistency checks', {
      vendorDetections: vendorDetections.size,
      semanticCategories: semanticData.categoryCount || 0
    });
    
    // Check for vendor-semantic category consistency
    let consistentDetections = 0;
    let inconsistentDetections = 0;
    
    for (const [headerName, detection] of vendorDetections) {
      const vendorCategory = detection.vendor.category;
      const semanticCategory = semanticData.headerCategories?.get(headerName);
      
      if (semanticCategory) {
        // Map vendor categories to semantic categories for consistency check
        const isConsistent = this.checkCategoryConsistency(vendorCategory, semanticCategory);
        
        if (isConsistent) {
          consistentDetections++;
        } else {
          inconsistentDetections++;
          logger.debug('Detected vendor-semantic inconsistency', {
            header: headerName,
            vendorCategory,
            semanticCategory,
            vendor: detection.vendor.name
          });
        }
      }
    }
    
    const consistencyRatio = consistentDetections / (consistentDetections + inconsistentDetections);
    logger.info('Cross-analyzer consistency analysis completed', {
      consistentDetections,
      inconsistentDetections,
      consistencyRatio: Math.round(consistencyRatio * 100) / 100,
      overallConsistent: consistencyRatio > 0.8
    });
  }

  /**
   * Check if vendor category is consistent with semantic category
   */
  private checkCategoryConsistency(vendorCategory: string, semanticCategory: string): boolean {
    // Define mapping between vendor categories and semantic categories
    const categoryMappings: Record<string, string[]> = {
      'cdn': ['infrastructure', 'caching', 'performance'],
      'cms': ['infrastructure', 'content-management'],
      'ecommerce': ['infrastructure', 'commerce', 'payment'],
      'analytics': ['tracking', 'monitoring'],
      'security': ['infrastructure', 'security'],
      'framework': ['infrastructure', 'development'],
      'hosting': ['infrastructure', 'hosting']
    };
    
    const expectedSemanticCategories = categoryMappings[vendorCategory] || [];
    return expectedSemanticCategories.includes(semanticCategory.toLowerCase());
  }

  /**
   * Calculate vendor statistics - Migrated from V1 analyzeVendorPresence
   */
  private calculateVendorStats(
    headers: string[], 
    vendorDetections: Map<string, VendorDetection>
  ): VendorStats {
    const vendorMap = new Map<string, { vendor: VendorPattern; headers: string[]; confidence: number }>();
    const categoryCount: Record<string, number> = {};
    let vendorHeaderCount = 0;

    // Process vendor detections
    for (const [headerName, detection] of vendorDetections) {
      vendorHeaderCount++;
      
      const vendorName = detection.vendor.name;
      if (!vendorMap.has(vendorName)) {
        vendorMap.set(vendorName, { 
          vendor: detection.vendor, 
          headers: [], 
          confidence: 0 
        });
      }
      
      const vendorEntry = vendorMap.get(vendorName)!;
      vendorEntry.headers.push(headerName);
      vendorEntry.confidence = Math.max(vendorEntry.confidence, detection.confidence);
      
      // Count by category
      const category = detection.vendor.category;
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    }

    // Create vendor distribution
    const vendorDistribution = Array.from(vendorMap.entries()).map(([vendorName, info]) => ({
      vendor: vendorName,
      category: info.vendor.category,
      headerCount: info.headers.length,
      percentage: headers.length > 0 ? (info.headers.length / headers.length) * 100 : 0,
      headers: info.headers,
      confidence: info.confidence
    }));

    return {
      totalHeaders: headers.length,
      vendorHeaders: vendorHeaderCount,
      vendorCoverage: headers.length > 0 ? (vendorHeaderCount / headers.length) * 100 : 0,
      vendorDistribution,
      categoryDistribution: categoryCount
    };
  }

  /**
   * Infer technology stack - Migrated and enhanced from V1
   */
  private inferTechnologyStack(
    vendorDetections: Map<string, VendorDetection>,
    data: PreprocessedData
  ): TechnologyStack {
    const stack: TechnologyStack = { 
      confidence: 0, 
      conflicts: [],
      complexity: 'simple'
    };
    
    const vendorsByCategory = new Map<string, VendorDetection[]>();
    
    // Group vendors by category
    for (const detection of vendorDetections.values()) {
      const category = detection.vendor.category;
      if (!vendorsByCategory.has(category)) {
        vendorsByCategory.set(category, []);
      }
      vendorsByCategory.get(category)!.push(detection);
    }

    // Assign primary technologies
    for (const [category, detections] of vendorsByCategory) {
      const sortedDetections = detections.sort((a, b) => b.confidence - a.confidence);
      const primary = sortedDetections[0];
      
      switch (category) {
        case 'cms':
          stack.cms = primary.vendor.name;
          break;
        case 'ecommerce':
          stack.ecommerce = primary.vendor.name;
          break;
        case 'framework':
          stack.framework = primary.vendor.name;
          break;
        case 'hosting':
          stack.hosting = primary.vendor.name;
          break;
        case 'cdn':
          stack.cdn = sortedDetections.map(d => d.vendor.name);
          break;
        case 'analytics':
          stack.analytics = sortedDetections.map(d => d.vendor.name);
          break;
        case 'security':
          stack.security = sortedDetections.map(d => d.vendor.name);
          break;
      }
    }

    // Calculate overall confidence
    const confidences = Array.from(vendorDetections.values()).map(d => d.confidence);
    stack.confidence = confidences.length > 0 
      ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length 
      : 0;

    // Determine complexity
    const vendorCount = vendorDetections.size;
    if (vendorCount <= 2) stack.complexity = 'simple';
    else if (vendorCount <= 5) stack.complexity = 'moderate';
    else stack.complexity = 'complex';

    return stack;
  }

  /**
   * Detect technology signatures (V2 enhancement)
   * Multi-header patterns that indicate specific technology combinations
   */
  private detectTechnologySignatures(data: PreprocessedData): TechnologySignature[] {
    const signatures: TechnologySignature[] = [];
    
    // Define technology signature patterns
    const signaturePatterns = [
      {
        name: 'WordPress + Cloudflare',
        vendor: 'WordPress/Cloudflare',
        category: 'cms_cdn',
        requiredHeaders: ['x-pingback', 'cf-ray'],
        optionalHeaders: ['x-wp-total', 'cf-cache-status'],
        conflictingHeaders: ['x-drupal-cache', 'x-shopify-shop-id']
      },
      {
        name: 'Shopify + Fastly',
        vendor: 'Shopify/Fastly', 
        category: 'ecommerce_cdn',
        requiredHeaders: ['x-shopify-shop-id', 'x-served-by'],
        optionalHeaders: ['x-shopify-stage', 'x-cache'],
        conflictingHeaders: ['x-wp-total', 'x-drupal-cache']
      },
      {
        name: 'Drupal + AWS CloudFront',
        vendor: 'Drupal/AWS',
        category: 'cms_cdn', 
        requiredHeaders: ['x-drupal-cache', 'x-amz-cf-id'],
        optionalHeaders: ['x-generator', 'x-amz-cf-pop'],
        conflictingHeaders: ['x-wp-total', 'cf-ray']
      },
      {
        name: 'Laravel + Cloudflare',
        vendor: 'Laravel/Cloudflare',
        category: 'framework_cdn',
        requiredHeaders: ['x-laravel-session', 'cf-ray'],
        optionalHeaders: ['laravel_session', 'cf-cache-status'],
        conflictingHeaders: ['x-aspnet-version']
      },
      {
        name: 'Duda + CDN',
        vendor: 'Duda',
        category: 'cms',
        requiredHeaders: ['d-geo', 'd-cache'],
        optionalHeaders: ['d-sid', 'd-rid', 'd-cache-status'],
        conflictingHeaders: ['x-wp-total', 'x-shopify-shop-id']
      }
    ];
    
    // Check each signature pattern against site data
    for (const pattern of signaturePatterns) {
      const matchingSites = this.findSitesWithSignature(pattern, data);
      
      if (matchingSites.length > 0) {
        const confidence = this.calculateSignatureConfidence(pattern, matchingSites, data);
        
        signatures.push({
          name: pattern.name,
          vendor: pattern.vendor,
          category: pattern.category,
          requiredHeaders: pattern.requiredHeaders,
          optionalHeaders: pattern.optionalHeaders,
          conflictingHeaders: pattern.conflictingHeaders,
          confidence,
          sites: matchingSites
        });
      }
    }
    
    return signatures.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Detect vendor conflicts (V2 enhancement)
   */
  private detectVendorConflicts(vendorDetections: Map<string, VendorDetection>): TechnologyConflict[] {
    const conflicts: TechnologyConflict[] = [];
    
    // Group vendors by category
    const vendorsByCategory = new Map<string, VendorDetection[]>();
    for (const detection of vendorDetections.values()) {
      const category = detection.vendor.category;
      if (!vendorsByCategory.has(category)) {
        vendorsByCategory.set(category, []);
      }
      vendorsByCategory.get(category)!.push(detection);
    }
    
    // 1. Detect CMS conflicts
    const cmsVendors = vendorsByCategory.get('cms');
    if (cmsVendors && cmsVendors.length > 1) {
      const vendorNames = cmsVendors.map(d => d.vendor.name);
      const avgConfidence = cmsVendors.reduce((sum, d) => sum + d.confidence, 0) / cmsVendors.length;
      
      conflicts.push({
        type: 'cms_conflict',
        vendors: vendorNames,
        reason: `Multiple CMS platforms detected: ${vendorNames.join(', ')}. Sites typically use only one CMS.`,
        severity: avgConfidence > 0.7 ? 'high' : 'medium'
      });
    }
    
    // 2. Detect framework conflicts
    const frameworkVendors = vendorsByCategory.get('framework');
    if (frameworkVendors && frameworkVendors.length > 2) {
      const vendorNames = frameworkVendors.map(d => d.vendor.name);
      
      conflicts.push({
        type: 'framework_conflict',
        vendors: vendorNames,
        reason: `Multiple frameworks detected: ${vendorNames.join(', ')}. Complex technology stack may indicate microservices or mixed architecture.`,
        severity: 'medium'
      });
    }
    
    // 3. Detect incompatible stack combinations
    const incompatibleCombinations = [
      { vendors: ['WordPress', 'Shopify'], reason: 'WordPress and Shopify are competing platforms' },
      { vendors: ['Drupal', 'WordPress'], reason: 'Drupal and WordPress are competing CMS platforms' },
      { vendors: ['ASP.NET', 'Laravel'], reason: 'ASP.NET (.NET) and Laravel (PHP) suggest different technology stacks' }
    ];
    
    for (const combo of incompatibleCombinations) {
      const detectedVendors = combo.vendors.filter(vendor => 
        Array.from(vendorDetections.values()).some(d => d.vendor.name === vendor)
      );
      
      if (detectedVendors.length === combo.vendors.length) {
        conflicts.push({
          type: 'incompatible_stack',
          vendors: detectedVendors,
          reason: combo.reason,
          severity: 'medium'
        });
      }
    }
    
    // 4. Detect suspicious vendor frequency patterns
    const highFrequencyVendors = Array.from(vendorDetections.values())
      .filter(d => d.frequency > 0.9)
      .map(d => d.vendor.name);
      
    if (highFrequencyVendors.length > 3) {
      conflicts.push({
        type: 'incompatible_stack',
        vendors: highFrequencyVendors,
        reason: `Unusually high number of vendors detected across most sites: ${highFrequencyVendors.join(', ')}. May indicate data collection issues.`,
        severity: 'low'
      });
    }
    
    return conflicts;
  }

  /**
   * Generate summary metrics
   */
  private generateSummary(
    vendorDetections: Map<string, VendorDetection>,
    technologyStack: TechnologyStack
  ): VendorSpecificData['summary'] {
    const highConfidenceVendors = Array.from(vendorDetections.values())
      .filter(d => d.confidence >= 0.8).length;
      
    const categories = new Set(
      Array.from(vendorDetections.values()).map(d => d.vendor.category)
    );

    return {
      totalVendorsDetected: vendorDetections.size,
      highConfidenceVendors,
      technologyCategories: Array.from(categories),
      stackComplexity: technologyStack.complexity
    };
  }

  /**
   * Calculate vendor confidence map
   */
  private calculateVendorConfidence(vendorDetections: Map<string, VendorDetection>): Map<string, number> {
    const confidenceMap = new Map<string, number>();
    
    for (const [header, detection] of vendorDetections) {
      confidenceMap.set(header, detection.confidence);
    }
    
    return confidenceMap;
  }

  /**
   * Find sites that match a technology signature pattern
   */
  private findSitesWithSignature(
    pattern: { requiredHeaders: string[]; optionalHeaders: string[]; conflictingHeaders: string[] },
    data: PreprocessedData
  ): string[] {
    const matchingSites: string[] = [];
    
    for (const [siteUrl, siteData] of data.sites) {
      const siteHeaders = new Set(Array.from(siteData.headers.keys()).map(h => h.toLowerCase()));
      
      // Check required headers
      const hasAllRequired = pattern.requiredHeaders.every(header => 
        siteHeaders.has(header.toLowerCase())
      );
      
      if (!hasAllRequired) continue;
      
      // Check conflicting headers (should not be present)
      const hasConflicts = pattern.conflictingHeaders.some(header =>
        siteHeaders.has(header.toLowerCase())
      );
      
      if (hasConflicts) continue;
      
      // Site matches the signature
      matchingSites.push(siteUrl);
    }
    
    return matchingSites;
  }

  /**
   * Calculate confidence score for a technology signature
   */
  private calculateSignatureConfidence(
    pattern: { requiredHeaders: string[]; optionalHeaders: string[]; conflictingHeaders: string[] },
    matchingSites: string[],
    data: PreprocessedData
  ): number {
    let confidence = 0.6; // Base confidence for signature detection
    
    const frequency = matchingSites.length / data.totalSites;
    
    // Boost confidence for reasonable frequency (not too rare, not too common)
    if (frequency >= 0.05 && frequency <= 0.5) {
      confidence += 0.2;
    } else if (frequency > 0.01) {
      confidence += 0.1;
    }
    
    // Boost confidence based on signature specificity
    const totalHeaders = pattern.requiredHeaders.length + pattern.optionalHeaders.length;
    if (totalHeaders >= 3) confidence += 0.1;
    if (totalHeaders >= 4) confidence += 0.05;
    
    // Check optional header presence for additional confidence
    let optionalHeaderMatches = 0;
    for (const siteUrl of matchingSites.slice(0, 10)) { // Sample first 10 sites
      const siteData = data.sites.get(siteUrl);
      if (siteData) {
        const siteHeaders = new Set(Array.from(siteData.headers.keys()).map(h => h.toLowerCase()));
        optionalHeaderMatches += pattern.optionalHeaders.filter(header =>
          siteHeaders.has(header.toLowerCase())
        ).length;
      }
    }
    
    const optionalScore = pattern.optionalHeaders.length > 0 
      ? optionalHeaderMatches / (pattern.optionalHeaders.length * Math.min(10, matchingSites.length))
      : 0;
    confidence += optionalScore * 0.1;
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Create V2 patterns for interface compatibility
   */
  private createVendorPatterns(
    vendorDetections: Map<string, VendorDetection>,
    options: AnalysisOptions
  ): Map<string, PatternData> {
    const patterns = new Map<string, PatternData>();

    for (const [header, detection] of vendorDetections) {
      if (detection.matchedSites.length >= options.minOccurrences) {
        patterns.set(`vendor:${header}`, {
          pattern: header,
          siteCount: detection.matchedSites.length,
          sites: new Set(detection.matchedSites),
          frequency: detection.frequency,
          metadata: {
            type: 'vendor_detection',
            vendor: detection.vendor.name,
            category: detection.vendor.category,
            confidence: detection.confidence,
            description: detection.vendor.description
          }
        });
      }
    }

    return patterns;
  }
}

// Export factory function for consistency
export function createVendorAnalyzer(): VendorAnalyzerV2 {
  return new VendorAnalyzerV2();
}