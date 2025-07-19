# Frequency Analysis Requirements

## Command Structure

This functionality will be implemented as a new `frequency` command in the Inspector CLI.

## Overview

This document defines the requirements for implementing frequency analysis of discriminative patterns across collected website data. The goal is to identify which headers, meta tags, and other patterns are truly discriminative for CMS/platform detection versus those that are generic across all platforms.

**Note**: This initial implementation focuses on frequency analysis of raw patterns without CMS detection correlation. CMS-based analysis will be added in a future iteration once we have ground-truth data.

## Core Requirements

### 1. Data Source and Scope

- **Source**: Use existing collected data from `data/cms-analysis/` directory (raw input data, not learn command output)
- **Deduplication**: For sites with multiple captures, use only the last good/complete capture
- **Temporal Tracking**: Record date/time of each capture for future filtering and trend analysis
- **Page-Level Tracking**: Track which page from a site was analyzed (mainpage vs. robots.txt)
- **Minimum Dataset Size**: Require at least 100 sites for statistically meaningful analysis

### 2. Data Elements to Track

#### 2.1 Headers

- **Full Name-Value Pairs**: Track both header name and value
    - Example: `x-powered-by: WordPress` (not just `x-powered-by`)
    - Empty values encoded as: `x-powered-by: <empty>`
- **Case Normalization**: Normalize header names to lowercase
- **Per-Page Headers**: Track headers separately by page type

#### 2.2 Meta Tags

- **Full Attribute-Value Pairs**: Track meta tag type and content
    - `name="generator" content="WordPress 6.0"`
    - `property="og:type" content="website"`
- **Empty values encoded as**: `generator: <empty>`

#### 2.3 Future Extensibility

Design system to easily add:

- Cookie names (from set-cookie headers)
- Script source patterns
- Link relations
- DOM patterns (classes, IDs, data attributes)

### 3. CMS Detection Tracking

**Deferred to Future Iteration**: CMS detection correlation will be added once ground-truth data is available for the analyzed sites.

### 4. Data Quality Requirements

#### 4.1 Good Data Criteria

- Successful data collection (no timeouts, errors)
- Non-error HTTP status codes (200, 301, 302, etc.)
- Not identified as bot detection page
- Not identified as error page (404, 500, etc.)
- Has minimum viable data (at least some headers and HTML content)

#### 4.2 Page Filtering

- Identify and filter out:
    - Bot detection pages (Cloudflare challenges, captchas)
    - Error pages (404, 500, maintenance pages)
    - Blank/empty responses
    - Pages with suspiciously low content

#### 4.3 Filtering Report
- Include a section in the output identifying which sites were filtered and why
- Track counts by filter reason (bot detection, error page, etc.)

### 5. Analysis Outputs

#### 5.1 Basic Frequency Metrics

For each distinct header/meta tag:

```
Header: x-powered-by
  Total occurrences: 45/100 sites (45%)
  Values:
    - "PHP/7.4.3": 20/100 (20%)
    - "WordPress": 15/100 (15%)
    - "Express": 8/100 (8%)
    - "<empty>": 2/100 (2%)
```

Sort values by occurrence frequency in descending order.

#### 5.2 Value Occurrence Report

For each header/value pair that meets minimum threshold (configurable, default 5 occurrences):

```
x-powered-by: WordPress
  Occurrences: 15/100 (15%)
  Page Distribution:
    - mainpage: 14/15 (93%)
    - robots.txt: 1/15 (7%)
```

#### 5.3 Statistical Metrics

- **Universality Score**: How common is this pattern across all sites? (percentage)
- **Value Diversity**: Number of unique values for each header
- **Top Values Report**: Most common values for each header

#### 5.4 Automated Filter Recommendations

The frequency analysis will provide recommendations for three commands:

##### 5.4.1 Current Usage Analysis
- **Learn Command**: Identify which headers/meta tags are currently filtered by discriminative filtering
- **Detect-CMS Command**: Identify which headers/meta tags are currently used in detection patterns
- **Ground-Truth Logic**: Review detection rules to identify which headers/meta tags are used

