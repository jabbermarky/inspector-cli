# Phased Learn Testing Plan

## Executive Summary

This plan defines comprehensive testing methodology for the 2-phase CMS detection approach, with specific success criteria and evaluation methods for each phase. The testing validates that Pattern Discovery Phase excels at finding patterns while Pattern Standardization Phase excels at consistency.

## Testing Objectives

### Primary Objectives

1. **Validate Phase Separation** - Confirm each phase performs its intended function optimally
2. **Measure Consistency Improvements** - Quantify improvements over single-phase baseline
3. **Optimize Mixed Model Performance** - Identify best model combinations for cost/quality
4. **Establish Production Readiness** - Ensure system meets reliability requirements

### Secondary Objectives

1. **Performance Benchmarking** - Measure latency and token usage improvements
2. **Cost Optimization** - Validate mixed model cost savings
3. **Quality Assurance** - Ensure no regression in detection accuracy

## Test Data Organization

### Test Site Categories

```
test-data/
├── baseline-sites/
│   ├── wordpress-known.csv      # 10 confirmed WordPress sites
│   ├── drupal-known.csv         # 10 confirmed Drupal sites
│   ├── joomla-known.csv         # 10 confirmed Joomla sites
│   ├── duda-known.csv           # 10 confirmed Duda sites
│   └── mixed-cms.csv            # 10 mixed CMS sites
├── consistency-sites/
│   ├── wordpress-identical.csv  # Same WordPress sites, different data collection times
│   ├── drupal-variations.csv    # Different Drupal sites, same patterns expected
│   ├── joomla-variations.csv    # Different Joomla sites, same patterns expected
│   ├── duda-variations.csv      # Different Duda sites, same patterns expected
│   └── edge-cases.csv           # Challenging sites with ambiguous patterns
└── performance-sites/
    ├── simple-sites.csv         # Fast-loading sites for baseline performance
    └── complex-sites.csv        # Complex sites for stress testing
```

### Required Pattern Database

Create reference database of expected patterns:

```
expected-patterns/
├── wordpress-required.json      # Must-detect WordPress patterns
├── drupal-required.json         # Must-detect Drupal patterns
├── joomla-required.json         # Must-detect Joomla patterns
├── duda-required.json           # Must-detect Duda patterns
└── pattern-standards.json       # Standardized naming conventions
```

## All patterns now follow the hybrid format correctly:
- Unique patterns use clean 3-part base format
- Multiple instances use base:instance format
- No more compound indicators like "wp_content"
- Clear CMS specificity
- Meaningful instance names

Correct Examples:
### Base Format Patterns (3 parts):
- `meta_generator_wordpress` ✅
- `url_content_wordpress` ✅
- `header_api_wordpress` ✅
- `header_powered_by_wordpress` ✅
- `url_api_wordpress` ✅

### Instance Format Patterns (base:instance):
- `robots_disallow_wordpress:wp_admin` ✅
- `js_global_wordpress:wp_emoji_settings` ✅
- `robots_disallow_drupal:modules` ✅
- `robots_disallow_drupal:themes` ✅
- `robots_disallow_drupal:misc` ✅
- `js_global_drupal:settings` ✅

## Rationale for the new format patterns:

### Before (Old Prompt):
- `url_wp_content_path` (4 parts - incorrect)
- `robots_disallow_wp_admin` (4 parts - incorrect)
- `js_global_wp_emoji_settings` (5 parts - incorrect)

### After (Hybrid Format):
- `url_content_wordpress` (3 parts - correct base format)
- `robots_disallow_wordpress:wp_admin` (base + instance - correct)
- `js_global_wordpress:wp_emoji_settings` (base + instance - correct)


## Step 0 Data Collection
1. confirm existence of REALLY-GOOD CSV files, one for each of the 4 CMS (WordPress, Drupal, Joomla, Duda)
2. confirm existence of expected-patterns files (/expected-patterns/drupal-required.json is an example file), one for each of the 4 CMS
3. review the pattern-standards.json file and ensure that the standard definition matches the above format
4. review the expected pattern files to ensure that the pattern names follow the pattern naming standards

