import { createModuleLogger } from '../utils/logger.js';
import { DataStorage } from '../utils/cms/analysis/storage.js';
import { AnalysisReporter } from '../utils/cms/analysis/reports.js';
import { collectData } from './collector.js';
import { analyzeHeaders } from './header-analyzer.js';
import { analyzeMetaTags } from './meta-analyzer.js';
import { generateRecommendations } from './recommender.js';
import { formatOutput } from './reporter.js';
import { analyzeDatasetBias } from './bias-detector.js';
import { batchAnalyzeHeaders, generateSemanticInsights } from './semantic-analyzer.js';
import { analyzeVendorPresence, inferTechnologyStack } from './vendor-patterns.js';
import { analyzeHeaderCooccurrence } from './co-occurrence-analyzer.js';
import { discoverHeaderPatterns } from './pattern-discovery.js';
import { runStandardPipeline, AnalysisStage } from './analysis-pipeline.js';
import type { FrequencyOptions, FrequencyResult, DetectionDataPoint, FrequencyOptionsWithDefaults } from './types.js';

const logger = createModuleLogger('frequency-analyzer');

/**
 * Main frequency analysis function that orchestrates existing components
 */
export async function analyzeFrequency(options: FrequencyOptions = {}): Promise<FrequencyResult> {
  const startTime = performance.now();
  
  // Set defaults  
  const opts: FrequencyOptionsWithDefaults = {
    dataSource: 'cms-analysis',
    dataDir: './data/cms-analysis',
    minSites: 100,
    minOccurrences: 5,
    pageType: 'all',
    output: 'human',
    outputFile: '',
    includeRecommendations: true,
    includeCurrentFilters: true,
    debugCalculations: false,
    enableValidation: true,
    skipStatisticalTests: false,
    validationStopOnError: false,
    validationDebugMode: false,
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
    
    // Step 4: Perform dataset bias analysis
    logger.info('Performing dataset bias analysis');
    const biasAnalysis = await analyzeDatasetBias(dataPoints, opts);
    
    // Step 4.5: Run validation pipeline if enabled (Phase 3)
    let validationResults;
    if (opts.enableValidation && biasAnalysis.headerCorrelations.size > 0) {
      logger.info('Running Phase 3 validation pipeline');
      try {
        const pipelineResult = await runStandardPipeline(
          dataPoints,
          biasAnalysis,
          opts,
          {
            skipSignificanceTesting: opts.skipStatisticalTests,
            stopOnError: opts.validationStopOnError,
            debugMode: opts.validationDebugMode,
            frequencyThreshold: opts.minOccurrences / dataPoints.length,
            sampleSizeThreshold: Math.max(30, opts.minOccurrences),
            concentrationThreshold: 0.4
          }
        );
        
        // Count statistically significant headers
        const significantCount = pipelineResult.finalData.significanceResults ? 
          Array.from(pipelineResult.finalData.significanceResults.values())
            .filter(result => result.result?.isSignificant).length : 0;
        
        validationResults = {
          pipelineResult,
          qualityScore: pipelineResult.summary.qualityScore,
          validationPassed: pipelineResult.overallPassed,
          sanityChecksPassed: pipelineResult.finalData.sanityCheckReport?.passed || false,
          statisticallySignificantHeaders: significantCount
        };
        
        logger.info('Validation pipeline completed', {
          passed: validationResults.validationPassed,
          qualityScore: validationResults.qualityScore,
          significantHeaders: significantCount,
          sanityChecksPassed: validationResults.sanityChecksPassed
        });
        
        // Use validated correlations if pipeline passed
        if (pipelineResult.overallPassed && pipelineResult.finalData.correlations.size > 0) {
          biasAnalysis.headerCorrelations = pipelineResult.finalData.correlations;
          logger.info('Updated bias analysis with validated correlations', {
            originalHeaders: biasAnalysis.headerCorrelations.size,
            validatedHeaders: pipelineResult.finalData.correlations.size
          });
        }
        
      } catch (validationError) {
        logger.warn('Validation pipeline failed, continuing with original analysis', {
          error: String(validationError)
        });
        
        validationResults = {
          pipelineResult: null,
          qualityScore: 0,
          validationPassed: false,
          sanityChecksPassed: false,
          statisticallySignificantHeaders: 0
        };
      }
    }
    
    // Step 5: Perform semantic analysis of headers
    logger.info('Performing semantic analysis of headers');
    const uniqueHeaders = Array.from(headerPatterns.keys()).map(h => h.toLowerCase());
    const headerAnalyses = batchAnalyzeHeaders(uniqueHeaders);
    const semanticInsights = generateSemanticInsights(headerAnalyses);
    const vendorStats = analyzeVendorPresence(uniqueHeaders);
    const technologyStack = inferTechnologyStack(uniqueHeaders);
    
    const semanticAnalysis = {
      headerAnalyses,
      insights: semanticInsights,
      vendorStats,
      technologyStack
    };
    
    // Step 6: Perform co-occurrence pattern analysis
    logger.info('Performing co-occurrence pattern analysis');
    const cooccurrenceAnalysis = analyzeHeaderCooccurrence(dataPoints);
    
    // Step 7: Perform pattern discovery analysis
    logger.info('Performing pattern discovery analysis');
    const patternDiscoveryAnalysis = discoverHeaderPatterns(dataPoints);
    
    // Step 8: Generate recommendations if requested (now bias-aware, semantic-aware, co-occurrence-aware, and pattern-discovery-aware)
    let recommendations;
    if (opts.includeRecommendations) {
      logger.info('Generating bias-aware filter recommendations');
      recommendations = await generateRecommendations({
        headerPatterns,
        metaPatterns,
        scriptPatterns,
        dataPoints,
        options: opts,
        biasAnalysis
      });
    }
    
    // Step 9: Format results
    // Calculate temporal range
    const temporalRange = calculateTemporalRange(dataPoints);
    
    const result: FrequencyResult = {
      metadata: {
        totalSites: dataPoints.length + filteringReport.sitesFilteredOut,
        validSites: dataPoints.length,
        filteredSites: filteringReport.sitesFilteredOut,
        analysisDate: new Date().toISOString(),
        options: opts,
        temporalRange
      },
      
      headers: formatHeaderData(headerPatterns, dataPoints.length, opts),
      metaTags: formatMetaTagData(metaPatterns, dataPoints.length, opts),
      scripts: formatScriptData(scriptPatterns, dataPoints.length, opts),
      
      ...(recommendations && { recommendations }),
      filteringReport,
      biasAnalysis,
      semanticAnalysis,
      cooccurrenceAnalysis,
      patternDiscoveryAnalysis,
      ...(validationResults && { validationResults })
    };
    
    const duration = performance.now() - startTime;
    logger.info('Frequency analysis complete', { 
      durationMs: Math.round(duration),
      totalPatterns: Object.keys(result.headers).length + Object.keys(result.metaTags).length
    });
    
    // Step 9: Output results if file specified
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
  options: FrequencyOptionsWithDefaults
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
      // NOTE: This is a fundamental architectural issue - we need access to raw site counts
      // For now, sum the frequency of all patterns for this header as approximation
      const totalHeaderFrequency = patterns
        .filter(p => p.frequency >= options.minOccurrences / totalSites)
        .reduce((sum, p) => sum + p.frequency, 0);
      const uniqueSitesUsingHeader = Math.round(totalHeaderFrequency * totalSites);
      const headerFrequency = Math.min(1.0, uniqueSitesUsingHeader / totalSites);
      
      // Calculate aggregated page distribution for this header across all its values
      let aggregateMainpage = 0;
      let aggregateRobots = 0;
      let totalOccurrences = 0;
      
      for (const pattern of patterns) {
        if (pattern.pageDistribution) {
          const patternOccurrences = Math.round(pattern.frequency * totalSites);
          aggregateMainpage += pattern.pageDistribution.mainpage * patternOccurrences;
          aggregateRobots += pattern.pageDistribution.robots * patternOccurrences;
          totalOccurrences += patternOccurrences;
        }
      }
      
      const pageDistribution = totalOccurrences > 0 ? {
        mainpage: aggregateMainpage / totalOccurrences,
        robots: aggregateRobots / totalOccurrences
      } : undefined;
      
      result[headerName] = {
        frequency: headerFrequency,
        occurrences: uniqueSitesUsingHeader,
        totalSites,
        values,
        ...(pageDistribution && { pageDistribution })
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
  options: FrequencyOptionsWithDefaults
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
  options: FrequencyOptionsWithDefaults
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

/**
 * Calculate temporal range from data points
 */
function calculateTemporalRange(dataPoints: DetectionDataPoint[]) {
  if (dataPoints.length === 0) {
    return undefined;
  }
  
  // Filter out data points without valid timestamps
  const validTimestamps = dataPoints
    .filter(dp => dp.timestamp)
    .map(dp => new Date(dp.timestamp))
    .filter(date => !isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  
  // If no valid timestamps, return undefined
  if (validTimestamps.length === 0) {
    return undefined;
  }
  
  const earliest = validTimestamps[0];
  const latest = validTimestamps[validTimestamps.length - 1];
  
  // Calculate human-readable time span
  const timeDiff = latest.getTime() - earliest.getTime();
  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  let timeSpan: string;
  if (days === 0 && hours === 0) {
    timeSpan = 'less than 1 hour';
  } else if (days === 0) {
    timeSpan = `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else if (days === 1) {
    timeSpan = '1 day';
  } else if (days < 7) {
    timeSpan = `${days} days`;
  } else if (days < 30) {
    const weeks = Math.floor(days / 7);
    timeSpan = `${weeks} week${weeks !== 1 ? 's' : ''}`;
  } else if (days < 365) {
    const months = Math.floor(days / 30);
    timeSpan = `${months} month${months !== 1 ? 's' : ''}`;
  } else {
    const years = Math.floor(days / 365);
    timeSpan = `${years} year${years !== 1 ? 's' : ''}`;
  }
  
  return {
    earliestCapture: earliest.toISOString(),
    latestCapture: latest.toISOString(),
    timeSpan
  };
}