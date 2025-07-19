import { DetectionDataPoint } from '../utils/cms/analysis/types.js';
import { createModuleLogger } from '../utils/logger.js';
import type { FrequencyOptions } from './types.js';

const logger = createModuleLogger('script-analyzer');

export interface ScriptPattern {
  pattern: string;
  frequency: number;
  occurrences: number;
  examples: string[];
}

/**
 * Direct script analysis to capture ALL script patterns, not just CMS-discriminative ones
 */
export async function analyzeScripts(
  dataPoints: DetectionDataPoint[], 
  options: Required<FrequencyOptions>
): Promise<Map<string, ScriptPattern[]>> {
  logger.info('Starting direct script analysis', { 
    sites: dataPoints.length,
    minOccurrences: options.minOccurrences 
  });

  const result = new Map<string, ScriptPattern[]>();
  
  // Track all script patterns across all sites
  const patternCounts = new Map<string, {
    siteCount: number;
    totalOccurrences: number;
    examples: Set<string>;
    sites: Set<string>;
  }>();

  for (const site of dataPoints) {
    const scripts = site.scripts || [];
    const siteUrl = site.url;
    const sitePatternsFound = new Set<string>();
    
    if (scripts.length === 0) {
      continue;
    }

    logger.debug(`Analyzing ${scripts.length} scripts for ${siteUrl}`);

    for (const script of scripts) {
      const patterns: string[] = [];
      
      // External script patterns
      if (script.src) {
        patterns.push(...extractExternalScriptPatterns(script.src));
      }
      
      // Inline script patterns  
      if (script.content || script.inline) {
        const content = script.content || '';
        patterns.push(...extractInlineScriptPatterns(content));
      }

      // Record patterns for this site
      for (const pattern of patterns) {
        if (!patternCounts.has(pattern)) {
          patternCounts.set(pattern, {
            siteCount: 0,
            totalOccurrences: 0,
            examples: new Set(),
            sites: new Set()
          });
        }

        const data = patternCounts.get(pattern)!;
        
        // Only count once per site for frequency calculation
        if (!sitePatternsFound.has(pattern)) {
          data.siteCount++;
          sitePatternsFound.add(pattern);
          data.sites.add(siteUrl);
        }
        
        data.totalOccurrences++;
        
        // Add example
        if (data.examples.size < 5) {
          const example = script.src || (script.content || '').substring(0, 100);
          data.examples.add(example);
        }
      }
    }
  }

  // Convert to result format
  const allPatterns: ScriptPattern[] = [];
  
  for (const [pattern, data] of patternCounts.entries()) {
    if (data.siteCount >= options.minOccurrences) {
      const frequency = data.siteCount / dataPoints.length;
      
      allPatterns.push({
        pattern,
        frequency,
        occurrences: data.siteCount,
        examples: Array.from(data.examples).slice(0, 3)
      });
    }
  }

  // Sort by frequency and group logically
  allPatterns.sort((a, b) => b.frequency - a.frequency);
  
  // Group patterns by type
  const groupedPatterns = new Map<string, ScriptPattern[]>();
  
  // Categorize patterns
  const pathPatterns = allPatterns.filter(p => p.pattern.startsWith('path:'));
  const specificScriptPatterns = allPatterns.filter(p => p.pattern.startsWith('script:'));
  const inlinePatterns = allPatterns.filter(p => p.pattern.startsWith('inline:'));
  const domainPatterns = allPatterns.filter(p => p.pattern.startsWith('domain:'));
  const libraryPatterns = allPatterns.filter(p => p.pattern.startsWith('library:'));
  const trackingPatterns = allPatterns.filter(p => p.pattern.startsWith('tracking:'));

  if (pathPatterns.length > 0) groupedPatterns.set('paths', pathPatterns);
  if (specificScriptPatterns.length > 0) groupedPatterns.set('scripts', specificScriptPatterns);
  if (inlinePatterns.length > 0) groupedPatterns.set('inline', inlinePatterns);
  if (domainPatterns.length > 0) groupedPatterns.set('domains', domainPatterns);
  if (libraryPatterns.length > 0) groupedPatterns.set('libraries', libraryPatterns);
  if (trackingPatterns.length > 0) groupedPatterns.set('tracking', trackingPatterns);

  logger.info('Direct script analysis complete', { 
    totalPatterns: allPatterns.length,
    categories: groupedPatterns.size,
    sites: dataPoints.length
  });

  return groupedPatterns;
}

/**
 * Extract patterns from external script URLs
 */
