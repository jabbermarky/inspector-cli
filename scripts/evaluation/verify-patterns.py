#!/usr/bin/env python3
"""
Pattern Verification Helper Script
Verifies that discovered patterns actually exist in the raw collected data.
"""

import json
import argparse
from pathlib import Path
from typing import Dict, List, Tuple
import re


def load_collected_data(data_file: str) -> Dict:
    """Load raw collected data from CMS analysis."""
    with open(data_file, 'r') as f:
        return json.load(f)


def verify_meta_pattern(data: Dict, pattern: Dict) -> bool:
    """Verify meta tag patterns exist in HTML."""
    html = data.get('data', {}).get('html', '')
    if not html:
        return False
    
    pattern_value = str(pattern.get('value', ''))
    pattern_name = pattern.get('name', '')
    
    # Check for meta generator tags
    if 'generator' in pattern_name.lower():
        meta_pattern = re.compile(r'<meta[^>]*name=["\']generator["\'][^>]*content=["\']([^"\']+)["\']', re.IGNORECASE)
        matches = meta_pattern.findall(html)
        return any(pattern_value.lower() in match.lower() for match in matches)
    
    # Check for other meta patterns
    meta_pattern = re.compile(rf'<meta[^>]*{re.escape(pattern_value)}[^>]*>', re.IGNORECASE)
    return bool(meta_pattern.search(html))


def verify_javascript_pattern(data: Dict, pattern: Dict) -> bool:
    """Verify JavaScript patterns exist in scripts."""
    scripts = data.get('data', {}).get('javascript', {}).get('inline', [])
    external = data.get('data', {}).get('javascript', {}).get('external', [])
    
    pattern_value = str(pattern.get('value', ''))
    
    # Check inline scripts
    for script in scripts:
        if pattern_value in script:
            return True
    
    # Check external script URLs
    for url in external:
        if pattern_value in url:
            return True
    
    # Also check in HTML for script tags
    html = data.get('data', {}).get('html', '')
    if pattern_value in html:
        return True
    
    return False


def verify_css_pattern(data: Dict, pattern: Dict) -> bool:
    """Verify CSS patterns exist in stylesheets."""
    css_data = data.get('data', {}).get('css', {})
    pattern_value = str(pattern.get('value', ''))
    
    # Check inline styles
    inline_styles = css_data.get('inline', [])
    for style in inline_styles:
        if pattern_value in style:
            return True
    
    # Check external stylesheet URLs
    external_styles = css_data.get('external', [])
    for url in external_styles:
        if pattern_value in url:
            return True
    
    # Check classes mentioned in HTML
    html = data.get('data', {}).get('html', '')
    if pattern_value in html:
        return True
    
    return False


def verify_structure_pattern(data: Dict, pattern: Dict) -> bool:
    """Verify file/URL structure patterns."""
    urls = data.get('data', {}).get('urls', [])
    pattern_value = str(pattern.get('value', ''))
    
    # Check if pattern appears in any collected URLs
    for url in urls:
        if pattern_value in url:
            return True
    
    # Also check in external resources
    js_urls = data.get('data', {}).get('javascript', {}).get('external', [])
    css_urls = data.get('data', {}).get('css', {}).get('external', [])
    
    all_urls = js_urls + css_urls
    return any(pattern_value in url for url in all_urls)


def verify_header_pattern(data: Dict, pattern: Dict) -> bool:
    """Verify HTTP header patterns."""
    headers = data.get('data', {}).get('headers', {})
    pattern_name = pattern.get('name', '').lower()
    pattern_value = str(pattern.get('value', ''))
    
    # Check if header exists
    for header_name, header_value in headers.items():
        if pattern_name in header_name.lower() or pattern_value in str(header_value):
            return True
    
    return False


