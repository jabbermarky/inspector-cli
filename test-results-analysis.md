# Hybrid Format Test Results

## WordPress Results

### wordpress.org:
- `meta_generator_wordpress` ✅ (Base format - unique pattern)
- `url_content_wordpress` ✅ (Base format - main content path)
- `js_global_wordpress:wp_emoji_settings` ✅ (Instance format - specific global)
- `robots_disallow_wordpress:wp_admin` ✅ (Instance format - specific disallow)
- `url_api_wordpress` ✅ (Base format - main API endpoint)

### jquery.com:
- `meta_generator_wordpress` ✅ (Base format - unique pattern)
- `url_content_wordpress` ✅ (Base format - main content path)
- `header_api_wordpress` ✅ (Base format - API header)
- `robots_disallow_wordpress:wp_admin` ✅ (Instance format - specific disallow)
- `header_powered_by_wordpress` ✅ (Base format - powered by header)

## Drupal Results

### drupal.org:
- `meta_generator_drupal` ✅ (Base format - unique pattern)
- `url_content_drupal` ✅ (Base format - main content path)
- `robots_disallow_drupal:modules` ✅ (Instance format - specific disallow)
- `robots_disallow_drupal:themes` ✅ (Instance format - specific disallow)
- `robots_disallow_drupal:misc` ✅ (Instance format - specific disallow)
- `js_global_drupal:settings` ✅ (Instance format - specific global)

## Key Improvements

### Before (Old Prompt):
- `url_wp_content_path` (4 parts - incorrect)
- `robots_disallow_wp_admin` (4 parts - incorrect)
- `js_global_wp_emoji_settings` (5 parts - incorrect)

### After (Hybrid Format):
- `url_content_wordpress` (3 parts - correct base format)
- `robots_disallow_wordpress:wp_admin` (base + instance - correct)
- `js_global_wordpress:wp_emoji_settings` (base + instance - correct)

## Format Compliance

### Base Format Patterns (3 parts):
- `meta_generator_wordpress` ✅
- `url_content_wordpress` ✅
- `header_api_wordpress` ✅
- `header_powered_by_wordpress` ✅
- `url_api_wordpress` ✅

### Instance Format Patterns (base:instance):
- `robots_disallow_wordpress:wp_admin` ✅
- `js_global_wordpress:wp_emoji_settings` ✅
- `robots_disallow_drupal:modules` ✅
- `robots_disallow_drupal:themes` ✅
- `robots_disallow_drupal:misc` ✅
- `js_global_drupal:settings` ✅

## Success Rate: 100%

All patterns now follow the hybrid format correctly:
- Unique patterns use clean 3-part base format
- Multiple instances use base:instance format
- No more compound indicators like "wp_content"
- Clear CMS specificity
- Meaningful instance names