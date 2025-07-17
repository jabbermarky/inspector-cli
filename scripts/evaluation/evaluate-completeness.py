#!/usr/bin/env python3
"""
Evaluate Pattern Completeness Script
Compares discovered patterns against reference database to calculate completeness scores.
"""

import json
import argparse
import os
from pathlib import Path
from typing import Dict, List, Set, Tuple
from datetime import datetime


def load_reference_patterns(reference_file: str) -> Dict[str, List[str]]:
    """Load required patterns from reference JSON file."""
    with open(reference_file, 'r') as f:
        data = json.load(f)
    return data.get('required_patterns', [])


def load_phase1_results(results_dir: str, cms_type: str) -> List[Dict]:
    """Load Phase 1 analysis results for a specific CMS type."""
    results_path = Path(results_dir)
    all_results = []
    
    # Find all JSON files that match the CMS type
    for json_file in results_path.glob('*.json'):
        try:
            with open(json_file, 'r') as f:
                data = json.load(f)
            
            # Check for learn data structure
            if 'analysis' in data and 'technologyDetected' in data['analysis']:
                detected_cms = data['analysis']['technologyDetected']
                if detected_cms.lower() == cms_type.lower():
                    # Convert keyPatterns to the expected format
                    patterns = []
                    for pattern_name in data['analysis'].get('keyPatterns', []):
                        patterns.append({'name': pattern_name})
                    
                    all_results.append({
                        'url': data.get('inputData', {}).get('url', 'unknown'),
                        'patterns': patterns
                    })
            # Check for original cms-analysis structure (fallback)
            elif data.get('detectedCMS', {}).get('name', '').lower() == cms_type.lower():
                if 'analysisResult' in data and 'patterns' in data['analysisResult']:
                    all_results.append({
                        'url': data.get('url', 'unknown'),
                        'patterns': data['analysisResult']['patterns']
                    })
        except Exception as e:
            print(f"Error loading {json_file}: {e}")
    
    return all_results


def calculate_completeness(discovered_patterns: Set[str], required_patterns: List[str]) -> Tuple[float, List[str], List[str]]:
    """Calculate completeness score and identify missing patterns."""
    required_set = set(required_patterns)
    found_patterns = discovered_patterns.intersection(required_set)
    missing_patterns = required_set - found_patterns
    
    completeness = len(found_patterns) / len(required_set) * 100 if required_set else 0
    
    return completeness, list(found_patterns), list(missing_patterns)


def analyze_pattern_frequency(all_results: List[Dict]) -> Dict[str, int]:
    """Analyze how frequently each pattern appears across sites."""
    pattern_freq = {}
    
    for result in all_results:
        unique_patterns = set()
        for pattern in result['patterns']:
            pattern_name = pattern['name']
            unique_patterns.add(pattern_name)
        
        for pattern_name in unique_patterns:
            pattern_freq[pattern_name] = pattern_freq.get(pattern_name, 0) + 1
    
    return pattern_freq


def generate_report(cms_type: str, all_results: List[Dict], required_patterns: List[str]) -> Dict:
    """Generate comprehensive completeness report."""
    report = {
        'cms_type': cms_type,
        'timestamp': datetime.utcnow().isoformat(),
        'sites_analyzed': len(all_results),
        'required_patterns_count': len(required_patterns),
        'site_results': [],
        'overall_metrics': {}
    }
    
    # Analyze each site
    all_discovered = set()
    for result in all_results:
        site_patterns = set(p['name'] for p in result['patterns'])
        all_discovered.update(site_patterns)
        
        completeness, found, missing = calculate_completeness(site_patterns, required_patterns)
        
        report['site_results'].append({
            'url': result['url'],
            'patterns_found': len(site_patterns),
            'completeness_score': completeness,
            'missing_patterns': missing
        })
    
    # Calculate overall metrics
    overall_completeness, overall_found, overall_missing = calculate_completeness(all_discovered, required_patterns)
    pattern_frequency = analyze_pattern_frequency(all_results)
    
    # Find consistently detected patterns (in 80%+ of sites)
    consistent_threshold = len(all_results) * 0.8
    consistent_patterns = [p for p, freq in pattern_frequency.items() if freq >= consistent_threshold]
    
    report['overall_metrics'] = {
        'overall_completeness': overall_completeness,
        'patterns_found_across_all_sites': len(all_discovered),
        'required_patterns_found': len(overall_found),
        'required_patterns_missing': overall_missing,
        'consistent_patterns': consistent_patterns,
        'pattern_frequency': pattern_frequency
    }
    
    # Determine test result
    if overall_completeness >= 95:
        report['test_result'] = 'EXCELLENT'
    elif overall_completeness >= 90:
        report['test_result'] = 'GOOD'
    else:
        report['test_result'] = 'NEEDS_IMPROVEMENT'
    
    return report


def print_summary(report: Dict):
    """Print human-readable summary of the report."""
    print(f"\n=== Pattern Completeness Report for {report['cms_type'].upper()} ===")
    print(f"Sites analyzed: {report['sites_analyzed']}")
    print(f"Required patterns: {report['required_patterns_count']}")
    
    metrics = report['overall_metrics']
    print(f"\nOverall Completeness: {metrics['overall_completeness']:.1f}%")
    print(f"Test Result: {report['test_result']}")
    
    if metrics['required_patterns_missing']:
        print(f"\nMissing Required Patterns ({len(metrics['required_patterns_missing'])}):")
        for pattern in metrics['required_patterns_missing']:
            print(f"  - {pattern}")
    
    print(f"\nConsistently Detected Patterns ({len(metrics['consistent_patterns'])}):")
    for pattern in metrics['consistent_patterns'][:10]:  # Show top 10
        freq = metrics['pattern_frequency'][pattern]
        print(f"  - {pattern} ({freq}/{report['sites_analyzed']} sites)")
    
    # Show site-by-site summary
    print("\nSite-by-Site Completeness:")
    for site in sorted(report['site_results'], key=lambda x: x['completeness_score'], reverse=True):
        print(f"  - {site['url']}: {site['completeness_score']:.1f}% ({site['patterns_found']} patterns)")


def main():
    parser = argparse.ArgumentParser(description='Evaluate pattern completeness for Phase 1 analysis')
    parser.add_argument('--phase1-results', required=True, help='Directory containing Phase 1 JSON results')
    parser.add_argument('--reference', required=True, help='Reference patterns JSON file')
    parser.add_argument('--cms-type', required=True, choices=['wordpress', 'drupal', 'joomla', 'duda'], 
                        help='CMS type to evaluate')
    parser.add_argument('--output', help='Output JSON file for detailed report')
    parser.add_argument('--quiet', action='store_true', help='Suppress console output')
    
    args = parser.parse_args()
    
    # Load data
    try:
        required_patterns = load_reference_patterns(args.reference)
        phase1_results = load_phase1_results(args.phase1_results, args.cms_type)
        
        if not phase1_results:
            print(f"Error: No {args.cms_type} results found in {args.phase1_results}")
            return 1
        
        # Generate report
        report = generate_report(args.cms_type, phase1_results, required_patterns)
        
        # Save detailed report if requested
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(report, f, indent=2)
            if not args.quiet:
                print(f"Detailed report saved to: {args.output}")
        
        # Print summary unless quiet
        if not args.quiet:
            print_summary(report)
        
        # Return exit code based on test result
        if report['test_result'] == 'NEEDS_IMPROVEMENT':
            return 1
        return 0
        
    except Exception as e:
        print(f"Error: {e}")
        return 1


if __name__ == '__main__':
    exit(main())