def verify_pattern(collected_data: Dict, pattern: Dict) -> Tuple[bool, str]:
    """Verify a single pattern against collected data."""
    pattern_type = pattern.get('type', '').lower()
    pattern_location = pattern.get('location', '').lower()
    
    try:
        if pattern_type == 'meta' or 'meta' in pattern_location:
            verified = verify_meta_pattern(collected_data, pattern)
        elif pattern_type == 'javascript' or 'script' in pattern_location:
            verified = verify_javascript_pattern(collected_data, pattern)
        elif pattern_type == 'css' or 'style' in pattern_location:
            verified = verify_css_pattern(collected_data, pattern)
        elif pattern_type == 'structure' or 'url' in pattern_location:
            verified = verify_structure_pattern(collected_data, pattern)
        elif pattern_type == 'header' or 'header' in pattern_location:
            verified = verify_header_pattern(collected_data, pattern)
        else:
            # Generic verification - check if value appears anywhere
            pattern_value = str(pattern.get('value', ''))
            data_str = json.dumps(collected_data.get('data', {}))
            verified = pattern_value in data_str
        
        reason = "Found in data" if verified else "Not found in collected data"
        return verified, reason
        
    except Exception as e:
        return False, f"Verification error: {str(e)}"


def analyze_pattern_accuracy(data_dir: str, limit: int = None) -> Dict:
    """Analyze pattern accuracy across all collected data."""
    data_path = Path(data_dir)
    results = {
        'total_files': 0,
        'total_patterns': 0,
        'verified_patterns': 0,
        'false_positives': [],
        'pattern_type_accuracy': {},
        'cms_accuracy': {}
    }
    
    files_processed = 0
    for json_file in data_path.glob('*.json'):
        if json_file.name == 'index.json':
            continue
            
        if limit and files_processed >= limit:
            break
            
        try:
            with open(json_file, 'r') as f:
                data = json.load(f)
            
            # Check for learn data structure
            if 'analysis' in data and 'technologyDetected' in data['analysis']:
                files_processed += 1
                results['total_files'] += 1
                
                cms_name = data['analysis']['technologyDetected']
                if cms_name not in results['cms_accuracy']:
                    results['cms_accuracy'][cms_name] = {'total': 0, 'verified': 0}
                
                # Verify each pattern from keyPatterns
                for pattern_name in data['analysis'].get('keyPatterns', []):
                    results['total_patterns'] += 1
                    results['cms_accuracy'][cms_name]['total'] += 1
                    
                    # Create pattern object for verification
                    pattern = {'name': pattern_name, 'type': 'unknown'}
                    
                    pattern_type = 'unknown'  # We don't have detailed type info in learn structure
                    if pattern_type not in results['pattern_type_accuracy']:
                        results['pattern_type_accuracy'][pattern_type] = {'total': 0, 'verified': 0}
                    results['pattern_type_accuracy'][pattern_type]['total'] += 1
                    
                    verified, reason = verify_pattern(data, pattern)
                    
                    if verified:
                        results['verified_patterns'] += 1
                        results['cms_accuracy'][cms_name]['verified'] += 1
                        results['pattern_type_accuracy'][pattern_type]['verified'] += 1
                    else:
                        results['false_positives'].append({
                            'url': data.get('inputData', {}).get('url', 'unknown'),
                            'pattern': pattern_name,
                            'type': pattern_type,
                            'reason': reason
                        })
            
            # Check for original cms-analysis structure (fallback)
            elif 'analysisResult' in data and 'patterns' in data['analysisResult']:
                files_processed += 1
                results['total_files'] += 1
                
                cms_name = data.get('detectedCMS', {}).get('name', 'unknown')
                if cms_name not in results['cms_accuracy']:
                    results['cms_accuracy'][cms_name] = {'total': 0, 'verified': 0}
                
                # Verify each pattern
                for pattern in data['analysisResult']['patterns']:
                    results['total_patterns'] += 1
                    results['cms_accuracy'][cms_name]['total'] += 1
                    
                    pattern_type = pattern.get('type', 'unknown')
                    if pattern_type not in results['pattern_type_accuracy']:
                        results['pattern_type_accuracy'][pattern_type] = {'total': 0, 'verified': 0}
                    results['pattern_type_accuracy'][pattern_type]['total'] += 1
                    
                    verified, reason = verify_pattern(data, pattern)
                    
                    if verified:
                        results['verified_patterns'] += 1
                        results['cms_accuracy'][cms_name]['verified'] += 1
                        results['pattern_type_accuracy'][pattern_type]['verified'] += 1
                    else:
                        results['false_positives'].append({
                            'url': data.get('url', 'unknown'),
                            'pattern': pattern.get('name', 'unknown'),
                            'type': pattern_type,
                            'reason': reason
                        })
                    
        except Exception as e:
            print(f"Error processing {json_file}: {e}")
    
    # Calculate accuracy percentages
    if results['total_patterns'] > 0:
        results['overall_accuracy'] = (results['verified_patterns'] / results['total_patterns']) * 100
        results['false_positive_rate'] = ((results['total_patterns'] - results['verified_patterns']) / results['total_patterns']) * 100
    else:
        results['overall_accuracy'] = 0
        results['false_positive_rate'] = 0
    
    # Calculate per-type accuracy
    for pattern_type, stats in results['pattern_type_accuracy'].items():
        if stats['total'] > 0:
            stats['accuracy'] = (stats['verified'] / stats['total']) * 100
    
    # Calculate per-CMS accuracy
    for cms, stats in results['cms_accuracy'].items():
        if stats['total'] > 0:
            stats['accuracy'] = (stats['verified'] / stats['total']) * 100
    
    return results


