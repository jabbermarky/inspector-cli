#!/usr/bin/env python3
"""
Generate Pattern Reorganization Recommendations
Based on LLM vs Expected Pattern analysis
"""

import json
import sys
from datetime import datetime

def load_analysis_report(filepath):
    """Load the LLM vs expected patterns analysis report"""
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {filepath}: {e}")
        return None

def generate_recommendations(report):
    """Generate specific recommendations for each CMS"""
    
    recommendations = {
        'generation_time': datetime.now().isoformat(),
        'source_analysis': report.get('generation_time', 'unknown'),
        'cms_recommendations': {}
    }
    
    detailed_analysis = report.get('detailed_analysis', {})
    
    # Normalize CMS names and combine data
    normalized_cms_data = {}
    
    cms_name_mapping = {
        'drupal': 'drupal',
        'drupal 7': 'drupal',
        'joomla': 'joomla', 
        'joomla!': 'joomla',
        'wordpress': 'wordpress',
        'duda': 'duda'
    }
    
    # Combine data for different variations of the same CMS
    for original_cms_name, data in detailed_analysis.items():
        normalized_name = cms_name_mapping.get(original_cms_name.lower())
        if not normalized_name:
            continue  # Skip custom/unknown CMS types
            
        if normalized_name not in normalized_cms_data:
            normalized_cms_data[normalized_name] = {
                'site_count': 0,
                'expected_patterns': {'found_patterns': [], 'missing_patterns': []},
                'unexpected_patterns': {'patterns': []},
                'all_found_patterns': {},
                'all_unexpected_patterns': {},
                'all_missing_patterns': set()
            }
        
        # Combine site counts
        normalized_cms_data[normalized_name]['site_count'] += data['site_count']
        
        # Combine pattern data
        for pattern_info in data['expected_patterns']['found_patterns']:
            pattern = pattern_info['pattern']
            if pattern not in normalized_cms_data[normalized_name]['all_found_patterns']:
                normalized_cms_data[normalized_name]['all_found_patterns'][pattern] = {
                    'frequency': 0, 'sites': []
                }
            normalized_cms_data[normalized_name]['all_found_patterns'][pattern]['frequency'] += pattern_info['frequency']
        
        for pattern_info in data['unexpected_patterns']['patterns']:
            pattern = pattern_info['pattern']
            if pattern not in normalized_cms_data[normalized_name]['all_unexpected_patterns']:
                normalized_cms_data[normalized_name]['all_unexpected_patterns'][pattern] = {
                    'frequency': 0, 'sites': []
                }
            normalized_cms_data[normalized_name]['all_unexpected_patterns'][pattern]['frequency'] += pattern_info['frequency']
        
        for pattern_info in data['expected_patterns']['missing_patterns']:
            normalized_cms_data[normalized_name]['all_missing_patterns'].add(pattern_info['pattern'])
    
    # Process normalized data
    for cms_name, combined_data in normalized_cms_data.items():
        site_count = combined_data['site_count']
        
        # Convert combined data back to the expected format with percentages
        found_patterns_list = []
        for pattern, data in combined_data['all_found_patterns'].items():
            percentage = (data['frequency'] / site_count) * 100 if site_count > 0 else 0
            found_patterns_list.append({
                'pattern': pattern,
                'frequency': data['frequency'],
                'percentage': percentage
            })
        
        unexpected_patterns_list = []
        for pattern, data in combined_data['all_unexpected_patterns'].items():
            percentage = (data['frequency'] / site_count) * 100 if site_count > 0 else 0
            unexpected_patterns_list.append({
                'pattern': pattern,
                'frequency': data['frequency'],
                'percentage': percentage
            })
        
        missing_patterns_list = [{'pattern': p} for p in combined_data['all_missing_patterns']]
        
        # Patterns to keep (found frequently)
        keep_patterns = []
        for pattern_info in found_patterns_list:
            if pattern_info['percentage'] >= 15:  # Found in 15%+ of sites
                keep_patterns.append({
                    'pattern': pattern_info['pattern'],
                    'frequency': pattern_info['frequency'],
                    'percentage': pattern_info['percentage'],
                    'reason': f"Found in {pattern_info['percentage']:.1f}% of sites"
                })
        
        # Patterns to remove (never found)
        remove_patterns = []
        for pattern_info in missing_patterns_list:
            remove_patterns.append({
                'pattern': pattern_info['pattern'],
                'reason': "Never found by LLM in any site"
            })
        
        # Patterns to add (LLM finds frequently)
        add_patterns = []
        for pattern_info in unexpected_patterns_list:
            if pattern_info['percentage'] >= 25:  # Found in 25%+ of sites
                add_patterns.append({
                    'pattern': pattern_info['pattern'],
                    'frequency': pattern_info['frequency'],
                    'percentage': pattern_info['percentage'],
                    'reason': f"Consistently found in {pattern_info['percentage']:.1f}% of sites"
                })
        
        # Patterns to consider (moderate frequency)
        consider_patterns = []
        for pattern_info in unexpected_patterns_list:
            if 10 <= pattern_info['percentage'] < 25:  # 10-25% frequency
                consider_patterns.append({
                    'pattern': pattern_info['pattern'],
                    'frequency': pattern_info['frequency'],
                    'percentage': pattern_info['percentage'],
                    'reason': f"Found in {pattern_info['percentage']:.1f}% of sites - consider adding"
                })
        
        recommendations['cms_recommendations'][cms_name] = {
            'sites_analyzed': site_count,
            'current_match_rate': f"{len(found_patterns_list)}/{len(found_patterns_list) + len(missing_patterns_list)} expected patterns found",
            'actions': {
                'keep_patterns': keep_patterns,
                'remove_patterns': remove_patterns,
                'add_patterns': add_patterns,
                'consider_patterns': consider_patterns[:10]  # Top 10 only
            },
            'summary': {
                'patterns_to_keep': len(keep_patterns),
                'patterns_to_remove': len(remove_patterns),
                'patterns_to_add': len(add_patterns),
                'total_new_expected': len(keep_patterns) + len(add_patterns)
            }
        }
    
    return recommendations

