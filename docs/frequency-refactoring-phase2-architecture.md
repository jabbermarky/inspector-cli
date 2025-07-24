# Frequency Analysis Refactoring - Phase 2 Architectural Design

## Executive Summary

This document presents the architectural design for fixing the frequency analysis system's fundamental counting methodology inconsistencies identified in Phase 1. The design standardizes on unique site counting, implements single-point filtering, and ensures data consistency across all components.

## Design Principles

1. **Single Source of Truth**: All data flows through unified preprocessing
2. **Consistent Counting**: Unique site counting across all analyzers
3. **Single Filtering**: Apply filters once at the appropriate stage
4. **Testable Architecture**: Enable end-to-end validation without heavy mocking
5. **Minimal Disruption**: Preserve existing API contracts where possible

## Architecture Overview

### Current Architecture (Problematic)
```
Raw Data → Individual Analyzers (4 different methodologies) → Reporter → Inconsistent Output
```

### New Architecture (Proposed)
```
Raw Data → Data Preprocessor → Standardized Analyzers → Unified Aggregator → Consistent Output
```

## Core Components

### 1. Data Preprocessor (New)

**Purpose**: Transform raw CMS data into standardized format for all analyzers

```typescript
interface PreprocessedData {
  sites: Map<string, SiteData>;
  totalSites: number;
  metadata: {
    dateRange?: DateRange;
    version: string;
  };
}

interface SiteData {
  url: string;
  cms: string;
  headers: Map<string, Set<string>>;      // header name → values
  metaTags: Map<string, Set<string>>;     // meta name → values  
  scripts: Set<string>;                    // script URLs
  technologies: Set<string>;               // detected tech stack
}
```

**Key Features**:
- Deduplicates data at source
- Normalizes URLs for consistent site identification
- Pre-structures data for efficient analysis
- Single loading point for all analyzers

### 2. Standardized Analyzer Interface

**All analyzers MUST implement**:

```typescript
interface FrequencyAnalyzer<T> {
  analyze(data: PreprocessedData, options: AnalysisOptions): AnalysisResult<T>;
}

interface AnalysisResult<T> {
  patterns: Map<string, PatternData>;
  totalSites: number;
  metadata: AnalysisMetadata;
}

interface PatternData {
  pattern: string;
  siteCount: number;              // PRIMARY metric
  sites: Set<string>;             // Which sites have this
  frequency: number;              // siteCount / totalSites
  examples?: Set<string>;         // Example values
  occurrenceCount?: number;       // Optional diagnostic metric
}
```

### 3. Refactored Analyzers

#### HeaderAnalyzer (Complete Rewrite Required)

**Current (Broken)**:
- Counts occurrences across all page loads
- No site deduplication
- Frequency based on occurrence count

**New Design**:
```typescript
class HeaderAnalyzer implements FrequencyAnalyzer<HeaderPattern> {
  analyze(data: PreprocessedData, options: AnalysisOptions) {
    const patterns = new Map<string, PatternData>();
    
    // Process each site ONCE
    for (const [siteUrl, siteData] of data.sites) {
      for (const [headerName, values] of siteData.headers) {
        if (this.shouldSkipHeader(headerName)) continue;
        
        // Get or create pattern data
        let pattern = patterns.get(headerName) || {
          pattern: headerName,
          siteCount: 0,
          sites: new Set<string>(),
          frequency: 0,
          examples: new Set<string>()
        };
        
        // Count this site (deduplication automatic via Set)
        pattern.sites.add(siteUrl);
        pattern.siteCount = pattern.sites.size;
        
        // Track examples
        for (const value of values) {
          if (pattern.examples.size < 5) {
            pattern.examples.add(value);
          }
        }
        
        patterns.set(headerName, pattern);
      }
    }
    
    // Calculate frequencies and apply filtering
    return this.finalizeResults(patterns, data.totalSites, options);
  }
}
```

#### MetaAnalyzer (Minor Fix Required)

**Current Issues**:
- Double filtering bug
- Otherwise correct counting

**Fix**: Remove filtering from collection phase, apply only in finalization

#### ScriptAnalyzer & BiasDetector (Reference Implementations)

**No changes required** - These already implement correct patterns

### 4. Unified Aggregator (Replaces current analyzer.ts coordination)

