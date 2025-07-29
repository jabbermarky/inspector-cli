#!/usr/bin/env node

// Test the pattern discovery section
import { formatForHuman, formatForMarkdown } from './dist/frequency/reporter-v2/sections/pattern-discovery-section.js';

// Mock pattern discovery analysis result
const mockPatternDiscoveryResult = {
  patterns: new Map([
    ['x-custom-header', {
      pattern: 'x-custom-header',
      frequency: 0.35,
      siteCount: 175
    }]
  ]),
  totalSites: 500,
  metadata: { analyzedAt: new Date().toISOString() },
  analyzerSpecific: {
    discoveredPatterns: new Map([
      ['x-shopify-*', {
        pattern: 'x-shopify-*',
        type: 'prefix',
        frequency: 0.15,
        siteCount: 75,
        sites: ['shop1.com', 'shop2.com'],
        examples: ['x-shopify-stage', 'x-shopify-shop-id'],
        confidence: 0.89,
        potentialVendor: 'Shopify',
        statisticalSignificance: 0.92,
        validationConfidence: 0.85
      }],
      ['*-cloudflare', {
        pattern: '*-cloudflare',
        type: 'suffix',
        frequency: 0.12,
        siteCount: 60,
        sites: ['site1.com', 'site2.com'],
        examples: ['cf-cloudflare', 'worker-cloudflare'],
        confidence: 0.82,
        potentialVendor: 'Cloudflare',
        statisticalSignificance: 0.88,
        validationConfidence: 0.79
      }]
    ]),
    emergingVendors: new Map([
      ['NewCDN', {
        vendorName: 'NewCDN',
        confidence: 0.76,
        siteCount: 45,
        sites: ['example1.com', 'example2.com'],
        patterns: [
          { pattern: 'x-newcdn-cache', confidence: 0.85 },
          { pattern: 'newcdn-ray-id', confidence: 0.72 }
        ],
        characteristics: {
          namingConvention: 'newcdn-{service}-{action}',
          commonPrefixes: ['newcdn-', 'x-newcdn-'],
          commonSuffixes: ['-id', '-cache'],
          semanticCategories: ['cdn', 'caching'],
          headerStructure: 'vendor-service-action'
        },
        technologyStack: {
          inferredStack: ['CDN', 'Edge Computing'],
          confidence: 0.78,
          stackCategory: 'cdn'
        }
      }]
    ]),
    patternEvolution: new Map([
      ['x-powered-by', {
        pattern: 'x-powered-by',
        basePattern: 'x-powered-by',
        versions: [
          {
            pattern: 'x-powered-by: Express',
            frequency: 0.25,
            siteCount: 125,
            timeRange: { start: new Date('2023-01-01'), end: new Date('2023-06-01') },
            examples: ['Express'],
            confidence: 0.92
          },
          {
            pattern: 'x-powered-by: Next.js',
            frequency: 0.18,
            siteCount: 90,
            timeRange: { start: new Date('2023-06-01'), end: new Date('2024-01-01') },
            examples: ['Next.js'],
            confidence: 0.88
          }
        ],
        evolutionType: 'migration',
        confidence: 0.87,
        trendDirection: 'increasing',
        migrationPattern: 'Express -> Next.js'
      }]
    ]),
    semanticAnomalies: [
      {
        headerName: 'x-debug-info',
        expectedCategory: 'infrastructure',
        actualCategory: 'security',
        confidence: 0.73,
        reason: 'Contains sensitive debugging information',
        severity: 'medium',
        sites: ['test1.com', 'test2.com'],
        frequency: 0.08,
        anomalyType: 'category-mismatch',
        context: {
          relatedHeaders: ['x-debug-mode', 'x-trace-id'],
          platformContext: 'Development environment leakage',
          suggestedCorrection: 'Move to infrastructure category'
        }
      },
      {
        headerName: 'custom-auth-token',
        expectedCategory: 'custom',
        actualCategory: 'security',
        confidence: 0.68,
        reason: 'Authentication token in custom header',
        severity: 'high',
        sites: ['auth1.com', 'auth2.com'],
        frequency: 0.05,
        anomalyType: 'semantic-drift'
      }
    ],
    insights: [
      'Detected 15% increase in Shopify-related headers across e-commerce sites',
      'Emerging CDN vendor "NewCDN" showing consistent naming patterns',
      'Migration trend from Express to Next.js frameworks observed'
    ],
    discoveryMetrics: {
      totalPatternsDiscovered: 42,
      newVendorsDetected: 3,
      evolutionPatternsFound: 8,
      anomaliesDetected: 12,
      averagePatternConfidence: 0.84,
      coveragePercentage: 78.5
    }
  }
};

console.log('=== Testing Pattern Discovery Section ===\n');

console.log('--- Human Format ---');
const humanOutput = formatForHuman(mockPatternDiscoveryResult, 10);
console.log(humanOutput);

console.log('\n--- Markdown Format ---');
const markdownOutput = formatForMarkdown(mockPatternDiscoveryResult, 10);
console.log(markdownOutput);

console.log('\n=== Test completed successfully! ===');