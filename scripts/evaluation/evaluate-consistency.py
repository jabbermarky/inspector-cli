#!/usr/bin/env python3
"""
Evaluate Pattern Naming Consistency Script
Measures how consistently patterns are named across multiple runs of the same sites.
"""

import json
import argparse
import os
from pathlib import Path
from typing import Dict, List, Set, Tuple
from datetime import datetime
from collections import defaultdict
import hashlib


def load_analysis_results(results_dir: str) -> Dict[str, List[Dict]]:
    """Load all analysis results grouped by URL."""
    results_path = Path(results_dir)
    url_results = defaultdict(list)
    
    for json_file in results_path.glob('*.json'):
        try:
            with open(json_file, 'r') as f:
                data = json.load(f)
            
            # Check for learn data structure
            if 'analysis' in data and 'technologyDetected' in data['analysis']:
                url = data.get('inputData', {}).get('url', 'unknown')
                # Convert keyPatterns to expected format
                patterns = []
                for pattern_name in data['analysis'].get('keyPatterns', []):
                    patterns.append({'name': pattern_name})
                
                url_results[url].append({
                    'timestamp': data.get('metadata', {}).get('timestamp', 'unknown'),
                    'patterns': patterns,
                    'cms': data['analysis']['technologyDetected'],
                    'phase': data.get('phase', 'combined')
                })
            # Check for original cms-analysis structure (fallback)
            elif 'analysisResult' in data and 'patterns' in data['analysisResult']:
                url = data.get('url', 'unknown')
                url_results[url].append({
                    'timestamp': data.get('timestamp', 'unknown'),
                    'patterns': data['analysisResult']['patterns'],
                    'cms': data.get('detectedCMS', {}).get('name', 'unknown'),
                    'phase': data.get('phase', 'unknown')
                })
        except Exception as e:
            print(f"Error loading {json_file}: {e}")
    
    return dict(url_results)


def normalize_pattern_for_comparison(pattern: Dict) -> str:
    """Create a normalized representation of a pattern for comparison."""
    # Extract key attributes that define pattern identity
    attributes = {
        'type': pattern.get('type', ''),
        'location': pattern.get('location', ''),
        'value': str(pattern.get('value', ''))[:100],  # Truncate long values
        'selector': pattern.get('selector', ''),
        'attribute': pattern.get('attribute', '')
    }
    
    # Create a deterministic string representation
    attr_string = '|'.join(f"{k}:{v}" for k, v in sorted(attributes.items()) if v)
    return hashlib.md5(attr_string.encode()).hexdigest()


def calculate_naming_consistency(runs: List[Dict]) -> Tuple[float, Dict[str, List[str]], List[str]]:
    """Calculate consistency score for pattern naming across multiple runs."""
    if len(runs) < 2:
        return 100.0, {}, []
    
    # Group patterns by their normalized identity
    pattern_names_by_identity = defaultdict(set)
    pattern_details = {}
    
    for run in runs:
        for pattern in run['patterns']:
            pattern_id = normalize_pattern_for_comparison(pattern)
            pattern_name = pattern.get('name', 'unnamed')
            pattern_names_by_identity[pattern_id].add(pattern_name)
            
            # Store pattern details for reporting
            if pattern_id not in pattern_details:
                pattern_details[pattern_id] = {
                    'type': pattern.get('type', ''),
                    'location': pattern.get('location', ''),
                    'example_value': str(pattern.get('value', ''))[:50]
                }
    
    # Calculate consistency metrics
    total_patterns = len(pattern_names_by_identity)
    consistent_patterns = 0
    inconsistent_patterns = {}
    
    for pattern_id, names in pattern_names_by_identity.items():
        if len(names) == 1:
            consistent_patterns += 1
        else:
            details = pattern_details[pattern_id]
            inconsistent_patterns[pattern_id] = {
                'names': list(names),
                'details': details
            }
    
    consistency_score = (consistent_patterns / total_patterns * 100) if total_patterns > 0 else 100
    
    # Find patterns that appear in all runs
    patterns_in_all_runs = []
    for pattern_id, names in pattern_names_by_identity.items():
        pattern_count = sum(1 for run in runs for p in run['patterns'] 
                          if normalize_pattern_for_comparison(p) == pattern_id)
        if pattern_count >= len(runs):
            patterns_in_all_runs.append(list(names)[0])
    
    return consistency_score, inconsistent_patterns, patterns_in_all_runs


def analyze_phase_consistency(url_results: Dict[str, List[Dict]]) -> Dict:
    """Analyze consistency for Phase 2 outputs specifically."""
    phase2_results = defaultdict(list)
    
    for url, runs in url_results.items():
        phase2_runs = [r for r in runs if r.get('phase') == 'phase2' or 'phase' not in r]
        if phase2_runs:
            phase2_results[url] = phase2_runs
    
    return dict(phase2_results)


