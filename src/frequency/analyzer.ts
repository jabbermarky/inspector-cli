import { createModuleLogger } from '../utils/logger.js';
import { DataStorage } from '../utils/cms/analysis/storage.js';
import { AnalysisReporter } from '../utils/cms/analysis/reports.js';
import { collectData } from './collector.js';
import { analyzeHeaders } from './header-analyzer.js';
import { analyzeMetaTags } from './meta-analyzer.js';
import { generateRecommendations } from './recommender.js';
import { formatOutput } from './reporter.js';
import type { FrequencyOptions, FrequencyResult, DetectionDataPoint } from './types.js';

const logger = createModuleLogger('frequency-analyzer');

/**
 * Main frequency analysis function that orchestrates existing components
 */
export async function analyzeFrequency(options: FrequencyOptions = {}): Promise<FrequencyResult> {
  const startTime = performance.now();
  
  // Set defaults
  const opts: Required<FrequencyOptions> = {
    dataSource: 'cms-analysis',
    dataDir: './data/cms-analysis',
    minSites: 100,
    minOccurrences: 5,
    pageType: 'all',
    output: 'human',
    outputFile: '',
    includeRecommendations: true,
    includeCurrentFilters: true,
    ...options
  };
  
  logger.info('Starting frequency analysis', { options: opts });
  
  try {
    // Step 1: Collect data using existing DataStorage
    logger.info('Collecting data from storage');
    const { dataPoints, filteringReport } = await collectData(opts);
    
    if (dataPoints.length < opts.minSites) {
      throw new Error(`Insufficient data: found ${dataPoints.length} sites, minimum required: ${opts.minSites}`);
    }
    
    logger.info('Data collection complete', { 
      totalSites: dataPoints.length,
      filteredSites: filteringReport.sitesFilteredOut 
    });
    
    // Step 2: Analyze patterns using both new direct analysis and existing PatternDiscovery
    logger.info('Analyzing meta tags directly');
    const metaPatterns = await analyzeMetaTags(dataPoints, opts);
    
    logger.info('Analyzing script patterns directly');
    const { analyzeScripts } = await import('./script-analyzer.js');
    const scriptPatterns = await analyzeScripts(dataPoints, opts);
    
    // Step 3: Analyze headers (extending PatternDiscovery functionality)
    logger.info('Analyzing HTTP headers');
    const headerPatterns = await analyzeHeaders(dataPoints, opts);
    
    // Step 4: Generate recommendations if requested
    let recommendations;
    if (opts.includeRecommendations) {
      logger.info('Generating filter recommendations');
      recommendations = await generateRecommendations({
        headerPatterns,
        metaPatterns,
        scriptPatterns,
        dataPoints,
        options: opts
      });
    }
    
    // Step 5: Format results
    const result: FrequencyResult = {
      metadata: {
        totalSites: dataPoints.length + filteringReport.sitesFilteredOut,
        validSites: dataPoints.length,
        filteredSites: filteringReport.sitesFilteredOut,
        analysisDate: new Date().toISOString(),
        options: opts
      },
      
      headers: formatHeaderData(headerPatterns, dataPoints.length, opts),
      metaTags: formatMetaTagData(metaPatterns, dataPoints.length, opts),
      scripts: formatScriptData(scriptPatterns, dataPoints.length, opts),
      
      ...(recommendations && { recommendations }),
      filteringReport
    };
    
    const duration = performance.now() - startTime;
    logger.info('Frequency analysis complete', { 
      durationMs: Math.round(duration),
      totalPatterns: Object.keys(result.headers).length + Object.keys(result.metaTags).length
    });
    
    // Step 6: Output results if file specified
    if (opts.outputFile) {
      await formatOutput(result, opts);
    }
    
    return result;
    
  } catch (error) {
    logger.error('Frequency analysis failed', error as Error);
    throw error;
  }
}

/**
 * Format header pattern data into frequency result format
 */
