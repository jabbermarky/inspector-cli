#!/usr/bin/env python3
"""
Analyze Phases Helper Script
Analyzes performance and quality metrics for Phase 1 vs Phase 2.
"""

import json
import argparse
from pathlib import Path
from typing import Dict, List, Tuple
from datetime import datetime
from collections import defaultdict
import statistics


def load_phased_results(results_dir: str) -> Dict[str, List[Dict]]:
    """Load phased analysis results organized by phase."""
    results_path = Path(results_dir)
    phase_results = {
        'phase1': [],
        'phase2': [],
        'combined': []
    }
    
    for json_file in results_path.glob('*.json'):
        try:
            with open(json_file, 'r') as f:
                data = json.load(f)
            
            phase = data.get('phase', 'combined')
            if phase in phase_results:
                phase_results[phase].append(data)
                
        except Exception as e:
            print(f"Error loading {json_file}: {e}")
    
    return phase_results


def analyze_phase_performance(phase_data: List[Dict]) -> Dict:
    """Analyze performance metrics for a specific phase."""
    if not phase_data:
        return {}
    
    latencies = []
    token_usage = []
    pattern_counts = []
    
    for result in phase_data:
        # Extract performance metrics
        perf = result.get('performance', {})
        if 'duration' in perf:
            latencies.append(perf['duration'])
        
        # Extract token usage
        if 'tokens' in result:
            token_usage.append(result['tokens'])
        elif 'token_usage' in perf:
            token_usage.append(perf['token_usage'])
        
        # Count patterns
        if 'analysisResult' in result and 'patterns' in result['analysisResult']:
            pattern_counts.append(len(result['analysisResult']['patterns']))
    
    metrics = {}
    
    if latencies:
        metrics['latency'] = {
            'avg': statistics.mean(latencies),
            'min': min(latencies),
            'max': max(latencies),
            'median': statistics.median(latencies),
            'p95': sorted(latencies)[int(len(latencies) * 0.95)] if len(latencies) > 1 else latencies[0]
        }
    
    if token_usage:
        metrics['tokens'] = {
            'avg': statistics.mean(token_usage),
            'min': min(token_usage),
            'max': max(token_usage),
            'median': statistics.median(token_usage)
        }
    
    if pattern_counts:
        metrics['patterns'] = {
            'avg': statistics.mean(pattern_counts),
            'min': min(pattern_counts),
            'max': max(pattern_counts),
            'total_unique': len(set().union(*[set(r['analysisResult']['patterns']) for r in phase_data if 'analysisResult' in r]))
        }
    
    metrics['sample_count'] = len(phase_data)
    
    return metrics


def analyze_pattern_quality(phase_data: List[Dict], phase_name: str) -> Dict:
    """Analyze pattern quality metrics for a phase."""
    quality_metrics = {
        'confidence_distribution': defaultdict(int),
        'pattern_types': defaultdict(int),
        'discriminator_patterns': 0,
        'total_patterns': 0
    }
    
    discriminator_keywords = {
        'wordpress': ['wp_', 'wordpress', 'wp-content', 'wp-includes'],
        'drupal': ['drupal', 'sites/default', 'core/modules'],
        'joomla': ['joomla', 'com_', 'mod_', 'plg_'],
        'duda': ['duda', 'dm_', 'dudaone']
    }
    
    for result in phase_data:
        if 'analysisResult' not in result or 'patterns' not in result['analysisResult']:
            continue
        
        cms = result.get('detectedCMS', {}).get('name', '').lower()
        
        for pattern in result['analysisResult']['patterns']:
            quality_metrics['total_patterns'] += 1
            
            # Confidence distribution
            confidence = pattern.get('confidence', 0)
            if phase_name == 'phase2':
                # Phase 2 should use standardized confidence values
                if confidence in [0.95, 0.90, 0.85, 0.80]:
                    quality_metrics['confidence_distribution']['standardized'] += 1
                else:
                    quality_metrics['confidence_distribution']['non_standardized'] += 1
            else:
                # Phase 1 confidence distribution
                if confidence >= 0.9:
                    quality_metrics['confidence_distribution']['high'] += 1
                elif confidence >= 0.8:
                    quality_metrics['confidence_distribution']['medium'] += 1
                else:
                    quality_metrics['confidence_distribution']['low'] += 1
            
            # Pattern types
            pattern_type = pattern.get('type', 'unknown')
            quality_metrics['pattern_types'][pattern_type] += 1
            
            # Check if discriminator pattern
            pattern_name = pattern.get('name', '').lower()
            if cms in discriminator_keywords:
                if any(keyword in pattern_name for keyword in discriminator_keywords[cms]):
                    quality_metrics['discriminator_patterns'] += 1
    
    # Calculate percentages
    if quality_metrics['total_patterns'] > 0:
        quality_metrics['discriminator_percentage'] = (
            quality_metrics['discriminator_patterns'] / quality_metrics['total_patterns'] * 100
        )
    
    return dict(quality_metrics)


