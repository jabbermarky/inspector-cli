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

**Last Updated**: January 8, 2025  
**Related Systems**: CMS Detection, Browser Management, Analysis Pipeline  
**Dependencies**: Puppeteer, File System, Browser Manager