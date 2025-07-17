#!/usr/bin/env python3
"""
Phase 2 Pattern Standardization Completeness Evaluation Script
Compares standardized patterns from Phase 2 against expected patterns
"""

import json
import sys
import os
from pathlib import Path
from collections import defaultdict
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

def evaluate_completeness(phase1_dir, reference_file):
    """Evaluate pattern completeness for a CMS type"""
    
    # Load reference patterns
    reference_data = load_json_file(reference_file)
    if not reference_data:
        return None
    
    cms_name = reference_data['cms'].lower()
    expected_patterns = set(reference_data['required_patterns'])
    discriminator_patterns = set(reference_data.get('discriminator_patterns', []))
    
    # Find all phase1 results for this CMS
    results = []
    phase1_path = Path(phase1_dir)
    
    # Look for phased analysis results
    for file in phase1_path.glob('*.json'):
        data = load_json_file(file)
        if not data:
            continue
            
        # Check for phased analysis
        if ('llmResponse' in data and 'phasedAnalysis' in data['llmResponse'] and 
            data['llmResponse']['phasedAnalysis'] and 'phases' in data['llmResponse']):
            
            phases = data['llmResponse']['phases']
            if isinstance(phases, list) and len(phases) > 0:
                phase1 = phases[0]
                if 'result' in phase1 and 'technology' in phase1['result']:
                    tech = phase1['result']['technology']
                    if tech and tech.lower() == cms_name:
                        patterns = extract_patterns_from_phase2(data)
                        found_expected = patterns.intersection(expected_patterns)
                        found_discriminators = patterns.intersection(discriminator_patterns)
                        
                        # Get URL from metadata
                        url = 'unknown'
                        if 'metadata' in data and 'url' in data['metadata']:
                            url = data['metadata']['url']
                        elif 'inputData' in data and 'url' in data['inputData']:
                            url = data['inputData']['url']
                        
                        results.append({
                            'url': url,
                            'total_patterns': len(patterns),
                            'found_patterns': patterns,
                            'found_expected': found_expected,
                            'found_discriminators': found_discriminators,
                            'expected_completeness': len(found_expected) / len(expected_patterns) if expected_patterns else 0,
                            'discriminator_completeness': len(found_discriminators) / len(discriminator_patterns) if discriminator_patterns else 0
                        })
    
    return {
        'cms': cms_name,
        'total_sites': len(results),
        'expected_patterns': expected_patterns,
        'discriminator_patterns': discriminator_patterns,
        'site_results': results,
        'average_completeness': sum(r['expected_completeness'] for r in results) / len(results) if results else 0,
        'average_discriminator_completeness': sum(r['discriminator_completeness'] for r in results) / len(results) if results else 0
    }

def main():
    if len(sys.argv) < 3:
        print("Usage: python evaluate-completeness.py <phase1-results-dir> <reference-patterns-file>")
        sys.exit(1)
    
    phase1_dir = sys.argv[1]
    reference_file = sys.argv[2]
    
    # Evaluate completeness
    evaluation = evaluate_completeness(phase1_dir, reference_file)
    
    if not evaluation:
        print("Error: Could not evaluate completeness")
        sys.exit(1)
    
    # Print results
    print(f"\n{'='*80}")
    print(f"Pattern Completeness Evaluation: {evaluation['cms'].upper()}")
    print(f"{'='*80}")
    print(f"Total sites analyzed: {evaluation['total_sites']}")
    print(f"Expected patterns: {len(evaluation['expected_patterns'])}")
    print(f"Discriminator patterns: {len(evaluation['discriminator_patterns'])}")
    print(f"\nAverage completeness: {evaluation['average_completeness']:.1%}")
    print(f"Average discriminator completeness: {evaluation['average_discriminator_completeness']:.1%}")
    
    # Show per-site results
    print(f"\n{'='*80}")
    print("Per-Site Results:")
    print(f"{'='*80}")
    
    for result in evaluation['site_results']:
        print(f"\n{result['url']}:")
        print(f"  Total patterns found: {result['total_patterns']}")
        print(f"  Expected patterns found: {len(result['found_expected'])}/{len(evaluation['expected_patterns'])} ({result['expected_completeness']:.1%})")
        print(f"  Discriminator patterns found: {len(result['found_discriminators'])}/{len(evaluation['discriminator_patterns'])} ({result['discriminator_completeness']:.1%})")
        
        # Show missing patterns
        missing_expected = evaluation['expected_patterns'] - result['found_expected']
        if missing_expected:
            print(f"  Missing expected patterns: {', '.join(sorted(missing_expected))}")
    
    # Summary
    print(f"\n{'='*80}")
    print("SUMMARY:")
    print(f"{'='*80}")
    
    success_threshold = 0.90
    if evaluation['average_completeness'] >= 0.95:
        print(f"✅ EXCELLENT: {evaluation['average_completeness']:.1%} pattern completeness (≥95%)")
    elif evaluation['average_completeness'] >= success_threshold:
        print(f"✅ GOOD: {evaluation['average_completeness']:.1%} pattern completeness (≥90%)")
    else:
        print(f"❌ NEEDS IMPROVEMENT: {evaluation['average_completeness']:.1%} pattern completeness (<90%)")
    
    # Save detailed results
    output_file = f"pattern-completeness-{evaluation['cms']}-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    with open(output_file, 'w') as f:
        json.dump(evaluation, f, indent=2, default=str)
    print(f"\nDetailed results saved to: {output_file}")

if __name__ == "__main__":
    main()