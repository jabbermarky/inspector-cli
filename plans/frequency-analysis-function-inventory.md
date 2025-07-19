# Frequency Analysis Function Inventory

## Overview

This document inventories existing functions in the Inspector CLI codebase that can be reused for frequency analysis implementation. The goal is to leverage existing battle-tested code and avoid duplication.

## Key Findings

🎉 **Excellent News**: The codebase has ~80% of the functionality we need already implemented and production-ready!

## 1. Data Collection Functions

### ⭐ **PRIMARY REUSE CANDIDATES**

#### `DataStorage` Class (`src/utils/cms/analysis/storage.ts`)
- **Functions**: 
  - `query(query: AnalysisQuery)` - Query data with filtering
  - `getAllDataPoints()` - Retrieve all stored detection data
  - `getStatistics()` - Get storage statistics including CMS distribution
- **Input/Output**: Returns `DetectionDataPoint[]` arrays with rich CMS data
- **Status**: ✅ **IMMEDIATE USE** - Perfect for reading cms-analysis data
- **Decision**: Use directly

#### File Operations (`src/utils/file/operations.ts`)
- **Functions**:
  - `loadCSVFromFile()` - Security-validated CSV loading
  - `validateFilePath()` - File path security validation
- **Status**: ✅ **IMMEDIATE USE**
- **Decision**: Use directly

#### CSV Processing (`src/utils/utils.ts`)
- **Functions**:
  - `parseCSV()` - Parse CSV with configurable options
  - `extractUrlsFromCSV()` - Intelligent URL extraction
- **Status**: ✅ **IMMEDIATE USE**
- **Decision**: Use directly

## 2. Data Processing Functions

### ⭐ **PRIMARY REUSE CANDIDATES**

#### `PatternDiscovery` Class (`src/utils/cms/analysis/patterns.ts`)
- **Functions**:
  - `analyzeMetaTagPatterns()` - **EXACT MATCH** for meta tag frequency analysis
  - `analyzeScriptPatterns()` - Script pattern frequency analysis
  - `calculatePatternConfidence()` - Statistical confidence calculation
  - `createMetaTagKey()` - Standardized meta tag key generation
- **Input/Output**: Returns `Map<string, PatternAnalysisResult[]>` with frequency data
- **Status**: ✅ **IMMEDIATE USE** - This IS frequency analysis!
- **Decision**: Use directly - core of our implementation

#### `HttpHeaderStrategy` Class (`src/utils/cms/strategies/http-headers.ts`)
- **Functions**: Header normalization and pattern matching
- **Input/Output**: Processes header objects with case-insensitive matching
- **Status**: ✅ **IMMEDIATE USE** - Perfect for HTTP header processing
- **Decision**: Use directly

### 🔶 **ADAPTATION CANDIDATES**

#### `MetaTagStrategy` Class (`src/utils/cms/strategies/meta-tag.ts`)
- **Functions**: `extractVersion()` - Version extraction from meta content
- **Status**: 🔶 **ADAPT** - CMS-specific but patterns are useful
- **Decision**: Extract patterns for general use

#### `UrlNormalizer` Class (`src/utils/url/normalizer.ts`)
- **Functions**: `normalizeDomain()`, `cleanUrl()`
- **Status**: 🔶 **ADAPT** - URL-focused but pattern applies to headers
- **Decision**: Use normalization patterns

## 3. CMS Detection Functions

### 🔍 **REFERENCE/VALIDATION**

#### `GroundTruthDiscovery` Class (`src/ground-truth/GroundTruthDiscovery.ts`)
- **Functions**: Known CMS site validation and ground truth detection
- **Status**: 🔍 **REFERENCE** - For validating frequency analysis results
- **Decision**: Use for test data validation

#### Detection Strategies (`src/utils/cms/strategies/`)
- **Functions**: Pattern-based detection with confidence scoring
- **Status**: 🔍 **REFERENCE** - Too complex for frequency analysis
- **Decision**: Reference for understanding existing patterns

