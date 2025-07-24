# Frequency Analysis Refactoring Plan

## Problem Statement

The frequency analysis system suffers from a fundamental architectural flaw: **multiple independent counting systems** that process the same raw data with different filtering, aggregation, and threshold methodologies. This creates mathematically impossible inconsistencies like:

- HTTP Headers table: `x-pingback` shows 5/4569 sites
- Recommendations table: `x-pingback` shows 132/4569 sites
- Both are "correct" within their respective counting systems

## Root Cause Analysis

### Current Architecture Issues

1. **No Single Source of Truth**: Each analyzer (header, meta, script, bias) independently processes raw data
2. **Inconsistent Filtering**: Different components apply `minOccurrences` at different levels (pattern vs header vs site)
3. **Multiple Aggregation Methods**: Frequency sums vs unique site counts vs pattern-level counting
4. **Fragmented Data Flow**: No canonical preprocessed dataset shared across analyzers
5. **Technical Debt**: Organic growth created incompatible subsystems

### Affected Components

- Header Analyzer: Pattern-level filtering → frequency sum aggregation
- Bias Detector: Header-level filtering → unique site counting
- Meta Tag Analyzer: Unknown methodology (needs investigation)
- Script Analyzer: Unknown methodology (needs investigation)
- Reporter: Attempts to reconcile inconsistent data sources

## Target Architecture

### Core Principle: Single Source of Truth

Create one canonical data preprocessing pipeline that produces consistent, filtered datasets consumed by all analyzers.

### New Data Flow

```
Raw Data Points → Data Preprocessor → Canonical Filtered Dataset → All Analyzers → Reporter
```

Instead of:

```
Raw Data Points → Header Analyzer (method A) ↘
Raw Data Points → Bias Detector (method B)  → Reporter (reconciliation layer)
Raw Data Points → Meta Analyzer (method C)  ↗
```

## Phase 1: Systematic Code Review

### 1.1 Data Flow Mapping

**Goal**: Document all current counting methodologies and identify inconsistencies

**Tasks**:

- [ ] Remember to be systematic
- [ ] Map data flow through `analyzer.ts` - how does it count headers?
- [ ] Map data flow through `bias-detector.ts` - how does it count correlations?
- [ ] Map data flow through `meta-analyzer.ts` - what's the counting method?
- [ ] Map data flow through `script-analyzer.ts` - what's the counting method?
- [ ] Document all filtering application points (`minOccurrences`, thresholds)
- [ ] Identify where raw `dataPoints` gets transformed differently

**Deliverables**:

- `docs/frequency-refactoring-current-data-flow-analysis.md` - Visual diagram of all data paths
- `docs/frequency-refactoring-counting-methodology-comparison.md` - Side-by-side comparison of methods
- `docs/frequency-refactoring-filtering-points-audit.md` - All places where filtering occurs

### 1.2 Inconsistency Detection

**Goal**: Systematically identify all data inconsistencies across the system

**Tasks**:

- [ ] Review docs/test-troubleshooting-workflow.md
- [ ] Create test that compares header counts between main table and recommendations
- [ ] Create test that compares meta tag counts across different analyses
- [ ] Create test that compares script counts across different analyses
- [ ] Document all mathematical impossibilities (A < B when A should equal B)
- [ ] Identify cross-component data dependencies that are fragile

**Deliverables**:

- `src/frequency/__tests__/consistency-audit.test.ts` - Automated inconsistency detection
- `docs/frequency-refactoring-known-inconsistencies.md` - Catalog of all identified problems

### 1.3 Current Test Coverage Analysis

**Goal**: Understand what our current tests actually validate

**Tasks**:

- [ ] Audit existing tests - do they test individual components or end-to-end consistency?
- [ ] Identify tests that hide inconsistencies by mocking away the problem
- [ ] Document test gaps around cross-component data flow
- [ ] Identify brittle tests that will break during refactoring

**Deliverables**:

- `docs/frequency-refactoring-test-coverage-analysis.md` - What's tested vs what should be tested
- `docs/frequency-refactoring-test-risks.md` - Tests likely to break during refactoring

## Phase 2: Design New Architecture

### 2.1 Data Preprocessor Design

**Goal**: Design single canonical preprocessing pipeline

**Tasks**:

- [ ] Design `DataPreprocessor` class that creates consistent filtered datasets
- [ ] Define standard interfaces for preprocessed data structures
- [ ] Design consistent filtering strategy (when/where/how `minOccurrences` applies)
- [ ] Design consistent counting methodology (unique sites vs frequency sums)
- [ ] Define data contracts between preprocessor and analyzers

