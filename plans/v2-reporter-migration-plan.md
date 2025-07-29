# V1 to V2 Reporter Migration Plan

## Overview

The V2 reporter currently has only basic frequency reporting and enhanced bias analysis. This plan migrates all V1 functionality to V2 while maintaining a simple, testable architecture without dependency injection.

## Migration Strategy

**Principle**: Each V1 section becomes a separate phase with its own formatter function. Keep the main `formatOutput` functions simple by delegating to section-specific formatters.

**Architecture**: 
- `formatAsHuman()`, `formatAsMarkdown()`, `formatAsCSV()` call section formatters
- Each section formatter is a pure function taking `FrequencyResult` and returning string
- Section formatters are independently testable
- No dependency injection - use direct imports and simple function calls

## Phase 1: Data Quality & Filtering Report

**Goal**: Add comprehensive data filtering and quality assessment reporting

### Implementation Tasks
- [ ] Add `formatFilteringReport()` function for human/markdown/csv output
- [ ] Support filtering report with reasons breakdown
- [ ] Add page-level filtering statistics
- [ ] Create comprehensive test for filtering report formatting

### V1 Features to Migrate
```typescript
// From V1 - Filtering Report section
if (filteringReport) {
    output += `## Data Quality Filtering
Sites filtered out: ${filteringReport.sitesFilteredOut}
Filter Reasons:`;
    for (const [reason, count] of Object.entries(filteringReport.filterReasons)) {
        if (count > 0) {
            output += `- ${reason}: ${count} sites\n`;
        }
    }
}
```

### Test Requirements
- Test filtering report with various filter reasons
- Test empty filtering report handling  
- Test CSV formatting of filter statistics
- Test markdown table formatting

### Expected Output
```
## Data Quality Filtering
Sites filtered out: 156
Filter Reasons:
- Invalid URLs: 23 sites
- Network errors: 45 sites
- Empty responses: 88 sites
```

## Phase 2: Enhanced Header Analysis

**Goal**: Migrate comprehensive header analysis with values, examples, and page distribution

### Implementation Tasks
- [ ] Add `formatHeadersSection()` function with top values display
- [ ] Add page distribution analysis (main vs robots.txt)
- [ ] Add unique values counting and display
- [ ] Add top value usage percentages with precision handling
- [ ] Create comprehensive header formatting tests

### V1 Features to Migrate
```typescript
// From V1 - Enhanced header display
const topValue = headerData.values[0];
const topValuePercent = topValue ? `${Math.round(topValue.frequency * 100)}%` : '0%';
const displayName = headerName.split(':')[0];

// Page distribution
let pageDistDisplay = 'N/A';
if (data.pageDistribution) {
    const mainPercent = Math.round(data.pageDistribution.mainpage * 100);
    const robotsPercent = Math.round(data.pageDistribution.robots * 100);
    pageDistDisplay = `${mainPercent}% main, ${robotsPercent}% robots`;
}
```

### Test Requirements  
- Test header formatting with various frequency ranges
- Test page distribution calculations
- Test top value percentage precision (<0.1%, 0.1%-1%, >1%)
- Test markdown table escaping for header values
- Test CSV header value escaping

### Expected Output
```
| Header | Frequency | Sites Using | Unique Values | Top Value | Page Distribution |
|--------|-----------|-------------|---------------|-----------|------------------|
| `server` | 89% | 4067/4569 | 156 | `nginx/1.18.0` (23%) | 95% main, 5% robots |
```

## Phase 3: Meta Tags Analysis

**Goal**: Add comprehensive meta tag analysis with examples and value diversity

### Implementation Tasks
- [ ] Add `formatMetaTagsSection()` function
- [ ] Add example value display for meta tags
- [ ] Add unique value counting for meta patterns
- [ ] Add frequency sorting and top-N display
- [ ] Create meta tag formatting tests

### V1 Features to Migrate
```typescript
// From V1 - Meta tag analysis
const sortedMetaTags = Object.entries(metaTags)
    .sort(([, a], [, b]) => b.frequency - a.frequency)
    .slice(0, 15); // Top 15

for (const [tagKey, data] of sortedMetaTags) {
    output += `### ${tagKey}
- Frequency: ${Math.round(data.frequency * 100)}% (${data.occurrences}/${data.totalSites} sites)
- Unique Values: ${(data.values || []).length}

Top Values:`;
    for (const value of data.values.slice(0, 5)) {
        output += `  - \`${value.value}\`: ${Math.round(value.frequency * 100)}% (${value.occurrences} sites)\n`;
    }
}
```

### Test Requirements
- Test meta tag sorting by frequency
- Test top values display with proper escaping
- Test unique value counting
- Test empty values handling
- Test markdown/CSV formatting

### Expected Output
```
### viewport
- Frequency: 87% (3978/4569 sites)  
- Unique Values: 45

