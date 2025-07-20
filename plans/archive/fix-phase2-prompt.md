# Phase 2 Prompt Fix Suggestions

## Current Problem
LLM is creating 4+ part patterns instead of 3-part format:
- `url_wp_content_path` instead of `url_content_wordpress`
- `js_global_wp_emoji_settings` instead of `js_emoji_wordpress`

## Suggested Phase 2 Prompt Changes

### 1. Make Format Rules More Explicit
```
CRITICAL: Each pattern name must have EXACTLY 3 parts separated by underscores:
- Part 1: Source (meta, header, url, js, css, robots, file)
- Part 2: Indicator (generator, content, admin, cache, etc.)
- Part 3: Specificity (wordpress, drupal, joomla, duda, OR descriptive term)

EXAMPLES:
✅ CORRECT: meta_generator_wordpress (3 parts)
✅ CORRECT: url_content_wordpress (3 parts) 
✅ CORRECT: js_settings_drupal (3 parts)
❌ WRONG: url_wp_content_path (4 parts - consolidate to url_content_wordpress)
❌ WRONG: js_global_wp_emoji_settings (5 parts - consolidate to js_emoji_wordpress)
```

### 2. Add Validation Step
```
VALIDATION REQUIREMENT:
Before finalizing any pattern name, count the underscores:
- If pattern has 2 underscores (3 parts): ✅ VALID
- If pattern has 3+ underscores (4+ parts): ❌ INVALID - must be consolidated

CONSOLIDATION RULES:
- url_wp_content_path → url_content_wordpress
- js_global_wp_emoji_settings → js_emoji_wordpress
- header_link_wordpress_api → header_api_wordpress
```

### 3. CMS-Specific Examples
```
WordPress patterns must end with "_wordpress":
- meta_generator_wordpress
- url_content_wordpress  
- js_emoji_wordpress
- css_theme_wordpress
- robots_disallow_wordpress

Drupal patterns must end with "_drupal":
- meta_generator_drupal
- url_content_drupal
- js_settings_drupal
```