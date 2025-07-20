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

## Test Execution Plan

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

This comprehensive test plan addresses the critical gaps that allowed the semantic analysis production bug to occur while establishing a robust testing foundation for the frequency analysis module.