Top Values:
  - `width=device-width, initial-scale=1`: 76% (3024 sites)
  - `width=device-width`: 8% (312 sites)
```

## Phase 4: Script Pattern Analysis

**Goal**: Migrate script pattern analysis with classification-based organization

### Implementation Tasks
- [ ] Add `formatScriptPatternsSection()` function
- [ ] Implement script classification system (path, library, tracking, etc.)
- [ ] Add script examples with proper escaping for code content
- [ ] Add per-classification tables and summaries
- [ ] Create script pattern formatting tests

### V1 Features to Migrate
```typescript
// From V1 - Script classification system
const classifications = {
    path: { title: 'Path Patterns', description: 'Script locations...' },
    library: { title: 'JavaScript Libraries', description: 'Popular libraries...' },
    tracking: { title: 'Analytics & Tracking', description: 'Analytics platforms...' },
    // ... other classifications
};

// Classification mapping
const scriptClassificationMap: Record<string, string> = {
    'inline-script': 'inline',
    'google-analytics': 'tracking', 
    'wordpress-scripts': 'path',
    // ... other mappings
};
```

### Test Requirements  
- Test script classification logic
- Test script examples formatting (code escaping)
- Test prefix-based pattern handling (`path:wp-content` -> `wp-content`)
- Test per-classification table generation
- Test script summary statistics

### Expected Output
```
### Path Patterns
*Script locations that indicate CMS structure*

| Pattern | Frequency | Sites Using | Example |
|---------|-----------|-------------|---------|
| `wp-content` | 34% | 1554/4569 | `/wp-content/themes/theme.js` |
```

## Phase 5: Recommendations System

**Goal**: Migrate comprehensive recommendation system for learn/detect-cms/ground-truth

### Implementation Tasks
- [ ] Add `formatRecommendationsSection()` function
- [ ] Implement learn command filter recommendations
- [ ] Add detect-CMS pattern recommendations  
- [ ] Add ground-truth rule recommendations
- [ ] Add confidence-based recommendation grouping
- [ ] Create recommendation formatting tests

### V1 Features to Migrate
```typescript
// From V1 - Recommendations with confidence grouping
const highConfidence = recommendations.learn.recommendToKeep.filter(rec => {
    if (biasAnalysis && biasAnalysis.headerCorrelations.has(rec.pattern)) {
        const correlation = biasAnalysis.headerCorrelations.get(rec.pattern)!;
        return correlation.recommendationConfidence === 'high';
    }
    return false;
});

// Transparency info with bias analysis integration
let transparencyInfo = '';
if (biasAnalysis && biasAnalysis.headerCorrelations.has(rec.pattern)) {
    const correlation = biasAnalysis.headerCorrelations.get(rec.pattern)!;
    const topCMS = Object.entries(correlation.cmsGivenHeader)
        .filter(([cms]) => !['Unknown', 'Enterprise', 'CDN'].includes(cms))
        .sort(([, a], [, b]) => b.probability - a.probability)[0];
    
    if (topCMS && topCMS[1].probability > 0.1) {
        transparencyInfo = ` | **${cmsCount}/${correlation.overallOccurrences} sites (${cmsPercent}%) are ${topCMS[0]}**`;
    }
}
```

### Test Requirements
- Test recommendation confidence grouping (high/medium/low)
- Test bias analysis integration with recommendations
- Test transparency calculations for CMS correlations
- Test learn/detect-cms/ground-truth recommendation sections
- Test recommendation tables with all columns

### Expected Output
```
#### High Confidence Recommendations (5)
*Headers with strong statistical support for CMS detection*

- **x-drupal-cache**: Strong platform specificity | **156/203 sites (77%) are Drupal**
```

## Phase 6: Co-occurrence Analytics  

**Goal**: Migrate comprehensive co-occurrence analysis with technology stacks and correlations

### Implementation Tasks
- [ ] Add `formatCooccurrenceSection()` function
- [ ] Add technology stack signatures display
- [ ] Add platform-specific header combinations
- [ ] Add high correlation pairs with mutual information
- [ ] Add mutually exclusive patterns detection
- [ ] Create co-occurrence formatting tests

### V1 Features to Migrate
```typescript
// From V1 - Technology stack signatures
for (const signature of cooccurrenceAnalysis.technologySignatures.slice(0, 10)) {
    output += `#### ${signature.name} Stack\n`;
    output += `- **Vendor**: ${signature.vendor}\n`;
    output += `- **Category**: ${signature.category}\n`;
    output += `- **Required Headers**: ${signature.requiredHeaders.join(', ')}\n`;
    output += `- **Sites**: ${signature.sites.length} sites\n`;
    output += `- **Confidence**: ${Math.round(signature.confidence * 100)}%\n`;
}

