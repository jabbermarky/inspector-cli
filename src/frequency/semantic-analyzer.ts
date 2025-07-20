import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('frequency-semantic-analyzer');

/**
 * Primary header categories for semantic classification
 */
export type HeaderPrimaryCategory = 
  | 'security' 
  | 'caching' 
  | 'analytics' 
  | 'cms' 
  | 'ecommerce' 
  | 'framework' 
  | 'infrastructure' 
  | 'custom';

/**
 * Header categorization result with confidence scoring
 */
export interface HeaderCategory {
  primary: HeaderPrimaryCategory;
  secondary?: string[]; // Additional categories
  vendor?: string; // Technology vendor
  confidence: number; // 0-1 categorization confidence
}

/**
 * Comprehensive semantic analysis of a header
 */
export interface HeaderSemanticAnalysis {
  headerName: string;
  category: HeaderCategory;
  namingConvention: 'kebab-case' | 'camelCase' | 'underscore_case' | 'UPPER_CASE' | 'mixed' | 'non-standard';
  semanticWords: string[]; // Detected meaningful words
  patternType: 'standard' | 'vendor-specific' | 'platform-specific' | 'custom';
  hierarchyLevel: number; // 0 = top-level, 1+ = nested
  namespace?: string; // Detected namespace (x-wp, cf-, etc.)
}

/**
 * Analyze the semantic meaning of HTTP header names
 */
export function analyzeHeaderSemantics(headerName: string): HeaderSemanticAnalysis {
  const normalizedName = headerName.toLowerCase().trim();
  
  // Step 1: Categorize the header
  const category = categorizeHeader(normalizedName);
  
  // Step 2: Detect naming convention
  const namingConvention = detectNamingConvention(headerName);
  
  // Step 3: Extract semantic words
  const semanticWords = extractSemanticWords(normalizedName);
  
  // Step 4: Determine pattern type
  const patternType = determinePatternType(normalizedName, category);
  
  // Step 5: Analyze hierarchy and namespace
  const { hierarchyLevel, namespace } = analyzeHierarchy(normalizedName);
  
  return {
    headerName,
    category,
    namingConvention,
    semanticWords,
    patternType,
    hierarchyLevel,
    namespace
  };
}

/**
 * Categorize header into primary and secondary categories with vendor detection
 */
function categorizeHeader(headerName: string): HeaderCategory {
  // Security headers
  if (isSecurityHeader(headerName)) {
    return {
      primary: 'security',
      confidence: 0.95,
      vendor: detectSecurityVendor(headerName)
    };
  }
  
  // CMS-specific headers (check before caching to avoid false matches)
  if (isCMSHeader(headerName)) {
    return {
      primary: 'cms',
      confidence: 0.90,
      vendor: detectCMSVendor(headerName)
    };
  }
  
  // E-commerce headers (check before caching to avoid false matches)
  if (isEcommerceHeader(headerName)) {
    return {
      primary: 'ecommerce',
      confidence: 0.85,
      vendor: detectEcommerceVendor(headerName)
    };
  }
  
  // CDN/Caching headers
  if (isCachingHeader(headerName)) {
    const vendor = detectCachingVendor(headerName);
    return {
      primary: 'caching',
      confidence: 0.90,
      vendor,
      secondary: vendor ? ['cdn'] : undefined
    };
  }
  
  // Analytics/Tracking headers
  if (isAnalyticsHeader(headerName)) {
    return {
      primary: 'analytics',
      confidence: 0.85,
      vendor: detectAnalyticsVendor(headerName)
    };
  }
  
  // Framework headers
  if (isFrameworkHeader(headerName)) {
    return {
      primary: 'framework',
      confidence: 0.80,
      vendor: detectFrameworkVendor(headerName)
    };
  }
  
  // Infrastructure headers (basic server functionality)
  if (isInfrastructureHeader(headerName)) {
    return {
      primary: 'infrastructure',
      confidence: 0.75
    };
  }
  
  // Custom/unknown headers
  return {
    primary: 'custom',
    confidence: 0.60
  };
}

/**
 * Detect security-related headers
 */
