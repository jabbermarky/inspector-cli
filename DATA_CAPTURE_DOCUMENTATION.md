# Inspector CLI - Data Capture System Documentation

This document provides comprehensive documentation of the data capture functionality in the CMS detection system.

## 🎯 Overview

The Inspector CLI includes a sophisticated data capture mechanism that collects comprehensive website data during CMS detection. This system supports analysis, pattern discovery, and data-driven rule generation for expanding CMS detection capabilities.

## 🚀 How Data Capture Works

### Activation
Data collection is enabled via the `--collect-data` CLI flag:

```bash
# Single URL with data collection
node dist/index.js detect-cms <url> --collect-data

# Batch CSV processing with data collection  
node dist/index.js detect-cms <csv-file> --collect-data
```

### Processing Flow
1. **Initialization**: `CMSDetectionIterator` creates a `DataCollector` instance when `--collect-data` is enabled
2. **Isolation**: Each URL gets a fresh isolated browser context to prevent cross-contamination
3. **Collection**: Comprehensive data is extracted during page navigation
4. **Detection**: CMS detection runs on the collected data
5. **Storage**: All data is persisted via the `DataStorage` class
6. **Cleanup**: Browser resources are properly cleaned up after each URL

## 🏗️ Architecture

### Core Classes

| Class | File Location | Purpose |
|-------|---------------|---------|
| `DataCollector` | `src/utils/cms/analysis/collector.ts` | Main collection engine |
| `DataStorage` | `src/utils/cms/analysis/storage.ts` | Storage and retrieval system |
| `CMSDetectionIterator` | `src/utils/cms/index.ts` | Orchestrates collection and detection |

### Configuration Interface

```typescript
interface CollectionConfig {
    includeHtmlContent: boolean;      // Store full HTML content
    includeDomAnalysis: boolean;      // Analyze DOM for CMS patterns
    includeScriptAnalysis: boolean;   // Capture and analyze scripts/styles
    maxHtmlSize: number;             // HTML content size limit (default: 500KB)
    maxScriptSize: number;           // Script content size limit (default: 10KB)
    timeout: number;                 // Collection timeout (default: 10s)
    retryAttempts: number;           // Retry attempts on failure (default: 2)
    respectRobots: boolean;          // Honor robots.txt (default: true)
    compress: boolean;               // Enable data compression
    outputFormat: 'json' | 'jsonl' | 'csv'; // Export format
}
```

## 📊 Data Captured

### Core Metadata
- **URL Information**: Original URL, final URL, redirect chain
- **Timestamp**: ISO 8601 formatted capture time
- **User Agent**: Browser user agent used for capture
- **Navigation Metrics**: Load time, redirect count, protocol upgrades

### HTTP Response Data
- **Headers**: Complete HTTP response headers
- **Status Codes**: Response status and status text
- **Content Info**: Content type, content length, encoding

### HTML Analysis
- **Content**: Full HTML content (limited by `maxHtmlSize`)
- **Meta Tags**: All meta tags with name, property, content, and http-equiv attributes
- **Title**: Page title
- **Size Metrics**: HTML content size and structure statistics

### DOM Structure Analysis
- **CMS Elements**: CMS-specific DOM selectors and elements
- **Element Counts**: Statistics on various element types
- **Attributes**: Analysis of CMS-indicative attributes
- **Samples**: Representative element samples for pattern analysis

### Resource Analysis
- **Scripts**: 
  - Inline and external scripts (up to first 50)
  - Script content analysis (limited by `maxScriptSize`)
  - Source URLs and attributes
- **Stylesheets**: 
  - Inline and external CSS (up to first 20)
  - Stylesheet URLs and media attributes
- **Links**: Analysis of link elements (href, rel, type)
- **Forms**: Form actions, methods, and field type analysis

### External Data
- **robots.txt**: Content and parsing results
- **Sitemaps**: Sitemap URLs discovered from robots.txt
- **Crawl Policies**: Crawl delay and access restrictions

### Performance Metrics
- **Load Time**: Page navigation and load timing
- **Resource Count**: Number of resources loaded
- **Navigation Timing**: Detailed browser timing metrics

### Detection Results
- **CMS Detection**: Results from all detection strategies
- **Confidence Scores**: Confidence levels and supporting evidence
- **Execution Times**: Performance metrics per detector
- **Error Information**: Any detection failures or issues

