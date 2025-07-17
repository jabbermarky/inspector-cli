#!/usr/bin/env python3
"""
Normalize patterns to follow strict {source}_{indicator}_{specificity} format
"""

def normalize_pattern(pattern: str, cms: str) -> str:
    """Normalize a pattern to 3-part format"""
    
    # Mapping of problematic patterns to correct format
    normalization_map = {
        # WordPress
        "robots_disallow_wp_admin": "robots_disallow_wordpress",
        "url_wp_content_path": "url_content_wordpress",
        "js_global_wp_emoji_settings": "js_emoji_wordpress", 
        "file_wp_json_api": "file_api_wordpress",
        "header_link_wordpress_api": "header_api_wordpress",
        "header_powered_by_php": "header_powered_by_wordpress",
        
        # Drupal
        "header_generator_drupal": "header_generator_drupal",  # already correct
        "url_content_path_drupal_theme": "url_content_drupal",
        "robots_disallow_common_drupal": "robots_disallow_drupal",
        "js_global_drupal_settings": "js_settings_drupal",
        
        # Joomla
        "url_media_content_path": "url_content_joomla",
        "url_template_joomla_path": "url_template_joomla",
        "js_global_joomla_jtext": "js_jtext_joomla",
        "css_class_joomla_template": "css_template_joomla",
        
        # Duda
        "js_global_window_parameters": "js_global_duda",  # Keep as is - matches prompt
        "js_global_dm_api": "js_api_duda",
        "url_cdn_website": "url_cdn_duda",
        "file_js_runtime_flex_package": "file_runtime_duda",
        "meta_og_type_website": "meta_og_duda",
        "header_x_frame_options_sameorigin": "header_frame_duda",
    }
    
    # Direct mapping first
    if pattern in normalization_map:
        return normalization_map[pattern]
    
    # Auto-normalization rules
    parts = pattern.split('_')
    
    # If already 3 parts, check if valid
    if len(parts) == 3:
        source, indicator, specificity = parts
        valid_sources = ['meta', 'header', 'url', 'js', 'css', 'robots', 'file']
        if source in valid_sources:
            return pattern  # Already correct
    
    # Try to normalize 4+ part patterns
    if len(parts) >= 4:
        source = parts[0]
        specificity = cms.lower()
        
        # Collapse middle parts into indicator
        indicator = '_'.join(parts[1:-1]) if parts[-1] in ['wordpress', 'drupal', 'joomla', 'duda'] else '_'.join(parts[1:])
        
        # Simplify common indicators
        if 'wp_content' in indicator:
            indicator = 'content'
        elif 'global_wp_emoji' in indicator:
            indicator = 'emoji'
        elif 'wp_json' in indicator:
            indicator = 'api'
        elif 'drupal_settings' in indicator:
            indicator = 'settings'
        
        return f"{source}_{indicator}_{specificity}"
    
    return pattern  # Return as-is if can't normalize

# Test the normalization
test_patterns = [
    ("robots_disallow_wp_admin", "WordPress"),
    ("url_wp_content_path", "WordPress"),
    ("js_global_wp_emoji_settings", "WordPress"),
    ("meta_generator_wordpress", "WordPress"),
    ("url_content_path_drupal_theme", "Drupal"),
    ("js_global_drupal_settings", "Drupal"),
]

print("=== PATTERN NORMALIZATION TEST ===")
for pattern, cms in test_patterns:
    normalized = normalize_pattern(pattern, cms)
    print(f"{pattern} → {normalized}")