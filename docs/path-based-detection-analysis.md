# Path-Based CMS Detection Analysis: Domain Validation Requirements

## Executive Summary

Analysis of the ground-truth statistical rules reveals that current path-based detection patterns (e.g., `/wp-content/`, `/sites/`, `/media/`) are **too generic** and will produce false positives without domain validation. Evidence from real CMS data shows these patterns frequently appear in external resources, CDN-hosted content, and third-party scripts, making domain validation essential for accurate CMS detection.

## Problem Statement

The current ground-truth analysis generates rules that look for simple path patterns in script sources:

```json
{
  "pattern": "/wp-content/",
  "description": "Scripts loaded from wp-content directory",
  "confidence": 0.95
}
```

However, these patterns match **any** occurrence of the path, regardless of whether it's from the analyzed site or an external resource.

## Evidence from Data Analysis

### 1. CDN-Hosted Content

Many sites serve their CMS assets through Content Delivery Networks (CDNs), which can cause false positives:

```javascript
// Example from gravityforms.com (a WordPress site)
{
  "scripts": [
    {
      "src": "https://s38924.pcdn.co/wp-content/themes/gravityforms/js/..."
    }
  ]
}
```

**Problem**: A non-WordPress site loading resources from this CDN would be incorrectly identified as WordPress due to the `/wp-content/` pattern.

### 2. Cross-Site Resource Loading

Sites frequently load scripts from other CMS-based websites:

```javascript
// Non-WordPress site loading WordPress.com widgets
{
  "scripts": [
    {
      "src": "https://widgets.wp.com/likes/index.html"
    },
    {
      "src": "https://stats.wp.com/e-202550.js"
    }
  ]
}
```

**Problem**: These external scripts would trigger WordPress detection even though the analyzed site isn't using WordPress.

### 3. Third-Party Services Built on CMS Platforms

Many third-party services are themselves built on CMS platforms and expose these paths:

```javascript
// Analytics or plugin services that happen to use WordPress
{
  "scripts": [
    {
      "src": "https://example-analytics.com/wp-content/plugins/tracker/track.js"
    }
  ]
}
```

**Problem**: Using such a service would incorrectly flag the site as WordPress.

### 4. Generic Path Names

Some path patterns are too generic and not CMS-specific:

- `/media/` - Could be any media directory
- `/sites/` - Could be any multi-site platform
- `/content/` - Common directory name across many platforms
- `/includes/` - Generic includes directory

## Current Rule Limitations

### WordPress Rules
```json
{
  "pattern": "/wp-content/",
  "confidence": 0.95
}
```
**Issues**:
- Matches CDN-hosted WordPress content
- Matches WordPress.com widgets/stats
- Matches any third-party WordPress sites

### Drupal Rules
```json
{
  "pattern": "/sites/",
  "confidence": 0.78
}
```
**Issues**:
- Extremely generic path
- Could match non-Drupal multi-site systems
- No Drupal-specific context

### Joomla Rules
```json
{
  "pattern": "/media/",
  "confidence": 0.68
}
```
**Issues**:
- Very common directory name
- Used by many non-Joomla systems
- Low specificity

## Recommended Solutions

### 1. Implement Same-Origin Validation

All path-based rules should verify the resource is from the same domain:

```javascript
function validateSameOrigin(scriptSrc, pageUrl) {
  try {
    const scriptUrl = new URL(scriptSrc, pageUrl);
    const pageHost = new URL(pageUrl).hostname;
    
    // Handle subdomains (e.g., cdn.example.com vs www.example.com)
    const scriptDomain = scriptUrl.hostname.split('.').slice(-2).join('.');
    const pageDomain = pageHost.split('.').slice(-2).join('.');
    
    return scriptDomain === pageDomain;
  } catch {
    return false;
  }
}

// Usage in detection
const wpContentScripts = scripts.filter(script => 
  validateSameOrigin(script.src, pageUrl) && 
  script.src.includes('/wp-content/')
);
```

### 2. Use More Specific Path Patterns

Replace generic paths with CMS-specific patterns:

#### WordPress Patterns
- `/wp-content/themes/` - Theme directory
- `/wp-content/plugins/` - Plugin directory  
- `/wp-includes/js/jquery/` - WordPress's jQuery location
- `/wp-admin/` - Admin directory
- `/?rest_route=/wp/v2/` - REST API endpoint

#### Drupal Patterns
- `/sites/default/files/` - Default file storage
- `/sites/all/modules/` - Modules directory
- `/core/misc/drupal.js` - Drupal 8+ core file
- `/misc/drupal.js` - Drupal 7 core file
- `/libraries/` - Drupal libraries directory

#### Joomla Patterns
- `/media/system/js/` - System JavaScript
- `/components/com_content/` - Content component
- `/templates/system/` - System templates
- `/media/jui/js/` - Joomla UI scripts
- `/administrator/components/` - Admin components