## 💾 Storage Structure

### Directory Structure
```
./data/cms-analysis/
├── index.json              # Master index of all captures
├── mct9ca9y-aHR0cDovL3.json # Individual capture files
├── n4t8xb2z-bHR0cHM6Ly9.json
└── ...
```

### File Naming Convention
- **Format**: `{timeHash}-{urlHash}.json`
- **timeHash**: Base36 encoded timestamp for chronological sorting
- **urlHash**: Base64 encoded URL (truncated) for uniqueness
- **Example**: `mct9ca9y-aHR0cDovL3.json`

### Index File Schema
The `index.json` file contains metadata for efficient querying:

```json
{
  "files": [
    {
      "id": "mct9ca9y-aHR0cDovL3",
      "url": "http://www.emailonacid.com", 
      "timestamp": "2025-07-07T15:30:06.982Z",
      "cms": "Unknown",
      "confidence": 0,
      "fileSize": 156742,
      "complete": true
    }
  ],
  "metadata": {
    "totalFiles": 1,
    "totalSize": 156742,
    "lastUpdated": "2025-07-07T15:30:06.982Z"
  }
}
```

### Individual Capture File Schema
Each capture file contains a complete `DetectionDataPoint`:

```json
{
  "url": "http://www.emailonacid.com",
  "timestamp": "2025-07-07T15:30:06.982Z",
  "finalUrl": "https://www.emailonacid.com/",
  "redirectCount": 1,
  "protocolUpgraded": true,
  "httpHeaders": {
    "content-type": "text/html; charset=UTF-8",
    "server": "nginx",
    // ... complete headers
  },
  "metaTags": [
    {
      "name": "description",
      "content": "Email testing and optimization platform"
    }
    // ... all meta tags
  ],
  "htmlContent": "<!DOCTYPE html>...", // Full HTML (up to maxHtmlSize)
  "domElements": [
    {
      "selector": "[name*='wp']",
      "count": 0,
      "samples": []
    }
    // ... CMS-specific DOM analysis
  ],
  "scripts": [
    {
      "type": "external",
      "src": "https://example.com/script.js",
      "size": 1234
    }
    // ... script analysis
  ],
  "stylesheets": [
    {
      "type": "external", 
      "href": "https://example.com/style.css",
      "media": "all"
    }
    // ... stylesheet analysis
  ],
  "robots": {
    "content": "User-agent: *\nDisallow:",
    "crawlDelay": null,
    "sitemaps": []
  },
  "performanceMetrics": {
    "loadTime": 1234,
    "resourceCount": 45
  },
  "detectionResults": [
    {
      "detector": "WordPressDetector",
      "cms": "Unknown",
      "confidence": 0,
      "evidence": [],
      "executionTime": 234
    }
    // ... all detector results
  ]
}
```

## 🚫 Blocking Detection

### Overview
The data capture system includes sophisticated blocking detection to identify when websites prevent access or return invalid responses. This is critical for understanding data quality and planning recollection strategies.

### Blocking Patterns Detected

The system identifies multiple types of blocking:

| Blocking Type | Detection Method | Indicators |
|---------------|------------------|------------|
| **CloudFront** | Header/Content Analysis | `x-amz-cf-id` header, CloudFront error messages |
| **Cloudflare** | Header/Content Analysis | `cf-ray` header, Cloudflare verification pages |
| **HTTP 403 Forbidden** | Status Code | 403 status, "Access Denied" content |
| **HTTP 429 Rate Limited** | Status Code | 429 status code |
| **Server Errors** | Status Code | 500+ status codes |
| **Bot Detection** | Content Analysis | "Bot detection", "robot" keywords |
| **Invalid Response** | Content Analysis | Minimal HTML, missing structure |

### Detection Implementation

Blocking detection occurs during data analysis:

```typescript
// Enhanced blocking detection logic
if (htmlContent.includes('Cloudflare') || 
    htmlContent.includes('cf-browser-verification') ||
    headers['cf-ray'] || 
    headers.server?.includes('cloudflare')) {
  blocked = 'Cloudflare';
} else if (headers['x-amz-cf-id'] || 
           headers.via?.includes('CloudFront') ||
           htmlContent.includes('ERROR: The request could not be satisfied')) {
  blocked = 'CloudFront';
} else if (statusCode === 403) {
  blocked = 'Access Denied (403)';
}
// ... additional patterns
```

