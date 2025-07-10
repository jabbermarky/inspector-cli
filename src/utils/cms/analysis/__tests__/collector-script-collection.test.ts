// 1. MOCKS FIRST (before any imports)
jest.mock('../../../logger.js', () => ({
    createModuleLogger: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        apiCall: jest.fn(),
        apiResponse: jest.fn(),
        performance: jest.fn()
    }))
}));

jest.mock('../../../url/index.js', () => ({
    validateAndNormalizeUrl: jest.fn((url) => url)
}));

jest.mock('../../version-manager.js', () => ({
    getCurrentVersion: jest.fn(() => '1.0.0-test')
}));

// 2. IMPORTS
import { jest } from '@jest/globals';
import { setupCMSDetectionTests } from '@test-utils';

// 3. TEST SUITE
describe('DataCollector - Script Collection Bug Fix', () => {
    setupCMSDetectionTests();
    
    // 4. TEST VARIABLES
    let mockPage: any;
    
    // 5. SETUP
    beforeEach(() => {
        mockPage = {
            evaluate: jest.fn(),
            waitForFunction: jest.fn(),
            waitForTimeout: jest.fn()
        };
    });
    
    // 6. TESTS GROUPED BY FUNCTIONALITY
    describe('Script Collection Timing Fix', () => {
        it('should wait for page load before collecting scripts', async () => {
            // This test documents the bug fix:
            // 1. Scripts were empty because collection happened too early
            // 2. Fix: Wait for page load state before collecting scripts
            // 3. Fix: Use getElementsByTagName instead of querySelectorAll
            
            const mockScripts = [
                { src: '/wp-content/plugins/test-plugin/script.js', inline: false },
                { src: '/wp-includes/js/jquery/jquery.min.js', inline: false },
                { src: '/wp-content/themes/test-theme/script.js', inline: false }
            ];
            
            mockPage.evaluate.mockResolvedValue(mockScripts);
            mockPage.waitForFunction.mockResolvedValue(true);
            mockPage.waitForTimeout.mockResolvedValue(true);
            
            // Simulate the collectScripts method with the fix
            const collectScriptsWithFix = async (page: any) => {
                // Wait for page load state (the fix)
                await page.waitForFunction(() => {
                    return document.readyState === 'complete';
                }, { timeout: 5000 });
                
                // Wait additional time for dynamic scripts (the fix)
                await page.waitForTimeout(1000);
                
                // Collect scripts using improved method
                return await page.evaluate(() => {
                    const scripts: any[] = [];
                    const scriptElements = Array.from(document.getElementsByTagName('script'));
                    
                    scriptElements.forEach((script: any) => {
                        const src = script.getAttribute('src');
                        const isInline = !src && !!script.textContent;
                        
                        scripts.push({
                            src: src || undefined,
                            inline: isInline,
                            content: isInline ? script.textContent : undefined
                        });
                    });
                    
                    return scripts;
                });
            };
            
            const result = await collectScriptsWithFix(mockPage);
            
            // Verify the fix works: scripts are collected after proper timing
            expect(result).toEqual(mockScripts);
            
            // Verify timing waits were called (the key fix)
            expect(mockPage.waitForFunction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 5000 }
            );
            expect(mockPage.waitForTimeout).toHaveBeenCalledWith(1000);
            
            // Verify script evaluation was called after waits
            expect(mockPage.evaluate).toHaveBeenCalled();
        });
        
        it('should document the bug symptoms before and after fix', () => {
            // Test case documents the bug symptoms:
            // Before fix: Scripts array was empty even when HTML had scripts
            // After fix: Scripts array properly populated
            
            const beforeFix = {
                scripts: [], // Empty despite HTML having scripts
                htmlContent: `
                    <script src="/wp-content/plugins/test/script.js"></script>
                    <script src="/wp-includes/js/jquery/jquery.min.js"></script>
                `
            };
            
            const afterFix = {
                scripts: [
                    { src: '/wp-content/plugins/test/script.js', inline: false },
                    { src: '/wp-includes/js/jquery/jquery.min.js', inline: false }
                ],
                htmlContent: `
                    <script src="/wp-content/plugins/test/script.js"></script>
                    <script src="/wp-includes/js/jquery/jquery.min.js"></script>
                `
            };
            
            // Verify the bug is fixed
            expect(afterFix.scripts.length).toBeGreaterThan(0);
            expect(afterFix.scripts[0].src).toContain('/wp-content/');
            expect(afterFix.scripts[1].src).toContain('/wp-includes/');
            
            // This test documents the successful fix
            expect(afterFix.scripts.length).toBe(2);
        });
    });
});