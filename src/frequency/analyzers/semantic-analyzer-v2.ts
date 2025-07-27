/**
 * SemanticAnalyzerV2 - Phase 3 implementation
 * Provides semantic analysis of headers, vendor detection, and technology classification
 */

import type { 
  FrequencyAnalyzer, 
  PreprocessedData, 
  AnalysisOptions, 
  AnalysisResult, 
  PatternData
} from '../types/analyzer-interface.js';
import { 
  batchAnalyzeHeaders, 
  generateSemanticInsights,
  type HeaderSemanticAnalysis,
  type SemanticInsights,
  type HeaderPrimaryCategory
} from '../semantic-analyzer.js';
import type { VendorSpecificData } from './vendor-analyzer-v2.js';
// Import V1 types for compatibility
import type {
  VendorStats,
  TechnologyStack
} from '../vendor-patterns.js';
import { createModuleLogger } from '../../utils/logger.js';

const logger = createModuleLogger('semantic-analyzer-v2');

export interface SemanticSpecificData {
  semanticAnalyses: Map<string, HeaderSemanticAnalysis>;
  insights: SemanticInsights;
  vendorStats: VendorStats;
  technologyStack: TechnologyStack;
  categoryPatterns: Map<HeaderPrimaryCategory, CategoryPattern>;
  vendorPatterns: Map<string, VendorPattern>;
}

export interface CategoryPattern {
  category: HeaderPrimaryCategory;
  headerCount: number;
  frequency: number;
  examples: string[];
  topVendors: string[];
  confidence: number;
}

export interface VendorPattern {
  vendor: string;
  headerCount: number;
  frequency: number;
  examples: string[];
  categories: string[]; // Allow both primary and secondary categories
  confidence: number;
}

export class SemanticAnalyzerV2 implements FrequencyAnalyzer<SemanticSpecificData> {
  private vendorData?: VendorSpecificData;
  
  getName(): string {
    return 'SemanticAnalyzerV2';
  }
  
  /**
   * Inject vendor analysis results for dependency resolution
   */
  setVendorData(vendorData: VendorSpecificData): void {
    this.vendorData = vendorData;
  }

  async analyze(
    data: PreprocessedData, 
    options: AnalysisOptions
  ): Promise<AnalysisResult<SemanticSpecificData>> {
    logger.info('Starting semantic analysis V2', {
      totalSites: data.totalSites,
      minOccurrences: options.minOccurrences
    });

    const startTime = Date.now();

    // Step 1: Extract unique headers from all sites
    const uniqueHeaders = this.extractUniqueHeaders(data);
    logger.info('Extracted unique headers', { count: uniqueHeaders.length });

    // Step 2: Perform batch semantic analysis using V1 logic
    const semanticAnalyses = batchAnalyzeHeaders(uniqueHeaders);
    const insights = generateSemanticInsights(semanticAnalyses);

    // Step 3: Use vendor analysis from injected vendor data
    const vendorStats = this.vendorData?.vendorStats || this.createFallbackVendorStats(uniqueHeaders);
    const technologyStack = this.vendorData?.technologyStack || this.createFallbackTechnologyStack();

    // Step 4: Create V2-specific pattern aggregations
    const categoryPatterns = this.createCategoryPatterns(semanticAnalyses, data, options);
    const vendorPatterns = this.createVendorPatterns(semanticAnalyses, vendorStats, data, options);

    // Step 5: Create standard V2 patterns for compatibility
    const patterns = this.createSemanticPatterns(semanticAnalyses, data, options);

    const duration = Date.now() - startTime;
    logger.info('Semantic analysis V2 completed', {
      duration,
      patterns: patterns.size,
      categories: categoryPatterns.size,
      vendors: vendorPatterns.size
    });

    return {
      patterns,
      totalSites: data.totalSites,
      metadata: {
        analyzer: this.getName(),
        analyzedAt: new Date().toISOString(),
        totalPatternsFound: patterns.size,
        totalPatternsAfterFiltering: patterns.size, // No filtering for semantic data
        options
      },
      analyzerSpecific: {
        semanticAnalyses,
        insights,
        vendorStats,
        technologyStack,
        categoryPatterns,
        vendorPatterns
      }
    };
  }

  /**
   * Extract unique headers from all preprocessed sites
   */
  private extractUniqueHeaders(data: PreprocessedData): string[] {
    // ARCHITECTURAL FIX: Prioritize validated headers when available
    if (data.metadata.validation?.validatedHeaders) {
      logger.info('Using validated headers for semantic analysis', {
        validatedCount: data.metadata.validation.validatedHeaders.size,
        qualityScore: data.metadata.validation.qualityScore
      });
      
      // Use only high-quality, statistically validated headers
      return Array.from(data.metadata.validation.validatedHeaders.keys()).sort();
    }
    
    // Fallback to extracting from all sites if no validation data
    logger.warn('No validated headers available, falling back to raw extraction');
    const headerSet = new Set<string>();
    
    for (const [_, siteData] of data.sites) {
      for (const [headerName, _] of siteData.headers) {
        headerSet.add(headerName.toLowerCase());
      }
    }
    
    return Array.from(headerSet).sort();
  }