### Completeness Criteria

A capture is considered **incomplete** if:
- HTML content is missing or < 500 bytes
- HTTP headers are missing or < 3 headers
- Meta tags are not captured
- DOM elements are not analyzed
- robots.txt is not retrieved

### Analysis Results

Based on the analysis of 893 captured URLs:
- **Total Blocked Sites**: 23 (2.6%)
- **Incomplete Captures**: 52 (5.8%)
- **Most Common Blocker**: CloudFront (based on previous analysis)

### Using Blocking Information

The blocking status is available in:
1. **Index File**: Quick reference for all captures
2. **Analysis Reports**: Detailed blocking breakdowns
3. **Individual Data Files**: Complete context for each blocked request

This information helps:
- Identify sites needing different collection strategies
- Plan user agent rotation for blocked sites
- Understand CDN/WAF deployment patterns
- Improve collection success rates

## ⚙️ Configuration Options

### CLI Configuration
- `--collect-data`: Enable comprehensive data collection (disabled by default for performance)

### Default Collection Settings
The system uses these default settings when `--collect-data` is enabled:

```typescript
const defaultConfig: CollectionConfig = {
    includeHtmlContent: true,
    includeDomAnalysis: true,
    includeScriptAnalysis: true,
    maxHtmlSize: 500000,        // 500KB
    maxScriptSize: 10000,       // 10KB
    timeout: 10000,             // 10 seconds
    retryAttempts: 2,
    respectRobots: true,
    compress: true,
    outputFormat: 'json'
};
```

### Customization
Collection settings are configured in the `CMSDetectionIterator` constructor and can be customized through the codebase.

## 🔍 Analysis and Query Capabilities

### Query Interface
The system supports rich querying through the `AnalysisQuery` interface:

```typescript
interface AnalysisQuery {
    urls?: string[];              // Filter by specific URLs
    cmsTypes?: string[];          // Filter by detected CMS types
    dateRange?: {                 // Time-based filtering
        start: Date;
        end: Date;
    };
    minConfidence?: number;       // Minimum confidence threshold
    includeUnknown?: boolean;     // Include unknown CMS results
    groupBy?: 'cms' | 'domain' | 'date'; // Result grouping
}
```

### Export Formats
Data can be exported in multiple formats:

- **JSON**: Complete data structure with full detail
- **JSONL**: Line-delimited JSON for streaming and processing
- **CSV**: Flattened summary data for spreadsheet analysis

### Statistics and Analytics
The system provides comprehensive statistics:

- **Coverage**: Total data points and storage utilization
- **CMS Distribution**: Breakdown by detected CMS types
- **Confidence Analysis**: Distribution of confidence scores
- **Temporal Analysis**: Capture trends over time
- **Performance Metrics**: Collection and detection timing

## 🔄 Integration with CMS Detection

### Seamless Integration
Data capture integrates transparently with the detection process:

1. **Parallel Operation**: Collection occurs during normal detection flow
2. **Fallback Handling**: If collection fails, falls back to standard detection
3. **Resource Sharing**: Uses the same browser context for efficiency
4. **Error Isolation**: Collection errors don't affect detection results

### Data-Driven Analysis
Collected data enables advanced analysis:

- **Offline Pattern Analysis**: Analyze data without re-visiting websites
- **Rule Generation**: Develop new detection rules from real-world data
- **Machine Learning**: Train models on comprehensive website features
- **A/B Testing**: Compare detection strategies on historical data

## 🎯 Use Cases

### Current Applications
- **Batch Analysis**: Collect data from large URL sets for comprehensive analysis
- **Pattern Discovery**: Identify new CMS detection patterns in real websites
- **Rule Validation**: Test detection rules against diverse website data
- **Performance Analysis**: Measure detection accuracy and execution timing

### Future Applications (Planned)
- **Automated Rule Generation**: Generate detection rules from data patterns
- **Machine Learning Training**: Train ML models for CMS detection
- **Market Analysis**: Analyze CMS adoption trends and patterns
- **Community Datasets**: Share anonymized training data for research

## 🔐 Privacy and Ethics

### Data Handling
- **Robots.txt Compliance**: Respects robots.txt by default
- **Size Limits**: Implements reasonable limits to avoid excessive data collection
- **Error Handling**: Graceful handling of access restrictions and errors
- **Cleanup**: Proper resource cleanup prevents memory leaks

