import { createModuleLogger } from '../utils/logger.js';
import { DataStorage } from '../utils/cms/analysis/storage.js';
import type { DetectionDataPoint, FrequencyOptions } from './types.js';

const logger = createModuleLogger('frequency-collector');

export interface CollectionResult {
  dataPoints: DetectionDataPoint[];
  filteringReport: {
    sitesFilteredOut: number;
    filterReasons: Record<string, number>;
  };
}

/**
 * Collect data from existing storage with quality filtering
 * Leverages existing DataStorage class
 */
export async function collectData(options: Required<FrequencyOptions>): Promise<CollectionResult> {
  // Validate data source
  if (options.dataSource !== 'cms-analysis') {
    throw new Error(`Data source ${options.dataSource} not supported`);
  }
  
  const storage = new DataStorage(options.dataDir);
  await storage.initialize();
  
  logger.info('Initialized data storage', { dataDir: options.dataDir });
  
  // Get all data points using existing functionality
  const allDataPoints = await storage.getAllDataPoints();
  logger.info('Retrieved data points', { total: allDataPoints.length });
  
  // Apply quality filtering
  const { validDataPoints, filteringReport } = filterDataPoints(allDataPoints, options);
  
  // Apply deduplication (keep latest for each URL)
  const deduplicatedDataPoints = deduplicateByUrl(validDataPoints);
  
  logger.info('Data collection complete', {
    original: allDataPoints.length,
    afterFiltering: validDataPoints.length,
    afterDeduplication: deduplicatedDataPoints.length,
    filteredOut: filteringReport.sitesFilteredOut
  });
  
  return {
    dataPoints: deduplicatedDataPoints,
    filteringReport
  };
}

/**
 * Filter data points based on quality criteria
 */
function filterDataPoints(
  dataPoints: DetectionDataPoint[], 
  options: Required<FrequencyOptions>
): { validDataPoints: DetectionDataPoint[]; filteringReport: CollectionResult['filteringReport'] } {
  
  const filterReasons: Record<string, number> = {
    'bot-detection': 0,
    'error-page': 0,
    'insufficient-data': 0,
    'invalid-url': 0
  };
  
  const validDataPoints = dataPoints.filter(dataPoint => {
    // Check for bot detection pages
    if (isBotDetectionPage(dataPoint)) {
      filterReasons['bot-detection']++;
      return false;
    }
    
    // Check for error pages
    if (isErrorPage(dataPoint)) {
      filterReasons['error-page']++;
      return false;
    }
    
    // Check for sufficient data
    if (hasInsufficientData(dataPoint)) {
      filterReasons['insufficient-data']++;
      return false;
    }
    
    // Check for valid URL
    if (!isValidUrl(dataPoint.url)) {
      filterReasons['invalid-url']++;
      return false;
    }
    
    return true;
  });
  
  const sitesFilteredOut = dataPoints.length - validDataPoints.length;
  
  return {
    validDataPoints,
    filteringReport: { sitesFilteredOut, filterReasons }
  };
}

/**
 * Deduplicate data points by URL, keeping the most recent
 */
function deduplicateByUrl(dataPoints: DetectionDataPoint[]): DetectionDataPoint[] {
  const urlMap = new Map<string, DetectionDataPoint>();
  
  for (const dataPoint of dataPoints) {
    const normalizedUrl = normalizeUrl(dataPoint.url);
    const existing = urlMap.get(normalizedUrl);
    
    if (!existing || new Date(dataPoint.timestamp) > new Date(existing.timestamp)) {
      urlMap.set(normalizedUrl, dataPoint);
    }
  }
  
  return Array.from(urlMap.values());
}

/**
 * Normalize URL for deduplication (remove trailing slash, www, etc.)
 */
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    let hostname = urlObj.hostname.toLowerCase();
    
    // Remove www prefix
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    
    // Remove trailing slash from pathname
    let pathname = urlObj.pathname;
    if (pathname.endsWith('/') && pathname.length > 1) {
      pathname = pathname.substring(0, pathname.length - 1);
    }
    
    return `${urlObj.protocol}//${hostname}${pathname}`;
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Check if data point represents a bot detection page
 */
function isBotDetectionPage(dataPoint: DetectionDataPoint): boolean {
  const content = dataPoint.htmlContent?.toLowerCase() || '';
  const title = dataPoint.metaTags?.find(tag => tag.name === 'title')?.content?.toLowerCase() || '';
  
  // For 403/503 status codes, check if it's a bot detection page
  if (dataPoint.statusCode === 403 || dataPoint.statusCode === 503) {
    const securityPageIndicators = [
      'cloudflare',
      'security check',
      'access denied',
      'bot detection'
    ];
    
    if (securityPageIndicators.some(indicator => title.includes(indicator))) {
      return true;
    }
  }
  
  // More specific patterns that indicate actual bot challenges
  const titleBotIndicators = [
    'attention required',
    'just a moment',
    'checking your browser',
    'please wait',
    'one more step',
    'verify you are human',
    'security check',
    'access denied'
  ];
  
  // Check title first - most reliable
  if (titleBotIndicators.some(indicator => title.includes(indicator))) {
    return true;
  }
  
  // For content, look for specific bot challenge patterns, not just keywords
  const contentBotPatterns = [
    'cloudflare ray id',
    'cf-ray',
    'please complete the security check',
    'please verify you are human',
    'complete the captcha',
    'suspicious activity has been detected',
    'enable javascript and cookies',
    'this process is automatic',
    'your browser will redirect',
    'ddos protection by cloudflare'
  ];
  
  return contentBotPatterns.some(pattern => content.includes(pattern));
}

