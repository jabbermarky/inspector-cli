# Algorithm Versioning Strategy

This document defines when and how to increment algorithm versions in the CMS detection system.

## Overview

The versioning system tracks two key algorithm components:
- **Detection Algorithm**: Core CMS detection logic and strategies
- **Confidence Algorithm**: How confidence scores are calculated and weighted

## Current Baseline (as of 2025-07-08)

```typescript
algorithms: {
    detection: '3',    // Current detection algorithm version
    confidence: '2'    // Current confidence algorithm version
}
```

### Detection Algorithm v3 Features
- Meta-tag strategy with generator tag detection
- HTML content strategy with CMS-specific patterns
- API endpoint strategy (wp-json, Drupal API, etc.)
- HTTP headers strategy with wildcard pattern matching
- Robots.txt strategy with CMS-specific disallow patterns
- Plugin detection strategy for WordPress
- Multi-detector orchestration with best-result selection

### Confidence Algorithm v2 Features
- Weighted aggregation across strategies
- Strategy-specific confidence weights
- Confidence capping at 1.0
- Early exit optimization for high-confidence results

## Version Increment Triggers

### Detection Algorithm Increments

**ALWAYS increment detection algorithm version when:**

1. **New Detection Strategies Added**
   ```typescript
   // Example: Adding new CSS selector strategy
   new CssSelectorStrategy([...patterns], 'WordPress', 5000)
   ```
   - Impact: Changes the detection methodology
   - Reason: Results may differ due to new evidence sources

2. **Strategy Weight Changes**
   ```typescript
   // Example: Changing strategy weights in BaseCMSDetector
   protected getStrategyWeight(method: string): number {
       const weights: Record<string, number> = {
           'meta-tag': 1.0,          // Changed from 0.95
           'api-endpoint': 0.95,     // Changed from 0.90
           'http-headers': 0.9,      // Changed from 0.85
           // ...
       };
   }
   ```
   - Impact: Changes final confidence calculations
   - Reason: Same evidence yields different confidence scores

3. **Detection Pattern Changes**
   ```typescript
   // Example: Adding new patterns to existing strategies
   new HtmlContentStrategy([
       '/wp-content/',
       '/wp-includes/',
       '/wp-admin/',        // NEW pattern added
       'wp-',
       'wordpress'
   ], 'WordPress', 4000)
   ```
   - Impact: Changes what constitutes detection evidence
   - Reason: May detect previously missed sites or reduce false positives

4. **Strategy Logic Bug Fixes**
   ```typescript
   // Example: Fixing case sensitivity in HTTP headers
   // Before: headers[pattern.name] (case sensitive)
   // After: headers[pattern.name.toLowerCase()] (case insensitive)
   ```
   - Impact: Fixes incorrect behavior
   - Reason: Same input now produces correct output

5. **Multi-Detector Orchestration Changes**
   ```typescript
   // Example: Changing how detectors are prioritized
   const detectors: CMSDetector[] = [
       new WordPressDetector(),  // Reordered
       new DrupalDetector(),     // Reordered  
       new JoomlaDetector()      // Reordered
   ];
   ```
   - Impact: Changes which result is selected when multiple detectors match
   - Reason: Same site may be classified differently

### Confidence Algorithm Increments

**ALWAYS increment confidence algorithm version when:**

1. **Confidence Calculation Method Changes**
   ```typescript
   // Example: Changing from simple addition to weighted average
   // Before: confidence = strategy1.confidence + strategy2.confidence
   // After: confidence = (strategy1.confidence * weight1 + strategy2.confidence * weight2) / (weight1 + weight2)
   ```
   - Impact: Changes how strategy results are combined
   - Reason: Same detection evidence yields different confidence scores

2. **Confidence Normalization Changes**
   ```typescript
   // Example: Changing confidence capping or scaling
   // Before: Math.min(totalConfidence, 1.0)
   // After: Math.tanh(totalConfidence) // Sigmoid scaling
   ```
   - Impact: Changes final confidence score distribution
   - Reason: Same raw confidence maps to different final score

3. **Early Exit Threshold Changes**
   ```typescript
   // Example: Changing when detection stops early
   // Before: if (result.confidence >= 0.9) return result;
   // After: if (result.confidence >= 0.8) return result;
   ```
   - Impact: Changes when detection terminates
   - Reason: May miss additional evidence that would change final score