function extractExternalScriptPatterns(scriptSrc: string): string[] {
  const patterns: string[] = [];
  
  try {
    const url = new URL(scriptSrc, 'https://example.com'); // Handle relative URLs
    const pathname = url.pathname;
    const hostname = url.hostname;
    const filename = pathname.split('/').pop() || '';
    
    // Library patterns
    if (filename.includes('jquery')) patterns.push('library:jquery');
    if (filename.includes('bootstrap')) patterns.push('library:bootstrap');
    if (filename.includes('angular')) patterns.push('library:angular');
    if (filename.includes('react')) patterns.push('library:react');
    if (filename.includes('vue')) patterns.push('library:vue');
    
    // CMS-specific script patterns
    if (filename.includes('wp-')) patterns.push('script:wordpress');
    if (filename.includes('drupal')) patterns.push('script:drupal');
    if (filename.includes('joomla')) patterns.push('script:joomla');
    
    // Path patterns
    if (pathname.includes('/wp-content/')) patterns.push('path:wp-content');
    if (pathname.includes('/wp-includes/')) patterns.push('path:wp-includes');
    if (pathname.includes('/sites/')) patterns.push('path:sites');
    if (pathname.includes('/media/')) patterns.push('path:media');
    if (pathname.includes('/administrator/')) patterns.push('path:administrator');
    if (pathname.includes('/components/')) patterns.push('path:components');
    if (pathname.includes('/modules/')) patterns.push('path:modules');
    if (pathname.includes('/templates/')) patterns.push('path:templates');
    if (pathname.includes('/assets/')) patterns.push('path:assets');
    if (pathname.includes('/js/')) patterns.push('path:js');
    if (pathname.includes('/javascript/')) patterns.push('path:javascript');
    
    // Tracking and analytics patterns
    if (hostname.includes('google-analytics') || pathname.includes('gtag')) patterns.push('tracking:google-analytics');
    if (hostname.includes('googletagmanager') || pathname.includes('gtm')) patterns.push('tracking:google-tag-manager');
    if (hostname.includes('facebook') || filename.includes('fbevents')) patterns.push('tracking:facebook');
    if (hostname.includes('hotjar')) patterns.push('tracking:hotjar');
    if (hostname.includes('segment')) patterns.push('tracking:segment');
    if (hostname.includes('mixpanel')) patterns.push('tracking:mixpanel');
    
    // CDN patterns
    if (hostname.includes('cdn')) patterns.push('domain:cdn');
    if (hostname.includes('cloudfront')) patterns.push('domain:cloudfront');
    if (hostname.includes('jsdelivr')) patterns.push('domain:jsdelivr');
    if (hostname.includes('unpkg')) patterns.push('domain:unpkg');
    if (hostname.includes('cdnjs')) patterns.push('domain:cdnjs');
    
    // CMS-specific domains
    if (hostname.includes('cdn-website.com')) patterns.push('domain:duda-cdn');
    if (hostname.includes('squarespace')) patterns.push('domain:squarespace');
    if (hostname.includes('shopify')) patterns.push('domain:shopify');
    if (hostname.includes('wixstatic')) patterns.push('domain:wix');
    
    // File type patterns
    if (filename.endsWith('.min.js')) patterns.push('script:minified');
    if (filename.includes('bundle')) patterns.push('script:bundled');
    if (filename.includes('polyfill')) patterns.push('script:polyfill');
    
  } catch (error) {
    // Handle malformed URLs - extract what we can
    const filename = scriptSrc.split('/').pop() || '';
    if (filename.includes('jquery')) patterns.push('library:jquery');
    if (scriptSrc.includes('/media/')) patterns.push('path:media');
    if (scriptSrc.includes('/wp-content/')) patterns.push('path:wp-content');
  }
  
  return patterns;
}

/**
 * Extract patterns from inline script content
 */
function extractInlineScriptPatterns(content: string): string[] {
  const patterns: string[] = [];
  
  if (!content || content.length === 0) return patterns;
  
  // CMS-specific inline patterns
  if (content.includes('wp-admin') || content.includes('WordPress')) patterns.push('inline:wordpress');
  if (content.includes('Drupal.')) patterns.push('inline:drupal');
  if (content.includes('Joomla.')) patterns.push('inline:joomla');
  
  // Library usage patterns
  if (content.includes('jQuery') || content.includes('$')) patterns.push('inline:jquery');
  if (content.includes('angular') || content.includes('ng-')) patterns.push('inline:angular');
  if (content.includes('React.') || content.includes('ReactDOM')) patterns.push('inline:react');
  if (content.includes('Vue.')) patterns.push('inline:vue');
  
  // Analytics and tracking patterns
  if (content.includes('gtag(') || content.includes('ga(')) patterns.push('inline:google-analytics');
  if (content.includes('fbq(')) patterns.push('inline:facebook-pixel');
  if (content.includes('dataLayer')) patterns.push('inline:google-tag-manager');
  if (content.includes('_paq') || content.includes('Matomo')) patterns.push('inline:matomo');
  if (content.includes('amplitude')) patterns.push('inline:amplitude');
  
  // CMS-specific configuration patterns
  if (content.includes('window.Parameters') || content.includes('DUDAONE')) patterns.push('inline:duda');
  if (content.includes('window.Shopify')) patterns.push('inline:shopify');
  if (content.includes('window.Squarespace')) patterns.push('inline:squarespace');
  if (content.includes('window.Wix')) patterns.push('inline:wix');
  
  // Common JavaScript patterns
  if (content.includes('document.addEventListener') || content.includes('DOMContentLoaded')) patterns.push('inline:dom-ready');
  if (content.includes('window.onload')) patterns.push('inline:window-load');
  if (content.includes('ajax') || content.includes('XMLHttpRequest') || content.includes('fetch(')) patterns.push('inline:ajax');
  
  return patterns;
}