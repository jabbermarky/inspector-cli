#!/usr/bin/env python3
"""
Map LLM Patterns to Ground Truth Discriminative Features
Creates proper hybrid naming format based on existing ground truth features
"""

import json
import sys
from datetime import datetime

def load_llm_analysis(filepath):
    """Load the LLM vs expected patterns analysis"""
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {filepath}: {e}")
        return None

def create_ground_truth_mapping():
    """Create mapping from ground truth discriminative features to hybrid pattern names"""
    
    # Based on src/ground-truth/discriminative-features.ts
    ground_truth_mapping = {
        # WordPress patterns (from discriminative-features.ts)
        'hasWpContent': 'url_content_wordpress',  # Scripts from /wp-content/
        'hasWpContentInHtml': 'url_content_wordpress',  # HTML contains wp-content
        'hasWpJsonLink': 'url_api_wordpress:rest',  # wp-json API references
        
        # Drupal patterns
        'hasDrupalSites': 'url_sites_drupal',  # Scripts from /sites/
        'generatorContainsDrupal': 'meta_generator_drupal',  # Generator meta tag
        'hasDrupalDynamicCacheHeader': 'header_cache_drupal',  # X-Drupal-Dynamic-Cache
        'hasDrupalSettingsJson': 'js_settings_drupal:object',  # drupal-settings-json
        'hasDrupalMessagesFallback': 'js_messages_drupal',  # data-drupal-messages-fallback
        'hasDrupalSettingsExtend': 'js_settings_drupal',  # jQuery.extend(Drupal.settings
        'hasDrupalJavaScript': 'js_object_drupal',  # Drupal JavaScript namespace
        
        # Joomla patterns  
        'hasJoomlaTemplates': 'url_template_joomla',  # Stylesheets from /templates/
        'hasJoomlaScriptOptions': 'js_global_joomla',  # joomla-script-options
        'generatorContainsJoomla': 'meta_generator_joomla',  # Generator meta tag
        'hasJoomlaJUI': 'url_media_joomla',  # Scripts from /media/jui/js/
        'hasJoomlaMedia': 'url_media_joomla',  # Scripts from /media/
        
        # Duda patterns
        'hasWindowParameters': 'js_global_duda:window_parameters',  # window.Parameters
        'hasDudaOneSiteType': 'js_global_duda:site_type',  # SiteType: atob('RFVEQU9ORQ==')
        'hasDMDirectProductId': 'js_global_duda:product_id',  # productId: 'DM_DIRECT'
        'hasDmBodySelector': 'css_class_duda:dm_body',  # BlockContainerSelector: '.dmBody'
        'hasIrpCdnWebsite': 'url_cdn_duda:irp',  # irp.cdn-website.com
        'hasLirpCdnWebsite': 'url_cdn_duda:lirp',  # lirp.cdn-website.com  
        'hasUSDirectProduction': 'js_global_duda:system_id',  # SystemID: 'US_DIRECT_PRODUCTION'
        'hasDudaMobileDomain': 'url_api_duda',  # dudamobile.com references
        'hasDmAlbumClasses': 'css_class_duda:design',  # dmAlbum or dmRespImg classes
        'hasDudaBuilderIdentifiers': 'meta_generator_duda',  # duda_website_builder identifiers
    }
    
    return ground_truth_mapping

def create_llm_pattern_mapping():
    """Create mapping from LLM patterns to standardized hybrid names"""
    
    llm_mapping = {
        # WordPress LLM patterns -> Hybrid format
        'meta_generator_wordpress': 'meta_generator_wordpress',  # Already correct
        'url_wp_content_path': 'url_content_wordpress',  # Standardize to ground truth
        'robots_disallow_wp_admin': 'robots_disallow_wordpress:wp_admin',  # Add CMS suffix
        'url_content_wordpress': 'url_content_wordpress',  # Already correct
        'header_api_wordpress': 'header_api_wordpress',  # Already correct
        'url_api_wordpress': 'url_api_wordpress',  # Already correct
        'header_powered_by_wordpress': 'header_powered_wordpress',  # Standardize
        'js_wpemoji_settings': 'js_emoji_wordpress',  # Standardize
        'js_wp_emoji_settings': 'js_emoji_wordpress',  # Merge duplicates
        'url_wp_includes_path': 'url_includes_wordpress',  # Standardize
        'css_wp_block_library': 'css_block_library_wordpress',  # Standardize
        
        # Drupal LLM patterns -> Hybrid format
        'meta_generator_drupal': 'meta_generator_drupal',  # Already correct
        'header_generator_drupal': 'header_generator_drupal',  # Already correct  
        'url_content_drupal': 'url_content_drupal',  # Already correct
        'header_cache_drupal': 'header_cache_drupal',  # Already correct
        'robots_disallow_admin': 'robots_disallow_drupal:admin',  # Add CMS suffix
        'js_drupal_settings': 'js_settings_drupal',  # Standardize
        'robots_disallow_drupal:core': 'robots_disallow_drupal:core',  # Already correct
        'robots_disallow_drupal:modules': 'robots_disallow_drupal:modules',  # Already correct
        'header_x_drupal_cache': 'header_cache_drupal:dynamic',  # Standardize
        
        # Joomla LLM patterns -> Hybrid format  
        'meta_generator_joomla': 'meta_generator_joomla',  # Already correct
        'robots_disallow_joomla:administrator': 'robots_disallow_joomla:administrator',  # Already correct
        'robots_disallow_administrator': 'robots_disallow_joomla:administrator',  # Add CMS suffix
        'js_joomla_script_options': 'js_global_joomla',  # Standardize
        'js_global_joomla:jtext': 'js_global_joomla:jtext',  # Already correct
        'url_media_joomla': 'url_media_joomla',  # Already correct
        'url_component_joomla': 'url_component_joomla',  # Already correct
        'url_template_joomla': 'url_template_joomla',  # Already correct
        
        # Duda LLM patterns -> Hybrid format
        'js_global_duda:window_parameters': 'js_global_duda:window_parameters',  # Already correct
        'url_cdn_duda': 'url_cdn_duda',  # Already correct
        'js_global_duda:parameters': 'js_global_duda:window_parameters',  # Merge similar
        'js_global_duda:SystemID': 'js_global_duda:system_id',  # Standardize case
        'meta_generator_duda': 'meta_generator_duda',  # Already correct  
        'js_global_duda:dmAPI': 'js_api_duda:dm',  # Standardize
        'header_cache_duda': 'header_cache_duda',  # Already correct
        'robots_sitemap_duda': 'robots_sitemap_duda',  # Already correct
        'js_runtime_duda': 'js_runtime_duda',  # Already correct
    }
    
    return llm_mapping