**Deliverables**:

- `docs/frequency-refactoring-data-preprocessor-design.md` - Architecture specification
- `src/frequency/types/preprocessed-data.ts` - Type definitions for canonical data
- `docs/frequency-refactoring-filtering-strategy.md` - Unified filtering approach

### 2.2 Analyzer Interface Standardization

**Goal**: Design consistent interfaces for all analyzers

**Tasks**:

- [ ] Design base `Analyzer` interface that consumes preprocessed data
- [ ] Define standard output formats for all analyzers
- [ ] Design consistent error handling and validation patterns
- [ ] Define consistent logging and debugging interfaces

**Deliverables**:

- `src/frequency/interfaces/analyzer.ts` - Base analyzer interface
- `docs/frequency-refactoring-analyzer-standardization.md` - Interface design rationale

### 2.3 Migration Strategy

**Goal**: Plan how to refactor without breaking existing functionality

**Tasks**:

- [ ] Design backward compatibility approach during transition
- [ ] Plan incremental migration strategy (which components first?)
- [ ] Design feature flags for old vs new counting methods
- [ ] Plan validation approach (old vs new results comparison)

**Deliverables**:

- `docs/frequency-refactoring-migration-strategy.md` - Step-by-step refactoring plan
- `docs/frequency-refactoring-backward-compatibility-plan.md` - How to avoid breaking changes

## Phase 3: Implementation Plan

### 3.1 Build Data Preprocessor

**Goal**: Create single source of truth for all frequency data

**Tasks**:

- [ ] Implement `DataPreprocessor` class
- [ ] Implement consistent filtering logic
- [ ] Implement consistent counting methodology
- [ ] Implement validation and error handling
- [ ] Review docs/test-troubleshooting-workflow.md
- [ ] Create comprehensive unit tests for preprocessor

**Deliverables**:

- `src/frequency/preprocessor.ts` - Central data preprocessing
- `src/frequency/__tests__/preprocessor.test.ts` - Comprehensive tests
- `src/frequency/types/` - Standardized data type definitions

### 3.2 Refactor Analyzers (One by One)

**Goal**: Convert each analyzer to use preprocessed data

**Sequential Tasks**:

1. **Header Analyzer Refactor**
    - [ ] Modify to consume preprocessed header data
    - [ ] Remove internal filtering/counting logic
    - [ ] Review docs/test-troubleshooting-workflow.md
    - [ ] Update tests to validate against preprocessed data
    - [ ] Validate output matches expected results

2. **Bias Detector Refactor**
    - [ ] Modify to consume preprocessed correlation data
    - [ ] Remove duplicate filtering logic
    - [ ] Ensure correlation calculations use consistent counts
    - [ ] Review docs/test-troubleshooting-workflow.md
    - [ ] Update tests and validate results

3. **Meta Analyzer Refactor**
    - [ ] Investigate current counting methodology
    - [ ] Modify to use preprocessed meta tag data
    - [ ] Standardize with header analyzer approach
    - [ ] Review docs/test-troubleshooting-workflow.md
    - [ ] Update tests

4. **Script Analyzer Refactor**
    - [ ] Investigate current counting methodology
    - [ ] Modify to use preprocessed script data
    - [ ] Standardize with other analyzers
    - [ ] Review docs/test-troubleshooting-workflow.md
    - [ ] Update tests

**Deliverables** (per analyzer):

- Refactored analyzer implementation
- Updated comprehensive test suite
- Validation report comparing old vs new results

### 3.3 Update Reporter

**Goal**: Simplify reporter now that data is consistent

**Tasks**:

- [ ] Remove data reconciliation logic from reporter
- [ ] Simplify table generation (no more choosing between data sources)
- [ ] Add validation that all data sources are mathematically consistent
- [ ] Review docs/test-troubleshooting-workflow.md
- [ ] Update reporter tests

**Deliverables**:

- `src/frequency/reporter.ts` - Simplified, consistent reporting
- `src/frequency/__tests__/reporter.test.ts` - Updated tests

## Phase 4: Comprehensive Testing

### 4.1 End-to-End Consistency Tests

**Goal**: Ensure mathematical consistency across all components

**Tasks**:

- [ ] Review docs/test-troubleshooting-workflow.md
- [ ] Create tests that validate count consistency across all tables
- [ ] Create tests that validate cross-component data relationships
- [ ] Create tests that catch mathematical impossibilities
- [ ] Create performance regression tests

