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
  
  const botDetectionIndicators = [
    'cloudflare',
    'captcha',
    'bot detection',
    'please verify',
    'security check',
    'access denied',
    'blocked',
    'suspicious activity'
  ];
  
  return botDetectionIndicators.some(indicator => 
    content.includes(indicator) || title.includes(indicator)
  );
}

/**
 * Check if data point represents an error page
 */
function isErrorPage(dataPoint: DetectionDataPoint): boolean {
  const content = dataPoint.htmlContent?.toLowerCase() || '';
  const title = dataPoint.metaTags?.find(tag => tag.name === 'title')?.content?.toLowerCase() || '';
  
  const errorIndicators = [
    '404',
    '500',
    'not found',
    'error',
    'maintenance',
    'temporarily unavailable',
    'under construction'
  ];
  
  return errorIndicators.some(indicator => 
    content.includes(indicator) || title.includes(indicator)
  );
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