def generate_wordpress_recommendations():
    """Generate WordPress recommendations using proper hybrid naming"""
    
    ground_truth_patterns = [
        'meta_generator_wordpress',  # 90.9% - from ground truth generatorContainsWordPress (not implemented yet)
        'url_content_wordpress',  # 49.4% + 46.8% combined - from hasWpContent + hasWpContentInHtml  
        'robots_disallow_wordpress:wp_admin',  # 48.1% + 24.7% combined - standardized
        'header_api_wordpress',  # 26.0% - WordPress REST API headers
        'url_api_wordpress',  # 15.6% - WordPress API endpoints
    ]
    
    # Additional patterns to consider based on ground truth discriminative features
    consider_patterns = [
        'url_api_wordpress:rest',  # From hasWpJsonLink (REST API) 
        'header_powered_wordpress',  # X-Powered-By: WordPress header
        'js_emoji_wordpress',  # WordPress emoji scripts (merged wpemoji variants)
        'url_includes_wordpress',  # /wp-includes/ directory references
        'css_block_library_wordpress',  # WordPress block library CSS
    ]
    
    return {
        'required_patterns': ground_truth_patterns,
        'discriminator_patterns': ground_truth_patterns[:3],  # Top 3 most reliable
        'consider_patterns': consider_patterns,
        'notes': [
            'Combined url_wp_content_path + url_content_wordpress into url_content_wordpress',
            'Combined robots_disallow_wp_admin + robots_disallow_wordpress:wp_admin patterns',
            'Merged js_wpemoji_settings + js_wp_emoji_settings into js_emoji_wordpress',
            'Based on ground truth discriminative features from src/ground-truth/'
        ]
    }

def main():
    if len(sys.argv) < 2:
        print("Usage: python map-llm-to-ground-truth.py <llm-analysis-report.json>")
        sys.exit(1)
    
    report_file = sys.argv[1]
    
    print("Loading LLM analysis...")
    llm_report = load_llm_analysis(report_file)
    if not llm_report:
        sys.exit(1)
    
    print("Creating pattern mappings...")
    ground_truth_mapping = create_ground_truth_mapping()
    llm_mapping = create_llm_pattern_mapping()
    
    print("Generating WordPress recommendations...")
    wordpress_recs = generate_wordpress_recommendations()
    
    # Create final mapping report
    mapping_report = {
        'generation_time': datetime.now().isoformat(),
        'source': 'Ground truth discriminative features + LLM analysis',
        'ground_truth_mapping': ground_truth_mapping,
        'llm_pattern_mapping': llm_mapping,
        'wordpress_recommendations': wordpress_recs,
        'notes': [
            'Hybrid naming format: {source}_{indicator}_{cms} or {source}_{indicator}_{cms}:{instance}',
            'Based on existing discriminative features in src/ground-truth/discriminative-features.ts',
            'LLM patterns mapped to consistent naming convention',
            'Focus on patterns that appear in ground truth analysis'
        ]
    }
    
    # Save mapping report
    output_file = f"llm-ground-truth-mapping-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    with open(output_file, 'w') as f:
        json.dump(mapping_report, f, indent=2)
    
    print(f"\n{'='*80}")
    print("WORDPRESS PATTERN RECOMMENDATIONS (Ground Truth Based)")
    print(f"{'='*80}")
    
    print("\n✅ REQUIRED PATTERNS (5 patterns):")
    for pattern in wordpress_recs['required_patterns']:
        print(f"  • {pattern}")
    
    print("\n🎯 DISCRIMINATOR PATTERNS (3 patterns):")
    for pattern in wordpress_recs['discriminator_patterns']:
        print(f"  • {pattern}")
    
    print("\n🤔 CONSIDER FOR FUTURE (5 patterns):")
    for pattern in wordpress_recs['consider_patterns']:
        print(f"  • {pattern}")
    
    print("\n📝 IMPLEMENTATION NOTES:")
    for note in wordpress_recs['notes']:
        print(f"  • {note}")
    
    print(f"\n{'='*80}")
    print(f"COMPLETE MAPPING SAVED TO: {output_file}")
    print(f"{'='*80}")
    print("\nNext steps:")
    print("1. Review ground truth discriminative features in src/ground-truth/discriminative-features.ts")
    print("2. Add missing WordPress generator pattern to ground truth features")
    print("3. Update expected-patterns files using hybrid naming format")
    print("4. Test pattern detection using ground truth analysis tools")

if __name__ == "__main__":
    main()