## Step 1 Testing: Pattern Discovery

### Test 1.1: Pattern Completeness

**Objective**: Verify Pattern Discovery Phase finds all discriminative patterns

**Method**:

1. Run Pattern Discovery Phase on known WordPress, Drupal, Joomla, and Duda sites
2. Compare discovered patterns against reference database for each CMS
3. Calculate completeness score: `found_patterns / expected_patterns`

**Success Criteria**:

- **Good**: 90%+ pattern completeness
- **Excellent**: 95%+ pattern completeness

**Test Script**:

```bash
# Test Pattern Completeness
node dist/index.js learn good-wordpress.csv --phased-analysis --model-phase1 gpt-4o
node dist/index.js learn good-drupal.csv --phased-analysis --model-phase1 gpt-4o
node dist/index.js learn good-joomla.csv --phased-analysis --model-phase1 gpt-4o
node dist/index.js learn good-duda.csv --phased-analysis --model-phase1 gpt-4o

python scripts/evaluate-completeness.py --phase1-results data/phased-results/gpt-4o/phase1-outputs/ --reference expected-patterns/wordpress-required.json
python scripts/evaluate-completeness.py --phase1-results data/phased-results/gpt-4o/phase1-outputs/ --reference expected-patterns/drupal-required.json
python scripts/evaluate-completeness.py --phase1-results data/phased-results/gpt-4o/phase1-outputs/ --reference expected-patterns/joomla-required.json
python scripts/evaluate-completeness.py --phase1-results data/phased-results/gpt-4o/phase1-outputs/ --reference expected-patterns/duda-required.json
```

### Test 1.2: Pattern Accuracy

**Objective**: Verify discovered patterns actually exist in data

**Method**:

1. Run Pattern Discovery Phase discovery
2. Cross-reference each pattern against raw data collection
3. Calculate accuracy: `verified_patterns / reported_patterns`

**Success Criteria**:

- **Good**: <5% false positive rate
- **Excellent**: <2% false positive rate

### Test 1.3: Creative Discovery

**Objective**: Measure novel pattern identification

**Method**:

1. Run Pattern Discovery Phase on diverse CMS sites
2. Identify patterns not in reference database
3. Manually verify novel patterns are discriminative
4. Calculate creativity score: `novel_verified_patterns / total_patterns`

**Success Criteria**:

- **Good**: 10%+ novel patterns that verify as discriminative
- **Excellent**: 15%+ novel patterns that verify as discriminative

### Test 1.4: Pattern Discovery Phase Performance

**Objective**: Measure Pattern Discovery Phase latency and token usage

**Method**:

1. Run Pattern Discovery Phase on performance test sites
2. Measure response time and token consumption
3. Calculate averages across site types

**Success Criteria**:

- **Good**: <20s latency, <4000 tokens
- **Excellent**: <15s latency, <3000 tokens

## Step 2 Testing: Pattern Standardization

### Test 2.1: Naming Consistency

**Objective**: Verify identical patterns get identical names

**Method**:

1. Run Pattern Discovery Phase on same WordPress, Drupal, Joomla, and Duda sites multiple times
2. Feed identical Pattern Discovery Phase outputs to Pattern Standardization Phase multiple times
3. Compare pattern names across runs for each CMS type
4. Calculate consistency: `identical_names / total_patterns`

**Success Criteria**:

- **Good**: 95%+ naming consistency
- **Excellent**: 98%+ naming consistency

**Test Script**:

```bash
# Test Naming Consistency
for i in {1..5}; do
  node dist/index.js learn https://wordpress.org --phased-analysis --model-phase2 gpt-4o
  node dist/index.js learn https://www.drupal.org --phased-analysis --model-phase2 gpt-4o
  node dist/index.js learn https://www.joomla.org --phased-analysis --model-phase2 gpt-4o
  node dist/index.js learn https://www.duda.co --phased-analysis --model-phase2 gpt-4o
done
python scripts/evaluate-consistency.py --results data/phased-results/consistency-test/
```

### Test 2.2: Standardization Compliance

**Objective**: Verify adherence to naming conventions