function isSecurityHeader(headerName: string): boolean {
  const securityPatterns = [
    // Content Security Policy
    'content-security-policy',
    'content-security-policy-report-only',
    
    // HTTPS/Transport Security
    'strict-transport-security',
    'expect-ct',
    'public-key-pins',
    'public-key-pins-report-only',
    
    // Content Type Security
    'x-content-type-options',
    'x-frame-options',
    'x-xss-protection',
    
    // Cross-Origin Policies
    'cross-origin-opener-policy',
    'cross-origin-embedder-policy',
    'cross-origin-resource-policy',
    
    // Referrer Policy
    'referrer-policy',
    
    // Permissions Policy
    'permissions-policy',
    'feature-policy',
    
    // Authentication
    'www-authenticate',
    'authorization',
    'proxy-authenticate',
    'proxy-authorization'
  ];
  
  return securityPatterns.some(pattern => headerName.includes(pattern));
}

/**
 * Detect caching-related headers
 */
function isCachingHeader(headerName: string): boolean {
  const cachingPatterns = [
    // Standard caching
    'cache-control',
    'expires',
    'pragma',
    'age',
    'etag',
    'last-modified',
    'if-modified-since',
    'if-none-match',
    'if-match',
    'if-unmodified-since',
    'if-range',
    
    // CDN-specific caching
    'x-cache',
    'x-cache-hits',
    'x-cache-status',
    'x-served-by',
    'x-timer',
    'x-cache-lookup',
    'x-cache-remote',
    
    // Cloudflare
    'cf-cache-status',
    'cf-ray',
    'cf-request-id',
    'cf-visitor',
    
    // AWS CloudFront
    'x-amz-cf-id',
    'x-amz-cf-pop',
    'x-amzn-requestid',
    
    // Other CDNs
    'x-fastly-request-id',
    'x-akamai-edgescape',
    'x-azure-ref'
  ];
  
  return cachingPatterns.some(pattern => headerName.includes(pattern));
}

/**
 * Detect analytics/tracking headers
 */
function isAnalyticsHeader(headerName: string): boolean {
  const analyticsPatterns = [
    // Google Analytics
    'x-google-analytics',
    'x-ga-',
    'x-gtm-',
    
    // Adobe Analytics
    'x-adobe-',
    'x-omniture-',
    
    // General tracking
    'x-tracking-',
    'x-session-',
    'x-visitor-',
    'x-correlation-id',
    'x-request-id',
    'x-trace-id',
    
    // Marketing platforms
    'x-facebook-',
    'x-twitter-',
    'x-linkedin-',
    'x-pinterest-'
  ];
  
  return analyticsPatterns.some(pattern => headerName.includes(pattern));
}

/**
 * Detect CMS-specific headers
 */
function isCMSHeader(headerName: string): boolean {
  const cmsPatterns = [
    // WordPress
    'x-wp-',
    'x-wordpress-',
    'x-pingback',
    'x-powered-by', // when contains WordPress
    
    // Drupal
    'x-drupal-',
    'x-generator', // when contains Drupal
    
    // Joomla
    'x-joomla-',
    
    // Duda
    'd-',
    'x-duda-',
    
    // Other CMS
    'x-ghost-',
    'x-typo3-',
    'x-umbraco-',
    'x-cms-'
  ];
  
  return cmsPatterns.some(pattern => 
    headerName.startsWith(pattern) || headerName.includes(pattern)
  );
}

/**
 * Detect e-commerce platform headers
 */
function isEcommerceHeader(headerName: string): boolean {
  const ecommercePatterns = [
    // Shopify
    'x-shopify-',
    'x-shopid',
    'x-shardid',
    'shopify',
    
    // WooCommerce
    'x-wc-',
    'x-woocommerce-',
    'woocommerce',
    
    // Magento
    'x-magento-',
    'magento',
    
    // BigCommerce
    'x-bc-',
    'x-bigcommerce-',
    'bigcommerce',
    
    // PrestaShop
    'x-prestashop-',
    'prestashop',
    
    // Payment gateways
    'x-paypal-',
    'x-stripe-',
    'x-square-',
    'x-payment-'
  ];
  
  return ecommercePatterns.some(pattern => 
    headerName.includes(pattern) || headerName.startsWith(pattern)
  );
}

/**
 * Detect framework-specific headers
 */
function isFrameworkHeader(headerName: string): boolean {
  const frameworkPatterns = [
    // Laravel
    'x-laravel-',
    
    // Django
    'x-django-',
    
    // Rails
    'x-rails-',
    'x-runtime',
    
    // Express.js
    'x-powered-by', // when contains Express
    
    // ASP.NET
    'x-aspnet-',
    'x-aspnetmvc-',
    
    // Spring
    'x-spring-',
    
    // General framework indicators
    'x-framework-',
    'x-runtime-',
    'x-app-'
  ];
  
  return frameworkPatterns.some(pattern => headerName.includes(pattern));
}