// High correlation pairs
const highCorrelationPairs = cooccurrenceAnalysis.cooccurrences
    .filter((h: HeaderCooccurrence) => h.mutualInformation > 0.3)
    .sort((a: HeaderCooccurrence, b: HeaderCooccurrence) => 
        b.mutualInformation - a.mutualInformation);
```

### Test Requirements
- Test technology stack signature formatting
- Test correlation pair calculations and sorting
- Test mutual information threshold filtering  
- Test platform combination analysis
- Test mutual exclusivity detection
- Test co-occurrence summary statistics

### Expected Output
```
### Technology Stack Signatures

| Name | Vendor | Category | Required Headers | Sites | Confidence |
|------|--------|----------|------------------|-------|------------|
| Cloudflare CDN | Cloudflare | CDN | cf-ray, cf-cache-status | 1234 | 89% |
```

## Phase 7: Semantic Analysis

**Goal**: Migrate semantic header analysis with categorization and vendor detection

### Implementation Tasks
- [ ] Add `formatSemanticAnalysisSection()` function
- [ ] Add header category distribution tables
- [ ] Add technology vendor analysis
- [ ] Add naming convention compliance
- [ ] Add pattern type distribution
- [ ] Add technology stack summary
- [ ] Create semantic analysis formatting tests

### V1 Features to Migrate
```typescript
// From V1 - Category distribution
const sortedCategories = semanticAnalysis.insights.topCategories.sort(
    (a, b) => b.count - a.count
);

for (const category of sortedCategories) {
    if (category.count > 0) {
        output += `- **${category.category}**: ${category.count} headers (${Math.round(category.percentage)}%)\n`;
    }
}

// Technology stack summary
if (semanticAnalysis.technologyStack.cdn && semanticAnalysis.technologyStack.cdn.length > 0) {
    output += `**CDN Services:** ${semanticAnalysis.technologyStack.cdn.join(', ')}\n`;
}
```

### Test Requirements
- Test category distribution calculations
- Test vendor analysis with percentage breakdowns
- Test naming convention compliance metrics
- Test technology stack confidence scoring
- Test vendor statistics and coverage metrics

### Expected Output
```
### Header Category Distribution

| Category | Headers | Percentage |
|----------|---------|------------|
| **Infrastructure** | 156 | 34% |
| **Security** | 89 | 19% |
| **CMS-Specific** | 67 | 15% |
```

## Phase 8: Pattern Discovery

**Goal**: Migrate pattern discovery analysis with emerging vendors and anomaly detection

### Implementation Tasks
- [ ] Add `formatPatternDiscoverySection()` function  
- [ ] Add discovered patterns with confidence scoring
- [ ] Add emerging vendor pattern detection
- [ ] Add pattern evolution trends analysis
- [ ] Add semantic anomalies detection
- [ ] Create pattern discovery formatting tests

### V1 Features to Migrate
```typescript
// From V1 - Discovered patterns
const topPatterns = patternDiscoveryAnalysis.discoveredPatterns
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 15);

for (const pattern of topPatterns) {
    output += `#### ${pattern.pattern} (${pattern.type})\n`;
    output += `- **Frequency**: ${Math.round(pattern.frequency * 100)}% (${pattern.sites.length} sites)\n`;
    output += `- **Confidence**: ${Math.round(pattern.confidence * 100)}%\n`;
    
    if (pattern.cmsCorrelation) {
        const topCms = Object.entries(pattern.cmsCorrelation)
            .filter(([cms]) => cms !== 'Unknown')
            .sort(([, a], [, b]) => b - a)[0];
        if (topCms && topCms[1] > 0.5) {
            output += `- **CMS Correlation**: ${Math.round(topCms[1] * 100)}% ${topCms[0]}\n`;
        }
    }
}
```

### Test Requirements
- Test pattern discovery sorting and confidence calculations
- Test emerging vendor detection algorithms
- Test pattern evolution trend analysis
- Test semantic anomaly detection with high confidence filtering
- Test CMS correlation calculations for discovered patterns

### Expected Output
```
#### x-varnish-* (prefix)
- **Frequency**: 12% (548 sites)
- **Confidence**: 87%
- **Potential Vendor**: Varnish Cache
- **CMS Correlation**: 67% WordPress
```

## Phase 9: Debug Mode & Calculation Transparency

**Goal**: Migrate debug mode with calculation audit trails and statistical transparency

### Implementation Tasks
- [ ] Add `formatDebugSection()` function for calculation transparency
- [ ] Add P(CMS|header) calculation details
- [ ] Add statistical threshold documentation
- [ ] Add bias warning integration with debug info
- [ ] Add sample size adequacy reporting
- [ ] Create debug mode formatting tests

### V1 Features to Migrate
```typescript
// From V1 - Debug mode calculation audit
if (options.debugCalculations && biasAnalysis) {
    output += `## 🔧 Debug Mode: Calculation Audit Trail

### Statistical Thresholds Applied
- **Minimum Sample Size**: 30 sites (for strict discriminative scoring)
- **Minimum CMS Concentration**: 40% (for discriminative headers)

### Header Correlation Details`;

    for (const [headerName, correlation] of biasAnalysis.headerCorrelations.entries()) {
        if (correlation.overallOccurrences >= 5) {
            output += `#### \`${headerName}\`
- **Sample Size**: ${correlation.overallOccurrences} sites
- **Platform Specificity**: ${(correlation.platformSpecificity * 100).toFixed(1)}%
- **Confidence Level**: ${correlation.recommendationConfidence}`;
        }
    }
}
```

### Test Requirements
- Test debug mode activation with debugCalculations flag
- Test statistical threshold documentation
- Test header correlation detail calculations
- Test bias warning integration in debug output
- Test sample size adequacy assessment

### Expected Output  
```
## 🔧 Debug Mode: Calculation Audit Trail