  /**
   * Create category-based patterns for V2 compatibility
   */
  private createCategoryPatterns(
    analyses: Map<string, HeaderSemanticAnalysis>,
    data: PreprocessedData,
    options: AnalysisOptions
  ): Map<HeaderPrimaryCategory, CategoryPattern> {
    const categoryPatterns = new Map<HeaderPrimaryCategory, CategoryPattern>();
    
    // Group headers by category
    const headersByCategory = new Map<HeaderPrimaryCategory, string[]>();
    for (const [headerName, analysis] of analyses) {
      const category = analysis.category.primary;
      if (!headersByCategory.has(category)) {
        headersByCategory.set(category, []);
      }
      headersByCategory.get(category)!.push(headerName);
    }

    // Create patterns for each category
    for (const [category, headers] of headersByCategory) {
      if (headers.length < options.minOccurrences) continue;

      // Count sites using headers in this category
      const sitesWithCategory = this.countSitesWithAnyHeader(headers, data);
      
      // Get top vendors for this category
      const categoryVendors = new Map<string, number>();
      for (const headerName of headers) {
        const analysis = analyses.get(headerName);
        if (analysis?.category.vendor) {
          categoryVendors.set(
            analysis.category.vendor,
            (categoryVendors.get(analysis.category.vendor) || 0) + 1
          );
        }
      }
      
      const topVendors = Array.from(categoryVendors.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([vendor, _]) => vendor);

      categoryPatterns.set(category, {
        category,
        headerCount: headers.length,
        frequency: sitesWithCategory / data.totalSites,
        examples: headers.slice(0, 5),
        topVendors,
        confidence: Math.min(1.0, headers.length / 10) // Higher confidence with more headers
      });
    }

    return categoryPatterns;
  }

  /**
   * Create vendor-based patterns for V2 compatibility
   */
  private createVendorPatterns(
    analyses: Map<string, HeaderSemanticAnalysis>,
    vendorStats: VendorStats,
    data: PreprocessedData,
    options: AnalysisOptions
  ): Map<string, VendorPattern> {
    const vendorPatterns = new Map<string, VendorPattern>();

    for (const vendorData of vendorStats.vendorDistribution) {
      // Count sites using this vendor's headers
      const sitesWithVendor = this.countSitesWithAnyHeader(vendorData.headers, data);
      
      // Check if vendor appears on enough sites (not header types)
      if (sitesWithVendor < options.minOccurrences) continue;

      // Get categories for this vendor (including secondary categories)
      const vendorCategories = new Set<string>();
      for (const headerName of vendorData.headers) {
        const analysis = analyses.get(headerName);
        if (analysis) {
          vendorCategories.add(analysis.category.primary);
          // Add secondary categories if they exist
          if (analysis.category.secondary) {
            for (const secondaryCategory of analysis.category.secondary) {
              vendorCategories.add(secondaryCategory);
            }
          }
        }
      }

      vendorPatterns.set(vendorData.vendor, {
        vendor: vendorData.vendor,
        headerCount: vendorData.headerCount,
        frequency: sitesWithVendor / data.totalSites,
        examples: vendorData.headers.slice(0, 5),
        categories: Array.from(vendorCategories),
        confidence: Math.min(1.0, vendorData.headerCount / 5) // Higher confidence with more headers
      });
    }

    return vendorPatterns;
  }

  /**
   * Create standard V2 patterns for each semantic category
   */
  private createSemanticPatterns(
    analyses: Map<string, HeaderSemanticAnalysis>,
    data: PreprocessedData,
    options: AnalysisOptions
  ): Map<string, PatternData> {
    const patterns = new Map<string, PatternData>();

    // Group by category and create patterns
    const categoryGroups = new Map<HeaderPrimaryCategory, string[]>();
    for (const [headerName, analysis] of analyses) {
      const category = analysis.category.primary;
      if (!categoryGroups.has(category)) {
        categoryGroups.set(category, []);
      }
      categoryGroups.get(category)!.push(headerName);
    }

    for (const [category, headers] of categoryGroups) {
      if (headers.length < options.minOccurrences) continue;

      const sitesWithCategory = this.countSitesWithAnyHeader(headers, data);
      const sitesSet = this.getSitesWithAnyHeader(headers, data);

      patterns.set(`category:${category}`, {
        pattern: `category:${category}`,
        siteCount: sitesWithCategory,
        sites: sitesSet,
        frequency: sitesWithCategory / data.totalSites,
        examples: new Set(headers.slice(0, 5).map(h => `header:${h}`)),
        metadata: {
          category,
          headerCount: headers.length,
          semanticType: 'category'
        }
      });
    }

    return patterns;
  }

  /**
   * Count sites that have any of the specified headers
   */
  private countSitesWithAnyHeader(headers: string[], data: PreprocessedData): number {
    let count = 0;
    for (const [_, siteData] of data.sites) {
      const hasAnyHeader = headers.some(header => 
        siteData.headers.has(header) || siteData.headers.has(header.toLowerCase())
      );
      if (hasAnyHeader) count++;
    }
    return count;
  }

  /**
   * Get set of sites that have any of the specified headers
   */
  private getSitesWithAnyHeader(headers: string[], data: PreprocessedData): Set<string> {
    const sites = new Set<string>();
    for (const [siteUrl, siteData] of data.sites) {
      const hasAnyHeader = headers.some(header => 
        siteData.headers.has(header) || siteData.headers.has(header.toLowerCase())
      );
      if (hasAnyHeader) {
        sites.add(siteUrl);
      }
    }
    return sites;
  }

  /**
   * Create fallback vendor stats when vendor data is not available
   */
  private createFallbackVendorStats(headers: string[]): VendorStats {
    // Basic fallback - minimal vendor stats
    return {
      totalHeaders: headers.length,
      vendorHeaders: 0,
      vendorCoverage: 0,
      vendorDistribution: [],
      categoryDistribution: {}
    };
  }

  /**
   * Create fallback technology stack when vendor data is not available
   */
  private createFallbackTechnologyStack(): TechnologyStack {
    return {
      confidence: 0.1 // Low confidence fallback
    };
  }
}

// Export factory function for backward compatibility
export function createSemanticAnalyzer(): SemanticAnalyzerV2 {
  return new SemanticAnalyzerV2();
}