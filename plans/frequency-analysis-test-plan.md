# Frequency Analysis Test Coverage Plan

## Overview

This document provides a systematic test plan for the frequency analysis module based on identified coverage gaps. The plan addresses critical integration testing gaps that allowed production bugs to slip through unit testing.

## Critical Gap Analysis

### 1. Integration Testing Gap (CRITICAL)
**Issue**: Production bug showed "0 headers with semantic classification" despite passing unit tests
**Root Cause**: Unit tests mock everything, missing real integration flows
**Impact**: High - production functionality failures

### 2. Missing Test Files
- `bias-detector.ts` - No test file exists
- `cms-enhanced-script-analyzer.ts` - No test file exists  
- `index.ts` - No test file exists
- `types.ts` - No test file exists (interface definitions)

### 3. Insufficient Integration Coverage
- `analyzer.ts` - Main orchestration logic needs end-to-end tests
- Semantic analysis flow (analyzer → header-analyzer → semantic-analyzer)
- Data flow between modules (Map objects, serialization)

## Test Plan Structure

### Phase 1: Critical Integration Tests (High Priority)

#### 1.1 Analyzer Integration Tests
**File**: `src/frequency/__tests__/analyzer.integration.test.ts`

**Test Cases**:
```typescript
describe('Analyzer Integration', () => {
  // Test real data flow through semantic analysis
  it('should perform complete semantic analysis with real data', async () => {
    // Use minimal real data, not mocks
    // Verify headerAnalyses Map contains actual results
    // Verify percentage calculations are correct
  });
  
  // Test Map object handling throughout the pipeline
  it('should properly handle Map objects in data pipeline', async () => {
    // Verify Maps are created, populated, and serialized correctly
    // Test the specific bug: Array.from(headerPatterns.keys())
  });
  
  // Test with different data volumes
  it('should handle various data volumes correctly', async () => {
    // Test with 0, 1, 10, 100+ sites
    // Verify percentage calculations at each scale
  });
});
```

#### 1.2 Semantic Analysis Flow Tests  
**File**: `src/frequency/__tests__/semantic-flow.integration.test.ts`

**Test Cases**:
```typescript
describe('Semantic Analysis Integration Flow', () => {
  // Test complete flow from headers to insights
  it('should analyze headers through complete semantic pipeline', async () => {
    // Real headers → header-analyzer → semantic-analyzer → insights
    // Verify non-zero results at each step
  });
  
  // Test vendor detection integration
  it('should detect vendors through complete analysis chain', async () => {
    // Test WordPress, Cloudflare, etc. headers
    // Verify vendor stats generation
  });
});
```

### Phase 2: Missing Module Tests (High Priority)

#### 2.1 Bias Detector Tests
**File**: `src/frequency/__tests__/bias-detector.test.ts`

**Test Coverage**:
- Dataset composition analysis
- CMS bias detection  
- Temporal bias detection
- Geographic bias detection (if applicable)
- Confidence scoring

#### 2.2 CMS Enhanced Script Analyzer Tests
**File**: `src/frequency/__tests__/cms-enhanced-script-analyzer.test.ts`

**Test Coverage**:
- Script pattern detection
- CMS-specific script identification
- Frequency calculation accuracy
- Error handling for malformed scripts

#### 2.3 Bias-Aware Recommender Test Overhaul (CRITICAL)
**File**: `src/frequency/__tests__/recommender-bias-aware.test.ts`

**CRITICAL ISSUES IDENTIFIED**:
- ❌ Hardcoded platformSpecificity values (0.75) don't match calculations (0.385)
- ❌ 13+ instances of fabricated test data instead of real calculations
- ❌ Missing platforms (Duda, Shopify, etc.) in coefficient of variation calculations
- ❌ No validation against external ground truth data
- ❌ Test creates false confidence by using incorrect mathematical values

**Required Test Additions**:

```typescript
describe('Mathematical Calculation Validation', () => {
  it('should calculate platform specificity using real coefficient of variation formula', () => {
    // Test with known input data
    const perCMSFrequency = {
      'Joomla': { frequency: 0.88 },
      'WordPress': { frequency: 0.40 },
      'Drupal': { frequency: 0.43 }
    };
    
    // Let the real function calculate - NO HARDCODED VALUES
    const result = calculatePlatformSpecificity(perCMSFrequency);
    
    // Verify against manual calculation: (0.2195 / 0.57) = 0.385
    expect(result).toBeCloseTo(0.385, 2);
    expect(result).not.toEqual(0.75); // Expose the hardcoded value error
  });

  it('should include ALL platforms in specificity calculations', () => {
    const perCMSFrequency = {
      'Joomla': { frequency: 0.88 },
      'WordPress': { frequency: 0.40 },
      'Drupal': { frequency: 0.43 },
      'Duda': { frequency: 0.30 },
      'Shopify': { frequency: 0.35 },
      'Unknown': { frequency: 0.25 }
    };
    
    const result = calculatePlatformSpecificity(perCMSFrequency);
    
    // With more platforms, specificity should be ~0.47, not 0.385
    expect(result).toBeCloseTo(0.47, 2);
  });
});

describe('Ground Truth Validation', () => {
  it('should validate universal headers against external data', () => {
    // Test set-cookie against webtechsurvey.com data showing 21M+ sites use it
    const setCookieCorrelation = analyzeHeader('set-cookie', realWorldData);
    
    // Should be flagged as universal, not platform-specific
    expect(setCookieCorrelation.isUniversal).toBe(true);
    expect(setCookieCorrelation.platformSpecificity).toBeLessThan(0.6);
    expect(setCookieCorrelation.recommendAction).toBe('filter');
  });

  it('should validate platform-specific headers correctly', () => {
    // Test x-pingback which is genuinely WordPress-specific
    const xPingbackCorrelation = analyzeHeader('x-pingback', realWorldData);
    
    expect(xPingbackCorrelation.isUniversal).toBe(false);
    expect(xPingbackCorrelation.platformSpecificity).toBeGreaterThan(0.8);
    expect(xPingbackCorrelation.recommendAction).toBe('keep');
  });
});

describe('Dataset Bias Detection', () => {
  it('should detect sampling bias in frequency data', () => {
    // Test case where high Joomla representation skews set-cookie frequency
    const biasedDataset = createBiasedDataset({
      'Joomla': 70,    // Overrepresented
      'WordPress': 15,
      'Drupal': 15
    });
    
    const bias = detectDatasetBias(biasedDataset);
    
    expect(bias.concentrationScore).toBeGreaterThan(0.6);
    expect(bias.biasWarnings).toContain('Dataset heavily skewed toward Joomla');
    expect(bias.recommendationConfidence).toBe('low');
  });
});

describe('Realistic Test Data Generation', () => {
  it('should use calculated values not hardcoded ones', () => {
    // Generate test data by running real calculation functions
    const testData = generateTestData({
      platforms: ['WordPress', 'Drupal', 'Joomla', 'Duda', 'Shopify'],
      headerFrequencies: {
        'set-cookie': { WordPress: 0.95, Drupal: 0.92, Joomla: 0.88, Duda: 0.85, Shopify: 0.90 }
      }
    });
    
    // Verify calculations match expected mathematical results
    expect(testData.platformSpecificity).toBeCloseTo(0.08, 2); // Universal header
    expect(testData.recommendAction).toBe('filter');
  });
});

describe('Confidence Interval Testing', () => {
  it('should adjust confidence based on dataset size', () => {
    const smallDataset = generateTestData({ siteCount: 10 });
    const largeDataset = generateTestData({ siteCount: 1000 });
    
    expect(smallDataset.recommendationConfidence).toBe('low');
    expect(largeDataset.recommendationConfidence).toBe('high');
  });
});
```

**Test Data Strategy Overhaul**:
```typescript
// NEVER use hardcoded platformSpecificity values
// ALWAYS calculate using real functions

// ❌ WRONG - Fabricated data
const badTest = {
  platformSpecificity: 0.75 // Hardcoded lie
};

// ✅ RIGHT - Real calculation
const goodTest = {
  perCMSFrequency: realFrequencyData,
  // Let calculatePlatformSpecificity() determine the value
};
```

### Phase 3: Edge Case and Error Handling (Medium Priority)

#### 3.1 Data Validation Tests
**Test Cases**:
- Empty datasets
- Malformed data points
- Missing required fields
- Invalid date ranges
- Corrupted JSON files

#### 3.2 Serialization Tests
**Test Cases**:
- Map to JSON conversion
- Large data structure serialization
- Unicode/special character handling
- Memory usage with large datasets

### Phase 4: Performance and Scale Tests (Medium Priority)

#### 4.1 Performance Tests
**Test Cases**:
- Processing time with 1000+ sites
- Memory usage patterns
- Concurrent analysis capabilities
- Large file output generation