**Method**:

1. Run Pattern Standardization Phase on diverse Pattern Discovery Phase outputs
2. Check each pattern name against standardization rules
3. Verify confidence values are from approved set (0.95, 0.90, 0.85, 0.80)
4. Calculate compliance: `compliant_patterns / total_patterns`

**Success Criteria**:

- **Good**: 100% standardization compliance
- **Excellent**: 100% standardization compliance (no tolerance)

### Test 2.3: Required Pattern Coverage

**Objective**: Verify mandatory patterns are included

**Method**:

1. Run full pipeline on known WordPress, Drupal, Joomla, and Duda sites
2. Check final output includes required patterns for each CMS
3. Calculate coverage: `required_patterns_found / required_patterns_total`

**Success Criteria**:

- **Good**: 95%+ required pattern coverage
- **Excellent**: 100% required pattern coverage

### Test 2.4: Pattern Standardization Phase Performance

**Objective**: Measure Pattern Standardization Phase efficiency

**Method**:

1. Run Pattern Standardization Phase on standardized Pattern Discovery Phase outputs
2. Measure processing time and token usage
3. Compare against Pattern Discovery Phase performance

**Success Criteria**:

- **Good**: <10s latency, <2000 tokens
- **Excellent**: <8s latency, <1500 tokens

## Step 3 System Integration Testing

### Test 3.1: End-to-End Consistency

**Objective**: Measure full pipeline consistency

**Method**:

1. Run complete 2-phase pipeline on same WordPress, Drupal, Joomla, and Duda sites multiple times
2. Compare final outputs across runs for each CMS type
3. Calculate system consistency: `identical_final_outputs / total_runs`

**Success Criteria**:

- **Good**: 90%+ end-to-end consistency
- **Excellent**: 95%+ end-to-end consistency

### Test 3.2: Cross-CMS Differentiation

**Objective**: Ensure different CMS sites produce different outputs

**Method**:

1. Run pipeline on WordPress, Drupal, Joomla, and Duda sites
2. Verify outputs are appropriately different
3. Check for cross-contamination of patterns

**Success Criteria**:

- **Good**: Clear differentiation between CMS types
- **Excellent**: No cross-contamination of CMS-specific patterns

### Test 3.3: Single-Phase Baseline Comparison

**Objective**: Prove 2-phase approach is better than single-phase

**Method**:

1. Run single-phase analysis on test sites
2. Run 2-phase analysis on same sites
3. Compare consistency, accuracy, and completeness metrics

**Success Criteria**:

- **Good**: 20%+ improvement in consistency metrics
- **Excellent**: 50%+ improvement in consistency metrics

## Step 4: Mixed Model Testing

### Test 4.1: Model Combination Matrix

**Objective**: Identify optimal model combinations

**Test Matrix**:
| Pattern Discovery Phase Model | Pattern Standardization Phase Model | Cost Target | Quality Target |
|---------------|---------------|-------------|----------------|
| gpt-4o-mini | gpt-4o | Low cost | High quality |
| gpt-4o | gpt-4o | Baseline | High quality |
| gpt-4o | gpt-4-turbo | Medium cost | Max quality |
| gemini-2.0-flash-exp | gpt-4o | Low cost | Creative discovery |

**Method**:

1. Run each combination on test sites
2. Measure cost, latency, and quality metrics
3. Identify Pareto optimal combinations

**Success Criteria**:

- **Good**: Find combinations with 30%+ cost savings at equivalent quality
- **Excellent**: Find combinations with 50%+ cost savings at equivalent quality

### Test 4.2: Mixed Model Consistency

**Objective**: Verify mixed models maintain consistency

**Method**:

1. Run mixed model combinations multiple times on same sites
2. Measure consistency across different model combinations
3. Compare against single-model consistency

**Success Criteria**:

- **Good**: Mixed model consistency ≥ single-model consistency
- **Excellent**: Mixed model consistency > single-model consistency

## Step 5: Performance Testing

### Test 5.1: Latency Benchmarks

**Objective**: Measure system performance under load

**Method**:

1. Run pipeline on performance test sites
2. Measure Pattern Discovery Phase, Pattern Standardization Phase, and total latency
3. Compare against single-phase baseline

**Success Criteria**:

- **Good**: Total latency ≤ 1.5x single-phase latency
- **Excellent**: Total latency ≤ 1.2x single-phase latency

### Test 5.2: Token Usage Optimization

**Objective**: Measure cost efficiency

**Method**:

1. Track token usage for each phase
2. Compare total tokens against single-phase
3. Calculate cost per analysis

**Success Criteria**:

- **Good**: Total cost ≤ 1.5x single-phase cost
- **Excellent**: Total cost ≤ 1.2x single-phase cost (before mixed model optimization)

### Test 5.3: Cache Performance

**Objective**: Measure caching effectiveness with 2-phase approach

**Method**:

1. Run repeated analyses with caching enabled
2. Measure cache hit rates for each phase
3. Calculate cost savings from caching

**Success Criteria**:

- **Good**: 70%+ cache hit rate for Pattern Standardization Phase (more consistent)
- **Excellent**: 80%+ cache hit rate for Pattern Standardization Phase

## Step 6: Regression Testing

### Test 6.1: Detection Accuracy Maintenance

**Objective**: Ensure no regression in CMS detection accuracy

**Method**:

1. Run 2-phase pipeline on validation sites with known CMS
2. Compare detection accuracy against single-phase baseline
3. Measure confidence score calibration

**Success Criteria**:

- **Good**: Detection accuracy ≥ single-phase baseline
- **Excellent**: Detection accuracy > single-phase baseline

### Test 6.2: Edge Case Handling

**Objective**: Verify system handles challenging sites

**Method**:

1. Run pipeline on edge cases (custom CMS, minimal patterns, etc.)
2. Verify graceful degradation
3. Check error handling and recovery

**Success Criteria**:

- **Good**: No system crashes, reasonable fallback behavior
- **Excellent**: Improved handling of edge cases vs single-phase

## Test Automation

### Automated Test Suite

```bash
# Run complete test suite
npm run test:phased-analysis

# Individual test categories
npm run test:phase1-discovery
npm run test:phase2-standardization
npm run test:mixed-models
npm run test:performance
npm run test:regression
```

### Continuous Integration

- Run consistency tests on every commit
- Run full test suite on release candidates
- Performance regression alerts
- Cost monitoring and alerts

### Result Storage

```
test-results/
├── baseline-results/
├── phase1-results/
├── phase2-results/
├── mixed-model-results/
└── performance-results/
```

## Implementation Timeline

### Part 1: Test Infrastructure Setup

- Create test data sets
- Build evaluation scripts
- Set up test automation

### Part 2: Pattern Discovery Phase Testing

- Run pattern discovery tests
- Evaluate completeness and accuracy
- Optimize Pattern Discovery Phase prompt

### Part 3: Pattern Standardization Phase Testing

- Run standardization tests
- Evaluate consistency and compliance
- Optimize Pattern Standardization Phase prompt

### Part 4: Integration Testing

- End-to-end system testing
- Mixed model optimization
- Performance benchmarking

### Part 5: Production Validation

- Regression testing
- Final optimization
- Release preparation

## Success Criteria Summary

### Minimum Viable Product

- 90%+ pattern completeness (Pattern Discovery Phase)
- 95%+ naming consistency (Pattern Standardization Phase)
- 90%+ end-to-end consistency (System)
- Total cost ≤ 1.5x single-phase

### Production Ready

- 95%+ pattern completeness (Pattern Discovery Phase)
- 98%+ naming consistency (Pattern Standardization Phase)
- 95%+ end-to-end consistency (System)
- Total cost ≤ 1.2x single-phase

### Excellence Target

- 98%+ pattern completeness (Pattern Discovery Phase)
- 99%+ naming consistency (Pattern Standardization Phase)
- 98%+ end-to-end consistency (System)
- Total cost < 1.0x single-phase (with mixed models)

This testing plan provides comprehensive validation that the 2-phase approach delivers on its promise of improved consistency while maintaining quality and controlling costs.
