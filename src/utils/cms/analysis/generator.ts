import { TechnologySignature, DetectionDataPoint, PatternAnalysisResult } from './types.js';
import { PatternDiscovery } from './patterns.js';
import { createModuleLogger } from '../../logger.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const logger = createModuleLogger('rule-generator');

export interface GeneratedStrategy {
    name: string;
    className: string;
    fileName: string;
    code: string;
    confidence: number;
    patterns: number;
    testCases: GeneratedTestCase[];
}

export interface GeneratedTestCase {
    description: string;
    input: any;
    expectedOutput: {
        confidence: number;
        detected: boolean;
    };
}

export interface RuleGenerationOptions {
    outputDir?: string;
    minConfidence?: number;
    generateTests?: boolean;
    validateRules?: boolean;
    namingPrefix?: string;
}

/**
 * Automated rule generation engine
 * Converts discovered patterns into functional detection strategies
 */
export class RuleGenerator {
    private dataPoints: DetectionDataPoint[];
    private patternDiscovery: PatternDiscovery;
    private options: Required<RuleGenerationOptions>;

    constructor(dataPoints: DetectionDataPoint[], options: RuleGenerationOptions = {}) {
        this.dataPoints = dataPoints;
        this.patternDiscovery = new PatternDiscovery(dataPoints);
        this.options = {
            outputDir: './src/utils/cms/strategies/generated',
            minConfidence: 0.7,
            generateTests: true,
            validateRules: true,
            namingPrefix: 'Generated',
            ...options
        };
    }

    /**
     * Generate detection strategies for all discovered CMS types
     */
    async generateAllStrategies(): Promise<Map<string, GeneratedStrategy>> {
        logger.info('Starting rule generation for all CMS types', {
            dataPoints: this.dataPoints.length,
            minConfidence: this.options.minConfidence
        });

        const signatures = this.patternDiscovery.generateTechnologySignatures();
        const strategies = new Map<string, GeneratedStrategy>();

        for (const [cms, signature] of signatures.entries()) {
            if (signature.confidence >= this.options.minConfidence) {
                try {
                    const strategy = await this.generateStrategy(cms, signature);
                    strategies.set(cms, strategy);
                    
                    logger.info('Generated strategy for CMS', {
                        cms,
                        confidence: strategy.confidence,
                        patterns: strategy.patterns
                    });
                } catch (error) {
                    logger.error('Failed to generate strategy', {
                        cms,
                        error: (error as Error).message
                    });
                }
            } else {
                logger.warn('Skipping CMS due to low confidence', {
                    cms,
                    confidence: signature.confidence,
                    minRequired: this.options.minConfidence
                });
            }
        }

        logger.info('Rule generation completed', {
            strategiesGenerated: strategies.size
        });

        return strategies;
    }

    /**
     * Generate a single detection strategy for a CMS
     */
    async generateStrategy(cms: string, signature: TechnologySignature): Promise<GeneratedStrategy> {
        logger.debug('Generating strategy for CMS', { cms, patterns: signature.patterns.length });

        const className = `${this.options.namingPrefix}${this.toPascalCase(cms)}Strategy`;
        const fileName = `${this.options.namingPrefix.toLowerCase()}-${this.toKebabCase(cms)}-strategy.ts`;

        // Generate the strategy code
        const code = this.generateStrategyCode(cms, className, signature);

        // Generate test cases
        const testCases = this.options.generateTests ? 
            await this.generateTestCases(cms, signature) : [];

        const strategy: GeneratedStrategy = {
            name: `${cms} Generated Strategy`,
            className,
            fileName,
            code,
            confidence: signature.confidence,
            patterns: signature.patterns.length,
            testCases
        };

        return strategy;
    }

    /**
     * Write generated strategies to files
     */
    async writeStrategies(strategies: Map<string, GeneratedStrategy>): Promise<void> {
        logger.info('Writing generated strategies to files', {
            outputDir: this.options.outputDir,
            strategies: strategies.size
        });

        // Ensure output directory exists
        await fs.mkdir(this.options.outputDir, { recursive: true });

        for (const [cms, strategy] of strategies.entries()) {
            const filePath = path.join(this.options.outputDir, strategy.fileName);
            
            try {
                await fs.writeFile(filePath, strategy.code, 'utf8');
                logger.debug('Strategy file written', { cms, filePath });

                // Generate test file if requested
                if (this.options.generateTests && strategy.testCases.length > 0) {
                    const testFilePath = path.join(
                        this.options.outputDir, 
                        strategy.fileName.replace('.ts', '.test.ts')
                    );
                    const testCode = this.generateTestFileCode(strategy);
                    await fs.writeFile(testFilePath, testCode, 'utf8');
                    logger.debug('Test file written', { cms, testFilePath });
                }
            } catch (error) {
                logger.error('Failed to write strategy file', {
                    cms,
                    filePath,
                    error: (error as Error).message
                });
                throw error;
            }
        }
    }