4. **Strategy Timeout Handling Changes**
   ```typescript
   // Example: Changing how timeouts affect confidence
   // Before: Timeout = 0 confidence
   // After: Timeout = partial confidence from completed work
   ```
   - Impact: Changes how failures are scored
   - Reason: Same timeout scenario yields different confidence

## Version Increment Process

### 1. Code Changes
When making changes that trigger version increments:

```typescript
// Update VersionManager baseline in generateVersion()
algorithms: {
    detection: '4',    // Incremented from '3'
    confidence: '2'    // Unchanged
}
```

### 2. Documentation Updates
Update this document with:
- New version number and date
- Description of changes made
- Impact on detection results
- Migration considerations

### 3. Testing Requirements
Before incrementing versions:
- [ ] Run existing test suite to ensure no regressions
- [ ] Test against known CMS sites to verify expected behavior
- [ ] Compare results with previous version on sample data
- [ ] Document any intentional behavior changes

### 4. Migration Planning
Consider existing data:
- Will migration script need updates?
- Are there breaking changes in data format?
- Should old captures be re-processed?

## Version History

### Detection Algorithm Versions

| Version | Date | Changes | Impact |
|---------|------|---------|--------|
| 1 | 2025-01-01 | Initial basic detection | Baseline |
| 2 | 2025-01-15 | Added HTTP headers strategy | Improved WordPress detection |
| 3 | 2025-07-08 | Current: 6 strategies, multi-detector | Comprehensive CMS coverage |

### Confidence Algorithm Versions

| Version | Date | Changes | Impact |
|---------|------|---------|--------|
| 1 | 2025-01-01 | Simple confidence addition | Baseline |
| 2 | 2025-07-08 | Current: Weighted aggregation | More accurate confidence scores |

## Common Mistakes to Avoid

### ❌ DON'T increment for:
- **Adding new CMS types** (e.g., adding Magento detector)
  - Reason: Doesn't change existing detection logic
- **Refactoring code without behavior changes**
  - Reason: Same input produces same output
- **Documentation or comment updates**
  - Reason: No functional changes
- **Test additions or improvements**
  - Reason: No changes to production logic
- **Performance optimizations without logic changes**
  - Reason: Same results, just faster

### ✅ DO increment for:
- **Any change that could affect detection results**
- **Bug fixes that change behavior**
- **New detection evidence sources**
- **Modified confidence calculations**
- **Changed strategy weights or thresholds**

## Version Comparison for Deduplication

When deduplication encounters multiple versions:

### Precedence Rules
1. **Higher Detection Algorithm** (4 > 3 > 2 > 1)
2. **Higher Confidence Algorithm** (2 > 1)
3. **Later Pattern Timestamp** (more recent patterns)
4. **Later Capture Date** (more recent capture)

### Example Comparison
```typescript
// Version A: detection: '3', confidence: '2'
// Version B: detection: '4', confidence: '1'
// Result: Keep Version B (higher detection algorithm wins)

// Version A: detection: '3', confidence: '2'
// Version B: detection: '3', confidence: '3'
// Result: Keep Version B (higher confidence algorithm wins)
```

## Integration with Migration Script

The migration script uses version history to assign appropriate versions:

```typescript
// Timing-based version assignment
const migrationMap = {
    'v0.1': { detection: '1', confidence: '1' }, // Early captures
    'v0.2': { detection: '1', confidence: '1' },
    'v0.3': { detection: '2', confidence: '1' }, // Headers strategy added
    'v0.4': { detection: '2', confidence: '1' },
    'v0.5': { detection: '3', confidence: '2' }  // Current algorithm
};
```

## Best Practices

1. **Always increment when in doubt** - Better to have extra versions than miss important changes
2. **Document all changes** - Include reasoning for version increments
3. **Test thoroughly** - Verify changes behave as expected
4. **Consider backward compatibility** - Plan for existing data
5. **Coordinate with team** - Ensure version increments are communicated

## Monitoring and Validation

### Success Metrics
- Detection accuracy on known CMS sites
- Confidence score distribution
- False positive/negative rates
- Performance characteristics

### Regression Testing
- Test against validation datasets
- Compare with previous version results
- Monitor for unexpected behavior changes
- Validate confidence score ranges

---

**Next Version Update**: Update this document when incrementing to detection v4 or confidence v3.

**Maintainer**: Update version numbers in `VersionManager.generateVersion()` when making qualifying changes.