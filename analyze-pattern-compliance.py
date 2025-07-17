#!/usr/bin/env python3

patterns = [
    # WordPress
    "meta_generator_wordpress",           # ✅ meta_generator_wordpress
    "robots_disallow_wp_admin",          # ✅ robots_disallow_wp_admin
    "url_wp_content_path",               # ✅ url_wp_content_path
    "js_global_wp_emoji_settings",       # ✅ js_global_wp_emoji_settings
    "file_wp_json_api",                  # ✅ file_wp_json_api
    "header_link_wordpress_api",         # ✅ header_link_wordpress_api
    "header_powered_by_php",             # ❌ should be header_powered_by_wordpress
    
    # Drupal
    "meta_generator_drupal",             # ✅ meta_generator_drupal
    "header_generator_drupal",           # ❌ should be header_x_generator_drupal?
    "url_content_path_drupal_theme",     # ❌ 4 parts, should be url_content_path_drupal
    "robots_disallow_common_drupal",     # ❌ should be robots_disallow_admin
    "js_global_drupal_settings",         # ❌ should be js_settings_drupal
    
    # Joomla
    "meta_generator_joomla",             # ✅ meta_generator_joomla
    "url_media_content_path",            # ❌ missing CMS specificity, should be url_media_content_joomla
    "url_template_joomla_path",          # ❌ 4 parts, should be url_template_joomla
    "js_global_joomla_jtext",            # ❌ should be js_jtext_joomla
    "robots_disallow_administrator",     # ✅ robots_disallow_administrator
    "css_class_joomla_template",         # ❌ should be css_template_joomla
    
    # Duda
    "js_global_window_parameters",       # ✅ js_global_window_parameters (matches prompt)
    "js_global_dm_api",                  # ❌ should be js_global_dm_direct (matches prompt)
    "url_cdn_website",                   # ❌ missing CMS specificity, should be url_cdn_duda
    "file_js_runtime_flex_package",      # ❌ 4 parts, should be file_runtime_duda
    "meta_og_type_website",              # ❌ should be meta_og_type_duda
    "header_x_frame_options_sameorigin", # ❌ should be header_x_frame_options_duda
]

print("=== PATTERN COMPLIANCE ANALYSIS ===")
print("Format: {source}_{indicator}_{specificity}")
print()

compliant = []
non_compliant = []

for pattern in patterns:
    parts = pattern.split('_')
    
    # Check if it has exactly 3 parts
    if len(parts) == 3:
        source, indicator, specificity = parts
        
        # Check if source is valid
        valid_sources = ['meta', 'header', 'url', 'js', 'css', 'robots', 'file']
        if source in valid_sources:
            compliant.append(pattern)
        else:
            non_compliant.append(f"{pattern} - invalid source '{source}'")
    else:
        non_compliant.append(f"{pattern} - has {len(parts)} parts, need 3")

print(f"✅ COMPLIANT ({len(compliant)}):")
for pattern in compliant:
    print(f"  {pattern}")

print(f"\n❌ NON-COMPLIANT ({len(non_compliant)}):")
for issue in non_compliant:
    print(f"  {issue}")

print(f"\nCOMPLIANCE RATE: {len(compliant)}/{len(patterns)} = {len(compliant)/len(patterns)*100:.1f}%")