def print_recommendations(recommendations):
    """Print human-readable recommendations"""
    
    print(f"\n{'='*80}")
    print("PATTERN REORGANIZATION RECOMMENDATIONS")
    print(f"{'='*80}")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Based on analysis from: {recommendations.get('source_analysis', 'unknown')}")
    print()
    
    cms_recs = recommendations['cms_recommendations']
    
    # Summary table
    print(f"{'CMS':<12} {'Sites':<6} {'Keep':<5} {'Remove':<7} {'Add':<4} {'New Total':<10}")
    print(f"{'-'*12} {'-'*6} {'-'*5} {'-'*7} {'-'*4} {'-'*10}")
    
    for cms_name, data in cms_recs.items():
        summary = data['summary']
        print(f"{cms_name:<12} {data['sites_analyzed']:<6} {summary['patterns_to_keep']:<5} {summary['patterns_to_remove']:<7} {summary['patterns_to_add']:<4} {summary['total_new_expected']:<10}")
    
    # Detailed recommendations for each CMS
    for cms_name, data in cms_recs.items():
        print(f"\n{'='*60}")
        print(f"{cms_name.upper()} REORGANIZATION PLAN")
        print(f"{'='*60}")
        print(f"Sites analyzed: {data['sites_analyzed']}")
        print(f"Current status: {data['current_match_rate']}")
        
        actions = data['actions']
        
        print(f"\n✅ KEEP THESE PATTERNS ({len(actions['keep_patterns'])} patterns):")
        if actions['keep_patterns']:
            for item in actions['keep_patterns']:
                print(f"  ✓ {item['pattern']:<45} ({item['percentage']:5.1f}% - {item['reason']})")
        else:
            print("  None of the current expected patterns are found frequently enough")
        
        print(f"\n❌ REMOVE THESE PATTERNS ({len(actions['remove_patterns'])} patterns):")
        if actions['remove_patterns']:
            for item in actions['remove_patterns']:
                print(f"  ✗ {item['pattern']:<45} ({item['reason']})")
        else:
            print("  All current patterns are being found")
        
        print(f"\n➕ ADD THESE NEW PATTERNS ({len(actions['add_patterns'])} patterns):")
        if actions['add_patterns']:
            for item in actions['add_patterns']:
                print(f"  + {item['pattern']:<45} ({item['percentage']:5.1f}% - {item['reason']})")
        else:
            print("  No new high-frequency patterns discovered")
        
        print(f"\n🤔 CONSIDER THESE PATTERNS ({len(actions['consider_patterns'])} patterns):")
        if actions['consider_patterns']:
            for item in actions['consider_patterns']:
                print(f"  ? {item['pattern']:<45} ({item['percentage']:5.1f}% - {item['reason']})")
        else:
            print("  No moderate-frequency patterns to consider")
    
    print(f"\n{'='*80}")
    print("IMPLEMENTATION NOTES:")
    print(f"{'='*80}")
    print("1. High-frequency patterns (25%+) should definitely be added")
    print("2. Very low frequency patterns (<10%) may be site-specific, consider removing")
    print("3. Focus on patterns that appear across many different sites")
    print("4. Discriminator patterns should be high-frequency and CMS-specific")
    print("5. Update expected-patterns/*.json files based on these recommendations")