### 3. Enhanced Rule Structure

Update the rule format to include validation requirements:

```json
{
  "feature": "hasWpContent",
  "type": "script-src",
  "pattern": "/wp-content/",
  "validation": {
    "requireSameOrigin": true,
    "allowSubdomains": true,
    "minimumOccurrences": 2
  },
  "contextPatterns": [
    "/wp-content/themes/",
    "/wp-content/plugins/"
  ],
  "description": "Scripts loaded from wp-content directory on same domain",
  "confidence": 0.95,
  "falsePositiveRisk": "high_without_validation"
}
```

### 4. Combination Rules

Use multiple indicators for higher confidence:

```javascript
const wordPressIndicators = {
  hasSameOriginWpContent: false,
  hasSameOriginWpIncludes: false,
  hasWpJsonApi: false,
  hasWpEmbed: false
};

// Check multiple indicators
scripts.forEach(script => {
  if (validateSameOrigin(script.src, pageUrl)) {
    if (script.src.includes('/wp-content/')) {
      wordPressIndicators.hasSameOriginWpContent = true;
    }
    if (script.src.includes('/wp-includes/')) {
      wordPressIndicators.hasSameOriginWpIncludes = true;
    }
  }
});

// Higher confidence with multiple indicators
const indicatorCount = Object.values(wordPressIndicators)
  .filter(v => v === true).length;
const confidence = indicatorCount / Object.keys(wordPressIndicators).length;
```

### 5. Exclude Known False Positive Patterns

Maintain a list of known external services that shouldn't trigger detection:

```javascript
const excludedDomains = [
  'wp.com',           // WordPress.com widgets
  'wordpress.com',    // WordPress.com resources
  'wpengine.com',     // WordPress hosting
  'pcdn.co',          // StackPath CDN
  'cloudflare.com',   // Cloudflare CDN
  'fastly.net',       // Fastly CDN
  'amazonaws.com',    // AWS CloudFront
  'akamaized.net'     // Akamai CDN
];

function shouldExclude(scriptUrl) {
  const url = new URL(scriptUrl);
  return excludedDomains.some(domain => 
    url.hostname.includes(domain)
  );
}
```

## Implementation Strategy

### Phase 1: Update Rule Generation

Modify the `ground-truth-analysis.cjs` tool to:
1. Track which scripts are same-origin vs external
2. Calculate separate confidence scores for same-origin patterns
3. Generate rules with domain validation requirements

### Phase 2: Update Detection Logic

Modify the detection strategies to:
1. Implement same-origin validation
2. Use more specific path patterns
3. Apply combination rules for higher confidence

### Phase 3: Test and Validate

1. Test against known false positive scenarios
2. Validate detection accuracy remains high
3. Document any edge cases discovered

## Impact Analysis

### Before Domain Validation
- **False Positive Rate**: High (estimated 20-30%)
- **Common Failures**: Sites using CDNs, loading third-party widgets
- **Confidence**: Unreliable for path-based patterns

### After Domain Validation
- **False Positive Rate**: Low (estimated <5%)
- **Accuracy**: Significantly improved
- **Confidence**: Path patterns become reliable indicators

## Edge Cases to Consider

### 1. Subdomain Handling
Sites may legitimately serve resources from subdomains:
- `cdn.example.com` serving files for `www.example.com`
- `static.example.com` serving files for `example.com`

**Solution**: Allow same-domain subdomains in validation.

### 2. Protocol-Relative URLs
Scripts may use protocol-relative URLs:
```html
<script src="//example.com/wp-content/..."></script>
```

**Solution**: Handle protocol-relative URLs in validation logic.

### 3. Relative Paths
Some scripts use relative paths:
```html
<script src="/wp-content/themes/..."></script>
<script src="wp-content/plugins/..."></script>
```

**Solution**: Resolve relative paths before validation.

## Conclusion

Path-based CMS detection patterns **must include domain validation** to be reliable. Without this validation, the detection system will produce numerous false positives from:

1. CDN-hosted CMS content
2. Third-party scripts from other CMS sites
3. External services built on CMS platforms
4. Generic path names that aren't CMS-specific

The recommended approach combines:
- Same-origin validation
- More specific path patterns
- Multiple indicator verification
- Known false positive exclusions

This will transform unreliable generic patterns into accurate CMS detection rules with significantly reduced false positive rates.

## Recommendations for Implementation

1. **Immediate**: Update rule generation to track domain information
2. **Short-term**: Implement same-origin validation in detection strategies
3. **Medium-term**: Develop combination rules using multiple indicators
4. **Long-term**: Build a comprehensive false positive exclusion system

The current path-based rules are a good starting point but require domain validation to be production-ready.