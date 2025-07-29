#!/usr/bin/env node

// Test the technologies section
import { formatForHuman, formatForMarkdown } from './dist/frequency/reporter-v2/sections/technologies-section.js';

// Mock technologies analysis result with TechSpecificData structure
const mockTechnologiesResult = {
  patterns: new Map([
    ['x-powered-by', {
      pattern: 'x-powered-by',
      frequency: 0.45,
      siteCount: 225
    }]
  ]),
  totalSites: 500,
  metadata: { analyzedAt: new Date().toISOString() },
  analyzerSpecific: {
    // Base TechSpecificData
    categories: new Map([
      ['frontend', new Set(['React', 'Vue.js', 'Angular', 'jQuery', 'Bootstrap'])],
      ['backend', new Set(['Node.js', 'PHP', 'Python', 'Java'])],
      ['cms', new Set(['WordPress', 'Drupal', 'Joomla'])],
      ['ecommerce', new Set(['WooCommerce', 'Shopify', 'Magento'])],
      ['cdn', new Set(['Cloudflare', 'AWS CloudFront', 'Fastly'])],
      ['analytics', new Set(['Google Analytics', 'Adobe Analytics', 'Matomo'])],
      ['security', new Set(['Let\'s Encrypt', 'Cloudflare SSL'])],
      ['server', new Set(['Apache', 'Nginx', 'IIS'])]
    ]),
    
    // Enhanced data (EnhancedTechSpecificData)
    detectedTechnologies: new Map([
      ['WordPress', {
        name: 'WordPress',
        category: 'cms',
        confidence: 0.92,
        version: '6.4.2',
        sources: ['x-powered-by', 'meta-generator']
      }],
      ['React', {
        name: 'React',
        category: 'frontend',
        confidence: 0.88,
        version: '18.2.0',
        sources: ['script-src', 'bundle-analysis']
      }],
      ['Cloudflare', {
        name: 'Cloudflare',
        category: 'cdn',
        confidence: 0.95,
        sources: ['cf-ray', 'cf-cache-status']
      }],
      ['Google Analytics', {
        name: 'Google Analytics',
        category: 'analytics',
        confidence: 0.78,
        version: 'GA4',
        sources: ['gtag', 'gtm-script']
      }]
    ]),
    
    stackAnalysis: {
      complexity: 'moderate',
      overallScore: 0.82,
      architecturePattern: 'JAMstack',
      recommendations: ['Consider CDN optimization', 'Update to latest React version']
    },
    
    technologyTrends: new Map([
      ['React', { direction: 'increasing', confidence: 0.89 }],
      ['WordPress', { direction: 'stable', confidence: 0.76 }],
      ['jQuery', { direction: 'decreasing', confidence: 0.84 }]
    ]),
    
    compatibilityMatrix: new Map([
      ['React', ['Node.js', 'webpack', 'Vite']],
      ['WordPress', ['PHP', 'MySQL', 'Apache']],
      ['Cloudflare', ['Any CMS', 'Static sites']]
    ]),
    
    securityAssessment: new Map([
      ['WordPress', { status: 'needs-update', riskLevel: 'medium' }],
      ['Cloudflare', { status: 'secure', riskLevel: 'low' }],
      ['Let\'s Encrypt', { status: 'active', riskLevel: 'low' }]
    ])
  }
};

console.log('=== Testing Technologies Section ===\n');

console.log('--- Human Format ---');
const humanOutput = formatForHuman(mockTechnologiesResult, 10);
console.log(humanOutput);

console.log('\n--- Markdown Format ---');
const markdownOutput = formatForMarkdown(mockTechnologiesResult, 10);
console.log(markdownOutput);

console.log('\n=== Test completed successfully! ===');