/**
 * Detect basic infrastructure headers
 */
function isInfrastructureHeader(headerName: string): boolean {
  const infrastructurePatterns = [
    // Basic HTTP
    'server',
    'content-type',
    'content-length',
    'content-encoding',
    'content-language',
    'content-disposition',
    'content-range',
    'accept-ranges',
    'connection',
    'keep-alive',
    'upgrade',
    'transfer-encoding',
    'te',
    'trailer',
    'via',
    'date',
    'vary',
    'location',
    'retry-after',
    
    // Cookie management
    'set-cookie',
    'cookie',
    
    // CORS
    'access-control-allow-origin',
    'access-control-allow-methods',
    'access-control-allow-headers',
    'access-control-expose-headers',
    'access-control-max-age',
    'access-control-allow-credentials',
    
    // General networking
    'x-forwarded-for',
    'x-forwarded-proto',
    'x-forwarded-host',
    'x-real-ip',
    'x-original-url'
  ];
  
  return infrastructurePatterns.includes(headerName);
}

/**
 * Detect vendor from security headers
 */
function detectSecurityVendor(headerName: string): string | undefined {
  if (headerName.includes('cloudflare')) return 'Cloudflare';
  if (headerName.includes('akamai')) return 'Akamai';
  if (headerName.includes('fastly')) return 'Fastly';
  if (headerName.includes('aws') || headerName.includes('amz')) return 'AWS';
  if (headerName.includes('azure')) return 'Microsoft Azure';
  return undefined;
}

/**
 * Detect vendor from caching headers
 */
function detectCachingVendor(headerName: string): string | undefined {
  if (headerName.startsWith('cf-')) return 'Cloudflare';
  if (headerName.includes('cloudflare')) return 'Cloudflare';
  if (headerName.includes('fastly')) return 'Fastly';
  if (headerName.includes('akamai')) return 'Akamai';
  if (headerName.includes('amz-cf')) return 'AWS CloudFront';
  if (headerName.includes('azure')) return 'Microsoft Azure';
  if (headerName.includes('varnish')) return 'Varnish';
  return undefined;
}

/**
 * Detect vendor from analytics headers
 */
function detectAnalyticsVendor(headerName: string): string | undefined {
  if (headerName.includes('google') || headerName.includes('ga-') || headerName.includes('gtm-')) return 'Google';
  if (headerName.includes('adobe') || headerName.includes('omniture')) return 'Adobe';
  if (headerName.includes('facebook')) return 'Facebook';
  if (headerName.includes('twitter')) return 'Twitter';
  if (headerName.includes('linkedin')) return 'LinkedIn';
  return undefined;
}

/**
 * Detect vendor from CMS headers
 */
function detectCMSVendor(headerName: string): string | undefined {
  if (headerName.includes('wp-') || headerName.includes('wordpress') || headerName.includes('pingback')) return 'WordPress';
  if (headerName.includes('drupal')) return 'Drupal';
  if (headerName.includes('joomla')) return 'Joomla';
  if (headerName.startsWith('d-') || headerName.includes('duda')) return 'Duda';
  if (headerName.includes('ghost')) return 'Ghost';
  if (headerName.includes('typo3')) return 'TYPO3';
  if (headerName.includes('umbraco')) return 'Umbraco';
  return undefined;
}

/**
 * Detect vendor from e-commerce headers
 */
function detectEcommerceVendor(headerName: string): string | undefined {
  if (headerName.includes('shopify') || headerName.includes('shopid') || headerName.includes('shardid')) return 'Shopify';
  if (headerName.includes('woocommerce') || headerName.includes('wc-')) return 'WooCommerce';
  if (headerName.includes('magento')) return 'Magento';
  if (headerName.includes('bigcommerce') || headerName.includes('bc-')) return 'BigCommerce';
  if (headerName.includes('prestashop')) return 'PrestaShop';
  if (headerName.includes('paypal')) return 'PayPal';
  if (headerName.includes('stripe')) return 'Stripe';
  return undefined;
}

/**
 * Detect vendor from framework headers
 */
