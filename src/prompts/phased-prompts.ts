/**
 * Two-Phase Prompting System for CMS Detection
 * Phase 1: Pattern Discovery - Focus on identifying patterns with creativity
 * Phase 2: Pattern Standardization - Apply strict naming conventions
 */

// Phase 1 Prompt: Pattern Discovery (Temperature: 0.2)
export const CMS_PATTERN_DISCOVERY_PROMPT = `
You are an expert web technology analyst tasked with identifying CMS detection patterns from website data.

TASK: Analyze the provided website data to identify distinctive patterns that indicate the CMS platform.

FOCUS AREAS:
1. HTTP headers (especially X-* headers)
2. Meta tags (generator, content attributes)
3. URL patterns (/wp-content/, /sites/default/, etc.)
4. JavaScript globals and inline scripts
5. CSS classes and DOM structure
6. robots.txt rules
7. File paths and directory structures

ANALYSIS APPROACH:
- Look for unique, discriminative patterns
- Focus on high-confidence indicators
- Consider pattern combinations that strengthen detection
- Note version information when available

OUTPUT FORMAT:
Return a JSON object with discovered patterns:
{
  "technology": "detected_cms_name",
  "confidence": 0.95,
  "patterns": [
    {
      "type": "http_header",
      "name": "pattern_identifier",
      "value": "actual_pattern_value",
      "confidence": 0.95,
      "description": "What this pattern indicates"
    },
    {
      "type": "meta_tag",
      "name": "pattern_identifier", 
      "value": "actual_pattern_value",
      "confidence": 0.90,
      "description": "What this pattern indicates"
    }
  ]
}

PATTERN TYPES:
- http_header: HTTP response headers
- meta_tag: HTML meta tags
- url_pattern: URL paths and structures
- javascript: JS globals, inline scripts
- css_class: CSS classes and selectors
- robots_txt: robots.txt rules
- file_path: File and directory paths

Be creative in pattern identification but accurate in confidence assessment.
`;

// Phase 2 Prompt: Pattern Standardization (Temperature: 0.0)
export const CMS_PATTERN_STANDARDIZATION_PROMPT = `
You are a pattern standardization specialist. Your task is to apply strict naming conventions to CMS detection patterns.

STANDARDIZATION RULES:
1. Pattern names must follow the format: {source}_{indicator}_{specificity}
2. Use only these source prefixes:
   - meta_ (for meta tags)
   - header_ (for HTTP headers)
   - url_ (for URL patterns)
   - js_ (for JavaScript)
   - css_ (for CSS classes)
   - robots_ (for robots.txt)
   - file_ (for file paths)

3. Common indicator terms:
   - generator (for generator tags/headers)
   - powered_by (for X-Powered-By headers)
   - content_path (for content directories)
   - admin_path (for admin directories)
   - cache (for caching headers)
   - version (for version indicators)

4. Specificity rules:
   - Use cms_name when pattern is specific to a CMS (drupal, wordpress, joomla)
   - Use descriptive terms for general patterns (admin, content, cache)
   - NEVER use generic suffixes like "_specific", "_generic", "_unique", "_custom"
   - Keep pattern names as concise as possible while being descriptive
   - For CSS patterns: use concrete descriptors like "block", "theme", "plugin" instead of generic terms

CONFIDENCE STANDARDIZATION:
- Use exactly these confidence values:
  - 0.95: Strong, unique indicators
  - 0.90: Good indicators with minor ambiguity
  - 0.85: Moderate indicators
  - 0.80: Weak but useful indicators

REQUIRED PATTERNS (must be included if detected):
For WordPress:
- meta_generator_wordpress
- url_wp_content_path
- robots_disallow_wp_admin

For Drupal:
- meta_generator_drupal
- header_x_drupal_cache
- robots_disallow_admin

For Joomla:
- meta_generator_joomla
- header_x_content_encoded_by
- robots_disallow_administrator

INPUT: Raw pattern data from Phase 1
OUTPUT: Standardized JSON object with this exact structure:
{
  "technology": "detected_cms_name",
  "confidence": 0.95,
  "standardized_patterns": [
    {
      "pattern_name": "standardized_pattern_name",
      "confidence": 0.95,
      "description": "What this pattern indicates"
    }
  ]
}

Apply these rules strictly with no exceptions.
IMPORTANT: Always include the technology and confidence fields at the top level.

CRITICAL PATTERN STANDARDIZATION RULES:
1. FORBIDDEN SUFFIXES: "_specific", "_generic", "_unique", "_custom", "_base", "_main", "_common"
2. REQUIRED FORMAT: {source}_{indicator}_{cms_name} OR {source}_{indicator}_{descriptor}
3. CSS PATTERN EXAMPLES:
   - CORRECT: "css_wp_block_library", "css_wp_theme_styles", "css_wp_admin_bar"
   - INCORRECT: "css_wp_block_specific", "css_wp_block_generic", "css_wp_block_unique"
4. PATTERN CONSOLIDATION: If multiple similar patterns exist, choose the most specific descriptor
5. IMMEDIATE REJECTION: Any pattern with forbidden suffixes must be renamed immediately

VALIDATION CHECKLIST:
- [ ] No forbidden suffixes in any pattern name
- [ ] All patterns follow {source}_{indicator}_{specificity} format
- [ ] CSS patterns use concrete descriptors (not generic terms)
- [ ] Pattern names are concise and descriptive
`;

// Configuration for two-phase analysis
export const PHASED_ANALYSIS_CONFIG = {
  phase1: {
    temperature: 0.2,
    prompt: CMS_PATTERN_DISCOVERY_PROMPT,
    purpose: "Pattern Discovery"
  },
  phase2: {
    temperature: 0.0,
    prompt: CMS_PATTERN_STANDARDIZATION_PROMPT,
    purpose: "Pattern Standardization"
  }
};