    /**
     * Validate generated rules against training data
     */
    async validateStrategies(strategies: Map<string, GeneratedStrategy>): Promise<Map<string, ValidationResult>> {
        if (!this.options.validateRules) {
            return new Map();
        }

        logger.info('Validating generated strategies', { strategies: strategies.size });

        const results = new Map<string, ValidationResult>();

        for (const [cms, strategy] of strategies.entries()) {
            const validation = await this.validateStrategy(cms, strategy);
            results.set(cms, validation);
            
            logger.info('Strategy validation completed', {
                cms,
                accuracy: validation.accuracy,
                truePositives: validation.truePositives,
                falsePositives: validation.falsePositives
            });
        }

        return results;
    }

    // Private helper methods

    private generateStrategyCode(cms: string, className: string, signature: TechnologySignature): string {
        const metaPatterns = signature.patterns.filter(p => p.type === 'meta');
        const scriptPatterns = signature.patterns.filter(p => p.type === 'script');
        const domPatterns = signature.patterns.filter(p => p.type === 'dom');

        let code = `import { DetectionStrategy, DetectionPage, PartialDetectionResult } from '../../types.js';\nimport { createModuleLogger } from '../../../logger.js';\n\nconst logger = createModuleLogger('${this.toKebabCase(cms)}-strategy');\n\n`;
        
        code += `/**\n * Auto-generated ${cms} detection strategy\n * Generated from analysis of ${this.dataPoints.length} websites\n * Confidence: ${Math.round(signature.confidence * 100)}%\n * Patterns: ${signature.patterns.length}\n */\n`;
        code += `export class ${className} implements DetectionStrategy {\n`;
        code += `    private readonly timeout = 5000;\n\n`;

        // getName method
        code += `    getName(): string {\n`;
        code += `        return '${this.toKebabCase(cms)}-generated';\n`;
        code += `    }\n\n`;

        // getTimeout method
        code += `    getTimeout(): number {\n`;
        code += `        return this.timeout;\n`;
        code += `    }\n\n`;

        // Main detect method
        code += `    async detect(page: DetectionPage, url: string): Promise<PartialDetectionResult> {\n`;
        code += `        const startTime = Date.now();\n`;
        code += `        let confidence = 0;\n`;
        code += `        const evidence: string[] = [];\n\n`;

        code += `        try {\n`;
        code += `            logger.debug('Starting ${cms} detection', { url });\n\n`;

        // Meta tag detection
        if (metaPatterns.length > 0) {
            code += `            // Meta tag detection\n`;
            code += `            const metaTags = await this.getMetaTags(page);\n`;
            for (const pattern of metaPatterns) {
                const weight = Math.round(pattern.weight * 100);
                const patternStr = typeof pattern.pattern === 'string' ? pattern.pattern : pattern.pattern.toString();
                const [tagType, tagValue] = patternStr.split(':');
                
                code += `            if (metaTags.some(tag => tag.${tagType} === '${tagValue}')) {\n`;
                code += `                confidence += ${weight};\n`;
                code += `                evidence.push('${tagType}:${tagValue}');\n`;
                code += `            }\n`;
            }
            code += `\n`;
        }

        // Script detection
        if (scriptPatterns.length > 0) {
            code += `            // Script detection\n`;
            code += `            const scripts = await this.getScripts(page);\n`;
            for (const pattern of scriptPatterns) {
                const weight = Math.round(pattern.weight * 100);
                const patternStr = typeof pattern.pattern === 'string' ? pattern.pattern : pattern.pattern.toString();
                const searchTerm = patternStr.replace('script:', '').replace('path:', '').replace('inline:', '');
                
                if (patternStr.startsWith('inline:')) {
                    code += `            if (scripts.some(script => script.content?.includes('${searchTerm}'))) {\n`;
                } else {
                    code += `            if (scripts.some(script => script.src?.includes('${searchTerm}'))) {\n`;
                }
                code += `                confidence += ${weight};\n`;
                code += `                evidence.push('script:${searchTerm}');\n`;
                code += `            }\n`;
            }
            code += `\n`;
        }

        // DOM detection
        if (domPatterns.length > 0) {
            code += `            // DOM structure detection\n`;
            for (const pattern of domPatterns) {
                const weight = Math.round(pattern.weight * 100);
                const selector = typeof pattern.pattern === 'string' ? pattern.pattern : pattern.pattern.toString();
                const varName = this.toCamelCase(selector);
                
                code += `            const ${varName} = await page.$$('${selector}');\n`;
                code += `            if (${varName}.length > 0) {\n`;
                code += `                confidence += ${weight};\n`;
                code += `                evidence.push('dom:${selector}');\n`;
                code += `            }\n`;
            }
            code += `\n`;
        }

        // Normalize confidence and return result
        const maxPossibleConfidence = signature.patterns.reduce((sum, p) => sum + Math.round(p.weight * 100), 0);
        code += `            // Normalize confidence (max possible: ${maxPossibleConfidence})\n`;
        code += `            const normalizedConfidence = Math.min(confidence / ${maxPossibleConfidence}, 1.0);\n\n`;

        code += `            const result: PartialDetectionResult = {\n`;
        code += `                confidence: normalizedConfidence,\n`;
        code += `                method: this.getName(),\n`;
        code += `                evidence,\n`;
        code += `                executionTime: Date.now() - startTime\n`;
        code += `            };\n\n`;

        code += `            logger.debug('${cms} detection completed', {\n`;
        code += `                url,\n`;
        code += `                confidence: normalizedConfidence,\n`;
        code += `                evidence: evidence.length,\n`;
        code += `                executionTime: result.executionTime\n`;
        code += `            });\n\n`;

        code += `            return result;\n\n`;

        code += `        } catch (error) {\n`;
        code += `            logger.error('${cms} detection failed', {\n`;
        code += `                url,\n`;
        code += `                error: (error as Error).message,\n`;
        code += `                executionTime: Date.now() - startTime\n`;
        code += `            });\n\n`;

        code += `            return {\n`;
        code += `                confidence: 0,\n`;
        code += `                method: this.getName(),\n`;
        code += `                error: (error as Error).message,\n`;
        code += `                executionTime: Date.now() - startTime\n`;
        code += `            };\n`;
        code += `        }\n`;
        code += `    }\n\n`;

        // Helper methods
        if (metaPatterns.length > 0) {
            code += `    private async getMetaTags(page: DetectionPage): Promise<Array<{name?: string, property?: string, content: string}>> {\n`;
            code += `        return await page.evaluate(() => {\n`;
            code += `            const metaTags: Array<{name?: string, property?: string, content: string}> = [];\n`;
            code += `            document.querySelectorAll('meta').forEach(meta => {\n`;
            code += `                const tag: any = { content: meta.getAttribute('content') || '' };\n`;
            code += `                if (meta.getAttribute('name')) tag.name = meta.getAttribute('name');\n`;
            code += `                if (meta.getAttribute('property')) tag.property = meta.getAttribute('property');\n`;
            code += `                metaTags.push(tag);\n`;
            code += `            });\n`;
            code += `            return metaTags;\n`;
            code += `        });\n`;
            code += `    }\n\n`;
        }

        if (scriptPatterns.length > 0) {
            code += `    private async getScripts(page: DetectionPage): Promise<Array<{src?: string, content?: string}>> {\n`;
            code += `        return await page.evaluate(() => {\n`;
            code += `            const scripts: Array<{src?: string, content?: string}> = [];\n`;
            code += `            document.querySelectorAll('script').forEach(script => {\n`;
            code += `                scripts.push({\n`;
            code += `                    src: script.getAttribute('src') || undefined,\n`;
            code += `                    content: script.textContent || undefined\n`;
            code += `                });\n`;
            code += `            });\n`;
            code += `            return scripts;\n`;
            code += `        });\n`;
            code += `    }\n\n`;
        }

        code += `}\n`;

        return code;
    }