def generate_consistency_report(url_results: Dict[str, List[Dict]], focus_phase2: bool = True) -> Dict:
    """Generate comprehensive consistency report."""
    report = {
        'timestamp': datetime.utcnow().isoformat(),
        'total_urls': len(url_results),
        'site_results': [],
        'overall_metrics': {},
        'cms_breakdown': defaultdict(lambda: {'total': 0, 'consistency_sum': 0})
    }
    
    all_consistency_scores = []
    
    for url, runs in url_results.items():
        if focus_phase2:
            # Filter to only Phase 2 runs
            runs = [r for r in runs if r.get('phase') == 'phase2' or 'phase' not in r]
        
        if len(runs) < 2:
            continue
            
        consistency_score, inconsistent, common_patterns = calculate_naming_consistency(runs)
        all_consistency_scores.append(consistency_score)
        
        # Get CMS type from first run
        cms_type = runs[0].get('cms', 'unknown')
        
        site_result = {
            'url': url,
            'runs_analyzed': len(runs),
            'consistency_score': consistency_score,
            'cms': cms_type,
            'inconsistent_patterns_count': len(inconsistent),
            'common_patterns_count': len(common_patterns)
        }
        
        # Add details about inconsistent patterns
        if inconsistent:
            site_result['inconsistent_examples'] = []
            for pattern_id, info in list(inconsistent.items())[:5]:  # Top 5 examples
                site_result['inconsistent_examples'].append({
                    'names_used': info['names'],
                    'type': info['details']['type'],
                    'location': info['details']['location']
                })
        
        report['site_results'].append(site_result)
        
        # Update CMS breakdown
        report['cms_breakdown'][cms_type]['total'] += 1
        report['cms_breakdown'][cms_type]['consistency_sum'] += consistency_score
    
    # Calculate overall metrics
    if all_consistency_scores:
        avg_consistency = sum(all_consistency_scores) / len(all_consistency_scores)
        min_consistency = min(all_consistency_scores)
        max_consistency = max(all_consistency_scores)
        
        # Count sites meeting targets
        sites_above_95 = sum(1 for score in all_consistency_scores if score >= 95)
        sites_above_98 = sum(1 for score in all_consistency_scores if score >= 98)
        
        report['overall_metrics'] = {
            'average_consistency': avg_consistency,
            'min_consistency': min_consistency,
            'max_consistency': max_consistency,
            'sites_analyzed': len(all_consistency_scores),
            'sites_95_percent_plus': sites_above_95,
            'sites_98_percent_plus': sites_above_98,
            'percentage_meeting_95_target': (sites_above_95 / len(all_consistency_scores) * 100)
        }
        
        # Calculate per-CMS averages
        cms_averages = {}
        for cms, data in report['cms_breakdown'].items():
            if data['total'] > 0:
                cms_averages[cms] = data['consistency_sum'] / data['total']
        report['overall_metrics']['cms_averages'] = cms_averages
        
        # Determine test result
        if avg_consistency >= 98:
            report['test_result'] = 'EXCELLENT'
        elif avg_consistency >= 95:
            report['test_result'] = 'GOOD'
        else:
            report['test_result'] = 'NEEDS_IMPROVEMENT'
    else:
        report['test_result'] = 'INSUFFICIENT_DATA'
    
    return report


def print_consistency_summary(report: Dict):
    """Print human-readable summary of consistency report."""
    print("\n=== Pattern Naming Consistency Report ===")
    print(f"URLs analyzed: {report['total_urls']}")
    
    metrics = report.get('overall_metrics', {})
    if not metrics:
        print("Insufficient data for analysis (need multiple runs per URL)")
        return
    
    print(f"Sites with multiple runs: {metrics['sites_analyzed']}")
    print(f"\nOverall Consistency: {metrics['average_consistency']:.1f}%")
    print(f"Test Result: {report['test_result']}")
    
    print(f"\nConsistency Range: {metrics['min_consistency']:.1f}% - {metrics['max_consistency']:.1f}%")
    print(f"Sites meeting 95% target: {metrics['sites_95_percent_plus']}/{metrics['sites_analyzed']} ({metrics['percentage_meeting_95_target']:.1f}%)")
    print(f"Sites meeting 98% target: {metrics['sites_98_percent_plus']}/{metrics['sites_analyzed']}")
    
    # CMS breakdown
    if 'cms_averages' in metrics:
        print("\nConsistency by CMS:")
        for cms, avg in sorted(metrics['cms_averages'].items()):
            print(f"  - {cms}: {avg:.1f}%")
    
    # Show problematic sites
    problematic_sites = [s for s in report['site_results'] if s['consistency_score'] < 95]
    if problematic_sites:
        print(f"\nSites Below 95% Consistency ({len(problematic_sites)}):")
        for site in sorted(problematic_sites, key=lambda x: x['consistency_score'])[:10]:
            print(f"  - {site['url']}: {site['consistency_score']:.1f}% ({site['inconsistent_patterns_count']} inconsistent patterns)")
            
            # Show example inconsistencies
            if 'inconsistent_examples' in site:
                for example in site['inconsistent_examples'][:2]:
                    print(f"    → {example['type']} at {example['location']}: {example['names_used']}")


def main():
    parser = argparse.ArgumentParser(description='Evaluate pattern naming consistency across multiple runs')
    parser.add_argument('--results', required=True, help='Directory containing analysis results')
    parser.add_argument('--phase2-only', action='store_true', help='Only analyze Phase 2 results')
    parser.add_argument('--output', help='Output JSON file for detailed report')
    parser.add_argument('--quiet', action='store_true', help='Suppress console output')
    
    args = parser.parse_args()
    
    try:
        # Load and analyze results
        url_results = load_analysis_results(args.results)
        
        if not url_results:
            print(f"Error: No results found in {args.results}")
            return 1
        
        # Generate report
        report = generate_consistency_report(url_results, focus_phase2=args.phase2_only)
        
        # Save detailed report if requested
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(report, f, indent=2)
            if not args.quiet:
                print(f"Detailed report saved to: {args.output}")
        
        # Print summary unless quiet
        if not args.quiet:
            print_consistency_summary(report)
        
        # Return exit code based on test result
        if report['test_result'] in ['NEEDS_IMPROVEMENT', 'INSUFFICIENT_DATA']:
            return 1
        return 0
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    exit(main())