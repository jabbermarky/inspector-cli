# Phased Learning System - Project Handoff

## Current State Summary

### System Overview
The phased learning system is a 2-phase LLM-based CMS detection approach:
- **Phase 1**: Pattern Discovery (temperature 0.2) - Finds patterns in website data
- **Phase 2**: Pattern Standardization (temperature 0.0) - Converts to hybrid naming format

### Hybrid Pattern Naming Convention
Standardized format: `{source}_{indicator}_{cms}[:{instance}]`
- Base pattern: `url_content_wordpress`
- Instance pattern: `url_media_joomla:jui`

## Key Findings & Issues

### 1. Pattern Completeness Problem
Current pattern detection rates are very low:
- WordPress: 21.9%
- Drupal: 16.1%
- Joomla: 16.3%
- Duda: 3.5%

**Root Cause**: LLM finds legitimate patterns but they don't match our manually-created expected patterns. The LLM discovers patterns we didn't anticipate.

### 2. Token Limit Issues
- 11+ sites fail with "maximum context length is 128000 tokens" errors
- Large sites with extensive HTML content exceed limits
- No current mitigation implemented

### 3. Ground Truth Integration
Successfully integrated ground truth discriminative features with hybrid pattern names:
- Modified `DiscriminativeFeature` type to include `hybridPatternName`
- Added helper functions in `src/ground-truth/extract-hybrid-patterns.ts`
- Added missing `robots_disallow_wordpress:wp_admin` pattern

## Important Files & Locations

### Core Implementation
- `/src/commands/learn.ts` - Main learn command
- `/src/learn/phased-analysis.ts` - Phased analysis implementation
- `/src/prompts/phased-prompts.ts` - LLM prompts for each phase
- `/src/learn/response-cache.ts` - Response caching for development

### Pattern Standards
- `/expected-patterns/pattern-standards.json` - Hybrid naming convention (v2.0)
- `/expected-patterns/wordpress-required.json` - Expected WordPress patterns
- `/expected-patterns/drupal-required.json` - Expected Drupal patterns
- `/expected-patterns/joomla-required.json` - Expected Joomla patterns
- `/expected-patterns/duda-required.json` - Expected Duda patterns

### Ground Truth Integration
- `/src/ground-truth/discriminative-features.ts` - Pattern definitions with hybrid names
- `/src/ground-truth/evaluate-feature.ts` - Pattern evaluation logic
- `/src/ground-truth/extract-hybrid-patterns.ts` - Hybrid pattern extraction utilities

### Testing & Analysis Scripts
- `/scripts/evaluate-phase2-completeness.py` - Evaluates pattern completeness
- `/scripts/catalog-llm-vs-expected-patterns.py` - Compares LLM findings vs expected
- `/scripts/test-hybrid-patterns.js` - Tests hybrid pattern extraction
- `/run-phased-batch.sh` - Batch processing for REALLY-GOOD files

### Test Data
- `good-wordpress.csv` - Known WordPress sites
- `good-drupal.csv` - Known Drupal sites
- `good-joomla.csv` - Known Joomla sites
- `good-duda.csv` - Known Duda sites

## Pending Tasks

### 1. Address Token Limit Issues (High Priority)
- Implement content truncation or sampling
- Consider preprocessing approach (see evaluation plan)
- Add fallback for large sites

### 2. Update Expected Patterns
Based on LLM discoveries, update expected pattern files to match what LLM actually finds in the wild.

### 3. Implement Preprocessing Evaluation
See `/plans/preprocessed-pattern-evaluation-plan.md` for comprehensive plan to evaluate preprocessing raw data into patterns before LLM analysis.

## Key Commands

### Run Phased Analysis
```bash
# Single URL
node dist/index.js learn <url> --phased-analysis

# Batch processing
node dist/index.js learn <csv-file> --phased-analysis

# With data collection
node dist/index.js learn <url> --phased-analysis --collect-data
```

### Evaluate Pattern Completeness
```bash
python scripts/evaluate-phase2-completeness.py
```

### Test Ground Truth Integration
```bash
npm run build
node scripts/test-hybrid-patterns.js
```

## Architecture Decisions

### 1. Two-Phase Approach
- Phase 1 discovers patterns with creative freedom
- Phase 2 standardizes to hybrid format
- Allows both discovery and consistency

### 2. Ground Truth Integration
- Deterministic pattern detection for known patterns
- Hybrid pattern names embedded in discriminative features
- Enables comparison between deterministic and LLM approaches

### 3. Response Caching
- Development optimization to avoid repeated API calls
- Cache stored in `data/learn-cache/`
- Automatically used when available

## Next Steps Recommendations

1. **Immediate**: Fix token limit issues to enable processing of all sites
2. **Short-term**: Update expected patterns based on LLM discoveries
3. **Medium-term**: Implement and evaluate preprocessing approach
4. **Long-term**: Consider hybrid architecture combining deterministic + LLM

## Common Gotchas

1. **Pattern Naming**: Always use 3-part base format, 4-part only for instances
2. **CMS Variations**: Remember Joomla/Joomla! and Drupal/Drupal 7 consolidation
3. **Test Data**: REALLY-GOOD files should have 100% detection accuracy
4. **Ground Truth**: Not all patterns are discriminative features - many are supplementary

## Contact Context
This work was focused on Phase 1 validation of the phased learning system. The main discovery was that LLM finds different (but valid) patterns than our manually-created expectations, suggesting we need to either:
1. Update our expected patterns to match reality
2. Implement preprocessing to ensure consistent pattern detection
3. Use a hybrid approach combining both methods

The evaluation plan in `/plans/preprocessed-pattern-evaluation-plan.md` provides a framework for making this decision based on data.