### Best Practices
- Only collect data when explicitly enabled via `--collect-data` flag
- Respect website terms of service and robots.txt directives
- Use collected data responsibly for legitimate analysis purposes
- Consider data privacy implications when sharing or publishing results

## 📈 Performance Considerations

### Collection Overhead
- Data collection adds ~20-30% overhead to detection time
- Disabled by default to maintain CLI performance
- Uses isolated browser contexts to prevent interference
- Implements timeouts and limits to prevent hanging

### Storage Efficiency
- JSON compression reduces storage footprint
- Configurable size limits prevent excessive disk usage
- Index file enables fast querying without reading all data
- Efficient file naming supports chronological access patterns

## 🛠️ Development and Maintenance

### Adding New Data Points
To capture additional data, extend the `DetectionDataPoint` interface and update the `DataCollector` class collection methods.

### Storage Backend
The current implementation uses local file storage. The modular design allows for future backends (databases, cloud storage, etc.).

### Testing
Comprehensive unit tests cover data collection, storage, and retrieval functionality. Tests use mocked browser environments for consistency.

---

# ✅ Version Tracking Implementation (COMPLETED)

## Production Version System

The data capture system now includes comprehensive version tracking that addresses the original concerns about algorithm evolution and result consistency.

### Current Implementation Status

**✅ Completed Features:**
- **Multi-component versioning schema** with schema, engine, algorithms, patterns, and features
- **Session-based version caching** for optimal performance
- **Automatic git commit hash capture** for traceability
- **Comprehensive feature flag scanning** for complete context
- **Session history tracking** in `data/scan-history.json`
- **Algorithm version baseline** (Detection: v3, Confidence: v2)
- **Migration script** for existing captures
- **Algorithm-based deduplication** with version precedence

### Version Schema Structure

```typescript
interface CaptureVersion {
  schema: string;           // "1", "2", "3" - simple incrementing
  engine: {
    version: string;        // from package.json
    commit: string;         // git commit hash
    buildDate: string;      // ISO timestamp
  };
  algorithms: {
    detection: string;      // "1", "2", "3" - increments for strategies/weights/bugs
    confidence: string;     // "1", "2", "3" - increments for calculation changes
  };
  patterns: {
    lastUpdated: string;    // latest mtime from all src/utils/cms/ files
  };
  features: {
    [key: string]: any;     // All config values auto-scanned
    experimentalFlags: string[];
  };
}
```

### Algorithm Version Triggers

Version increments are triggered by:
- **Detection Algorithm**: New strategies, weight changes, pattern changes, bug fixes
- **Confidence Algorithm**: Calculation method changes, normalization changes, threshold changes

See `src/utils/cms/ALGORITHM_VERSIONING.md` for complete documentation.

### Usage in Practice

**Data Collection:**
```bash
# Automatically includes version info in all captures
node dist/index.js detect-cms urls.csv --collect-data
```

**Migration:**
```bash
# Re-version existing captures
node migrate-existing-captures.js
```

**Deduplication:**
```bash
# Use algorithm versions for duplicate resolution
node algorithm-based-deduplication.js
```

### Benefits Achieved

1. **Algorithm Evolution Tracking**: Each capture knows exactly which detection algorithm was used
2. **Informed Deduplication**: Duplicate resolution prefers newer algorithm versions
3. **Debugging Capability**: Version info helps determine if results are from old algorithms
4. **Quality Assurance**: Can filter analysis by algorithm version for consistent comparisons
5. **Regression Detection**: Compare performance across algorithm versions

### File Integration

- **Individual captures**: Include `captureVersion` field with complete version info
- **Index file**: Includes version summary for efficient filtering
- **Scan history**: Tracks version info for every detect-cms invocation with --collect-data
- **Migration support**: Backward-compatible with existing data

---