/**
 * Check if data point represents an error page
 * Improved version with reduced false positives
 */
function isErrorPage(dataPoint: DetectionDataPoint): boolean {
  // HTTP error status codes are definitive - always filter these
  if (dataPoint.statusCode >= 400) {
    return true;
  }
  
  // For HTTP 200 responses, use more restrictive content analysis
  if (dataPoint.statusCode !== 200) {
    return false; // Only check content for successful responses
  }
  
  const title = dataPoint.metaTags?.find(tag => tag.name === 'title')?.content?.toLowerCase() || '';
  const htmlContent = dataPoint.htmlContent || '';
  const contentLower = htmlContent.toLowerCase();
  
  // High-confidence error indicators in page title
  const titleErrorPatterns = [
    'page not found',
    'error 404',
    'error 500', 
    '404 not found',
    '404 error',
    'not found',
    'site maintenance',
    'temporarily unavailable',
    'under construction',
    'this page could not be found',
    'the requested url was not found'
  ];
  
  // Check title first - most reliable indicator
  const titleHasError = titleErrorPatterns.some(pattern => title.includes(pattern));
  if (titleHasError) {
    return true;
  }
  
  // Remove potentially problematic content before checking
  const cleanedContent = removeExcludedSections(htmlContent);
  const cleanedLower = cleanedContent.toLowerCase();
  
  // More specific patterns that require word boundaries or context
  const contextualErrorPatterns = [
    /\b404\s+(page\s+)?not\s+found\b/,
    /\berror\s+404\b/,
    /\berror\s+500\b/,
    /\bpage\s+not\s+found\b/,
    /\bsite\s+maintenance\b/,
    /\btemporarily\s+unavailable\b/,
    /\bunder\s+construction\b/
  ];
  
  // Check for contextual error patterns
  const contentHasError = contextualErrorPatterns.some(pattern => pattern.test(cleanedLower));
  
  // Additional check: if page is very short and has error indicators, likely an error
  const isShortPage = cleanedContent.length < 1000;
  const hasSimpleErrorIndicator = cleanedLower.includes('404') || cleanedLower.includes('not found');
  
  if (isShortPage && hasSimpleErrorIndicator && !hasExcludedContext(cleanedContent)) {
    return true;
  }
  
  return contentHasError;
}

/**
 * Remove sections that commonly contain false positive triggers
 */
function removeExcludedSections(htmlContent: string): string {
  if (!htmlContent) return '';
  
  let cleaned = htmlContent;
  
  // Remove script tags and their content
  cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Remove style tags and their content
  cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove common analytics patterns
  cleaned = cleaned.replace(/gtag\([^)]*\)/gi, '');
  cleaned = cleaned.replace(/ga\([^)]*\)/gi, '');
  cleaned = cleaned.replace(/dataLayer[^;]*;/gi, '');
  
  // Remove CSS class and ID references that might contain numbers
  cleaned = cleaned.replace(/class="[^"]*\b(404|500)\b[^"]*"/gi, '');
  cleaned = cleaned.replace(/id="[^"]*\b(404|500)\b[^"]*"/gi, '');
  
  // Remove font family declarations
  cleaned = cleaned.replace(/font-family:[^;]*[45]00[^;]*;/gi, '');
  
  return cleaned;
}

/**
 * Check if content has excluded context that suggests false positive
 */
function hasExcludedContext(content: string): boolean {
  const excludedContexts = [
    'font-weight',
    'font-family',
    'css',
    'javascript',
    'analytics',
    'gtag',
    'dataLayer',
    'class=',
    'id=',
    'itemid'
  ];
  
  const contentLower = content.toLowerCase();
  return excludedContexts.some(context => contentLower.includes(context));
}

/**
 * Check if data point has sufficient data for analysis
 */
function hasInsufficientData(dataPoint: DetectionDataPoint): boolean {
  // Must have HTML content
  if (!dataPoint.htmlContent || dataPoint.htmlContent.length < 100) {
    return true;
  }
  
  // Must have some headers
  if (!dataPoint.httpHeaders || Object.keys(dataPoint.httpHeaders).length === 0) {
    return true;
  }
  
  return false;
}

/**
 * Basic URL validation
 */
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}