def print_accuracy_report(results: Dict):
    """Print human-readable accuracy report."""
    print("\n=== Pattern Accuracy Verification Report ===")
    print(f"Files analyzed: {results['total_files']}")
    print(f"Total patterns: {results['total_patterns']}")
    print(f"Verified patterns: {results['verified_patterns']}")
    
    print(f"\nOverall Accuracy: {results['overall_accuracy']:.1f}%")
    print(f"False Positive Rate: {results['false_positive_rate']:.1f}%")
    
    # Determine test result
    if results['false_positive_rate'] <= 2:
        print("Test Result: EXCELLENT")
    elif results['false_positive_rate'] <= 5:
        print("Test Result: GOOD")
    else:
        print("Test Result: NEEDS_IMPROVEMENT")
    
    print("\nAccuracy by Pattern Type:")
    for pattern_type, stats in sorted(results['pattern_type_accuracy'].items()):
        if 'accuracy' in stats:
            print(f"  - {pattern_type}: {stats['accuracy']:.1f}% ({stats['verified']}/{stats['total']})")
    
    print("\nAccuracy by CMS:")
    for cms, stats in sorted(results['cms_accuracy'].items()):
        if 'accuracy' in stats:
            print(f"  - {cms}: {stats['accuracy']:.1f}% ({stats['verified']}/{stats['total']})")
    
    if results['false_positives']:
        print(f"\nExample False Positives (showing first 10):")
        for fp in results['false_positives'][:10]:
            print(f"  - {fp['url']}: {fp['pattern']} ({fp['type']}) - {fp['reason']}")


def main():
    parser = argparse.ArgumentParser(description='Verify pattern accuracy against collected data')
    parser.add_argument('--data-dir', required=True, help='Directory containing CMS analysis data')
    parser.add_argument('--limit', type=int, help='Limit number of files to analyze')
    parser.add_argument('--output', help='Output JSON file for detailed report')
    parser.add_argument('--quiet', action='store_true', help='Suppress console output')
    
    args = parser.parse_args()
    
    try:
        # Analyze pattern accuracy
        results = analyze_pattern_accuracy(args.data_dir, args.limit)
        
        # Save detailed report if requested
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(results, f, indent=2)
            if not args.quiet:
                print(f"Detailed report saved to: {args.output}")
        
        # Print summary unless quiet
        if not args.quiet:
            print_accuracy_report(results)
        
        # Return exit code based on false positive rate
        if results['false_positive_rate'] > 5:
            return 1
        return 0
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    exit(main())