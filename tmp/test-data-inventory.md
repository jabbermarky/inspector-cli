# Test Data Inventory

## CSV Test Files (31 files, 29,390 URLs total)

### Core Test Files (Good/Known Sites)
- **good-wordpress.csv** - 3 verified WordPress sites for baseline testing
- **good-drupal.csv** - 9 verified Drupal sites for baseline testing  
- **good-joomla.csv** - 4 verified Joomla sites for baseline testing
- **duda.csv** - 655 Duda sites for comprehensive testing
- **duda2.csv** - 10 additional Duda sites for validation

### CMS-Specific Test Files
- **additional_joomla_sites.csv** - 5 extra Joomla sites for expanded testing
- **bad-joomla.csv** - 16 problematic Joomla sites (navigation timeouts)
- **drupal.csv** - 59 lines of Drupal-related data
- **joomla-curated.csv** - 10 manually curated Joomla sites
- **wordpress-curated.csv** - 10 manually curated WordPress sites

### Analysis and Pattern Files
- **duda-patterns-only.csv** - Extracted Duda patterns for analysis
- **failing-sites.csv** - 58 sites that failed detection
- **mixed-cms-sites.csv** - 10 sites with mixed CMS indicators
- **test-sites.csv** - 5 general test sites

### Batch Processing Files
- **cpanel.csv** - 38 cPanel-related entries
- **updated-joomla.csv** - 59 updated Joomla sites
- **wordpress-batch.csv** - 83 WordPress sites for batch processing

### Specialized Collections
- **special-joomla.csv** - 5 special case Joomla sites
- **test-duda.csv** - 5 Duda test sites
- **test-wordpress.csv** - 5 WordPress test sites

## Data Directories (4 directories, 3,488 files, 950MB total)

### Primary Data Storage
- **data/** - Main data directory with cms-analysis, learn results, cache
- **batches/** - CSV files and batch processing data
- **reports/** - Analysis reports and documentation
- **plans/** - Test plans and implementation guides

## Pattern Files (201 files)

### Expected Pattern Databases
- **wordpress-required.json** - Must-detect WordPress patterns
- **drupal-required.json** - Must-detect Drupal patterns
- **joomla-required.json** - Must-detect Joomla patterns
- **duda-required.json** - Must-detect Duda patterns (needs creation)

### Historical Results
- **baseline-results/** - Pre-phased approach results
- **phased-results/** - 2-phase approach results
- **mixed-model-results/** - Model combination testing

## Data Quality Assessment

### Availability: 89.3%
- 599 of 671 test sites have existing analysis data
- 72 sites need fresh analysis

### Coverage by CMS:
- **WordPress**: 3 test sites, full data coverage
- **Drupal**: 9 test sites, full data coverage  
- **Joomla**: 4 test sites, full data coverage
- **Duda**: 665 test sites, 583 with existing data

### Missing Components:
- **good-duda.csv** - Standardized Duda test file needed
- **pattern-standards.json** - Naming convention reference
- **validation-sets/** - Edge cases and consistency tests

## Recommendations

### High Priority:
1. Create **good-duda.csv** with 10 verified Duda sites
2. Run learn command on 72 sites with missing data
3. Build ground truth pattern databases

### Medium Priority:
1. Standardize CSV formatting across all files
2. Create performance test site collections
3. Implement automated validation pipeline

## Next Steps

1. **Step 1 Complete**: Data inventory and cross-reference ✅
2. **Step 2 Pending**: Ground truth pattern extraction
3. **Step 3 Pending**: Validation pipeline creation