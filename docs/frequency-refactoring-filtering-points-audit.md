# Filtering Points Audit - Phase 1 Analysis

## Executive Summary

The frequency analysis system has **inconsistent filtering application** across components, leading to the data inconsistencies Mark identified. The `minOccurrences` threshold is applied multiple times in some components and not consistently across the architecture.

## Complete Filtering Application Map

### 1. Header Analysis Pipeline

#### First Filtering Point: header-analyzer.ts (Line 75)
```typescript
// File: src/frequency/header-analyzer.ts:75
if (stats.count >= options.minOccurrences) {
```
- **Applied to**: Individual header value occurrences
- **Data Type**: `stats.count` (integer occurrence count)
- **Semantics**: Filters out header values that don't appear frequently enough
- **Status**: ✅ Correct application

#### Second Filtering Point: analyzer.ts formatHeaderData() (Line 234)
```typescript
// File: src/frequency/analyzer.ts:234
.filter(p => p.frequency >= options.minOccurrences / totalSites)
```
- **Applied to**: Header patterns after conversion to frequency
- **Data Type**: `p.frequency` (decimal 0.0-1.0)
- **Semantics**: Re-filters patterns based on frequency threshold
- **Status**: ❌ **DOUBLE FILTERING BUG** - Applied again to same data

### 2. Meta Tag Analysis Pipeline

#### First Filtering Point: meta-analyzer.ts (Line 109)
```typescript
// File: src/frequency/meta-analyzer.ts:109
if (stats.sites.size >= options.minOccurrences) {
```
- **Applied to**: Unique sites using meta tag
- **Data Type**: `stats.sites.size` (integer site count)
- **Semantics**: Filters meta tags based on site usage
- **Status**: ✅ Correct application

#### Second Filtering Point: analyzer.ts formatMetaTagData() (Line 316)
```typescript
// File: src/frequency/analyzer.ts:316
.filter(p => p.frequency >= options.minOccurrences / totalSites)
```
- **Applied to**: Meta tag patterns after conversion to frequency
- **Data Type**: `p.frequency` (decimal 0.0-1.0)
- **Semantics**: Re-filters patterns based on frequency threshold
- **Status**: ❌ **DOUBLE FILTERING BUG** - Applied again to same data

### 3. Script Analysis Pipeline

#### Single Filtering Point: script-analyzer.ts (Line 101)
```typescript
// File: src/frequency/script-analyzer.ts:101
if (data.siteCount >= options.minOccurrences) {
```
- **Applied to**: Unique sites using script pattern
- **Data Type**: `data.siteCount` (integer site count)
- **Semantics**: Filters scripts based on site usage
- **Status**: ✅ **CORRECT** - Single application, proper semantics

#### Formatting: analyzer.ts formatScriptData() (Line 345)
```typescript
// File: src/frequency/analyzer.ts:345
if (pattern.frequency >= options.minOccurrences / totalSites) {
```
- **Applied to**: Script patterns during formatting
- **Data Type**: `pattern.frequency` (decimal 0.0-1.0)
- **Semantics**: Pass-through validation during formatting
- **Status**: ⚠️ Potentially redundant, but doesn't create double-filtering since script-analyzer already filtered correctly

### 4. Bias Detection Pipeline

#### Single Filtering Point: bias-detector.ts (Line 362)
```typescript
// File: src/frequency/bias-detector.ts:362
if (correlation.overallOccurrences >= options.minOccurrences) {
```
- **Applied to**: Header correlations after all calculations
- **Data Type**: `correlation.overallOccurrences` (integer unique site count)
- **Semantics**: Filters correlations based on sample size adequacy
- **Status**: ✅ **CORRECT** - Single application after analysis complete

### 5. Other Threshold Applications

#### Statistical Significance Thresholds
```typescript
// File: src/frequency/statistical-tests.ts
// Various statistical thresholds applied to correlation analysis
// These are separate from minOccurrences filtering
```