def compare_phases(phase_results: Dict[str, List[Dict]]) -> Dict:
    """Compare Phase 1 and Phase 2 performance and quality."""
    comparison = {
        'phase1': {},
        'phase2': {},
        'improvements': {}
    }
    
    # Analyze each phase
    for phase_name in ['phase1', 'phase2']:
        if phase_results[phase_name]:
            comparison[phase_name]['performance'] = analyze_phase_performance(phase_results[phase_name])
            comparison[phase_name]['quality'] = analyze_pattern_quality(phase_results[phase_name], phase_name)
    
    # Calculate improvements
    if comparison['phase1'].get('performance') and comparison['phase2'].get('performance'):
        p1_perf = comparison['phase1']['performance']
        p2_perf = comparison['phase2']['performance']
        
        if 'latency' in p1_perf and 'latency' in p2_perf:
            comparison['improvements']['latency_reduction'] = (
                (p1_perf['latency']['avg'] - p2_perf['latency']['avg']) / p1_perf['latency']['avg'] * 100
            )
        
        if 'tokens' in p1_perf and 'tokens' in p2_perf:
            comparison['improvements']['token_reduction'] = (
                (p1_perf['tokens']['avg'] - p2_perf['tokens']['avg']) / p1_perf['tokens']['avg'] * 100
            )
    
    return comparison


def generate_phase_report(phase_results: Dict[str, List[Dict]]) -> Dict:
    """Generate comprehensive phase analysis report."""
    report = {
        'timestamp': datetime.utcnow().isoformat(),
        'phase_comparison': compare_phases(phase_results),
        'test_results': {}
    }
    
    # Evaluate Phase 1 performance criteria
    phase1_perf = report['phase_comparison']['phase1'].get('performance', {})
    if phase1_perf and 'latency' in phase1_perf:
        avg_latency = phase1_perf['latency']['avg']
        avg_tokens = phase1_perf.get('tokens', {}).get('avg', 0)
        
        if avg_latency < 15000 and avg_tokens < 3000:  # 15s, 3000 tokens
            report['test_results']['phase1_performance'] = 'EXCELLENT'
        elif avg_latency < 20000 and avg_tokens < 4000:  # 20s, 4000 tokens
            report['test_results']['phase1_performance'] = 'GOOD'
        else:
            report['test_results']['phase1_performance'] = 'NEEDS_IMPROVEMENT'
    
    # Evaluate Phase 2 performance criteria
    phase2_perf = report['phase_comparison']['phase2'].get('performance', {})
    if phase2_perf and 'latency' in phase2_perf:
        avg_latency = phase2_perf['latency']['avg']
        avg_tokens = phase2_perf.get('tokens', {}).get('avg', 0)
        
        if avg_latency < 8000 and avg_tokens < 1500:  # 8s, 1500 tokens
            report['test_results']['phase2_performance'] = 'EXCELLENT'
        elif avg_latency < 10000 and avg_tokens < 2000:  # 10s, 2000 tokens
            report['test_results']['phase2_performance'] = 'GOOD'
        else:
            report['test_results']['phase2_performance'] = 'NEEDS_IMPROVEMENT'
    
    # Evaluate Phase 2 standardization compliance
    phase2_quality = report['phase_comparison']['phase2'].get('quality', {})
    if phase2_quality and 'confidence_distribution' in phase2_quality:
        standardized = phase2_quality['confidence_distribution'].get('standardized', 0)
        total = sum(phase2_quality['confidence_distribution'].values())
        
        if total > 0:
            compliance_rate = standardized / total * 100
            report['test_results']['phase2_compliance'] = 'EXCELLENT' if compliance_rate == 100 else 'NEEDS_IMPROVEMENT'
            report['phase_comparison']['phase2']['compliance_rate'] = compliance_rate
    
    return report