function detectFrameworkVendor(headerName: string): string | undefined {
  if (headerName.includes('laravel')) return 'Laravel';
  if (headerName.includes('django')) return 'Django';
  if (headerName.includes('rails')) return 'Ruby on Rails';
  if (headerName.includes('express')) return 'Express.js';
  if (headerName.includes('aspnet')) return 'ASP.NET';
  if (headerName.includes('spring')) return 'Spring';
  return undefined;
}

/**
 * Detect naming convention used in header name
 */
function detectNamingConvention(headerName: string): 'kebab-case' | 'camelCase' | 'underscore_case' | 'UPPER_CASE' | 'mixed' | 'non-standard' {
  // Check for kebab-case (most common for HTTP headers)
  if (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(headerName)) {
    return 'kebab-case';
  }
  
  // Check for UPPER_CASE with underscores
  if (/^[A-Z0-9]+(_[A-Z0-9]+)*$/.test(headerName)) {
    return 'UPPER_CASE';
  }
  
  // Check for underscore_case
  if (/^[a-z0-9]+(_[a-z0-9]+)*$/.test(headerName)) {
    return 'underscore_case';
  }
  
  // Check for camelCase
  if (/^[a-z][a-zA-Z0-9]*$/.test(headerName) && /[A-Z]/.test(headerName)) {
    return 'camelCase';
  }
  
  // Check for non-standard characters first (anything not alphanumeric, hyphen, or underscore)
  if (!/^[a-zA-Z0-9_-]+$/.test(headerName)) {
    return 'non-standard';
  }
  
  // Check for mixed conventions
  const hasHyphens = headerName.includes('-');
  const hasUnderscores = headerName.includes('_');
  const hasMixedCase = /[a-z]/.test(headerName) && /[A-Z]/.test(headerName);
  
  if ((hasHyphens && hasUnderscores) || (hasHyphens && hasMixedCase) || (hasUnderscores && hasMixedCase)) {
    return 'mixed';
  }
  
  return 'non-standard';
}

/**
 * Extract meaningful semantic words from header name
 */
function extractSemanticWords(headerName: string): string[] {
  // Split on common delimiters
  const words = headerName
    .toLowerCase()
    .split(/[-_\s]/)
    .filter(word => word.length > 0);
  
  // Define semantic keywords by category
  const semanticKeywords = new Set([
    // CMS keywords
    'wp', 'wordpress', 'drupal', 'joomla', 'cms', 'ghost', 'typo3',
    
    // Framework keywords
    'laravel', 'django', 'rails', 'express', 'spring', 'aspnet', 'framework',
    
    // Function keywords
    'auth', 'authentication', 'session', 'tracking', 'analytics', 'cache', 'security',
    'payment', 'api', 'admin', 'user', 'content', 'media', 'plugin', 'theme',
    
    // Technology keywords
    'cdn', 'waf', 'proxy', 'load', 'balancer', 'cluster', 'node', 'server',
    
    // Vendor keywords
    'google', 'facebook', 'adobe', 'microsoft', 'amazon', 'cloudflare', 'akamai',
    'shopify', 'magento', 'woocommerce', 'paypal', 'stripe'
  ]);
  
  // Return words that are semantic keywords
  return words.filter(word => semanticKeywords.has(word) || word.length >= 3);
}

/**
 * Determine pattern type based on header characteristics
 */
function determinePatternType(headerName: string, category: HeaderCategory): 'standard' | 'vendor-specific' | 'platform-specific' | 'custom' {
  // Standard HTTP headers (RFC compliant)
  const standardHeaders = new Set([
    'content-type', 'content-length', 'cache-control', 'expires', 'etag',
    'last-modified', 'server', 'date', 'connection', 'keep-alive', 'vary',
    'set-cookie', 'location', 'accept-ranges', 'content-encoding',
    'content-security-policy', 'strict-transport-security', 'x-content-type-options',
    'x-frame-options', 'x-xss-protection', 'referrer-policy'
  ]);
  
  if (standardHeaders.has(headerName)) {
    return 'standard';
  }
  
  // Vendor-specific if we detected a vendor
  if (category.vendor) {
    return 'vendor-specific';
  }
  
  // Platform-specific if it's CMS/framework/ecommerce related
  if (['cms', 'framework', 'ecommerce'].includes(category.primary)) {
    return 'platform-specific';
  }
  
  return 'custom';
}

