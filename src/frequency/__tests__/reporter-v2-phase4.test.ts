/**
 * Phase 4 Tests: Script Pattern Analysis with Classification
 * 
 * Tests the formatScriptPatternsSection function and its integration
 * with all output formats (human, markdown, csv).
 */

import { describe, it, expect } from 'vitest';
import type { FrequencyResult } from '../types/frequency-types-v2.js';

// Import the functions we need to test
import { formatOutputV2 } from '../simple-reporter-v2.js';

/**
 * Create mock FrequencyResult with comprehensive script pattern data for testing
 */
function createMockFrequencyResultWithScripts(): FrequencyResult {
    return {
        metadata: {
            totalSites: 4569,
            validSites: 4569,
            filteredSites: 0,
            analysisDate: '2024-01-15T10:30:00Z',
            options: {
                output: 'human'
            }
        },
        summary: {
            totalSitesAnalyzed: 4569,
            totalPatternsFound: 8,
            analysisDate: '2024-01-15T10:30:00Z'
        },
        headers: {},
        metaTags: {},
        scripts: {
            'path:wp-content': {
                frequency: 0.34,
                occurrences: 1554,
                totalSites: 4569,
                examples: ['/wp-content/themes/twentytwentythree/assets/js/main.js', '/wp-content/plugins/contact-form-7/includes/js/index.js']
            },
            'path:drupal': {
                frequency: 0.12,
                occurrences: 548,
                totalSites: 4569,
                examples: ['/core/misc/drupal.js', '/sites/all/modules/views/js/ajax_view.js']
            },
            'jquery': {
                frequency: 0.67,
                occurrences: 3061,
                totalSites: 4569,
                examples: ['https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js', 'https://code.jquery.com/jquery-3.6.0.min.js']
            },
            'google-analytics': {
                frequency: 0.45,
                occurrences: 2056,
                totalSites: 4569,
                examples: ['https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID', 'https://www.google-analytics.com/analytics.js']
            },
            'facebook-pixel': {
                frequency: 0.23,
                occurrences: 1051,
                totalSites: 4569,
                examples: ['https://connect.facebook.net/en_US/fbevents.js', '<!-- Facebook Pixel Code -->']
            },
            'cdn-usage': {
                frequency: 0.56,
                occurrences: 2559,
                totalSites: 4569,
                examples: ['https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js', 'https://unpkg.com/axios@1.4.0/dist/axios.min.js']
            },
            'inline-script': {
                frequency: 0.78,
                occurrences: 3564,
                totalSites: 4569,
                examples: ['<!-- Google Tag Manager -->\n<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({\'gtm.start\':', 'var config = {"apiUrl": "https://api.example.com"};']
            },
            'unknown-pattern': {
                frequency: 0.02,
                occurrences: 91,
                totalSites: 4569,
                examples: ['/custom/weird/script.js', 'some-complex-pattern']
            }
        },
        biasAnalysis: undefined
    };
}

/**
 * Create mock FrequencyResult without scripts
 */
function createMockFrequencyResultWithoutScripts(): FrequencyResult {
    return {
        metadata: {
            totalSites: 4569,
            validSites: 4569,
            filteredSites: 0,
            analysisDate: '2024-01-15T10:30:00Z',
            options: {
                output: 'human'
            }
        },
        summary: {
            totalSitesAnalyzed: 4569,
            totalPatternsFound: 0,
            analysisDate: '2024-01-15T10:30:00Z'
        },
        headers: {},
        metaTags: {},
        scripts: {}, // Empty scripts
        biasAnalysis: undefined
    };
}

