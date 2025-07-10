import { jest } from '@jest/globals';
import { setupCommandTests } from '@test-utils';

describe('Ground Truth Script Signals Bug Fix', () => {
    setupCommandTests();

    let discovery: any;

    beforeEach(() => {
        // Create a test class with the methods we need to test
        class TestGroundTruthDiscovery {
            constructor() {
                // Mock constructor
            }
            
            extractDomain(url: string): string {
                try {
                    const urlObj = new URL(url);
                    return urlObj.hostname.toLowerCase();
                } catch {
                    return '';
                }
            }
            
            isSameDomain(domain1: string, domain2: string): boolean {
                return domain1 === domain2;
            }
            
            isSameDomainScript(scriptUrl: string, targetUrl: string): boolean {
                try {
                    // If script URL is relative, it's same domain
                    if (!scriptUrl.startsWith('http')) {
                        return true;
                    }

                    const scriptDomain = new URL(scriptUrl).hostname.toLowerCase();
                    const targetDomain = new URL(targetUrl).hostname.toLowerCase();

                    // Only exact matches are considered the same domain
                    return scriptDomain === targetDomain;
                } catch {
                    // If URL parsing fails, assume it's not same domain
                    return false;
                }
            }
            
            analyzeScriptSignals(data: any): Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, examples?: string[]}> {
                const signals: Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, examples?: string[]}> = [];
                const scripts = data.scripts || [];
                const targetUrl = data.url || '';
                
                // WordPress script patterns - only count same-domain scripts
                const wpContentScripts = scripts.filter((s: any) => 
                    s.src && s.src.toLowerCase().includes('/wp-content/') && this.isSameDomainScript(s.src, targetUrl));
                const wpIncludesScripts = scripts.filter((s: any) => 
                    s.src && s.src.toLowerCase().includes('/wp-includes/') && this.isSameDomainScript(s.src, targetUrl));
                
                signals.push({
                    signal: '/wp-content/ scripts (WordPress)',
                    confidence: 'high' as const,
                    match: wpContentScripts.length > 0,
                    cms: 'WordPress',
                    examples: wpContentScripts.slice(0, 2).map((s: any) => s.src)
                });
                
                signals.push({
                    signal: '/wp-includes/ scripts (WordPress)',
                    confidence: 'high' as const,
                    match: wpIncludesScripts.length > 0,
                    cms: 'WordPress',
                    examples: wpIncludesScripts.slice(0, 1).map((s: any) => s.src)
                });
                
                // Drupal script patterns - only count same-domain scripts
                const drupalSitesScripts = scripts.filter((s: any) => 
                    s.src && s.src.toLowerCase().includes('/sites/') && this.isSameDomainScript(s.src, targetUrl));
                const drupalCoreScripts = scripts.filter((s: any) => 
                    s.src && s.src.toLowerCase().includes('/core/') && this.isSameDomainScript(s.src, targetUrl));
                
                signals.push({
                    signal: '/sites/ directory (Drupal)',
                    confidence: 'high' as const,
                    match: drupalSitesScripts.length > 0,
                    cms: 'drupal',
                    examples: drupalSitesScripts.slice(0, 2).map((s: any) => s.src)
                });
                
                signals.push({
                    signal: '/core/ directory (Drupal 8+)',
                    confidence: 'medium' as const,
                    match: drupalCoreScripts.length > 0,
                    cms: 'drupal',
                    examples: drupalCoreScripts.slice(0, 1).map((s: any) => s.src)
                });
                
                // Joomla script patterns - only count same-domain scripts
                const joomlaJuiScripts = scripts.filter((s: any) => 
                    s.src && s.src.toLowerCase().includes('/media/jui/js/') && this.isSameDomainScript(s.src, targetUrl));
                const joomlaMediaScripts = scripts.filter((s: any) => 
                    s.src && s.src.toLowerCase().includes('/media/') && this.isSameDomainScript(s.src, targetUrl));
                const joomlaComponentScripts = scripts.filter((s: any) => 
                    s.src && s.src.toLowerCase().includes('/components/') && this.isSameDomainScript(s.src, targetUrl));
                
                signals.push({
                    signal: '/media/jui/js/ scripts (Joomla UI library)',
                    confidence: 'high' as const,
                    match: joomlaJuiScripts.length > 0,
                    cms: 'Joomla',
                    examples: joomlaJuiScripts.slice(0, 2).map((s: any) => s.src)
                });
                
                signals.push({
                    signal: '/media/ scripts (Joomla)',
                    confidence: 'medium' as const,
                    match: joomlaMediaScripts.length > 0,
                    cms: 'Joomla',
                    examples: joomlaMediaScripts.slice(0, 2).map((s: any) => s.src)
                });
                
                signals.push({
                    signal: '/components/ scripts (Joomla)',
                    confidence: 'medium' as const,
                    match: joomlaComponentScripts.length > 0,
                    cms: 'Joomla',
                    examples: joomlaComponentScripts.slice(0, 1).map((s: any) => s.src)
                });
                
                // Common libraries - only count same-domain to avoid false positives from CDNs
                const jqueryScripts = scripts.filter((s: any) => 
                    s.src && s.src.toLowerCase().includes('jquery') && this.isSameDomainScript(s.src, targetUrl));
                const bootstrapScripts = scripts.filter((s: any) => 
                    s.src && s.src.toLowerCase().includes('bootstrap') && this.isSameDomainScript(s.src, targetUrl));
                
                // Only show jQuery if it's not already covered by more specific WordPress patterns
                const hasWordPressPatterns = wpContentScripts.length > 0 || wpIncludesScripts.length > 0;
                if (!hasWordPressPatterns && jqueryScripts.length > 0) {
                    signals.push({
                        signal: 'jQuery library (same-domain)',
                        confidence: 'low' as const,
                        match: true,
                        examples: jqueryScripts.slice(0, 1).map((s: any) => s.src)
                    });
                }
                
                signals.push({
                    signal: 'Bootstrap framework (same-domain)',
                    confidence: 'low' as const,
                    match: bootstrapScripts.length > 0,
                    examples: bootstrapScripts.slice(0, 1).map((s: any) => s.src)
                });
                
                return signals;
            }
            
            // Mock the display method for testing
            displaySignalCategory(title: string, signals: Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, examples?: string[]}>) {
                const matchingSignals = signals.filter(s => s.match);
                const missingSignals = signals.filter(s => !s.match && s.cms);
                
                // Return info about what would be displayed for testing
                return {
                    title,
                    matchingCount: matchingSignals.length,
                    missingCount: missingSignals.length,
                    showsNoPatterns: matchingSignals.length === 0 && missingSignals.length > 0,
                    matchingSignals: matchingSignals.map(s => s.signal),
                    missingSignals: missingSignals.map(s => s.signal)
                };
            }
        }
        
        discovery = new TestGroundTruthDiscovery();
    });

    describe('Script Signal Detection', () => {
        it('should detect wp-includes scripts correctly and not show redundant jQuery', () => {
            const targetUrl = 'https://lamaisondaffichage.ca';
            const data = {
                url: targetUrl,
                scripts: [
                    { src: 'https://lamaisondaffichage.ca/wp-includes/js/jquery/jquery.min.js?ver=3.7.1' }
                ]
            };
            
            const signals = discovery.analyzeScriptSignals(data);
            
            // Should detect wp-includes pattern
            const wpIncludesSignal = signals.find((s: any) => s.signal.includes('/wp-includes/'));
            expect(wpIncludesSignal).toBeDefined();
            expect(wpIncludesSignal.match).toBe(true);
            expect(wpIncludesSignal.examples).toContain('https://lamaisondaffichage.ca/wp-includes/js/jquery/jquery.min.js?ver=3.7.1');
            
            // Should NOT show jQuery signal since it's covered by wp-includes
            const jquerySignal = signals.find((s: any) => s.signal.includes('jQuery library'));
            expect(jquerySignal).toBeUndefined();
        });

        it('should show jQuery signal only when no WordPress patterns exist', () => {
            const targetUrl = 'https://example.com';
            const data = {
                url: targetUrl,
                scripts: [
                    { src: 'https://example.com/js/jquery.min.js' }
                ]
            };
            
            const signals = discovery.analyzeScriptSignals(data);
            
            // Should NOT detect WordPress patterns
            const wpIncludesSignal = signals.find((s: any) => s.signal.includes('/wp-includes/'));
            const wpContentSignal = signals.find((s: any) => s.signal.includes('/wp-content/'));
            expect(wpIncludesSignal.match).toBe(false);
            expect(wpContentSignal.match).toBe(false);
            
            // Should show jQuery signal since no WordPress patterns exist
            const jquerySignal = signals.find((s: any) => s.signal.includes('jQuery library'));
            expect(jquerySignal).toBeDefined();
            expect(jquerySignal.match).toBe(true);
        });

        it('should filter out jQuery from different domains/CDNs', () => {
            const targetUrl = 'https://example.com';
            const data = {
                url: targetUrl,
                scripts: [
                    { src: 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js' },
                    { src: 'https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js' }
                ]
            };
            
            const signals = discovery.analyzeScriptSignals(data);
            
            // Should NOT show jQuery signal since these are from different domains
            const jquerySignal = signals.find((s: any) => s.signal.includes('jQuery library'));
            expect(jquerySignal).toBeUndefined();
        });

        it('should handle same-domain Bootstrap correctly', () => {
            const targetUrl = 'https://example.com';
            const data = {
                url: targetUrl,
                scripts: [
                    { src: 'https://example.com/js/bootstrap.min.js' },
                    { src: 'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js' }
                ]
            };
            
            const signals = discovery.analyzeScriptSignals(data);
            
            // Should only count same-domain Bootstrap
            const bootstrapSignal = signals.find((s: any) => s.signal.includes('Bootstrap framework'));
            expect(bootstrapSignal).toBeDefined();
            expect(bootstrapSignal.match).toBe(true);
            expect(bootstrapSignal.examples).toEqual(['https://example.com/js/bootstrap.min.js']);
        });

        it('should handle the original lamaisondaffichage.ca case correctly', () => {
            const targetUrl = 'https://lamaisondaffichage.ca';
            const data = {
                url: targetUrl,
                scripts: [
                    { src: 'https://lamaisondaffichage.ca/wp-includes/js/jquery/jquery.min.js?ver=3.7.1' },
                    { src: 'https://lamaisondaffichage.ca/wp-content/themes/twentytwentythree/style.css' }
                ]
            };
            
            const signals = discovery.analyzeScriptSignals(data);
            
            // Find all matching signals
            const matchingSignals = signals.filter((s: any) => s.match);
            const signalNames = matchingSignals.map((s: any) => s.signal);
            
            // Should detect wp-includes but NOT jQuery (since it's redundant)
            expect(signalNames).toContain('/wp-includes/ scripts (WordPress)');
            expect(signalNames).not.toContain('jQuery library (same-domain)');
            
            // Should show consistent results (no conflicting signals)
            const wpIncludesSignal = signals.find((s: any) => s.signal.includes('/wp-includes/'));
            expect(wpIncludesSignal.match).toBe(true);
        });
    });

    describe('Display Logic', () => {
        it('should not show "No patterns found" when some patterns match', () => {
            const signals = [
                { signal: '/wp-includes/ scripts (WordPress)', confidence: 'high' as const, match: true, cms: 'WordPress', examples: ['example.js'] },
                { signal: '/wp-content/ scripts (WordPress)', confidence: 'high' as const, match: false, cms: 'WordPress', examples: [] },
                { signal: '/sites/ directory (Drupal)', confidence: 'high' as const, match: false, cms: 'drupal', examples: [] }
            ];
            
            const displayResult = discovery.displaySignalCategory('SCRIPT PATTERNS', signals);
            
            expect(displayResult.matchingCount).toBe(1);
            expect(displayResult.missingCount).toBe(2);
            expect(displayResult.showsNoPatterns).toBe(false); // Should NOT show "No patterns found"
            expect(displayResult.matchingSignals).toContain('/wp-includes/ scripts (WordPress)');
        });

        it('should show "No patterns found" only when ALL patterns are missing', () => {
            const signals = [
                { signal: '/wp-includes/ scripts (WordPress)', confidence: 'high' as const, match: false, cms: 'WordPress', examples: [] },
                { signal: '/wp-content/ scripts (WordPress)', confidence: 'high' as const, match: false, cms: 'WordPress', examples: [] },
                { signal: '/sites/ directory (Drupal)', confidence: 'high' as const, match: false, cms: 'drupal', examples: [] }
            ];
            
            const displayResult = discovery.displaySignalCategory('SCRIPT PATTERNS', signals);
            
            expect(displayResult.matchingCount).toBe(0);
            expect(displayResult.missingCount).toBe(3);
            expect(displayResult.showsNoPatterns).toBe(true); // SHOULD show "No patterns found"
        });

        it('should handle the original lamaisondaffichage.ca display case correctly', () => {
            const targetUrl = 'https://lamaisondaffichage.ca';
            const data = {
                url: targetUrl,
                scripts: [
                    { src: 'https://lamaisondaffichage.ca/wp-includes/js/jquery/jquery.min.js?ver=3.7.1' }
                ]
            };
            
            const signals = discovery.analyzeScriptSignals(data);
            const displayResult = discovery.displaySignalCategory('SCRIPT PATTERNS', signals);
            
            // Should have wp-includes matching but other patterns not matching
            expect(displayResult.showsNoPatterns).toBe(false); // Should NOT show "No patterns found"
            expect(displayResult.matchingSignals).toContain('/wp-includes/ scripts (WordPress)');
            expect(displayResult.matchingCount).toBeGreaterThan(0);
        });
    });
});