```typescript
class FrequencyAggregator {
  constructor(
    private preprocessor: DataPreprocessor,
    private analyzers: Map<string, FrequencyAnalyzer<any>>
  ) {}
  
  async analyze(options: FrequencyOptions): Promise<AggregatedResults> {
    // Single data load
    const data = await this.preprocessor.load(options);
    
    // Run all analyzers with same preprocessed data
    const results = new Map<string, AnalysisResult<any>>();
    for (const [name, analyzer] of this.analyzers) {
      results.set(name, await analyzer.analyze(data, options));
    }
    
    // Aggregate with guaranteed consistency
    return this.aggregate(results, options);
  }
}
```

### 5. Filtering Strategy

**Single-Point Filtering Rules**:

1. **Semantic Filtering** (during analysis):
   - Skip non-informative patterns (e.g., 'date' header)
   - Apply domain-specific rules

2. **Threshold Filtering** (after analysis):
   - Apply `minOccurrences` to `siteCount` (not occurrences)
   - Convert to frequency threshold: `minFrequency = minOccurrences / totalSites`
   - Filter patterns where `frequency < minFrequency`

3. **No Double Filtering**:
   - Remove all filtering from formatters
   - Filtering happens ONCE in analyzer finalization

## Migration Strategy

### Phase 2.1: Create New Components
1. Implement `DataPreprocessor`
2. Create `FrequencyAnalyzer` interface
3. Build `FrequencyAggregator`

### Phase 2.2: Migrate Analyzers
1. Rewrite `HeaderAnalyzer` completely
2. Fix `MetaAnalyzer` double filtering
3. Adapt `ScriptAnalyzer` to new interface (minimal changes)
4. Adapt `BiasDetector` to new interface (minimal changes)

### Phase 2.3: Integration
1. Replace current `analyzer.ts` coordination with `FrequencyAggregator`
2. Update `reporter.ts` to use consistent data
3. Maintain backward compatibility at CLI level

## Testing Architecture

### Unit Tests
- Test each analyzer with preprocessed data fixtures
- Verify counting methodology per analyzer
- Validate filtering logic separately

### Integration Tests  
```typescript
describe('Cross-Component Consistency', () => {
  it('should report same count for pattern across all tables', async () => {
    const results = await aggregator.analyze(options);
    
    // Example: x-pingback header
    const headerCount = results.headers.get('x-pingback')?.siteCount;
    const biasCount = results.recommendations
      .find(r => r.pattern === 'x-pingback')?.totalSites;
    
    expect(headerCount).toBe(biasCount);
  });
});
```

### End-to-End Tests
- Use real data samples
- Verify mathematical relationships
- No heavy mocking - test actual integration

## Success Metrics

1. **Consistency**: Same pattern shows identical counts across all analyses
2. **Mathematical Validity**: No impossible relationships (e.g., subset > superset)
3. **Performance**: Analysis completes in < 5 seconds for 10,000 sites
4. **Maintainability**: Single place to change counting methodology
5. **Testability**: Can validate without mocking core logic

## Example: Fixed x-pingback Case

**Current (Broken)**:
- Headers table: 5/4569 sites (0.1%)
- Recommendations: 124/132 WordPress sites (93.9%)
- **Impossible**: 5 < 124

**After Fix**:
- Headers table: 132/4569 sites (2.9%)
- Recommendations: 124/132 WordPress sites (93.9%)
- **Valid**: 132 total, 124 are WordPress

## Risk Mitigation

1. **API Changes**: Maintain existing CLI interface
2. **Performance**: Preprocessor caches data in memory
3. **Backward Compatibility**: Keep existing output formats
4. **Data Loss**: Preserve diagnostic metrics (occurrence counts) as optional

## Next Steps

1. **Review and approve** this architectural design
2. **Create detailed implementation plan** for Phase 3
3. **Build proof-of-concept** for DataPreprocessor
4. **Validate approach** with sample data

## Appendix: Data Flow Diagram

```
[CMS JSON Files]
       ↓
[DataPreprocessor]
   - Load files
   - Deduplicate by site
   - Structure data
       ↓
[PreprocessedData]
    ↓  ↓  ↓  ↓
[Header] [Meta] [Script] [Bias]
[Analyzer] [Analyzer] [Analyzer] [Detector]
    ↓  ↓  ↓  ↓
[Standardized Results]
       ↓
[FrequencyAggregator]
   - Combine results
   - Ensure consistency
       ↓
[Reporter]
   - Format output
   - Generate tables
       ↓
[Consistent Output]
```

This architecture ensures that all components work with the same deduplicated site data, use the same counting methodology, and produce mathematically consistent results.