/**
 * Analyze header hierarchy and namespace
 */
function analyzeHierarchy(headerName: string): { hierarchyLevel: number; namespace?: string } {
  // Detect common namespaces
  const namespacePatterns = [
    { pattern: /^cf-/, namespace: 'cf' },
    { pattern: /^x-wp-/, namespace: 'x-wp' },
    { pattern: /^x-drupal-/, namespace: 'x-drupal' },
    { pattern: /^x-shopify-/, namespace: 'x-shopify' },
    { pattern: /^x-wc-/, namespace: 'x-wc' },
    { pattern: /^d-/, namespace: 'd' },
    { pattern: /^x-amz-/, namespace: 'x-amz' },
    { pattern: /^x-azure-/, namespace: 'x-azure' },
    { pattern: /^x-google-/, namespace: 'x-google' },
    { pattern: /^x-facebook-/, namespace: 'x-facebook' }
  ];
  
  for (const { pattern, namespace } of namespacePatterns) {
    if (pattern.test(headerName)) {
      // Count hierarchy level by number of separators after namespace
      const afterNamespace = headerName.replace(pattern, '');
      const hierarchyLevel = (afterNamespace.match(/[-_]/g) || []).length;
      return { hierarchyLevel: hierarchyLevel + 1, namespace };
    }
  }
  
  // For headers without detected namespace, count separators
  const separators = (headerName.match(/[-_]/g) || []).length;
  return { hierarchyLevel: separators };
}

/**
 * Batch analyze multiple headers for semantic analysis
 */
export function batchAnalyzeHeaders(headerNames: string[]): Map<string, HeaderSemanticAnalysis> {
  logger.info('Starting batch semantic analysis', { headerCount: headerNames.length });
  
  const results = new Map<string, HeaderSemanticAnalysis>();
  
  for (const headerName of headerNames) {
    try {
      const analysis = analyzeHeaderSemantics(headerName);
      results.set(headerName, analysis);
    } catch (error) {
      logger.warn('Failed to analyze header semantics', { headerName, error });
      // Continue with other headers even if one fails
    }
  }
  
  logger.info('Batch semantic analysis complete', { 
    processed: results.size,
    failed: headerNames.length - results.size 
  });
  
  return results;
}

/**
 * Get semantic insights for a collection of headers
 */
export interface SemanticInsights {
  categoryDistribution: Record<HeaderPrimaryCategory, number>;
  vendorDistribution: Record<string, number>;
  namingConventions: Record<string, number>;
  patternTypes: Record<string, number>;
  topVendors: Array<{ vendor: string; count: number; percentage: number }>;
  topCategories: Array<{ category: HeaderPrimaryCategory; count: number; percentage: number }>;
}

export function generateSemanticInsights(analyses: Map<string, HeaderSemanticAnalysis>): SemanticInsights {
  const total = analyses.size;
  const categoryDistribution: Record<HeaderPrimaryCategory, number> = {
    security: 0, caching: 0, analytics: 0, cms: 0, ecommerce: 0, 
    framework: 0, infrastructure: 0, custom: 0
  };
  const vendorDistribution: Record<string, number> = {};
  const namingConventions: Record<string, number> = {};
  const patternTypes: Record<string, number> = {};
  
  for (const analysis of analyses.values()) {
    // Count categories
    categoryDistribution[analysis.category.primary]++;
    
    // Count vendors
    if (analysis.category.vendor) {
      vendorDistribution[analysis.category.vendor] = (vendorDistribution[analysis.category.vendor] || 0) + 1;
    }
    
    // Count naming conventions
    namingConventions[analysis.namingConvention] = (namingConventions[analysis.namingConvention] || 0) + 1;
    
    // Count pattern types
    patternTypes[analysis.patternType] = (patternTypes[analysis.patternType] || 0) + 1;
  }
  
  // Generate top vendors
  const topVendors = Object.entries(vendorDistribution)
    .map(([vendor, count]) => ({ vendor, count, percentage: (count / total) * 100 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Generate top categories
  const topCategories = Object.entries(categoryDistribution)
    .map(([category, count]) => ({ category: category as HeaderPrimaryCategory, count, percentage: (count / total) * 100 }))
    .sort((a, b) => b.count - a.count);
  
  return {
    categoryDistribution,
    vendorDistribution,
    namingConventions,
    patternTypes,
    topVendors,
    topCategories
  };
}