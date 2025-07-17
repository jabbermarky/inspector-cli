#!/usr/bin/env python3
"""
LLM vs Expected Pattern Analysis
Compares what the LLM actually produces against our expected patterns
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

def extract_patterns_from_phase2(analysis_data):
    """Extract standardized patterns from Phase 2 analysis result"""
    patterns = set()
    
    # Check for new phased analysis format in llmResponse
    if 'llmResponse' in analysis_data and 'phasedAnalysis' in analysis_data['llmResponse']:
        if analysis_data['llmResponse']['phasedAnalysis'] and 'phases' in analysis_data['llmResponse']:
            phases = analysis_data['llmResponse']['phases']
            # Phase 2 is at index 1
            if isinstance(phases, list) and len(phases) > 1:
                phase2 = phases[1]
                if 'result' in phase2 and 'standardized_patterns' in phase2['result']:
                    for pattern in phase2['result']['standardized_patterns']:
                        if 'pattern_name' in pattern:
                            patterns.add(pattern['pattern_name'])
    
    return patterns

def extract_patterns_from_phase1(analysis_data):
    """Extract raw patterns from Phase 1 discovery result"""
    patterns = set()
    
    if 'llmResponse' in analysis_data and 'phasedAnalysis' in analysis_data['llmResponse']:
        if analysis_data['llmResponse']['phasedAnalysis'] and 'phases' in analysis_data['llmResponse']:
            phases = analysis_data['llmResponse']['phases']
            # Phase 1 is at index 0
            if isinstance(phases, list) and len(phases) > 0:
                phase1 = phases[0]
                if 'result' in phase1 and 'patterns' in phase1['result']:
                    for pattern in phase1['result']['patterns']:
                        if 'name' in pattern:
                            patterns.add(pattern['name'])
    
    return patterns

def load_expected_patterns(expected_patterns_dir):
    """Load expected patterns for each CMS"""
    expected_patterns = {}
    
    pattern_files = [
        ('wordpress', 'wordpress-required.json'),
        ('drupal', 'drupal-required.json'),
        ('joomla', 'joomla-required.json'),
        ('duda', 'duda-required.json')
    ]
    
    for cms_name, filename in pattern_files:
        filepath = Path(expected_patterns_dir) / filename
        if filepath.exists():
            data = load_json_file(filepath)
            if data:
                expected_patterns[cms_name] = {
                    'required_patterns': set(data.get('required_patterns', [])),
                    'discriminator_patterns': set(data.get('discriminator_patterns', []))
                }
    
    return expected_patterns

def analyze_llm_patterns(learn_results_dir, expected_patterns_dir):
    """Analyze LLM patterns vs expected patterns"""
    
    # Load expected patterns
    expected_patterns = load_expected_patterns(expected_patterns_dir)
    
    cms_analysis = defaultdict(lambda: {
        'sites': [],
        'phase1_patterns': Counter(),
        'phase2_patterns': Counter(), 
        'unique_phase1': set(),
        'unique_phase2': set(),
        'expected_found': Counter(),
        'unexpected_found': Counter()
    })
    
    total_files = 0
    processed_files = 0
    
    # Process all JSON files in learn results directory
    learn_path = Path(learn_results_dir)
    
    for file in learn_path.rglob('*.json'):
        total_files += 1
        data = load_json_file(file)
        
        if not data:
            continue
            
        # Extract CMS detection from Phase 1
        cms_name = None
        if 'llmResponse' in data and 'phasedAnalysis' in data['llmResponse']:
            if data['llmResponse']['phasedAnalysis'] and 'phases' in data['llmResponse']:
                phases = data['llmResponse']['phases']
                if isinstance(phases, list) and len(phases) > 0:
                    phase1 = phases[0]
                    if 'result' in phase1 and 'technology' in phase1['result']:
                        cms_name = phase1['result']['technology']
                        if cms_name:
                            cms_name = cms_name.lower()
        
        if not cms_name:
            continue
            
        # Extract URL
        url = 'unknown'
        if 'metadata' in data and 'url' in data['metadata']:
            url = data['metadata']['url']
        elif 'inputData' in data and 'url' in data['inputData']:
            url = data['inputData']['url']
        
        # Extract patterns from both phases
        phase1_patterns = extract_patterns_from_phase1(data)
        phase2_patterns = extract_patterns_from_phase2(data)
        
        # Analyze against expected patterns
        expected_for_cms = expected_patterns.get(cms_name, {})
        required_patterns = expected_for_cms.get('required_patterns', set())
        
        found_expected = phase2_patterns.intersection(required_patterns)
        found_unexpected = phase2_patterns - required_patterns
        
        # Store analysis
        cms_analysis[cms_name]['sites'].append({
            'url': url,
            'phase1_patterns': list(phase1_patterns),
            'phase2_patterns': list(phase2_patterns),
            'found_expected': list(found_expected),
            'found_unexpected': list(found_unexpected),
            'expected_completeness': len(found_expected) / len(required_patterns) if required_patterns else 0
        })
        
        # Update counters
        cms_analysis[cms_name]['phase1_patterns'].update(phase1_patterns)
        cms_analysis[cms_name]['phase2_patterns'].update(phase2_patterns)
        cms_analysis[cms_name]['unique_phase1'].update(phase1_patterns)
        cms_analysis[cms_name]['unique_phase2'].update(phase2_patterns)
        cms_analysis[cms_name]['expected_found'].update(found_expected)
        cms_analysis[cms_name]['unexpected_found'].update(found_unexpected)
        
        processed_files += 1
    
    print(f"Processed {processed_files}/{total_files} files")
    return dict(cms_analysis), expected_patterns

def generate_comparison_report(cms_analysis, expected_patterns, output_file):
    """Generate comprehensive comparison report"""
    
    report = {
        'generation_time': datetime.now().isoformat(),
        'summary': {
            'total_cms_types': len(cms_analysis),
            'comparison_overview': {}
        },
        'detailed_analysis': {}
    }
    
    # Generate comparison overview
    for cms_name, data in cms_analysis.items():
        site_count = len(data['sites'])
        expected_for_cms = expected_patterns.get(cms_name, {})
        required_patterns = expected_for_cms.get('required_patterns', set())
        
        avg_completeness = sum(site['expected_completeness'] for site in data['sites']) / site_count if site_count > 0 else 0
        
        report['summary']['comparison_overview'][cms_name] = {
            'total_sites_analyzed': site_count,
            'expected_patterns_defined': len(required_patterns),
            'unique_phase2_patterns_found': len(data['unique_phase2']),
            'average_expected_completeness': round(avg_completeness * 100, 1),
            'patterns_found_but_not_expected': len(data['unexpected_found']),
            'expected_patterns_never_found': len(required_patterns - data['expected_found'].keys())
        }
    
    # Detailed analysis per CMS
    for cms_name, data in cms_analysis.items():
        expected_for_cms = expected_patterns.get(cms_name, {})
        required_patterns = expected_for_cms.get('required_patterns', set())
        discriminator_patterns = expected_for_cms.get('discriminator_patterns', set())
        
        # Pattern frequency analysis
        phase2_by_frequency = sorted(data['phase2_patterns'].items(), key=lambda x: x[1], reverse=True)
        
        # Expected vs Found analysis
        expected_found = []
        expected_missing = []
        unexpected_found = []
        
        for pattern in required_patterns:
            if pattern in data['expected_found']:
                frequency = data['expected_found'][pattern]
                percentage = (frequency / len(data['sites'])) * 100 if data['sites'] else 0
                expected_found.append({
                    'pattern': pattern,
                    'frequency': frequency,
                    'percentage': round(percentage, 1),
                    'is_discriminator': pattern in discriminator_patterns
                })
            else:
                expected_missing.append({
                    'pattern': pattern,
                    'is_discriminator': pattern in discriminator_patterns
                })
        
        for pattern, frequency in data['unexpected_found'].items():
            percentage = (frequency / len(data['sites'])) * 100 if data['sites'] else 0
            unexpected_found.append({
                'pattern': pattern,
                'frequency': frequency,
                'percentage': round(percentage, 1)
            })
        
        # Sort by frequency
        expected_found.sort(key=lambda x: x['frequency'], reverse=True)
        unexpected_found.sort(key=lambda x: x['frequency'], reverse=True)
        
        report['detailed_analysis'][cms_name] = {
            'site_count': len(data['sites']),
            'expected_patterns': {
                'total_defined': len(required_patterns),
                'found_patterns': expected_found,
                'missing_patterns': expected_missing,
                'found_count': len(expected_found),
                'missing_count': len(expected_missing)
            },
            'unexpected_patterns': {
                'total_found': len(unexpected_found),
                'patterns': unexpected_found[:20]  # Top 20 unexpected
            },
            'phase_comparison': {
                'phase1_unique_patterns': len(data['unique_phase1']),
                'phase2_unique_patterns': len(data['unique_phase2']),
                'top_phase1_patterns': sorted(data['phase1_patterns'].items(), key=lambda x: x[1], reverse=True)[:15],
                'top_phase2_patterns': phase2_by_frequency[:15]
            },
            'sample_sites': data['sites'][:5]  # First 5 sites as examples
        }
    
    # Save report
    with open(output_file, 'w') as f:
        json.dump(report, f, indent=2, default=str)
    
    return report

def print_summary_report(cms_analysis, expected_patterns):
    """Print a human-readable summary to console"""
    
    print(f"\n{'='*80}")
    print("LLM PATTERNS vs EXPECTED PATTERNS ANALYSIS")
    print(f"{'='*80}")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Summary table
    print(f"{'CMS':<12} {'Sites':<6} {'Expected':<9} {'LLM Found':<10} {'Match %':<8} {'Extra':<6}")
    print(f"{'-'*12} {'-'*6} {'-'*9} {'-'*10} {'-'*8} {'-'*6}")
    
    for cms_name, data in sorted(cms_analysis.items()):
        site_count = len(data['sites'])
        expected_for_cms = expected_patterns.get(cms_name, {})
        required_patterns = expected_for_cms.get('required_patterns', set())
        
        avg_completeness = sum(site['expected_completeness'] for site in data['sites']) / site_count if site_count > 0 else 0
        extra_patterns = len(data['unexpected_found'])
        
        print(f"{cms_name:<12} {site_count:<6} {len(required_patterns):<9} {len(data['unique_phase2']):<10} {avg_completeness*100:<8.1f} {extra_patterns:<6}")
    
    # Detailed breakdown
    for cms_name, data in sorted(cms_analysis.items()):
        expected_for_cms = expected_patterns.get(cms_name, {})
        required_patterns = expected_for_cms.get('required_patterns', set())
        
        print(f"\n{'='*60}")
        print(f"{cms_name.upper()} DETAILED ANALYSIS")
        print(f"{'='*60}")
        
        print(f"\n✅ EXPECTED PATTERNS FOUND:")
        found_expected = []
        for pattern in required_patterns:
            if pattern in data['expected_found']:
                frequency = data['expected_found'][pattern]
                percentage = (frequency / len(data['sites'])) * 100 if data['sites'] else 0
                found_expected.append((pattern, frequency, percentage))
        
        found_expected.sort(key=lambda x: x[1], reverse=True)
        for pattern, freq, pct in found_expected[:10]:
            print(f"  {pattern:<40} {freq:>3}/{len(data['sites']):<3} ({pct:5.1f}%)")
        
        print(f"\n❌ EXPECTED PATTERNS MISSING:")
        missing_patterns = required_patterns - data['expected_found'].keys()
        for pattern in sorted(missing_patterns)[:10]:
            print(f"  {pattern}")
        
        print(f"\n🔍 UNEXPECTED PATTERNS FOUND (Top 10):")
        unexpected_sorted = sorted(data['unexpected_found'].items(), key=lambda x: x[1], reverse=True)
        for pattern, freq in unexpected_sorted[:10]:
            percentage = (freq / len(data['sites'])) * 100 if data['sites'] else 0
            print(f"  {pattern:<40} {freq:>3}/{len(data['sites']):<3} ({percentage:5.1f}%)")

def main():
    if len(sys.argv) < 3:
        print("Usage: python catalog-llm-vs-expected-patterns.py <learn-results-dir> <expected-patterns-dir> [output-file]")
        sys.exit(1)
    
    learn_results_dir = sys.argv[1]
    expected_patterns_dir = sys.argv[2]
    output_file = sys.argv[3] if len(sys.argv) > 3 else f"llm-vs-expected-patterns-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    
    if not os.path.exists(learn_results_dir):
        print(f"Error: Directory {learn_results_dir} does not exist")
        sys.exit(1)
    
    if not os.path.exists(expected_patterns_dir):
        print(f"Error: Directory {expected_patterns_dir} does not exist")
        sys.exit(1)
    
    print("Analyzing LLM patterns vs expected patterns...")
    cms_analysis, expected_patterns = analyze_llm_patterns(learn_results_dir, expected_patterns_dir)
    
    if not cms_analysis:
        print("No LLM analysis results found")
        sys.exit(1)
    
    print("Generating comparison report...")
    report = generate_comparison_report(cms_analysis, expected_patterns, output_file)
    
    print_summary_report(cms_analysis, expected_patterns)
    
    print(f"\n{'='*80}")
    print(f"COMPLETE ANALYSIS SAVED TO: {output_file}")
    print(f"{'='*80}")

if __name__ == "__main__":
    main()