#### 4.2 Accuracy Verification Tests
**Test Cases**:
- Known pattern detection accuracy
- Frequency calculation precision
- Percentage calculation validation
- Cross-validation with manual analysis

## Test Implementation Strategy

### 1. Test Data Strategy
```typescript
// Create realistic test fixtures
const testFixtures = {
  wordpressSites: [
    { 
      url: 'https://wp-site1.com',
      httpHeaders: { 'x-pingback': 'https://wp-site1.com/xmlrpc.php' },
      detectionResults: [{ cms: 'WordPress', confidence: 0.95 }]
    }
    // ... more WordPress sites
  ],
  drupalSites: [
    // ... Drupal test data
  ],
  mixedDataset: [
    // ... mixed CMS data for integration tests
  ]
};
```

### 2. Mock Strategy
```typescript
// Minimal mocking for integration tests
// Only mock external dependencies (filesystem, network)
// Use real business logic modules

// Unit tests: Mock everything except unit under test
// Integration tests: Mock only external boundaries
// Functional tests: Mock only filesystem/network
```

### 3. Assertion Strategy
```typescript
// Specific assertions that would catch production bugs
expect(semanticAnalysis.headerAnalyses.size).toBeGreaterThan(0);
expect(semanticAnalysis.insights.namingConventions['kebab-case']).toBeGreaterThan(0);
expect(typeof result.metadata.validSites).toBe('number');

// Verify Map object integrity
expect(headerPatterns instanceof Map).toBe(true);
expect(Array.from(headerPatterns.keys())).toContain('server');
```

## URGENT: Bias-Aware Recommender Test Crisis

### Impact Assessment
**CRITICAL SEVERITY**: The current bias-aware recommender test suite has **ZERO mathematical validity**

**Examples of Fabricated Data**:
- Line 65: `platformSpecificity: 0.75` (claimed) vs `0.385` (actual calculation)
- Line 78: `platformSpecificity: 0.72` (fabricated)
- Line 91: `platformSpecificity: 0.95` (fabricated) 
- **13+ instances** of hardcoded mathematical lies throughout the test

**Production Impact**:
- ✅ Tests pass with fabricated data
- ❌ Production recommendations are mathematically incorrect
- ❌ Universal headers like `set-cookie` incorrectly flagged as platform-specific
- ❌ No validation against 21M+ websites using `set-cookie` (webtechsurvey.com)

**Immediate Actions Required**:
1. **STOP using current bias-aware recommender tests** - they provide false confidence
2. **Audit all 13+ hardcoded `platformSpecificity` values** in the test file
3. **Replace fabricated data with calculated values** using real functions
4. **Add ground truth validation** against external web usage data
5. **Include ALL platforms** (Duda, Shopify, etc.) in calculations, not just 3

## Test Execution Plan

### PHASE 0: Emergency Bias-Aware Test Fix (Days 1-2)
**HIGHEST PRIORITY - Must complete before any other testing**

1. **Mathematical Calculation Audit**:
   ```bash
   # Find all hardcoded platformSpecificity values
   grep -n "platformSpecificity:" src/frequency/__tests__/recommender-bias-aware.test.ts
   # Expected: 13+ hardcoded values that need replacement
   ```

2. **Replace Fabricated Test Data**:
   - Remove ALL hardcoded `platformSpecificity` values
   - Use real `calculatePlatformSpecificity()` function calls
   - Include complete platform coverage (6+ platforms, not 3)
   - Add ground truth validation fixtures

3. **Validation Against External Data**:
   - Create test fixtures with webtechsurvey.com header usage data
   - Validate universal headers (set-cookie: 21M+ sites) are correctly identified
   - Validate platform-specific headers (x-pingback: WordPress only) are correctly identified

### Phase 1 Execution (Week 1)
1. Create analyzer integration tests
2. Create semantic flow integration tests  
3. Run tests against current codebase
4. Fix any discovered integration issues

### Phase 2 Execution (Week 2)
1. Create bias-detector tests
2. Create cms-enhanced-script-analyzer tests
3. Achieve 90%+ code coverage for these modules

### Phase 3 Execution (Week 3)
1. Create edge case tests
2. Create error handling tests
3. Validate robustness improvements

### Phase 4 Execution (Week 4)
1. Create performance tests
2. Create accuracy verification tests
3. Establish performance baselines

## Success Criteria

