/**
 * Ground truth validation data from external sources (webtechsurvey.com)
 * Used to validate that our platform specificity calculations align with real-world usage
 */

export interface GroundTruthData {
  sites: number;
  percentage: number;
  isUniversal: boolean;
  platform?: string;
  description: string;
}

/**
 * External validation data from webtechsurvey.com showing real web usage patterns
 * This data helps distinguish truly universal headers from platform-specific ones
 */
export const WEB_TECH_SURVEY_DATA: Record<string, GroundTruthData> = {
  // Universal headers (should have low platform specificity and be filtered)
  'set-cookie': { 
    sites: 21_000_000, 
    percentage: 95.2, 
    isUniversal: true,
    description: 'Session management - used across all web platforms' 
  },
  'content-type': { 
    sites: 22_000_000, 
    percentage: 99.8, 
    isUniversal: true,
    description: 'HTTP content type - fundamental web standard' 
  },
  'server': { 
    sites: 21_500_000, 
    percentage: 97.5, 
    isUniversal: true,
    description: 'Server software identification - universal' 
  },
  'date': { 
    sites: 21_200_000, 
    percentage: 96.1, 
    isUniversal: true,
    description: 'HTTP date header - standard across all servers' 
  },
  'cache-control': { 
    sites: 20_500_000, 
    percentage: 92.8, 
    isUniversal: true,
    description: 'HTTP caching directives - web standard' 
  },
  'connection': { 
    sites: 20_000_000, 
    percentage: 90.6, 
    isUniversal: true,
    description: 'HTTP connection management - universal' 
  },
  
  // Platform-specific headers (should have high platform specificity and be kept)
  'x-pingback': { 
    sites: 15_000, 
    percentage: 0.07, 
    isUniversal: false,
    platform: 'WordPress',
    description: 'WordPress XML-RPC pingback endpoint - WordPress exclusive' 
  },
  'x-generator': { 
    sites: 50_000, 
    percentage: 0.23, 
    isUniversal: false,
    platform: 'Various',
    description: 'CMS/framework identification - platform-specific' 
  },
  'x-powered-by': { 
    sites: 200_000, 
    percentage: 0.9, 
    isUniversal: false,
    platform: 'Various',
    description: 'Technology stack identification - platform-specific' 
  },
  
  // Infrastructure headers (context-dependent - high usage but can show platform variation)
  'strict-transport-security': { 
    sites: 8_000_000, 
    percentage: 36.3, 
    isUniversal: false,
    description: 'HTTPS enforcement - varies by platform security policies' 
  },
  'x-frame-options': { 
    sites: 6_500_000, 
    percentage: 29.5, 
    isUniversal: false,
    description: 'Clickjacking protection - varies by platform security settings' 
  },
  'content-security-policy': { 
    sites: 4_500_000, 
    percentage: 20.4, 
    isUniversal: false,
    description: 'XSS protection - implementation varies by platform' 
  }
};

/**
 * Expected platform specificity ranges based on header type and usage patterns
 */
export const EXPECTED_SPECIFICITY_RANGES = {
  universal: { min: 0.0, max: 0.3, description: 'Used similarly across all platforms' },
  moderate: { min: 0.3, max: 0.6, description: 'Some platform variation - may indicate bias' },
  platformSpecific: { min: 0.6, max: 1.0, description: 'Strong platform correlation - discriminative' }
};

/**
 * Realistic frequency patterns for testing
 * Based on analysis of real CMS distributions
 */
export const REALISTIC_FREQUENCY_PATTERNS = {
  // Universal pattern - appears on most sites regardless of CMS
  universal: {
    'WordPress': 0.95,
    'Drupal': 0.96,
    'Joomla': 0.94,
    'Duda': 0.97,
    'Shopify': 0.95,
    'Unknown': 0.93
  },
  
  // WordPress-specific pattern
  wordpressSpecific: {
    'WordPress': 0.90,
    'Drupal': 0.00,
    'Joomla': 0.00,
    'Duda': 0.00,
    'Shopify': 0.00,
    'Unknown': 0.00
  },
  
  // Biased dataset pattern - appears more in one CMS due to sampling, not true specificity
  samplingBias: {
    'WordPress': 0.40,
    'Drupal': 0.43, 
    'Joomla': 0.88,  // Higher due to Joomla overrepresentation in dataset
    'Duda': 0.30,
    'Shopify': 0.35,
    'Unknown': 0.25
  },
  
  // Infrastructure header with moderate platform variation
  infrastructureModerate: {
    'WordPress': 0.20,
    'Drupal': 0.00,
    'Joomla': 0.00,
    'Duda': 0.97,  // Duda enforces security headers
    'Shopify': 0.15,
    'Unknown': 0.52
  }
};