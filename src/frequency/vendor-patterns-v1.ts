/**
 * Vendor-specific header patterns and technology provider mappings
 * This centralizes knowledge about technology vendors and their header signatures
 */

export interface VendorPattern {
  name: string;
  category: 'cdn' | 'cms' | 'ecommerce' | 'analytics' | 'security' | 'framework' | 'hosting';
  headerPatterns: string[];
  description: string;
  website?: string;
}

/**
 * Comprehensive database of vendor header patterns
 */
export const VENDOR_PATTERNS: VendorPattern[] = [
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
  {
    name: 'Microsoft Azure CDN',
    category: 'cdn',
    headerPatterns: [
      'x-azure-ref',
      'x-msedge-ref',
      'x-azure-requestid'
    ],
    description: 'Microsoft Azure Content Delivery Network',
    website: 'https://azure.microsoft.com/en-us/services/cdn/'
  },

  // CMS Platforms
  {
    name: 'WordPress',
    category: 'cms',
    headerPatterns: [
      'x-wp-total',
      'x-wp-totalpages',
      'x-pingback',
      'x-powered-by', // when value contains WordPress
      'x-wp-nonce',
      'x-robots-tag'
    ],
    description: 'WordPress content management system',
    website: 'https://wordpress.org'
  },
  {
    name: 'Drupal',
    category: 'cms',
    headerPatterns: [
      'x-drupal-cache',
      'x-drupal-dynamic-cache',
      'x-generator', // when value contains Drupal
      'x-drupal-cache-tags',
      'x-drupal-cache-contexts'
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
      'x-duda-content-type'
    ],
    description: 'Duda website builder platform',
    website: 'https://duda.co'
  },
  {
    name: 'Wix',
    category: 'cms',
    headerPatterns: [
      'x-wix-request-id',
      'x-wix-dispatcher-cache-hit',
      'x-wix-published-version',
      'x-wix-application-instance-id'
    ],
    description: 'Wix website builder platform',
    website: 'https://wix.com'
  },
  {
    name: 'Squarespace',
    category: 'cms',
    headerPatterns: [
      'x-squarespace-renderer',
      'x-contextid',
      'x-served-by'
    ],
    description: 'Squarespace website builder',
    website: 'https://squarespace.com'
  },

  // E-commerce Platforms
  {
    name: 'Shopify',
    category: 'ecommerce',
    headerPatterns: [
      'x-shopify-shop-id',
      'x-shopify-stage',
      'x-shopid',
      'x-shardid',
      'x-shopify-request-id',
      'x-sorting-hat-podid',
      'x-sorting-hat-shopid'
    ],
    description: 'Shopify e-commerce platform',
    website: 'https://shopify.com'
  },
  {
    name: 'WooCommerce',
    category: 'ecommerce',
    headerPatterns: [
      'x-wc-store-api-nonce',
      'x-woocommerce-api',
      'woocommerce-login-nonce'
    ],
    description: 'WooCommerce WordPress e-commerce plugin',
    website: 'https://woocommerce.com'
  },
  {
    name: 'Magento',
    category: 'ecommerce',
    headerPatterns: [
      'x-magento-cache-debug',
      'x-magento-tags',
      'x-magento-vary'
    ],
    description: 'Magento e-commerce platform',
    website: 'https://magento.com'
  },
  {
    name: 'BigCommerce',
    category: 'ecommerce',
    headerPatterns: [
      'x-bc-storefront-request-id',
      'x-bc-edge-cache-status',
      'x-bc-customer-id'
    ],
    description: 'BigCommerce e-commerce platform',
    website: 'https://bigcommerce.com'
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
  {
    name: 'Adobe Analytics',
    category: 'analytics',
    headerPatterns: [
      'x-adobe-floodgate',
      'x-omniture-visitor-id',
      'x-adobe-target'
    ],
    description: 'Adobe Analytics (formerly Omniture)',
    website: 'https://business.adobe.com/products/analytics/adobe-analytics.html'
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
    name: 'Ruby on Rails',
    category: 'framework',
    headerPatterns: [
      'x-runtime',
      'x-request-id'
    ],
    description: 'Ruby on Rails web framework',
    website: 'https://rubyonrails.org'
  },
  {
    name: 'ASP.NET',
    category: 'framework',
    headerPatterns: [
      'x-aspnet-version',
      'x-aspnetmvc-version',
      'x-powered-by' // when value contains ASP.NET
    ],
    description: 'Microsoft ASP.NET web framework',
    website: 'https://dotnet.microsoft.com/apps/aspnet'
  },

  // Security Services
  {
    name: 'Incapsula',
    category: 'security',
    headerPatterns: [
      'x-iinfo',
      'x-cdn'
    ],
    description: 'Incapsula web application security',
    website: 'https://incapsula.com'
  },
  {
    name: 'Sucuri',
    category: 'security',
    headerPatterns: [
      'x-sucuri-id',
      'x-sucuri-cache',
      'x-sucuri-block'
    ],
    description: 'Sucuri website security services',
    website: 'https://sucuri.net'
  },

  // Hosting Providers
  {
    name: 'Netlify',
    category: 'hosting',
    headerPatterns: [
      'x-nf-request-id',
      'x-nf-edge-cache-tag',
      'netlify-vary'
    ],
    description: 'Netlify static site hosting',
    website: 'https://netlify.com'
  },
  {
    name: 'Vercel',
    category: 'hosting',
    headerPatterns: [
      'x-vercel-cache',
      'x-vercel-id',
      'server' // when value contains Vercel
    ],
    description: 'Vercel frontend hosting platform',
    website: 'https://vercel.com'
  },
  {
    name: 'GitHub Pages',
    category: 'hosting',
    headerPatterns: [
      'x-github-request-id',
      'server' // when value contains GitHub.com
    ],
    description: 'GitHub Pages static site hosting',
    website: 'https://pages.github.com'
  }
];

/**
 * Quick lookup maps for efficient vendor detection
 */
export const HEADER_TO_VENDOR_MAP = new Map<string, string>();
export const VENDOR_TO_PATTERNS_MAP = new Map<string, string[]>();

// Build lookup maps
for (const vendor of VENDOR_PATTERNS) {
  VENDOR_TO_PATTERNS_MAP.set(vendor.name, vendor.headerPatterns);
  
  for (const pattern of vendor.headerPatterns) {
    HEADER_TO_VENDOR_MAP.set(pattern, vendor.name);
  }
}

/**
 * Find vendor by header name
 */
export function findVendorByHeader(headerName: string): VendorPattern | undefined {
  const normalizedHeader = headerName.toLowerCase();
  
  // Direct lookup first
  const vendorName = HEADER_TO_VENDOR_MAP.get(normalizedHeader);
  if (vendorName) {
    return VENDOR_PATTERNS.find(v => v.name === vendorName);
  }
  
  // Pattern matching for partial matches
  for (const vendor of VENDOR_PATTERNS) {
    for (const pattern of vendor.headerPatterns) {
      if (normalizedHeader.includes(pattern) || normalizedHeader.startsWith(pattern)) {
        return vendor;
      }
    }
  }
  
  return undefined;
}

/**
 * Get all vendors by category
 */
export function getVendorsByCategory(category: VendorPattern['category']): VendorPattern[] {
  return VENDOR_PATTERNS.filter(vendor => vendor.category === category);
}

/**
 * Get vendor statistics for a collection of headers
 */
export interface VendorStats {
  totalHeaders: number;
  vendorHeaders: number;
  vendorCoverage: number; // Percentage of headers that map to known vendors
  vendorDistribution: Array<{
    vendor: string;
    category: string;
    headerCount: number;
    percentage: number;
    headers: string[];
  }>;
  categoryDistribution: Record<string, number>;
}

export function analyzeVendorPresence(headerNames: string[]): VendorStats {
  const vendorMap = new Map<string, { vendor: VendorPattern; headers: string[] }>();
  const categoryCount: Record<string, number> = {};
  let vendorHeaderCount = 0;
  
  for (const headerName of headerNames) {
    const vendor = findVendorByHeader(headerName);
    if (vendor) {
      vendorHeaderCount++;
      
      if (!vendorMap.has(vendor.name)) {
        vendorMap.set(vendor.name, { vendor, headers: [] });
      }
      vendorMap.get(vendor.name)!.headers.push(headerName);
      
      categoryCount[vendor.category] = (categoryCount[vendor.category] || 0) + 1;
    }
  }
  
  const vendorDistribution = Array.from(vendorMap.entries()).map(([vendorName, data]) => ({
    vendor: vendorName,
    category: data.vendor.category,
    headerCount: data.headers.length,
    percentage: (data.headers.length / headerNames.length) * 100,
    headers: data.headers
  })).sort((a, b) => b.headerCount - a.headerCount);
  
  return {
    totalHeaders: headerNames.length,
    vendorHeaders: vendorHeaderCount,
    vendorCoverage: headerNames.length > 0 ? (vendorHeaderCount / headerNames.length) * 100 : 0,
    vendorDistribution,
    categoryDistribution: categoryCount
  };
}

/**
 * Technology stack inference based on vendor presence
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
}

export function inferTechnologyStack(headerNames: string[]): TechnologyStack {
  const vendorStats = analyzeVendorPresence(headerNames);
  const stack: TechnologyStack = { confidence: 0 };
  
  // Group vendors by category
  const vendorsByCategory = vendorStats.vendorDistribution.reduce((acc, vendor) => {
    if (!acc[vendor.category]) acc[vendor.category] = [];
    acc[vendor.category].push(vendor);
    return acc;
  }, {} as Record<string, typeof vendorStats.vendorDistribution[0][]>);
  
  // Identify primary technologies (highest confidence in each category)
  if (vendorsByCategory.cms && vendorsByCategory.cms.length > 0) {
    stack.cms = vendorsByCategory.cms[0].vendor;
  }
  
  if (vendorsByCategory.ecommerce && vendorsByCategory.ecommerce.length > 0) {
    stack.ecommerce = vendorsByCategory.ecommerce[0].vendor;
  }
  
  if (vendorsByCategory.framework && vendorsByCategory.framework.length > 0) {
    stack.framework = vendorsByCategory.framework[0].vendor;
  }
  
  if (vendorsByCategory.hosting && vendorsByCategory.hosting.length > 0) {
    stack.hosting = vendorsByCategory.hosting[0].vendor;
  }
  
  // Allow multiple CDN, analytics, and security services
  if (vendorsByCategory.cdn) {
    stack.cdn = vendorsByCategory.cdn.map(v => v.vendor);
  }
  
  if (vendorsByCategory.analytics) {
    stack.analytics = vendorsByCategory.analytics.map(v => v.vendor);
  }
  
  if (vendorsByCategory.security) {
    stack.security = vendorsByCategory.security.map(v => v.vendor);
  }
  
  // Calculate overall confidence based on vendor coverage and specificity
  const baseConfidence = vendorStats.vendorCoverage / 100;
  const specificityBonus = Object.keys(vendorsByCategory).length * 0.1;
  stack.confidence = Math.min(1.0, baseConfidence + specificityBonus);
  
  return stack;
}