## 4. Reporting and Output Functions

### ⭐ **PRIMARY REUSE CANDIDATES**

#### `DataStorage.export()` (`src/utils/cms/analysis/storage.ts`)
- **Functions**: Export in JSON, JSONL, CSV formats
- **Input/Output**: `(format: 'json'|'jsonl'|'csv', outputPath: string) => void`
- **Status**: ✅ **IMMEDIATE USE** - Perfect for frequency analysis output
- **Decision**: Use directly

#### `AnalysisReporter` Class (`src/utils/cms/analysis/reports.ts`)
- **Functions**:
  - `generatePatternSummary()` - Comprehensive pattern reports
  - `generateComparativeAnalysis()` - Cross-CMS statistics
  - `generateDetectionRules()` - Rule suggestions from patterns
- **Status**: ✅ **IMMEDIATE USE** - Excellent templates for frequency reports
- **Decision**: Use as foundation for frequency reports

## 5. Supporting Utilities

### ⭐ **PRIMARY REUSE CANDIDATES**

#### Logging (`src/utils/logger.ts`)
- **Functions**: `createModuleLogger()` - Structured logging with performance tracking
- **Status**: ✅ **IMMEDIATE USE**
- **Decision**: Use directly

#### JSON Operations (`src/utils/utils.ts`)
- **Functions**: `validJSON()` - JSON validation utility
- **Status**: ✅ **IMMEDIATE USE**
- **Decision**: Use directly

#### URL Normalization (`src/ground-truth/normalize-url.ts`)
- **Functions**: URL normalization for deduplication
- **Status**: ✅ **IMMEDIATE USE** - Perfect for URL-based deduplication
- **Decision**: Use directly

## 6. Deduplication Logic

### ⭐ **PRIMARY REUSE CANDIDATES**

#### Built-in DataStorage Deduplication
- **Functions**: Automatic deduplication in DataStorage queries
- **Status**: ✅ **IMMEDIATE USE**
- **Decision**: Leverage existing logic

## Implementation Strategy

Based on this inventory, the frequency analysis can be implemented with:

### **Phase 1: Direct Reuse (80% of functionality)**
1. **Data Collection**: Use `DataStorage.getAllDataPoints()` directly
2. **Pattern Analysis**: Use `PatternDiscovery.analyzeMetaTagPatterns()` and similar
3. **Header Processing**: Use `HttpHeaderStrategy` normalization
4. **Output**: Use `DataStorage.export()` and `AnalysisReporter` templates
5. **Utilities**: Use existing logging, validation, and file operations

### **Phase 2: Minor Adaptations (15% of functionality)**
1. **Header Normalization**: Adapt URL normalization patterns
2. **Meta Tag Processing**: Extract patterns from `MetaTagStrategy`
3. **Custom Statistics**: Build on existing statistical helpers

### **Phase 3: New Code (5% of functionality)**
1. **Frequency-specific CLI options**
2. **Recommendation engine logic**
3. **Custom report formats**

## Files That Can Be Used Immediately

```typescript
// Direct imports for immediate use:
import { DataStorage } from '../utils/cms/analysis/storage.js';
import { PatternDiscovery } from '../utils/cms/analysis/patterns.js';
import { AnalysisReporter } from '../utils/cms/analysis/reports.js';
import { HttpHeaderStrategy } from '../utils/cms/strategies/http-headers.js';
import { loadCSVFromFile, validateFilePath } from '../utils/file/operations.js';
import { parseCSV, extractUrlsFromCSV } from '../utils/utils.js';
import { createModuleLogger } from '../utils/logger.js';
import normalizeUrl from '../ground-truth/normalize-url.js';
```

## Conclusion

The Inspector CLI codebase has excellent infrastructure for frequency analysis. We can implement the core functionality primarily by orchestrating existing, well-tested components rather than building from scratch.

**Recommendation**: Proceed with implementation using existing functions as the foundation, with minimal new code required.