describe('Phase 4: Script Pattern Analysis with Classification', () => {
    describe('Human Format Output', () => {
        it('should include comprehensive script analysis with classification system', async () => {
            const result = createMockFrequencyResultWithScripts();
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'human' });
                
                // Verify script patterns section is present with count
                expect(capturedOutput).toContain('SCRIPT PATTERNS (8 patterns):');
                
                // Verify classification sections are present
                expect(capturedOutput).toContain('### Path Patterns');
                expect(capturedOutput).toContain('*Script locations that indicate CMS structure, platform architecture, or organizational patterns.*');
                
                expect(capturedOutput).toContain('### JavaScript Libraries');
                expect(capturedOutput).toContain('*Popular JavaScript libraries and frameworks detected across sites.*');
                
                expect(capturedOutput).toContain('### Analytics & Tracking');
                expect(capturedOutput).toContain('*Analytics platforms, marketing pixels, and user tracking technologies.*');
                
                expect(capturedOutput).toContain('### Inline Script Patterns');
                expect(capturedOutput).toContain('*Common patterns found in inline JavaScript code embedded in HTML.*');
                
                expect(capturedOutput).toContain('### CDN & External Domains');
                expect(capturedOutput).toContain('*Content delivery networks and external script hosting services.*');
                
                // Verify pattern display with prefix removal
                expect(capturedOutput).toContain('**wp-content**: 34.0% (1554/4569 sites)'); // path:wp-content -> wp-content
                expect(capturedOutput).toContain('**drupal**: 12.0% (548/4569 sites)'); // path:drupal -> drupal
                
                // Verify library patterns
                expect(capturedOutput).toContain('**jquery**: 67.0% (3061/4569 sites)');
                
                // Verify tracking patterns
                expect(capturedOutput).toContain('**google-analytics**: 45.0% (2056/4569 sites)');
                expect(capturedOutput).toContain('**facebook-pixel**: 23.0% (1051/4569 sites)');
                
                // Verify examples are shown
                expect(capturedOutput).toContain('Example: /wp-content/themes/twentytwentythree/assets/js/main.js');
                expect(capturedOutput).toContain('Example: https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.mi...');
                
                // Verify inline script examples are formatted properly (code detection)
                expect(capturedOutput).toContain('Example: `<!-- Google Tag Manager --> <script>(function(w,d,...` (inline code)');
                
                // Verify summary
                expect(capturedOutput).toContain('**Summary:** 8 total patterns across');
                expect(capturedOutput).toContain('categories analyzed.');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });

        it('should handle prefix-based pattern classification correctly', async () => {
            const result = createMockFrequencyResultWithScripts();
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'human' });
                
                // path:wp-content should be classified under "Path Patterns" and display as "wp-content"
                const pathSection = capturedOutput.split('### Path Patterns')[1];
                expect(pathSection).toContain('**wp-content**: 34.0%');
                expect(pathSection).toContain('**drupal**: 12.0%');
                
                // Should NOT show the full prefix patterns
                expect(pathSection).not.toContain('**path:wp-content**');
                expect(pathSection).not.toContain('**path:drupal**');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });

        it('should format complex inline script examples properly', async () => {
            const result = createMockFrequencyResultWithScripts();
            // Add a script with complex inline code
            result.scripts['complex-inline'] = {
                frequency: 0.15,
                occurrences: 685,
                totalSites: 4569,
                examples: ['<!-- Google Tag Manager -->\n<script>\n(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({\'gtm.start\':new Date().getTime(),event:\'gtm.js\'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!=\'dataLayer\'?\'&l=\'+l:\'\';j.async=true;j.src=\'https://www.googletagmanager.com/gtm.js?id=\'+i+dl;f.parentNode.insertBefore(j,f);})(window,document,\'script\',\'dataLayer\',\'GTM-XXXXXXX\');\n</script>']
            };
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'human' });
                
                // Complex inline scripts should be summarized with "(inline code)" indicator  
                expect(capturedOutput).toContain('`<!-- Google Tag Manager --> <script>(function(w,d');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });

        it('should not include script patterns section when no scripts exist', async () => {
            const result = createMockFrequencyResultWithoutScripts();
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'human' });
                
                // Should not show script patterns section
                expect(capturedOutput).not.toContain('SCRIPT PATTERNS');
                expect(capturedOutput).not.toContain('### Path Patterns');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });
    });

    describe('Markdown Format Output', () => {
        it('should include comprehensive markdown tables for each classification', async () => {
            const result = createMockFrequencyResultWithScripts();
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'markdown' });
                
                // Verify markdown section header
                expect(capturedOutput).toContain('## Script Patterns (8 patterns)');
                
                // Verify classification tables
                expect(capturedOutput).toContain('### Path Patterns');
                expect(capturedOutput).toContain('| Pattern | Frequency | Sites Using | Example |');
                expect(capturedOutput).toContain('|---------|-----------|-------------|---------|');
                
                // Verify table rows with prefix removal (examples truncated for markdown)
                expect(capturedOutput).toContain('| `wp-content` | 34.0% | 1554/4569 | /wp-content/themes/twentytwentythree/assets/js/mai... |');
                expect(capturedOutput).toContain('| `drupal` | 12.0% | 548/4569 | /core/misc/drupal.js |');
                
                // Verify library section
                expect(capturedOutput).toContain('### JavaScript Libraries');
                expect(capturedOutput).toContain('| `jquery` | 67.0% | 3061/4569 | https://ajax.googleapis.com/ajax/libs/jquery/3.6.0... |');
                
                // Verify tracking section
                expect(capturedOutput).toContain('### Analytics & Tracking');
                expect(capturedOutput).toContain('| `google-analytics` | 45.0% | 2056/4569 |');
                expect(capturedOutput).toContain('| `facebook-pixel` | 23.0% | 1051/4569 |');
                
                // Verify summary
                expect(capturedOutput).toContain('**Summary:** 8 total patterns across');
                expect(capturedOutput).toContain('categories analyzed.');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });

        it('should properly escape markdown table cell content for script examples', async () => {
            const result = createMockFrequencyResultWithScripts();
            // Add script with markdown special characters - use existing classification
            result.scripts['path:special'] = { // This will be classified as 'path'
                frequency: 0.05,
                occurrences: 228,
                totalSites: 4569,
                examples: ['script|with|pipes|and|newlines\ntest', 'another*special*example']
            };
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'markdown' });
                
                // Verify pipe characters are escaped and newlines removed (all pipes escaped)
                expect(capturedOutput).toContain('script\\|with\\|pipes\\|and\\|newlines test');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });
    });

    describe('CSV Format Output', () => {
        it('should include comprehensive CSV with all script data grouped by category', async () => {
            const result = createMockFrequencyResultWithScripts();
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'csv' });
                
                // Verify CSV structure
                expect(capturedOutput).toContain('# Script Patterns Analysis');
                expect(capturedOutput).toContain('Category,Pattern,Frequency,Occurrences,TotalSites,Example');
                
                // Verify path patterns
                expect(capturedOutput).toContain('"Path Patterns","wp-content",0.340000,1554,4569,"/wp-content/themes/twentytwentythree/assets/js/main.js"');
                expect(capturedOutput).toContain('"Path Patterns","drupal",0.120000,548,4569,"/core/misc/drupal.js"');
                
                // Verify library patterns
                expect(capturedOutput).toContain('"JavaScript Libraries","jquery",0.670000,3061,4569,"https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js"');
                
                // Verify tracking patterns
                expect(capturedOutput).toContain('"Analytics & Tracking","google-analytics",0.450000,2056,4569,"https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"');
                expect(capturedOutput).toContain('"Analytics & Tracking","facebook-pixel",0.230000,1051,4569,"https://connect.facebook.net/en_US/fbevents.js"');
                
                // Verify CDN patterns
                expect(capturedOutput).toContain('"CDN & External Domains","cdn-usage",0.560000,2559,4569,"https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"');
                
                // Verify inline patterns
                expect(capturedOutput).toContain('"Inline Script Patterns","inline-script",0.780000,3564,4569');
                
                // Verify "Other" category for unclassified patterns
                expect(capturedOutput).toContain('"Other","unknown-pattern",0.020000,91,4569,"/custom/weird/script.js"');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });

        it('should properly escape CSV special characters in script examples', async () => {
            const result = createMockFrequencyResultWithScripts();
            // Add script with CSV special characters
            result.scripts['csv-test'] = {
                frequency: 0.01,
                occurrences: 45,
                totalSites: 4569,
                examples: ['script,with,"quotes",and,commas', 'another"example']
            };
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'csv' });
                
                // Verify CSV escaping of quotes and commas
                expect(capturedOutput).toContain('"Other","csv-test"'); // Pattern name escaped
                expect(capturedOutput).toContain('"script,with,""quotes"",and,commas"'); // Example properly escaped
                
            } finally {
                console.log = originalConsoleLog;
            }
        });
    });

    describe('Classification Logic', () => {
        it('should correctly classify scripts based on known patterns', async () => {
            const result = createMockFrequencyResultWithScripts();
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'human' });
                
                // Verify jquery is classified under JavaScript Libraries
                const librarySection = capturedOutput.split('### JavaScript Libraries')[1];
                expect(librarySection).toContain('**jquery**: 67.0%');
                
                // Verify google-analytics is classified under Analytics & Tracking
                const trackingSection = capturedOutput.split('### Analytics & Tracking')[1];
                expect(trackingSection).toContain('**google-analytics**: 45.0%');
                expect(trackingSection).toContain('**facebook-pixel**: 23.0%');
                
                // Verify cdn-usage is classified under CDN & External Domains
                const cdnSection = capturedOutput.split('### CDN & External Domains')[1];
                expect(cdnSection).toContain('**cdn-usage**: 56.0%');
                
                // Verify inline-script is classified under Inline Script Patterns
                const inlineSection = capturedOutput.split('### Inline Script Patterns')[1];
                expect(inlineSection).toContain('**inline-script**: 78.0%');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });

        it('should handle patterns within each classification sorted by frequency', async () => {
            const result = createMockFrequencyResultWithScripts();
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'human' });
                
                // Within Path Patterns, wp-content (34%) should come before drupal (12%)
                const pathSection = capturedOutput.split('### Path Patterns')[1].split('###')[0];
                const wpContentPos = pathSection.indexOf('**wp-content**: 34.0%');
                const drupalPos = pathSection.indexOf('**drupal**: 12.0%');
                
                expect(wpContentPos).toBeGreaterThan(-1);
                expect(drupalPos).toBeGreaterThan(-1);
                expect(wpContentPos).toBeLessThan(drupalPos);
                
            } finally {
                console.log = originalConsoleLog;
            }
        });

        it('should show top 15 patterns per classification', async () => {
            const result = createMockFrequencyResultWithScripts();
            
            // Add many patterns to path classification to test the limit
            for (let i = 3; i <= 20; i++) {
                result.scripts[`path:pattern-${i}`] = {
                    frequency: 0.01 * (21 - i), // Decreasing frequency
                    occurrences: 45,
                    totalSites: 4569,
                    examples: [`/path/pattern-${i}.js`]
                };
            }
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'human' });
                
                // Should show pattern-15 (within top 15)
                expect(capturedOutput).toContain('**pattern-15**');
                
                // Should NOT show pattern-16 and beyond (beyond top 15)
                expect(capturedOutput).not.toContain('**pattern-16**');
                expect(capturedOutput).not.toContain('**pattern-20**');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });
    });

    describe('Example Formatting', () => {
        it('should handle different types of script examples appropriately', async () => {
            const result = createMockFrequencyResultWithScripts();
            
            // Add various types of script examples with existing classifications
            result.scripts['bootstrap'] = { // This will be classified as 'library'
                frequency: 0.10,
                occurrences: 457,
                totalSites: 4569,
                examples: ['https://example.com/bootstrap.js']
            };
            
            result.scripts['complex-inline'] = { // This will be classified as 'inline' (has HTML comments)
                frequency: 0.08,
                occurrences: 365,
                totalSites: 4569,
                examples: ['<!-- Complex Code -->\n<script>var config = {"api": "https://api.example.com", "timeout": 5000}; if (window.jQuery) { jQuery(document).ready(function() { console.log("Ready!"); }); }</script>']
            };
            
            result.scripts['path:custom'] = { // This will be classified as 'path'
                frequency: 0.06,
                occurrences: 274,
                totalSites: 4569,
                examples: ['/custom/module/behavior.js']
            };
            
            let capturedOutput = '';
            const originalConsoleLog = console.log;
            console.log = (output: string) => {
                capturedOutput = output;
            };

            try {
                await formatOutputV2(result, { output: 'human' });
                
                // Bootstrap library should be shown as-is (under 60 chars, so not truncated)
                expect(capturedOutput).toContain('https://example.com/bootstrap.js');
                
                // Complex inline code is classified as 'inline' but the pattern is ignored since it doesn't match known patterns
                // Verify path:custom gets displayed properly as 'custom' in Path Patterns
                expect(capturedOutput).toContain('**custom**: 6.0% (274/4569 sites)');
                
                // Custom path should be shown as-is in Path Patterns section
                expect(capturedOutput).toContain('/custom/module/behavior.js');
                
            } finally {
                console.log = originalConsoleLog;
            }
        });
    });
});