def generate_new_pattern_files(recommendations, output_dir):
    """Generate new pattern files based on recommendations"""
    
    import os
    from pathlib import Path
    
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)
    
    cms_mapping = {
        'wordpress': 'WordPress',
        'drupal': 'Drupal', 
        'joomla': 'Joomla',
        'duda': 'Duda'
    }
    
    for cms_name, data in recommendations['cms_recommendations'].items():
        if cms_name not in cms_mapping:
            continue
            
        actions = data['actions']
        
        # Combine keep + add patterns
        new_required_patterns = []
        new_discriminator_patterns = []
        
        # Add patterns to keep
        for item in actions['keep_patterns']:
            new_required_patterns.append(item['pattern'])
            if item['percentage'] >= 50:  # High frequency = good discriminator
                new_discriminator_patterns.append(item['pattern'])
        
        # Add new patterns
        for item in actions['add_patterns']:
            new_required_patterns.append(item['pattern'])
            if item['percentage'] >= 50:  # High frequency = good discriminator
                new_discriminator_patterns.append(item['pattern'])
        
        # Create new pattern file
        new_pattern_file = {
            "cms": cms_mapping[cms_name],
            "description": f"Required patterns for {cms_mapping[cms_name]} CMS detection - Updated based on LLM analysis",
            "version": "2.0",
            "last_updated": datetime.now().isoformat(),
            "analysis_source": "LLM pattern discovery results",
            "sites_analyzed": data['sites_analyzed'],
            "required_patterns": sorted(new_required_patterns),
            "discriminator_patterns": sorted(new_discriminator_patterns),
            "confidence_thresholds": {
                "high": 0.95,
                "medium": 0.90,
                "low": 0.85
            },
            "minimum_patterns_required": min(3, len(new_required_patterns)),
            "minimum_discriminators_required": min(2, len(new_discriminator_patterns)),
            "changelog": {
                "patterns_kept": len(actions['keep_patterns']),
                "patterns_removed": len(actions['remove_patterns']),
                "patterns_added": len(actions['add_patterns']),
                "previous_total": len(actions['keep_patterns']) + len(actions['remove_patterns']),
                "new_total": len(new_required_patterns)
            }
        }
        
        # Save new file
        output_file = output_path / f"{cms_name}-required-updated.json"
        with open(output_file, 'w') as f:
            json.dump(new_pattern_file, f, indent=2)
        
        print(f"Generated updated patterns for {cms_name}: {output_file}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python generate-pattern-recommendations.py <llm-analysis-report.json> [output-dir]")
        sys.exit(1)
    
    report_file = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "updated-patterns"
    
    print("Loading LLM vs expected patterns analysis...")
    report = load_analysis_report(report_file)
    
    if not report:
        print("Failed to load analysis report")
        sys.exit(1)
    
    print("Generating recommendations...")
    recommendations = generate_recommendations(report)
    
    # Save recommendations
    rec_file = f"pattern-reorganization-recommendations-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    with open(rec_file, 'w') as f:
        json.dump(recommendations, f, indent=2)
    
    print_recommendations(recommendations)
    
    print(f"\nGenerating updated pattern files in {output_dir}/...")
    generate_new_pattern_files(recommendations, output_dir)
    
    print(f"\n{'='*80}")
    print(f"RECOMMENDATIONS SAVED TO: {rec_file}")
    print(f"UPDATED PATTERN FILES IN: {output_dir}/")
    print(f"{'='*80}")

if __name__ == "__main__":
    main()