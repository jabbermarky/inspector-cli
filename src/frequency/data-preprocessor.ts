/**
 * DataPreprocessor - Phase 3 implementation
 * Single source of truth for loading and preprocessing CMS analysis data
 * Ensures all analyzers work with the same deduplicated site data
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import type { 
  PreprocessedData, 
  SiteData, 
  DateRange 
} from './types/analyzer-interface.js';
// Types for the analysis data we need
interface CMSAnalysisData {
  pageData?: {
    httpInfo?: {
      headers?: Record<string, string | string[]>;
    };
    metadata?: Record<string, string>;
    scripts?: Array<{ src?: string }>;
  };
  detectionResult?: {
    allTechnologies?: string[];
  };
}

interface IndexEntry {
  fileId: string;
  url: string;
  timestamp: string;
  cms: string;
  confidence: number;
  filePath: string;
}
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('data-preprocessor');

export class DataPreprocessor {
  private dataPath: string;
  private cache: Map<string, PreprocessedData> = new Map();

  constructor(dataPath: string = './data/cms-analysis') {
    this.dataPath = dataPath;
  }

  /**
   * Load and preprocess CMS analysis data
   * Deduplicates by normalized URL and structures for efficient analysis
   */
  async load(options: {
    dateRange?: DateRange;
    forceReload?: boolean;
  } = {}): Promise<PreprocessedData> {
    const cacheKey = this.getCacheKey(options);
    
    if (!options.forceReload && this.cache.has(cacheKey)) {
      logger.debug('Using cached preprocessed data');
      return this.cache.get(cacheKey)!;
    }

    logger.info('Loading and preprocessing CMS analysis data...');
    const startTime = Date.now();

    // Load index
    const indexPath = join(this.dataPath, 'index.json');
    const indexContent = await readFile(indexPath, 'utf-8');
    const index: IndexEntry[] = JSON.parse(indexContent);

    // Filter by date range if specified
    const filteredIndex = this.filterByDateRange(index, options.dateRange);
    logger.info(`Processing ${filteredIndex.length} sites after date filtering`);

    // Load and preprocess site data
    const sites = new Map<string, SiteData>();
    const errors: string[] = [];
    const filteringStats = {
      sitesFilteredOut: 0,
      filterReasons: {
        'bot-detection': 0,
        'error-page': 0,
        'insufficient-data': 0,
        'invalid-url': 0
      }
    };

    for (const entry of filteredIndex) {
      try {
        const siteResult = await this.loadSiteData(entry);
        if (siteResult && 'filtered' in siteResult) {
          // Site was filtered out
          filteringStats.sitesFilteredOut++;
          const reason = siteResult.reason as keyof typeof filteringStats.filterReasons;
          if (reason in filteringStats.filterReasons) {
            filteringStats.filterReasons[reason]++;
          }
        } else if (siteResult) {
          const siteData = siteResult as SiteData;
          // Use normalized URL as key to handle deduplication
          const normalizedUrl = this.normalizeUrl(entry.url);
          
          // If we already have this normalized URL, keep the one with higher confidence
          const existing = sites.get(normalizedUrl);
          if (!existing || existing.confidence < entry.confidence) {
            sites.set(normalizedUrl, siteData);
          }
        }
      } catch (error) {
        errors.push(`Failed to load ${entry.url}: ${error}`);
      }
    }

    if (errors.length > 0) {
      logger.warn(`Failed to load ${errors.length} sites`);
      if (errors.length <= 10) {
        errors.forEach(err => logger.debug(err));
      }
    }

    const preprocessedData: PreprocessedData = {
      sites,
      totalSites: sites.size,
      filteringStats,
      metadata: {
        dateRange: options.dateRange,
        version: '1.0.0',
        preprocessedAt: new Date().toISOString()
      }
    };

    // Cache the result
    this.cache.set(cacheKey, preprocessedData);

    const duration = Date.now() - startTime;
    logger.info(`Preprocessing completed in ${duration}ms. Loaded ${sites.size} unique sites. Filtered out ${filteringStats.sitesFilteredOut} sites.`);

    return preprocessedData;
  }

  /**
   * Load individual site data from JSON file
   */
  private async loadSiteData(entry: IndexEntry): Promise<SiteData | { filtered: true; reason: string } | null> {
    try {
      const filePath = join(this.dataPath, entry.filePath);
      const content = await readFile(filePath, 'utf-8');
      const data: CMSAnalysisData = JSON.parse(content);

      // Apply site filtering (same logic as old analyzer)
      const filterReason = this.shouldFilterSite(data, entry);
      if (filterReason) {
        return { filtered: true, reason: filterReason };
      }

      // Extract and structure data
      const headers = new Map<string, Set<string>>();
      const headersByPageType = {
        mainpage: new Map<string, Set<string>>(),
        robots: new Map<string, Set<string>>()
      };
      const metaTags = new Map<string, Set<string>>();
      const scripts = new Set<string>();
      const technologies = new Set<string>();

      // Process headers - Handle both mainpage and robots.txt headers
      // Mainpage headers
      const httpHeaders = (data as any).httpHeaders || data.pageData?.httpInfo?.headers;
      if (httpHeaders) {
        for (const [name, value] of Object.entries(httpHeaders)) {
          const normalizedName = name.toLowerCase();
          
          // Add to combined headers
          if (!headers.has(normalizedName)) {
            headers.set(normalizedName, new Set());
          }
          
          // Add to mainpage-specific headers
          if (!headersByPageType.mainpage.has(normalizedName)) {
            headersByPageType.mainpage.set(normalizedName, new Set());
          }
          
          // Handle both string and array values
          const values = Array.isArray(value) ? value : [value];
          values.forEach(v => {
            headers.get(normalizedName)!.add(String(v));
            headersByPageType.mainpage.get(normalizedName)!.add(String(v));
          });
        }
      }

      // Robots.txt headers (if available)
      const robotsHeaders = (data as any).robotsTxt?.httpHeaders;
      if (robotsHeaders) {
        for (const [name, value] of Object.entries(robotsHeaders)) {
          const normalizedName = name.toLowerCase();
          
          // Add to combined headers
          if (!headers.has(normalizedName)) {
            headers.set(normalizedName, new Set());
          }
          
          // Add to robots-specific headers
          if (!headersByPageType.robots.has(normalizedName)) {
            headersByPageType.robots.set(normalizedName, new Set());
          }
          
          // Handle both string and array values
          const values = Array.isArray(value) ? value : [value];
          values.forEach(v => {
            headers.get(normalizedName)!.add(String(v));
            headersByPageType.robots.get(normalizedName)!.add(String(v));
          });
        }
      }

      // Process meta tags - Handle both old and new data structure
      const metaTagsData = (data as any).metaTags || data.pageData?.metadata;
      if (metaTagsData) {
        if (Array.isArray(metaTagsData)) {
          // New structure: array of objects with name/content properties
          metaTagsData.forEach((meta: any) => {
            if (meta.name && meta.content) {
              if (!metaTags.has(meta.name)) {
                metaTags.set(meta.name, new Set());
              }
              metaTags.get(meta.name)!.add(String(meta.content));
            }
          });
        } else {
          // Old structure: object with name->content mapping
          for (const [name, content] of Object.entries(metaTagsData)) {
            if (!metaTags.has(name)) {
              metaTags.set(name, new Set());
            }
            metaTags.get(name)!.add(String(content));
          }
        }
      }

      // Process scripts - Handle both structured scripts and HTML content
      const scriptsData = (data as any).scripts;
      if (scriptsData && Array.isArray(scriptsData)) {
        scriptsData.forEach((script: { src?: string; inline?: boolean }) => {
          if (script.src) {
            scripts.add(script.src);
          }
        });
      }

      // Also extract inline scripts and additional src attributes from HTML content
      const htmlContent = (data as any).htmlContent;
      if (htmlContent) {
        this.extractScriptsFromHtml(htmlContent, scripts);
      }

      // Process technologies
      if (data.detectionResult?.allTechnologies) {
        data.detectionResult.allTechnologies.forEach((tech: string) => {
          technologies.add(tech);
        });
      }

      return {
        url: entry.url,
        normalizedUrl: this.normalizeUrl(entry.url),
        cms: entry.cms || null, // Keep null values as null, don't convert to 'Unknown'
        confidence: entry.confidence || 0,
        headers,
        headersByPageType,
        metaTags,
        scripts,
        technologies,
        capturedAt: entry.timestamp
      };
    } catch (error) {
      logger.debug(`Failed to load site data for ${entry.url}: ${error}`);
      return null;
    }
  }

  /**
   * Normalize URL for deduplication
   * Removes protocol variations, www prefix, and trailing slashes
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove www prefix
      const host = parsed.host.replace(/^www\./, '');
      // Remove trailing slash from pathname
      const path = parsed.pathname.replace(/\/$/, '') || '/';
      // Reconstruct normalized URL
      return `${host}${path}`;
    } catch {
      // If URL parsing fails, return as-is
      return url;
    }
  }

  /**
   * Filter index entries by date range
   */
  private filterByDateRange(index: IndexEntry[], dateRange?: DateRange): IndexEntry[] {
    if (!dateRange) {
      return index;
    }

    return index.filter(entry => {
      const entryDate = new Date(entry.timestamp);

      if (dateRange.lastDays !== undefined) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - dateRange.lastDays);
        cutoffDate.setHours(0, 0, 0, 0);
        return entryDate >= cutoffDate;
      }

      if (dateRange.start && entryDate < dateRange.start) {
        return false;
      }

      if (dateRange.end && entryDate > dateRange.end) {
        return false;
      }

      return true;
    });
  }

  /**
   * Generate cache key for preprocessed data
   */
  private getCacheKey(options: { dateRange?: DateRange }): string {
    if (!options.dateRange) {
      return 'all';
    }

    const parts: string[] = [];
    if (options.dateRange.lastDays !== undefined) {
      parts.push(`last${options.dateRange.lastDays}`);
    }
    if (options.dateRange.start) {
      parts.push(`from${options.dateRange.start.toISOString()}`);
    }
    if (options.dateRange.end) {
      parts.push(`to${options.dateRange.end.toISOString()}`);
    }

    return parts.join('_') || 'all';
  }

  /**
   * Clear cache to free memory
   */
  clearCache(): void {
    this.cache.clear();
    logger.debug('Preprocessor cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { entries: number; keys: string[] } {
    return {
      entries: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Check if site should be filtered out (same logic as old analyzer)
   */
  private shouldFilterSite(data: CMSAnalysisData, entry: IndexEntry): string | null {
    // Check for bot detection pages
    if (this.isBotDetectionPage(data)) {
      return 'bot-detection';
    }

    // Check for error pages
    if (this.isErrorPage(data)) {
      return 'error-page';
    }

    // Check for insufficient data
    if (this.hasInsufficientData(data)) {
      return 'insufficient-data';
    }

    // Check for valid URL
    if (!this.isValidUrl(entry.url)) {
      return 'invalid-url';
    }

    return null;
  }

  private isBotDetectionPage(data: CMSAnalysisData): boolean {
    const content = (data as any).htmlContent?.toLowerCase() || '';
    const metaTags = (data as any).metaTags || [];
    const title = metaTags.find((tag: any) => tag.name === 'title')?.content?.toLowerCase() || '';
    
    // For 403/503 status codes, check if it's a bot detection page
    const statusCode = (data as any).statusCode;
    if (statusCode === 403 || statusCode === 503) {
      const securityPageIndicators = [
        'cloudflare',
        'security check',
        'access denied',
        'bot detection',
        'ddos protection',
        'please enable javascript',
        'browser check',
        'verify you are human'
      ];
      
      return securityPageIndicators.some(indicator => 
        content.includes(indicator) || title.includes(indicator)
      );
    }
    
    return false;
  }

  private isErrorPage(data: CMSAnalysisData): boolean {
    const statusCode = (data as any).statusCode;
    
    // HTTP error status codes are definitive - always filter these
    if (statusCode >= 400) {
      return true;
    }
    
    // For HTTP 200 responses, use more restrictive content analysis
    if (statusCode !== 200) {
      return false; // Only check content for successful responses
    }
    
    const content = (data as any).htmlContent?.toLowerCase() || '';
    const title = (data as any).metaTags?.find((tag: any) => tag.name === 'title')?.content?.toLowerCase() || '';
    
    // Look for error page indicators in successful responses
    const errorPageIndicators = [
      'page not found',
      'error 404',
      '404 not found',
      'page cannot be found',
      'the requested page could not be found'
    ];
    
    return errorPageIndicators.some(indicator => 
      content.includes(indicator) || title.includes(indicator)
    );
  }

  private hasInsufficientData(data: CMSAnalysisData): boolean {
    // Must have HTML content
    const htmlContent = (data as any).htmlContent;
    if (!htmlContent || htmlContent.length < 100) {
      return true;
    }
    
    // Must have some headers
    const httpHeaders = (data as any).httpHeaders || data.pageData?.httpInfo?.headers;
    if (!httpHeaders || Object.keys(httpHeaders).length === 0) {
      return true;
    }
    
    return false;
  }

  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Extract script sources from HTML content using regex
   */
  private extractScriptsFromHtml(htmlContent: string, scripts: Set<string>): void {
    // Extract external script sources
    const scriptSrcRegex = /<script[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;
    let match;
    while ((match = scriptSrcRegex.exec(htmlContent)) !== null) {
      const src = match[1];
      if (src && src.startsWith('http')) {
        scripts.add(src);
      }
    }

    // Extract inline scripts (for pattern analysis)
    const inlineScriptRegex = /<script[^>]*>([^<]+)<\/script>/gi;
    while ((match = inlineScriptRegex.exec(htmlContent)) !== null) {
      const scriptContent = match[1].trim();
      if (scriptContent.length > 10) { // Only capture meaningful inline scripts
        scripts.add(`inline:${scriptContent.substring(0, 200)}`); // Truncate for storage
      }
    }
  }
}