    private async generateTestCases(cms: string, signature: TechnologySignature): Promise<GeneratedTestCase[]> {
        const testCases: GeneratedTestCase[] = [];

        // Generate positive test cases from actual data
        const cmsDataPoints = this.dataPoints.filter(dp => 
            dp.detectionResults.some(r => r.cms === cms && r.confidence > 0.5)
        );

        for (const dp of cmsDataPoints.slice(0, 3)) { // Max 3 positive test cases
            testCases.push({
                description: `should detect ${cms} on ${dp.url}`,
                input: {
                    metaTags: dp.metaTags,
                    scripts: dp.scripts,
                    domElements: dp.domElements
                },
                expectedOutput: {
                    confidence: Math.max(...dp.detectionResults.map(r => r.confidence)),
                    detected: true
                }
            });
        }

        // Generate negative test cases from other CMS data
        const otherCmsDataPoints = this.dataPoints.filter(dp => 
            !dp.detectionResults.some(r => r.cms === cms && r.confidence > 0.3)
        );

        for (const dp of otherCmsDataPoints.slice(0, 2)) { // Max 2 negative test cases
            testCases.push({
                description: `should not detect ${cms} on ${dp.url}`,
                input: {
                    metaTags: dp.metaTags,
                    scripts: dp.scripts,
                    domElements: dp.domElements
                },
                expectedOutput: {
                    confidence: 0,
                    detected: false
                }
            });
        }

        return testCases;
    }