# Future Work (HISTORICAL)
  ## Version Tracking is Essential (ADDRESSED ABOVE)

  You're absolutely right - when you have nearly identical data sizes
  but different CMS detection results, it strongly suggests the
  detection algorithm changed between captures, not the website
  itself. This indicates:

  1. Algorithm Evolution: Your detection strategies, confidence
  thresholds, or pattern matching rules have likely improved over time
  2. Data Interpretation Changes: The same HTML/headers/DOM elements
  are being interpreted differently by different versions
  3. Quality Improvements: Newer versions presumably have better
  detection accuracy

  ## Why This Matters

  For Deduplication: Without version tracking, you can't make informed
   decisions about which duplicate to keep. You'd naturally want to
  keep results from the latest/best algorithm version.

  For Analysis: When analyzing detection accuracy or patterns, mixing
  results from different algorithm versions would give misleading
  insights.

  For Debugging: If you see unexpected results, knowing the algorithm
  version helps determine if it's a regression or an old issue.

  ## What to Track

  Beyond just a version number, consider tracking:
  - Algorithm version: The detection logic version
  - Pattern/rules version: If detection patterns are data-driven
  - Feature flags: Any experimental features enabled during capture
  - Confidence calculation method: How confidence scores were computed

  Implementation Considerations

  This version info should be stored both in:
  - Individual capture files (for full context)
  - The index.json (for efficient filtering/analysis)

  This would let you:
  - Filter analysis by algorithm version
  - Prefer newer algorithm results during deduplication
  - Track algorithm performance improvements over time
  - Re-run old captures with new algorithms for comparison

  

## Proposed Versioning Schema Design

  1. Version Components

  I propose a multi-component versioning system that tracks different
  aspects of the capture and detection process:

  ``` JSON
  captureVersion: {
    schema: "1.0.0",           // Data structure version
    engine: {
      version: "2.3.1",        // Inspector CLI version
      commit: "abc123def",     // Git commit hash (optional)
      buildDate: "2025-01-08"  // Build timestamp
    },
    algorithms: {
      capture: "1.2.0",        // Browser automation & data collection
   logic
      detection: "3.1.0",      // CMS detection algorithm version
      confidence: "1.0.0"      // Confidence calculation method
    },
    patterns: {
      wordpress: "2.1.0",      // Individual detector versions
      drupal: "1.5.0",
      joomla: "1.3.0",
      dataDate: "2025-01-07"   // When patterns were last updated
    },
    features: {
      userAgentRotation: true,
      enhancedDomAnalysis: true,
      robotsRespect: true,
      experimentalFlags: []
    }
  }
```

  2. Versioning Strategy

  Semantic Versioning for Each Component:
  - Major: Breaking changes (new detection approach, incompatible data
   format)
  - Minor: New features/patterns (new CMS support, enhanced detection)
  - Patch: Bug fixes (corrected patterns, performance improvements)

  3. Storage Locations

  In Capture Files: Full version object stored with each capture
  In Index: Simplified version for efficient filtering
  In Config: Current version definitions

  4. Version Comparison Rules

  For deduplication, establish precedence:
  1. Schema version (must be compatible)
  2. Detection algorithm (prefer newer)
  3. Pattern versions (prefer newer for relevant CMS)
  4. Capture date (tiebreaker)

  5. Migration Path

  Backward Compatibility:
  - Assume version 1.0.0 for existing captures without version info
  - Migration script to add version data to existing files
  - Version compatibility matrix for analysis tools

  6. Use Cases Enabled

  1. Smart Deduplication: "Keep capture with latest detection
  algorithm"
  2. Performance Tracking: "Compare WordPress detection accuracy
  between v2.0.0 and v2.1.0"
  3. Regression Detection: "Find URLs where older algorithm performed
  better"
  4. Selective Reprocessing: "Re-analyze all v1.x captures with v2.x
  algorithm"

  7. Future Considerations

  - Remote Pattern Updates: Patterns could be updated without code
  changes
  - A/B Testing: Run multiple algorithm versions in parallel
  - Deprecation Notices: Mark old versions as deprecated
  - Compatibility Matrix: Define which versions can be compared

## Possible Outcomes from Version Changes
1. Data Size Patterns:
  - Significant changes in average data size
  - Data fields appearing/disappearing
1. CMS Detection Patterns:
  - Sudden shifts in Unknown vs Known CMS ratios, in either direction
  - Changes in confidence score distributions, in all directions
  - Detected CMS types appearing, or disappearing

## What to Look For

- Volume changes: 10 URLs/hour → 100 URLs/hour = new approach
- Filename pattern changes: The file naming convention might have
  evolved

- Algorithm Change Indicators:
  - Shift in success/failure ratios
  - Different error patterns
  - Changes in which sites get blocked
  - Systematic differences in detection results for similar sites