### Coverage Metrics
- **Integration Test Coverage**: 100% of critical data flows
- **Unit Test Coverage**: 90%+ for all modules
- **Edge Case Coverage**: All identified failure modes tested

### Quality Metrics
- **Zero Production Bugs**: No issues like "0 headers" slip through
- **Performance**: Analysis completes within acceptable time limits
- **Accuracy**: Frequency calculations match manual verification

### Confidence Metrics
- **Regression Prevention**: Tests catch integration issues before production
- **Documentation**: All test scenarios documented and maintainable
- **Automation**: All tests run in CI/CD pipeline

## Risk Mitigation

### High-Risk Areas
1. **Map/Object Serialization**: Special attention to JSON conversion
2. **Percentage Calculations**: Verify denominators and edge cases
3. **Data Pipeline**: Ensure data flows correctly between modules
4. **Memory Management**: Monitor memory usage with large datasets

### Monitoring Strategy
1. **Test Execution Time**: Monitor for performance regressions
2. **Coverage Reports**: Ensure coverage doesn't decrease
3. **Production Validation**: Regular production data spot checks
4. **Error Rates**: Monitor test failure patterns

## Implementation Notes

### Test File Naming Convention
```
src/frequency/__tests__/
├── [module-name].test.ts          # Unit tests
├── [module-name].integration.test.ts  # Integration tests
├── [workflow-name].functional.test.ts # End-to-end functional tests
└── test-fixtures/                 # Shared test data
    ├── wordpress-sites.json
    ├── drupal-sites.json
    └── mixed-dataset.json
```

### Test Categories
- **Unit Tests**: Single module, all dependencies mocked
- **Integration Tests**: Multiple modules, minimal mocking
- **Functional Tests**: Complete workflows, external dependencies mocked
- **Performance Tests**: Load and scale testing
- **Accuracy Tests**: Validation against known correct results

## CRITICAL SUMMARY: Test Plan Priority

### Phase 0 (Emergency): Bias-Aware Recommender Test Crisis
**Status**: 🚨 **CRITICAL** - Current tests provide false confidence with fabricated mathematical values

**What's Broken**:
- Test hardcodes `platformSpecificity: 0.75` but calculation yields `0.385`  
- 13+ instances of mathematical lies in test data
- Production recommendations are mathematically invalid
- Universal headers incorrectly flagged as platform-specific

**Fix Required**: Replace ALL hardcoded values with real calculations, add ground truth validation

### Implementation Guidance

#### Creating Valid Test Data
```typescript
// ✅ CORRECT: Use real calculation functions
describe('Platform Specificity Calculation', () => {
  it('should calculate specificity correctly for set-cookie', () => {
    const realData = {
      perCMSFrequency: {
        'Joomla': { frequency: 0.88 },
        'WordPress': { frequency: 0.40 },
        'Drupal': { frequency: 0.43 },
        'Duda': { frequency: 0.30 },      // Include ALL platforms
        'Shopify': { frequency: 0.35 },
        'Unknown': { frequency: 0.25 }
      }
    };
    
    // Let the REAL function calculate - never hardcode
    const result = calculatePlatformSpecificity(realData.perCMSFrequency);
    
    // Test against manually verified calculation
    expect(result).toBeCloseTo(0.47, 2); // NOT 0.75!
    
    // Verify recommendation logic
    const recommendation = shouldKeepHeaderBiasAware('set-cookie', {
      ...otherCorrelationData,
      platformSpecificity: result  // Use calculated value
    });
    
    expect(recommendation).toBe(false); // Universal header should be filtered
  });
});

// ❌ WRONG: Never use fabricated mathematical values
const brokenTest = {
  platformSpecificity: 0.75  // Mathematical lie - creates false confidence
};
```

#### Ground Truth Integration
```typescript
// Add external validation against known web usage data
describe('Ground Truth Validation', () => {
  const webTechSurveyData = {
    'set-cookie': { sites: 21000000, percentage: 95.2 }, // webtechsurvey.com
    'content-type': { sites: 22000000, percentage: 99.8 },
    'x-pingback': { sites: 15000, percentage: 0.07 }     // WordPress only
  };
  
  it('should correctly identify universal headers', () => {
    // set-cookie used by 21M+ sites - should be flagged as universal
    expect(analyzeHeader('set-cookie').isUniversal).toBe(true);
  });
});
```

This comprehensive test plan addresses both the critical bias-aware recommender mathematical crisis and the original semantic analysis production bug, establishing a robust foundation for the frequency analysis module with mathematical validity and real-world validation.