##### 5.4.2 Recommendations Report

```
LEARN COMMAND RECOMMENDATIONS
=============================
Headers Currently Filtered:
  - server (appears in 85% of sites)
  - cache-control (appears in 92% of sites)
  
Headers to Consider Filtering:
  - x-runtime (appears in 78% of sites, high diversity: 89 unique values)
  - x-request-time (appears in 65% of sites, high diversity: 100% unique values)
  
Headers to Keep (High Discriminative Value):
  - x-powered-by (15% occurrence, low diversity: 12 unique values)
  - x-generator (8% occurrence, low diversity: 5 unique values)

DETECT-CMS COMMAND RECOMMENDATIONS
=================================
New Pattern Opportunities:
  - Header "x-litespeed-cache" appears in 12% of sites, 95% correlation with WordPress
  - Meta tag "generator" with value "Joomla!" appears in 8% of sites
  
Pattern Refinements:
  - Current pattern for "x-powered-by: PHP" is too generic (appears in 35% of sites)
  
GROUND-TRUTH RECOMMENDATIONS
============================
Headers Used in Ground Truth:
  - x-powered-by (used in 15 rules)
  - x-generator (used in 8 rules)
  
Potential New Rules:
  - Sites with "x-drupal-*" headers (5% of sites) are likely Drupal
  - Meta tag "sailthru.platform" indicates custom platform integration
```

##### 5.4.3 Recommendation Criteria
- **High Universality (>70%)**: Recommend for filtering in learn command
- **High Diversity + High Frequency**: Likely non-discriminative (e.g., request IDs)
- **Low Diversity + Medium Frequency (5-30%)**: Potential detection patterns
- **Currently Filtered but Low Frequency (<5%)**: Consider removing from filters

### 6. Normalization Rules

#### 6.1 Header Normalization

- Convert header names to lowercase
- Trim whitespace
- Handle encoding variations

#### 6.2 Value Normalization

- **Case Normalization**: Convert values to lowercase for comparison (e.g., `WordPress` → `wordpress`)
- **Exact Value Matching**: Initially keep exact values without version stripping
- **Future Iteration**: Pattern grouping and version normalization to be added later

### 7. Technical Implementation Considerations

- **Incremental Processing**: Ability to add new captures without reprocessing everything
- **Memory Efficiency**: Stream processing for large datasets
- **Export Formats**: JSON, CSV, and human-readable reports
- **Filtering Capabilities**: Filter by date range
- **Caching**: Cache computed frequencies for performance

## Configuration Parameters

Based on the requirements analysis, the following parameters will be configurable:

1. **Minimum Occurrences Threshold**: Number of times a pattern must appear to be included in reports (default: 5)
2. **Minimum Dataset Size**: Minimum number of sites required for analysis (default: 100)
3. **Output Formats**: JSON, CSV, or human-readable report

## Implementation Phases

### Phase 1: Basic Frequency Analysis (Current)
- Raw frequency counts for headers and meta tags
- Value diversity metrics
- Per-page-type breakdowns
- Basic filtering and normalization
- Automated filter recommendations (see section 5.4)

### Phase 2: Pattern Analysis (Future)
- Co-occurrence patterns
- Header combinations
- Version normalization options

### Phase 3: CMS Correlation (Future)
- Integrate ground-truth CMS data
- Calculate discriminative scores
- CMS distribution analysis

### Phase 4: Advanced Analytics (Future)
- Temporal trend analysis
- Emerging/declining pattern detection
- Enhanced pattern correlation

## Summary of Decisions

1. **Data Source**: Use `data/cms-analysis/` for raw input data
2. **Normalization**: Lowercase normalization for both header names and values
3. **Version Handling**: Keep exact versions initially, iterate later
4. **Page Types**: Track and report separately (mainpage vs robots.txt)
5. **Minimum Thresholds**: 100 sites total, 5 occurrences per pattern
6. **CMS Analysis**: Deferred until ground-truth data available
7. **Advanced Features**: Co-occurrence, temporal analysis deferred to future iterations
