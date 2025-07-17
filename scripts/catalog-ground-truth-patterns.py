#!/usr/bin/env python3
"""
Ground Truth Pattern Catalog Generator
Analyzes actual CMS detection results to catalog real patterns by CMS type
"""

import json
import sys
import os
from pathlib import Path
from collections import defaultdict, Counter
from datetime import datetime

def load_json_file(filepath):
    """Load JSON file and return contents"""
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {filepath}: {e}")
        return None

def analyze_cms_patterns(cms_analysis_dir):
    """Analyze all CMS detection files and catalog patterns by CMS"""
    
    cms_patterns = defaultdict(lambda: {
        'sites': [],
        'all_patterns': Counter(),
        'pattern_frequencies': defaultdict(int),
        'unique_patterns': set()
    })
    
    total_files = 0
    processed_files = 0
    
    # Process all JSON files in cms-analysis directory
    cms_path = Path(cms_analysis_dir)
    
    for file in cms_path.glob('*.json'):
        if file.name in ['index.json', 'index.json.backup', 'index.json.pre-dns-cleanup', 'index.json.pre-v2-dedup']:
            continue
            
        total_files += 1
        data = load_json_file(file)
        
        if not data:
            continue
            
        # Extract CMS info from detectionResults
        detection_results = data.get('detectionResults', [])
        cms_name = None
        
        # Look for CMS in detection results
        for result in detection_results:
            if isinstance(result, dict) and result.get('cms'):
                cms_name = result['cms'].lower()
                break
        
        # Fallback to legacy cms field
        if not cms_name:
            cms_info = data.get('cms', {})
            if isinstance(cms_info, str):
                cms_name = cms_info.lower()
            elif isinstance(cms_info, dict):
                cms_name = cms_info.get('name', '').lower()
        
        if not cms_name or cms_name == 'unknown':
            continue
            
        # Extract URL
        url = data.get('url', 'unknown')
        
        # Extract patterns
        patterns = data.get('patterns', {})
        if not patterns:
            continue
            
        pattern_names = list(patterns.keys())
        
        # Store data
        cms_patterns[cms_name]['sites'].append({
            'url': url,
            'patterns': pattern_names,
            'pattern_count': len(pattern_names)
        })
        
        # Update counters
        cms_patterns[cms_name]['all_patterns'].update(pattern_names)
        for pattern in pattern_names:
            cms_patterns[cms_name]['pattern_frequencies'][pattern] += 1
            cms_patterns[cms_name]['unique_patterns'].add(pattern)
            
        processed_files += 1
    
    print(f"Processed {processed_files}/{total_files} files")
    return dict(cms_patterns)

def generate_catalog_report(cms_patterns, output_file):
    """Generate comprehensive catalog report"""
    
    report = {
        'generation_time': datetime.now().isoformat(),
        'summary': {
            'total_cms_types': len(cms_patterns),
            'cms_breakdown': {}
        },
        'cms_details': {}
    }
    
    # Generate summary
    for cms_name, data in cms_patterns.items():
        site_count = len(data['sites'])
        unique_pattern_count = len(data['unique_patterns'])
        total_pattern_instances = sum(data['all_patterns'].values())
        
        report['summary']['cms_breakdown'][cms_name] = {
            'total_sites': site_count,
            'unique_patterns': unique_pattern_count,
            'total_pattern_instances': total_pattern_instances,
            'avg_patterns_per_site': round(total_pattern_instances / site_count if site_count > 0 else 0, 2)
        }
    
    # Generate detailed analysis for each CMS
    for cms_name, data in cms_patterns.items():
        site_count = len(data['sites'])
        
        # Most common patterns (appear in >50% of sites)
        common_patterns = []
        frequent_patterns = []
        rare_patterns = []
        
        for pattern, frequency in data['pattern_frequencies'].items():
            percentage = (frequency / site_count) * 100 if site_count > 0 else 0
            
            pattern_info = {
                'pattern': pattern,
                'frequency': frequency,
                'percentage': round(percentage, 1)
            }
            
            if percentage >= 80:
                common_patterns.append(pattern_info)
            elif percentage >= 30:
                frequent_patterns.append(pattern_info)
            else:
                rare_patterns.append(pattern_info)
        
        # Sort by frequency
        common_patterns.sort(key=lambda x: x['frequency'], reverse=True)
        frequent_patterns.sort(key=lambda x: x['frequency'], reverse=True)
        rare_patterns.sort(key=lambda x: x['frequency'], reverse=True)
        
        # Top patterns overall
        top_patterns = sorted(
            [{'pattern': p, 'frequency': f, 'percentage': round((f/site_count)*100, 1)} 
             for p, f in data['pattern_frequencies'].items()],
            key=lambda x: x['frequency'], 
            reverse=True
        )[:20]
        
        report['cms_details'][cms_name] = {
            'total_sites': site_count,
            'unique_patterns': len(data['unique_patterns']),
            'pattern_analysis': {
                'common_patterns_80plus': common_patterns,
                'frequent_patterns_30to80': frequent_patterns,
                'rare_patterns_under30': rare_patterns,
                'top_20_patterns': top_patterns
            },
            'sites': data['sites'][:10],  # First 10 sites as examples
            'all_unique_patterns': sorted(list(data['unique_patterns']))
        }
    
    # Save report
    with open(output_file, 'w') as f:
        json.dump(report, f, indent=2, default=str)
    
    return report