#### Confidence Thresholds
```typescript
// File: src/frequency/recommender.ts
// Various confidence thresholds for recommendations
// These use computed confidence scores, not raw occurrence counts
```

## Filtering Inconsistency Analysis

### Double Filtering Bug Pattern

**Components Affected**: Headers, Meta Tags

**Root Cause**: The formatting functions in `analyzer.ts` re-apply `minOccurrences` filtering to data that was already filtered during collection.

**Mathematical Impact**:
- First filter: Removes patterns with < N occurrences/sites
- Second filter: Removes patterns with < N/totalSites frequency
- **For small N**: Second filter can be more restrictive than first
- **For large N**: Second filter can be less restrictive than first
- **Result**: Inconsistent and unpredictable filtering behavior

### Correct Single Filtering Pattern

**Components**: Scripts, Bias Detection

**Architecture**: Apply filtering once, at the appropriate semantic level:
- **Scripts**: Filter during collection based on site count
- **Bias Detection**: Filter after analysis based on statistical adequacy

## Semantic Filtering Issues

### 1. Occurrence Count vs Site Count Confusion

| Component | Filters Based On | Semantic Meaning | Correctness |
|-----------|------------------|------------------|-------------|
| **Headers** | Occurrence count | How many times header appears | ❌ Wrong - should count sites |
| **Meta Tags** | Site count | How many sites use meta tag | ✅ Correct |
| **Scripts** | Site count | How many sites use script pattern | ✅ Correct |
| **Bias Detection** | Site count | Statistical sample size | ✅ Correct |

### 2. Frequency Threshold Conversion Issues

**Problem**: Converting `minOccurrences` (integer) to frequency threshold `minOccurrences / totalSites` (decimal) creates precision and semantic issues.

**Example**:
- `minOccurrences = 5`, `totalSites = 4569`
- Frequency threshold = `5 / 4569 = 0.001094`
- A pattern with frequency `0.001000` (≈4.57 sites) gets filtered out
- But it should be included if it appears in 5+ sites

## Filter Application Timing Issues

### Early vs Late Filtering Trade-offs

**Early Filtering** (during collection):
- ✅ **Pro**: More memory efficient
- ✅ **Pro**: Faster processing 
- ❌ **Con**: Can't adjust thresholds without recollection
- ❌ **Con**: Loses data for statistical analysis

**Late Filtering** (after analysis):
- ✅ **Pro**: Maintains raw data for statistical calculations
- ✅ **Pro**: Allows threshold adjustment
- ❌ **Con**: Higher memory usage
- ❌ **Con**: Processes data that might be filtered out

**Current Inconsistency**: Some components filter early, others late, some both.

## Recommended Filtering Strategy

Based on this analysis, the refactoring should implement:

### 1. Single Filtering Point
- Apply `minOccurrences` filtering **once** per component
- Choose timing based on statistical and memory requirements

### 2. Consistent Semantics  
- All filtering based on **unique site counts**, not occurrence counts
- Use integer comparisons, not frequency threshold conversions

### 3. Statistical Adequacy
- Filter after analysis completion (like bias-detector.ts)
- Preserve raw data for statistical calculations
- Apply filtering when outputting results

### 4. Reference Implementation
- Use **script-analyzer.ts** as the pattern to follow
- Single filtering during collection
- Proper site-based semantics
- No double filtering in formatting

## Impact on Data Consistency

**Current Impact**:
- Headers: Inconsistent counts due to double filtering + occurrence counting
- Meta Tags: Moderate inconsistency due to double filtering only
- Scripts: Consistent and correct
- Bias Detection: Consistent and correct

**Post-Refactoring Expected Impact**:
- All components will use consistent unique site counting
- Single filtering application eliminates mathematical impossibilities
- Cross-component data comparisons will be meaningful
- Reporter tables will show consistent counts

This filtering audit provides the foundation for Phase 2 architectural design decisions.