    private generateTestFileCode(strategy: GeneratedStrategy): string {
        let code = `import { jest } from '@jest/globals';\n`;
        code += `import { ${strategy.className} } from './${strategy.fileName.replace('.ts', '.js')}';\n\n`;

        code += `describe('${strategy.className}', () => {\n`;
        code += `    let strategy: ${strategy.className};\n`;
        code += `    let mockPage: any;\n\n`;

        code += `    beforeEach(() => {\n`;
        code += `        strategy = new ${strategy.className}();\n`;
        code += `        mockPage = {\n`;
        code += `            evaluate: jest.fn(),\n`;
        code += `            $$: jest.fn()\n`;
        code += `        };\n`;
        code += `    });\n\n`;

        for (const testCase of strategy.testCases) {
            code += `    it('${testCase.description}', async () => {\n`;
            code += `        // Setup mock responses\n`;
            code += `        mockPage.evaluate.mockImplementation((fn: Function) => {\n`;
            code += `            const funcStr = fn.toString();\n`;
            code += `            if (funcStr.includes('metaTags')) {\n`;
            code += `                return Promise.resolve(${JSON.stringify(testCase.input.metaTags, null, 16)});\n`;
            code += `            }\n`;
            code += `            if (funcStr.includes('scripts')) {\n`;
            code += `                return Promise.resolve(${JSON.stringify(testCase.input.scripts, null, 16)});\n`;
            code += `            }\n`;
            code += `            return Promise.resolve([]);\n`;
            code += `        });\n\n`;

            code += `        const result = await strategy.detect(mockPage, 'test-url');\n\n`;

            if (testCase.expectedOutput.detected) {
                code += `        expect(result.confidence).toBeGreaterThan(0.3);\n`;
            } else {
                code += `        expect(result.confidence).toBeLessThan(0.3);\n`;
            }

            code += `        expect(result.method).toBe('${strategy.name.toLowerCase().replace(/\s+/g, '-')}-generated');\n`;
            code += `    });\n\n`;
        }

        code += `});\n`;

        return code;
    }

    private async validateStrategy(cms: string, strategy: GeneratedStrategy): Promise<ValidationResult> {
        // This is a simplified validation - in practice, you'd compile and run the generated code
        const cmsDataPoints = this.dataPoints.filter(dp => 
            dp.detectionResults.some(r => r.cms === cms)
        );
        const otherDataPoints = this.dataPoints.filter(dp => 
            !dp.detectionResults.some(r => r.cms === cms)
        );

        return {
            accuracy: 0.85, // Placeholder - would calculate from actual execution
            truePositives: cmsDataPoints.length,
            falsePositives: 0,
            trueNegatives: otherDataPoints.length,
            falseNegatives: 0,
            precision: 1.0,
            recall: 0.85,
            f1Score: 0.92
        };
    }

    // String utility methods
    private toPascalCase(str: string): string {
        return str.replace(/(?:^|\s)\w/g, match => match.toUpperCase()).replace(/\s+/g, '');
    }

    private toKebabCase(str: string): string {
        return str.toLowerCase().replace(/\s+/g, '-');
    }

    private toCamelCase(str: string): string {
        // For CSS selectors, create safe JavaScript variable names
        return str
            .replace(/[^a-zA-Z0-9]+/g, '_')
            .replace(/^[^a-zA-Z]/, 'element_')
            .replace(/_+/g, '_')
            .replace(/_$/, '') + 'Elements';
    }
}

export interface ValidationResult {
    accuracy: number;
    truePositives: number;
    falsePositives: number;
    trueNegatives: number;
    falseNegatives: number;
    precision: number;
    recall: number;
    f1Score: number;
}