function formatHeaderData(
  headerPatterns: Map<string, any[]>, 
  totalSites: number, 
  options: Required<FrequencyOptions>
): FrequencyResult['headers'] {
  const result: FrequencyResult['headers'] = {};
  
  for (const [headerName, patterns] of headerPatterns.entries()) {
    const values = patterns
      .filter(p => p.frequency >= options.minOccurrences / totalSites)
      .map(p => ({
        value: p.pattern.split(':')[1] || p.pattern,
        frequency: p.frequency,
        occurrences: Math.round(p.frequency * totalSites),
        examples: p.examples.slice(0, 3).map(sanitizeExample)
      }))
      .sort((a, b) => b.frequency - a.frequency);
    
    if (values.length > 0) {
      // Calculate header-level frequency as percentage of sites using ANY value of this header
      const uniqueSitesUsingHeader = new Set(
        values.flatMap(v => v.examples)
      ).size;
      const headerFrequency = Math.min(1.0, uniqueSitesUsingHeader / totalSites);
      
      result[headerName] = {
        frequency: headerFrequency,
        occurrences: uniqueSitesUsingHeader,
        totalSites,
        values
      };
    }
  }
  
  return result;
}

/**
 * Sanitize examples to prevent markdown rendering issues
 */
function sanitizeExample(example: string): string {
  // Wrap HTML comments and CDATA in code blocks or escape them
  if (example.includes('<!--') || example.includes('<![CDATA[')) {
    return '`' + example.replace(/`/g, '\\`') + '`';
  }
  return example;
}

/**
 * Format meta tag pattern data into frequency result format
 */
function formatMetaTagData(
  metaPatterns: Map<string, any[]>, 
  totalSites: number, 
  options: Required<FrequencyOptions>
): FrequencyResult['metaTags'] {
  const result: FrequencyResult['metaTags'] = {};
  
  // Process patterns from our direct meta tag analyzer
  for (const [metaKey, patterns] of metaPatterns.entries()) {
    // Calculate meta key level frequency (percentage of sites using ANY value of this meta tag)
    const uniqueSitesUsingMeta = new Set(
      patterns.flatMap(p => p.examples)
    ).size;
    const metaFrequency = Math.min(1.0, uniqueSitesUsingMeta / totalSites);
    
    // Prepare values array with all patterns for this meta key
    const values = patterns
      .filter(p => p.frequency >= options.minOccurrences / totalSites)
      .map(p => ({
        value: p.pattern.split(':').slice(1).join(':') || p.pattern, // Remove the "name:" prefix
        frequency: p.frequency,
        occurrences: Math.round(p.frequency * totalSites),
        examples: p.examples.slice(0, 3).map(sanitizeExample)
      }))
      .sort((a, b) => b.frequency - a.frequency);
    
    if (values.length > 0) {
      result[metaKey] = {
        frequency: metaFrequency,
        occurrences: uniqueSitesUsingMeta,
        totalSites,
        values
      };
    }
  }
  
  return result;
}

/**
 * Format script pattern data into frequency result format
 */
function formatScriptData(
  scriptPatterns: Map<string, any[]>, 
  totalSites: number, 
  options: Required<FrequencyOptions>
): FrequencyResult['scripts'] {
  const result: FrequencyResult['scripts'] = {};
  
  // Process patterns from our direct script analyzer
  for (const [category, patterns] of scriptPatterns.entries()) {
    for (const pattern of patterns) {
      if (pattern.frequency >= options.minOccurrences / totalSites) {
        // Ensure frequency is properly capped at 100%
        const actualFrequency = Math.min(1.0, pattern.frequency);
        const actualOccurrences = Math.min(totalSites, pattern.occurrences);
        
        result[pattern.pattern] = {
          frequency: actualFrequency,
          occurrences: actualOccurrences,
          totalSites,
          examples: pattern.examples.slice(0, 3).map(sanitizeExample)
        };
      }
    }
  }
  
  return result;
}