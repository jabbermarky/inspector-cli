import { jest } from '@jest/globals';
import { JoomlaDetector } from '../../detectors/joomla.js';
import { DetectionPage } from '../../types.js';

// Mock logger
jest.mock('../../../logger.js', () => ({
    createModuleLogger: () => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    })
}));

// Mock retry utility
jest.mock('../../../retry.js', () => ({
    withRetry: jest.fn().mockImplementation(async (fn: any) => {
        return await fn();
    })
}));

describe('Joomla Detector', () => {
    let detector: JoomlaDetector;
    let mockPage: jest.Mocked<DetectionPage>;

    beforeEach(() => {
        detector = new JoomlaDetector();
        
        mockPage = {
            $eval: jest.fn(),
            content: jest.fn(),
            goto: jest.fn(),
            evaluate: jest.fn()
        } as any;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Meta Tag Detection', () => {
        it('should detect Joomla from meta generator tag', async () => {
            mockPage.$eval.mockResolvedValue('joomla! 4.2');
            mockPage.content.mockResolvedValue('<html></html>');

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Joomla');
            expect(result.confidence).toBeGreaterThan(0.9);
            expect(result.version).toBe('4.2');
            expect(result.detectionMethods).toContain('meta-tag');
        });

        it('should handle missing meta tag gracefully', async () => {
            mockPage.$eval.mockRejectedValue(new Error('Meta tag not found'));
            mockPage.content.mockResolvedValue(`
                <html>
                    <head>
                        <meta content="Joomla! - Open Source Content Management" />
                    </head>
                    <body>
                        <script src="/administrator/templates/atum/js/script.js"></script>
                        <link href="/components/com_content/assets/css/style.css" rel="stylesheet">
                    </body>
                </html>
            `);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Joomla');
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.detectionMethods).toContain('html-content');
        });
    });

    describe('HTML Content Detection', () => {
        it('should detect Joomla from joomla-specific paths', async () => {
            mockPage.$eval.mockRejectedValue(new Error('No meta tag'));
            mockPage.content.mockResolvedValue(`
                <html>
                    <head>
                        <title>Test Site</title>
                        <link rel="stylesheet" href="/administrator/templates/atum/css/template.css">
                        <script src="/components/com_content/assets/js/script.js"></script>
                    </head>
                    <body>
                        <div id="joomla-content">
                            <script src="/modules/mod_menu/tmpl/default.js"></script>
                        </div>
                    </body>
                </html>
            `);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Joomla');
            expect(result.confidence).toBeGreaterThan(0.4);
            expect(result.detectionMethods).toContain('html-content');
        });

        it('should detect Joomla from content="Joomla!" meta tag', async () => {
            mockPage.$eval.mockRejectedValue(new Error('No generator meta tag'));
            mockPage.content.mockResolvedValue(`
                <html>
                    <head>
                        <meta content="Joomla! - Open Source Content Management" />
                        <title>Test Site</title>
                    </head>
                    <body>
                        <script src="/administrator/templates/atum/js/script.js"></script>
                        <div class="joomla-content">Welcome to our joomla site</div>
                        <script src="/components/com_content/assets/js/script.js"></script>
                    </body>
                </html>
            `);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Joomla');
            expect(result.confidence).toBeGreaterThan(0.4);
            expect(result.detectionMethods).toContain('html-content');
        });

        it('should detect Joomla from "joomla" text in HTML', async () => {
            mockPage.$eval.mockRejectedValue(new Error('No meta tag'));
            mockPage.content.mockResolvedValue(`
                <html>
                    <head><title>Test Site</title></head>
                    <body>
                        <div class="joomla-footer">
                            Powered by Joomla! content management system
                        </div>
                        <script src="/administrator/index.php"></script>
                        <script src="/components/com_content/script.js"></script>
                        <script src="/modules/mod_menu/script.js"></script>
                    </body>
                </html>
            `);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Joomla');
            expect(result.confidence).toBeGreaterThan(0.4);
            expect(result.detectionMethods).toContain('html-content');
        });

        it('should not detect Joomla from unrelated content', async () => {
            mockPage.$eval.mockRejectedValue(new Error('No meta tag'));
            mockPage.content.mockResolvedValue(`
                <html>
                    <head><title>My Site</title></head>
                    <body><p>Welcome to my website built with React</p></body>
                </html>
            `);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Unknown');
            expect(result.confidence).toBeLessThan(0.4);
        });
    });

    describe('Confidence Scoring', () => {
        it('should have high confidence with meta tag detection', async () => {
            mockPage.$eval.mockResolvedValue('joomla! 4.2');
            mockPage.content.mockResolvedValue('<html></html>');

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBeGreaterThan(0.9);
        });

        it('should have medium confidence with HTML content only', async () => {
            mockPage.$eval.mockRejectedValue(new Error('No meta tag'));
            mockPage.content.mockResolvedValue(`
                <html>
                    <script src="/administrator/templates/atum/js/script.js"></script>
                    <link href="/components/com_content/css/style.css" rel="stylesheet">
                    <div class="joomla-content">Content here</div>
                </html>
            `);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBeGreaterThan(0.4);
            expect(result.confidence).toBeLessThan(0.9);
        });

        it('should aggregate confidence from multiple successful strategies', async () => {
            mockPage.$eval.mockResolvedValue('joomla! 4.2');
            mockPage.content.mockResolvedValue(`
                <html>
                    <script src="/administrator/js/script.js"></script>
                    <div content="Joomla! CMS">Content</div>
                    <script src="/components/com_content/script.js"></script>
                    <script src="/modules/mod_menu/script.js"></script>
                    <script>Joomla.JText._('Some text');</script>
                </html>
            `);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.confidence).toBeGreaterThan(0.6);
            expect(result.detectionMethods?.length).toBeGreaterThan(1);
        });
    });

    describe('Error Handling', () => {
        it('should handle strategy failures gracefully', async () => {
            mockPage.$eval.mockRejectedValue(new Error('Meta tag failed'));
            mockPage.content.mockRejectedValue(new Error('Content failed'));

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Unknown');
            expect(result.confidence).toBe(0);
            expect(result.executionTime).toBeDefined();
        });

        it('should continue with other strategies if one fails', async () => {
            mockPage.$eval.mockRejectedValue(new Error('Meta tag failed'));
            mockPage.content.mockResolvedValue(`
                <html>
                    <script src="/administrator/templates/atum/js/script.js"></script>
                    <div class="joomla-powered">Powered by Joomla!</div>
                    <script src="/components/com_content/script.js"></script>
                    <script src="/modules/mod_menu/script.js"></script>
                    <script>Joomla.JText._('Some text');</script>
                </html>
            `);

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Joomla');
            expect(result.confidence).toBeGreaterThan(0);
        });
    });

    describe('Version Extraction', () => {
        it('should extract version from meta generator tag', async () => {
            mockPage.$eval.mockResolvedValue('joomla! 4.2.3');
            mockPage.content.mockResolvedValue('<html></html>');

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.version).toBe('4.2.3');
        });

        it('should handle version extraction with different formats', async () => {
            mockPage.$eval.mockResolvedValue('joomla 3.10.12');
            mockPage.content.mockResolvedValue('<html></html>');

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.version).toBe('3.10.12');
        });

        it('should work without version when not available', async () => {
            mockPage.$eval.mockResolvedValue('joomla');
            mockPage.content.mockResolvedValue('<html></html>');

            const result = await detector.detect(mockPage, 'https://example.com');

            expect(result.cms).toBe('Joomla');
            expect(result.version).toBeUndefined();
        });
    });

    describe('Strategy Weights', () => {
        it('should use correct strategy weights for joomla detection', async () => {
            const weights = (detector as any).getStrategyWeight;
            
            expect(weights('meta-tag')).toBe(1.0);
            expect(weights('html-content')).toBe(0.8);
            expect(weights('unknown-strategy')).toBe(0.5);
        });
    });
});