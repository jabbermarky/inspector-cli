# Expected Patterns Reference Database

This directory contains reference pattern files used for testing and validating the phased CMS detection system.

## Files

### CMS-Specific Pattern Files
- `wordpress-required.json` - Required patterns for WordPress detection
- `drupal-required.json` - Required patterns for Drupal detection
- `joomla-required.json` - Required patterns for Joomla detection
- `duda-required.json` - Required patterns for Duda detection

### Standards File
- `pattern-standards.json` - Naming conventions and validation rules

## Pattern File Structure

Each CMS-specific file contains:
- `required_patterns`: All patterns that should be detected for comprehensive coverage
- `discriminator_patterns`: High-confidence patterns that uniquely identify the CMS
- `confidence_thresholds`: Threshold values for pattern confidence scoring
- `minimum_patterns_required`: Minimum number of patterns needed for detection
- `minimum_discriminators_required`: Minimum number of discriminator patterns needed

## Usage

These files are used by the evaluation scripts:
- `evaluate-completeness.py` - Compares discovered patterns against required patterns
- `evaluate-consistency.py` - Measures pattern naming consistency
- `verify-patterns.py` - Validates patterns exist in collected data

## Updating Patterns

When adding new patterns:
1. Add to the appropriate `required_patterns` array
2. If it's a strong indicator, also add to `discriminator_patterns`
3. Ensure the pattern name follows the standards in `pattern-standards.json`
4. Test with the evaluation scripts to ensure compatibility