def print_phase_analysis(report: Dict):
    """Print human-readable phase analysis."""
    print("\n=== Phase Analysis Report ===")
    print(f"Generated: {report['timestamp']}")
    
    comparison = report['phase_comparison']
    
    # Phase 1 Analysis
    print("\n## Phase 1: Pattern Discovery")
    p1 = comparison.get('phase1', {})
    if p1.get('performance'):
        perf = p1['performance']
        print(f"Samples analyzed: {perf.get('sample_count', 0)}")
        
        if 'latency' in perf:
            print(f"Latency: avg={perf['latency']['avg']/1000:.1f}s, p95={perf['latency']['p95']/1000:.1f}s")
        
        if 'tokens' in perf:
            print(f"Token usage: avg={perf['tokens']['avg']:.0f}, max={perf['tokens']['max']:.0f}")
        
        if 'patterns' in perf:
            print(f"Patterns discovered: avg={perf['patterns']['avg']:.1f}, max={perf['patterns']['max']}")
    
    if p1.get('quality'):
        quality = p1['quality']
        print(f"Discriminator patterns: {quality.get('discriminator_percentage', 0):.1f}%")
        print("Pattern types:", dict(quality.get('pattern_types', {})))
    
    print(f"Performance Test Result: {report['test_results'].get('phase1_performance', 'NOT_EVALUATED')}")
    
    # Phase 2 Analysis
    print("\n## Phase 2: Pattern Standardization")
    p2 = comparison.get('phase2', {})
    if p2.get('performance'):
        perf = p2['performance']
        print(f"Samples analyzed: {perf.get('sample_count', 0)}")
        
        if 'latency' in perf:
            print(f"Latency: avg={perf['latency']['avg']/1000:.1f}s, p95={perf['latency']['p95']/1000:.1f}s")
        
        if 'tokens' in perf:
            print(f"Token usage: avg={perf['tokens']['avg']:.0f}, max={perf['tokens']['max']:.0f}")
    
    if 'compliance_rate' in p2:
        print(f"Standardization compliance: {p2['compliance_rate']:.1f}%")
    
    print(f"Performance Test Result: {report['test_results'].get('phase2_performance', 'NOT_EVALUATED')}")
    print(f"Compliance Test Result: {report['test_results'].get('phase2_compliance', 'NOT_EVALUATED')}")
    
    # Improvements
    if comparison.get('improvements'):
        print("\n## Phase-to-Phase Improvements")
        imp = comparison['improvements']
        
        if 'latency_reduction' in imp:
            print(f"Latency reduction: {imp['latency_reduction']:.1f}%")
        
        if 'token_reduction' in imp:
            print(f"Token reduction: {imp['token_reduction']:.1f}%")


def main():
    parser = argparse.ArgumentParser(description='Analyze phased analysis performance and quality')
    parser.add_argument('--results-dir', required=True, help='Directory containing phased analysis results')
    parser.add_argument('--output', help='Output JSON file for detailed report')
    parser.add_argument('--quiet', action='store_true', help='Suppress console output')
    
    args = parser.parse_args()
    
    try:
        # Load and analyze results
        phase_results = load_phased_results(args.results_dir)
        
        if not any(phase_results.values()):
            print(f"Error: No phased results found in {args.results_dir}")
            return 1
        
        # Generate report
        report = generate_phase_report(phase_results)
        
        # Save detailed report if requested
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(report, f, indent=2)
            if not args.quiet:
                print(f"Detailed report saved to: {args.output}")
        
        # Print summary unless quiet
        if not args.quiet:
            print_phase_analysis(report)
        
        # Return exit code based on test results
        test_results = report.get('test_results', {})
        if any(result == 'NEEDS_IMPROVEMENT' for result in test_results.values()):
            return 1
        return 0
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    exit(main())