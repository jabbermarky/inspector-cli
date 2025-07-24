/**
 * FrequencyAggregator - Phase 3 implementation
 * Coordinates all analyzers with unified data and consistent results
 */

import type { 
  FrequencyAnalyzer,
  PreprocessedData,
  AnalysisOptions,
  AggregatedResults,
  BiasAnalysisResult,
  FrequencySummary,
  PatternSummary
} from './types/analyzer-interface.js';
import { DataPreprocessor } from './data-preprocessor.js';
import { HeaderAnalyzerV2 } from './analyzers/header-analyzer-v2.js';
import { MetaAnalyzerV2 } from './analyzers/meta-analyzer-v2.js';
import { ScriptAnalyzerV2 } from './analyzers/script-analyzer-v2.js';
import { createModuleLogger } from '../utils/logger.js';
import type { FrequencyOptions } from './types.js';

const logger = createModuleLogger('frequency-aggregator');

export class FrequencyAggregator {
  private preprocessor: DataPreprocessor;
  private analyzers: Map<string, FrequencyAnalyzer<any>>;

  constructor(dataPath?: string) {
    this.preprocessor = new DataPreprocessor(dataPath);
    
    // Initialize analyzers
    this.analyzers = new Map();
    this.analyzers.set('headers', new HeaderAnalyzerV2());
    this.analyzers.set('metaTags', new MetaAnalyzerV2());
    this.analyzers.set('scripts', new ScriptAnalyzerV2());
    // TODO: Add TechAnalyzerV2 when implemented
  }

  /**
   * Run frequency analysis with all analyzers
   */
  async analyze(options: FrequencyOptions): Promise<AggregatedResults> {
    logger.info('Starting aggregated frequency analysis', {
      analyzers: Array.from(this.analyzers.keys()),
      minOccurrences: options.minOccurrences
    });

    const startTime = Date.now();

    // Convert FrequencyOptions to internal format
    const analysisOptions: AnalysisOptions = {
      minOccurrences: options.minOccurrences || 10,
      includeExamples: true,
      maxExamples: 5,
      semanticFiltering: false // Temporarily disable to see all patterns
    };

    // Load and preprocess data once
    const preprocessedData = await this.preprocessor.load({
      dateRange: options.dateRange ? {
        start: options.dateRange.start ? new Date(options.dateRange.start) : undefined,
        end: options.dateRange.end ? new Date(options.dateRange.end) : undefined
      } : undefined,
      forceReload: false
    });

    logger.info(`Analyzing ${preprocessedData.totalSites} unique sites`);

    // Debug: Check if we actually have data
    if (preprocessedData.sites.size === 0) {
      logger.warn('No sites loaded from preprocessor');
    } else {
      const firstSite = Array.from(preprocessedData.sites.values())[0];
      logger.info('Sample site data', {
        url: firstSite.url,
        headerCount: firstSite.headers.size,
        metaTagCount: firstSite.metaTags.size
      });
    }

    // Run all analyzers with the same data
    const headerResult = await this.analyzers.get('headers')!.analyze(preprocessedData, analysisOptions);
    const metaResult = await this.analyzers.get('metaTags')!.analyze(preprocessedData, analysisOptions);
    const scriptResult = await this.analyzers.get('scripts')!.analyze(preprocessedData, analysisOptions);

    logger.info('Analyzer results', {
      headerPatterns: headerResult.patterns.size,
      metaPatterns: metaResult.patterns.size,
      scriptPatterns: scriptResult.patterns.size
    });

    // TODO: Run tech analyzers when implemented
    // const techResult = await this.analyzers.get('technologies')!.analyze(preprocessedData, analysisOptions);

    // TODO: Run bias detector when implemented
    const biasResult: BiasAnalysisResult = {
      recommendations: [],
      metadata: {
        analyzer: 'BiasDetector',
        analyzedAt: new Date().toISOString(),
        totalPatternsFound: 0,
        totalPatternsAfterFiltering: 0,
        options: analysisOptions
      }
    };

    // Create summary
    const summary = this.createSummary(
      preprocessedData,
      headerResult,
      metaResult,
      scriptResult,
      null  // techResult
    );

    const duration = Date.now() - startTime;
    logger.info(`Aggregated analysis completed in ${duration}ms`);

    return {
      headers: headerResult,
      metaTags: metaResult,
      scripts: scriptResult,
      technologies: null as any, // TODO: Replace with actual result
      correlations: biasResult,
      summary
    };
  }

  /**
   * Create summary of analysis results
   */
  private createSummary(
    data: PreprocessedData,
    headerResult: any,
    metaResult: any,
    scriptResult: any,
    techResult: any
  ): FrequencySummary {
    const topN = 10;

    // Get top patterns from each analyzer
    const topHeaders = this.getTopPatterns(headerResult, topN);
    const topMeta = this.getTopPatterns(metaResult, topN);
    const topScripts = this.getTopPatterns(scriptResult, topN);
    const topTech: PatternSummary[] = []; // TODO: Implement when tech analyzer is ready

    return {
      totalSitesAnalyzed: data.totalSites,
      totalPatternsFound: 
        headerResult.metadata.totalPatternsFound +
        metaResult.metadata.totalPatternsFound +
        (scriptResult?.metadata.totalPatternsFound || 0),
      analysisDate: new Date().toISOString(),
      filteringStats: data.filteringStats,
      topPatterns: {
        headers: topHeaders,
        metaTags: topMeta,
        scripts: topScripts,
        technologies: topTech
      }
    };
  }

  /**
   * Get top N patterns from analysis result
   */
  private getTopPatterns(result: any, n: number): PatternSummary[] {
    if (!result?.patterns) return [];

    return Array.from(result.patterns.values())
      .slice(0, n)
      .map((pattern: any) => ({
        pattern: pattern.pattern,
        siteCount: pattern.siteCount,
        frequency: pattern.frequency
      }));
  }

  /**
   * Clear preprocessor cache
   */
  clearCache(): void {
    this.preprocessor.clearCache();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { entries: number; keys: string[] } {
    return this.preprocessor.getCacheStats();
  }
}

// Factory function for backward compatibility
export function createFrequencyAggregator(dataPath?: string): FrequencyAggregator {
  return new FrequencyAggregator(dataPath);
}