**Deliverables**:

- `src/frequency/__tests__/end-to-end-consistency.test.ts`
- `src/frequency/__tests__/mathematical-validation.test.ts`
- `src/frequency/__tests__/performance-regression.test.ts`

### 4.2 Migration Validation Tests

**Goal**: Prove the refactoring maintains correctness

**Tasks**:

- [ ] Review docs/test-troubleshooting-workflow.md
- [ ] Create tests comparing old vs new results on same datasets
- [ ] Create tests validating backward compatibility
- [ ] Create tests for edge cases and error conditions
- [ ] Create integration tests with real data

**Deliverables**:

- `src/frequency/__tests__/migration-validation.test.ts`
- `test-datasets/` - Curated test data for validation
- `docs/frequency-refactoring-validation-results.md` - Before/after comparison report

### 4.3 Documentation Tests

**Goal**: Ensure documentation matches implementation

**Tasks**:

- [ ] Review docs/test-troubleshooting-workflow.md
- [ ] Create tests that validate examples in documentation work
- [ ] Create tests that validate API contracts match interfaces
- [ ] Create tests for debugging and troubleshooting workflows

**Deliverables**:

- `src/frequency/__tests__/documentation-validation.test.ts`

## Phase 5: Documentation and Cleanup

### 5.1 Architecture Documentation

**Goal**: Document the new consistent architecture

**Tasks**:

- [ ] Update `docs/frequency-refactoring-frequency-analysis-architecture.md`
- [ ] Create `docs/frequency-refactoring-data-flow-diagram.md` with visual representations
- [ ] Update `CLAUDE.md` with new debugging workflows
- [ ] Create `docs/frequency-refactoring-troubleshooting-data-consistency.md`

### 5.2 Developer Guidelines

**Goal**: Prevent future architectural drift

**Tasks**:

- [ ] Create `docs/frequency-refactoring-adding-new-analyzers.md` - How to extend the system
- [ ] Create `docs/frequency-refactoring-data-consistency-principles.md` - Core principles
- [ ] Update code review guidelines to catch inconsistency risks
- [ ] Create automated linting rules for data consistency

### 5.3 Legacy Code Removal

**Goal**: Clean up obsolete code and prevent regression

**Tasks**:

- [ ] Remove old counting/filtering logic from individual analyzers
- [ ] Remove data reconciliation code from reporter
- [ ] Remove feature flags used during migration
- [ ] Clean up obsolete test mocks and fixtures

## Success Criteria

### Functional Requirements

- [ ] All frequency analysis tables show mathematically consistent counts
- [ ] Same header appears with same count across main table and recommendations
- [ ] Cross-component data relationships are logically sound
- [ ] No mathematical impossibilities (A < B when A should equal B)

### Technical Requirements

- [ ] Single source of truth for all frequency data
- [ ] Consistent filtering and counting methodology across all components
- [ ] Standardized analyzer interfaces
- [ ] Comprehensive test coverage with consistency validation
- [ ] The entire app test suite passes all tests
- [ ] Clean, maintainable architecture that prevents future drift

### Performance Requirements

- [ ] No significant performance regression
- [ ] Memory usage remains reasonable
- [ ] Processing time scales linearly with data size

## Risk Assessment

### High Risks

- **Breaking existing functionality**: Mitigation through comprehensive testing and incremental migration
- **Performance regression**: Mitigation through benchmarking and optimization
- **Complex refactoring scope**: Mitigation through phased approach and clear rollback plans

### Medium Risks

- **Test suite maintenance**: Many tests will need updates
- **Backward compatibility**: Some existing behaviors may need to change
- **Integration complexity**: Multiple systems need to work together

### Low Risks

- **User-facing changes**: Most changes are internal architecture
- **Data loss**: Read-only analysis system, no data persistence risks

## Timeline Estimate

- **Phase 1 (Review)**: 2-3 days
- **Phase 2 (Design)**: 2-3 days
- **Phase 3 (Implementation)**: 5-7 days
- **Phase 4 (Testing)**: 3-4 days
- **Phase 5 (Documentation)**: 1-2 days

**Total**: 2-3 weeks for complete refactoring

## Conclusion

This refactoring addresses the fundamental architectural flaw causing data inconsistencies throughout the frequency analysis system. By establishing a single source of truth and consistent methodologies, we eliminate the root cause of mathematical impossibilities and create a maintainable foundation for future development.

The phased approach minimizes risk while ensuring comprehensive coverage of all affected systems.