### Statistical Thresholds Applied
- **Minimum Sample Size**: 30 sites (for strict discriminative scoring)
- **Platform Specificity Algorithm**: Two-tier scoring system

#### `x-drupal-cache`
- **Sample size**: 203 sites (4.4% of dataset)
- **Platform Specificity**: 94.1%
- **Confidence Level**: high
```

## Implementation Guidelines

### Architecture Principles
1. **Pure Functions**: All section formatters are pure functions
2. **Simple Dependencies**: Use direct imports, no dependency injection
3. **Testable Units**: Each formatter function is independently testable  
4. **Clear Interfaces**: Consistent function signatures across formatters
5. **Error Handling**: Graceful degradation when data is missing

### Function Signature Pattern
```typescript
function formatSectionName(
    result: FrequencyResult, 
    format: 'human' | 'markdown' | 'csv'
): string {
    // Implementation
}
```

### Testing Strategy
```typescript
describe('formatSectionName', () => {
    it('formats human output correctly', () => {
        const result = createMockFrequencyResult();
        const output = formatSectionName(result, 'human');
        expect(output).toContain('expected content');
    });
    
    it('handles missing data gracefully', () => {
        const result = { ...createMockFrequencyResult(), sectionData: undefined };
        const output = formatSectionName(result, 'human');
        expect(output).toBe(''); // or appropriate fallback
    });
});
```

### Error Handling Pattern
```typescript
function formatSectionName(result: FrequencyResult, format: string): string {
    if (!result.sectionData) {
        return ''; // Graceful degradation
    }
    
    try {
        // Formatting logic
        return formattedContent;
    } catch (error) {
        logger.warn('Error formatting section', { section: 'sectionName', error });
        return ''; // Fail silently in production
    }
}
```

## Success Criteria

### Functional Requirements
- [ ] All V1 output sections reproduced in V2
- [ ] All output formats (human/markdown/csv) working
- [ ] Bias analysis integration maintained
- [ ] Debug mode fully functional
- [ ] Graceful handling of missing data

### Technical Requirements  
- [ ] Each phase independently testable
- [ ] No dependency injection complexity
- [ ] Pure function architecture maintained
- [ ] Error handling for missing data
- [ ] Performance equivalent to V1

### Quality Requirements
- [ ] Comprehensive test coverage for each phase
- [ ] Clear separation of formatting concerns
- [ ] Consistent function signatures
- [ ] Proper markdown/CSV escaping
- [ ] Statistical accuracy maintained

## Timeline Estimate

- **Phase 1 (Filtering)**: 1 day
- **Phase 2 (Headers)**: 1-2 days  
- **Phase 3 (Meta Tags)**: 1 day
- **Phase 4 (Scripts)**: 1-2 days
- **Phase 5 (Recommendations)**: 2-3 days
- **Phase 6 (Co-occurrence)**: 2-3 days
- **Phase 7 (Semantic)**: 2 days
- **Phase 8 (Pattern Discovery)**: 2-3 days
- **Phase 9 (Debug Mode)**: 1-2 days

**Total**: 2-3 weeks for complete V1 to V2 migration

## Next Steps

1. Start with Phase 1 (simplest section)
2. Validate approach with comprehensive tests
3. Apply pattern to remaining phases
4. Integration test with full frequency command
5. Performance comparison with V1
6. Deprecate V1 reporter once V2 is complete