def print_summary_report(cms_patterns):
    """Print a human-readable summary to console"""
    
    print(f"\n{'='*80}")
    print("GROUND TRUTH PATTERN CATALOG")
    print(f"{'='*80}")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Total CMS Types: {len(cms_patterns)}")
    print()
    
    # Summary table
    print(f"{'CMS':<15} {'Sites':<8} {'Unique Patterns':<15} {'Avg Patterns/Site':<18}")
    print(f"{'-'*15} {'-'*8} {'-'*15} {'-'*18}")
    
    for cms_name, data in sorted(cms_patterns.items()):
        site_count = len(data['sites'])
        unique_count = len(data['unique_patterns'])
        avg_patterns = sum(len(site['patterns']) for site in data['sites']) / site_count if site_count > 0 else 0
        
        print(f"{cms_name:<15} {site_count:<8} {unique_count:<15} {avg_patterns:<18.1f}")
    
    print()
    
    # Detailed breakdown for each CMS
    for cms_name, data in sorted(cms_patterns.items()):
        site_count = len(data['sites'])
        print(f"\n{'='*60}")
        print(f"{cms_name.upper()} - {site_count} sites")
        print(f"{'='*60}")
        
        # Top 15 most common patterns
        print("\nMost Common Patterns:")
        print(f"{'Pattern':<40} {'Sites':<8} {'%':<8}")
        print(f"{'-'*40} {'-'*8} {'-'*8}")
        
        top_patterns = sorted(data['pattern_frequencies'].items(), key=lambda x: x[1], reverse=True)[:15]
        for pattern, frequency in top_patterns:
            percentage = (frequency / site_count) * 100 if site_count > 0 else 0
            print(f"{pattern:<40} {frequency:<8} {percentage:<8.1f}")
        
        # Recommended discriminators (patterns in 60%+ of sites)
        discriminators = [pattern for pattern, freq in data['pattern_frequencies'].items() 
                         if (freq / site_count) >= 0.6] if site_count > 0 else []
        
        if discriminators:
            print(f"\nRecommended Discriminator Patterns (≥60% frequency):")
            for pattern in sorted(discriminators)[:10]:
                freq = data['pattern_frequencies'][pattern]
                pct = (freq / site_count) * 100
                print(f"  • {pattern} ({freq}/{site_count} sites, {pct:.1f}%)")
        
        print()

def main():
    if len(sys.argv) < 2:
        print("Usage: python catalog-ground-truth-patterns.py <cms-analysis-dir> [output-file]")
        sys.exit(1)
    
    cms_analysis_dir = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else f"ground-truth-pattern-catalog-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    
    if not os.path.exists(cms_analysis_dir):
        print(f"Error: Directory {cms_analysis_dir} does not exist")
        sys.exit(1)
    
    print("Analyzing ground truth CMS detection patterns...")
    cms_patterns = analyze_cms_patterns(cms_analysis_dir)
    
    if not cms_patterns:
        print("No CMS patterns found")
        sys.exit(1)
    
    print("Generating catalog report...")
    report = generate_catalog_report(cms_patterns, output_file)
    
    print_summary_report(cms_patterns)
    
    print(f"\n{'='*80}")
    print(f"COMPLETE CATALOG SAVED TO: {output_file}")
    print(f"{'='*80}")

if __name__ == "__main__":
    main()