import { DetectionDataPoint, PatternAnalysisResult, TechnologySignature } from './types.js';
import { createModuleLogger } from '../../logger.js';

const logger = createModuleLogger('pattern-analysis');

/**
 * Pattern discovery engine for CMS detection
 * Analyzes collected data to identify discriminating patterns
 */
export class PatternDiscovery {
    private dataPoints: DetectionDataPoint[] = [];

    constructor(dataPoints: DetectionDataPoint[]) {
        this.dataPoints = dataPoints;
        logger.info('Pattern discovery initialized', { dataPoints: dataPoints.length });
    }

    /**
     * Analyze meta tag patterns across different CMS types
     */
    analyzeMetaTagPatterns(): Map<string, PatternAnalysisResult[]> {
        logger.info('Starting meta tag pattern analysis');
        
        const patterns = new Map<string, PatternAnalysisResult[]>();
        const metaTagFrequency = new Map<string, Map<string, number>>();

        // Group data points by detected CMS
        const groupedData = this.groupByCMS();

        for (const [cms, dataPoints] of groupedData.entries()) {
            const cmsPatterns: PatternAnalysisResult[] = [];
            const tagFrequency = new Map<string, number>();
            const tagExamples = new Map<string, string[]>();

            // Analyze meta tags for this CMS
            for (const dp of dataPoints) {
                for (const metaTag of dp.metaTags) {
                    const key = this.createMetaTagKey(metaTag);
                    if (key) {
                        tagFrequency.set(key, (tagFrequency.get(key) || 0) + 1);
                        
                        if (!tagExamples.has(key)) {
                            tagExamples.set(key, []);
                        }
                        const examples = tagExamples.get(key)!;
                        if (examples.length < 3) {
                            examples.push(metaTag.content);
                        }
                    }
                }
            }

            // Calculate confidence and frequency for each pattern
            const totalSites = dataPoints.length;
            for (const [pattern, count] of tagFrequency.entries()) {
                const frequency = count / totalSites;
                const confidence = this.calculatePatternConfidence(pattern, cms, groupedData);
                
                if (frequency >= 0.3 && confidence >= 0.6) { // Only include patterns that appear in 30%+ of sites with 60%+ confidence
                    cmsPatterns.push({
                        pattern,
                        confidence,
                        frequency,
                        examples: tagExamples.get(pattern) || [],
                        cmsCorrelation: this.calculateCMSCorrelation(pattern, groupedData)
                    });
                }
            }

            // Sort by confidence * frequency (discriminating power)
            cmsPatterns.sort((a, b) => (b.confidence * b.frequency) - (a.confidence * a.frequency));
            patterns.set(cms, cmsPatterns);
        }

        logger.info('Meta tag pattern analysis completed', { 
            cmsTypes: patterns.size,
            totalPatterns: Array.from(patterns.values()).reduce((sum, patterns) => sum + patterns.length, 0)
        });

        return patterns;
    }

    /**
     * Analyze script and resource patterns
     */
    analyzeScriptPatterns(): Map<string, PatternAnalysisResult[]> {
        logger.info('Starting script pattern analysis');
        
        const patterns = new Map<string, PatternAnalysisResult[]>();
        const groupedData = this.groupByCMS();

        for (const [cms, dataPoints] of groupedData.entries()) {
            const cmsPatterns: PatternAnalysisResult[] = [];
            const scriptFrequency = new Map<string, number>();
            const scriptExamples = new Map<string, string[]>();

            // Analyze scripts for this CMS
            for (const dp of dataPoints) {
                // Analyze script sources
                for (const script of dp.scripts) {
                    if (script.src) {
                        const patterns = this.extractScriptPatterns(script.src);
                        for (const pattern of patterns) {
                            scriptFrequency.set(pattern, (scriptFrequency.get(pattern) || 0) + 1);
                            
                            if (!scriptExamples.has(pattern)) {
                                scriptExamples.set(pattern, []);
                            }
                            const examples = scriptExamples.get(pattern)!;
                            if (examples.length < 3) {
                                examples.push(script.src);
                            }
                        }
                    }
                }

                // Analyze inline script patterns
                for (const script of dp.scripts) {
                    if (script.inline && script.content) {
                        const patterns = this.extractInlineScriptPatterns(script.content);
                        for (const pattern of patterns) {
                            scriptFrequency.set(pattern, (scriptFrequency.get(pattern) || 0) + 1);
                            
                            if (!scriptExamples.has(pattern)) {
                                scriptExamples.set(pattern, []);
                            }
                            const examples = scriptExamples.get(pattern)!;
                            if (examples.length < 3) {
                                examples.push(script.content.substring(0, 100));
                            }
                        }
                    }
                }
            }

            // Calculate confidence and create patterns
            const totalSites = dataPoints.length;
            for (const [pattern, count] of scriptFrequency.entries()) {
                const frequency = count / totalSites;
                const confidence = this.calculatePatternConfidence(pattern, cms, groupedData);
                
                if (frequency >= 0.2 && confidence >= 0.7) { // Scripts are more discriminating
                    cmsPatterns.push({
                        pattern,
                        confidence,
                        frequency,
                        examples: scriptExamples.get(pattern) || [],
                        cmsCorrelation: this.calculateCMSCorrelation(pattern, groupedData)
                    });
                }
            }

            cmsPatterns.sort((a, b) => (b.confidence * b.frequency) - (a.confidence * a.frequency));
            patterns.set(cms, cmsPatterns);
        }

        logger.info('Script pattern analysis completed', { 
            cmsTypes: patterns.size,
            totalPatterns: Array.from(patterns.values()).reduce((sum, patterns) => sum + patterns.length, 0)
        });

        return patterns;
    }

    /**
     * Analyze DOM structure patterns
     */
    analyzeDOMPatterns(): Map<string, PatternAnalysisResult[]> {
        logger.info('Starting DOM pattern analysis');
        
        const patterns = new Map<string, PatternAnalysisResult[]>();
        const groupedData = this.groupByCMS();

        for (const [cms, dataPoints] of groupedData.entries()) {
            const cmsPatterns: PatternAnalysisResult[] = [];
            const domFrequency = new Map<string, number>();
            const domExamples = new Map<string, string[]>();

            for (const dp of dataPoints) {
                for (const domElement of dp.domElements) {
                    const pattern = domElement.selector;
                    domFrequency.set(pattern, (domFrequency.get(pattern) || 0) + 1);
                    
                    if (!domExamples.has(pattern)) {
                        domExamples.set(pattern, []);
                    }
                    const examples = domExamples.get(pattern)!;
                    if (examples.length < 3 && domElement.sample) {
                        examples.push(domElement.sample);
                    }
                }
            }

            const totalSites = dataPoints.length;
            for (const [pattern, count] of domFrequency.entries()) {
                const frequency = count / totalSites;
                const confidence = this.calculatePatternConfidence(pattern, cms, groupedData);
                
                if (frequency >= 0.4 && confidence >= 0.8) { // DOM patterns should be highly specific
                    cmsPatterns.push({
                        pattern,
                        confidence,
                        frequency,
                        examples: domExamples.get(pattern) || [],
                        cmsCorrelation: this.calculateCMSCorrelation(pattern, groupedData)
                    });
                }
            }

            cmsPatterns.sort((a, b) => (b.confidence * b.frequency) - (a.confidence * a.frequency));
            patterns.set(cms, cmsPatterns);
        }

        logger.info('DOM pattern analysis completed', { 
            cmsTypes: patterns.size,
            totalPatterns: Array.from(patterns.values()).reduce((sum, patterns) => sum + patterns.length, 0)
        });

        return patterns;
    }

    /**
     * Generate technology signatures based on discovered patterns
     */
    generateTechnologySignatures(): Map<string, TechnologySignature> {
        logger.info('Generating technology signatures');
        
        const signatures = new Map<string, TechnologySignature>();
        const metaPatterns = this.analyzeMetaTagPatterns();
        const scriptPatterns = this.analyzeScriptPatterns();
        const domPatterns = this.analyzeDOMPatterns();

        const groupedData = this.groupByCMS();

        for (const cms of groupedData.keys()) {
            if (cms === 'Unknown') continue; // Skip unknown CMS

            const signature: TechnologySignature = {
                name: cms,
                patterns: [],
                confidence: 0,
                category: 'cms'
            };

            // Add meta tag patterns
            const metaPatternsForCMS = metaPatterns.get(cms) || [];
            for (const pattern of metaPatternsForCMS.slice(0, 5)) { // Top 5 meta patterns
                signature.patterns.push({
                    type: 'meta',
                    pattern: pattern.pattern,
                    weight: pattern.confidence * pattern.frequency,
                    required: pattern.confidence > 0.9
                });
            }

            // Add script patterns
            const scriptPatternsForCMS = scriptPatterns.get(cms) || [];
            for (const pattern of scriptPatternsForCMS.slice(0, 3)) { // Top 3 script patterns
                signature.patterns.push({
                    type: 'script',
                    pattern: pattern.pattern,
                    weight: pattern.confidence * pattern.frequency,
                    required: pattern.confidence > 0.95
                });
            }

            // Add DOM patterns
            const domPatternsForCMS = domPatterns.get(cms) || [];
            for (const pattern of domPatternsForCMS.slice(0, 3)) { // Top 3 DOM patterns
                signature.patterns.push({
                    type: 'dom',
                    pattern: pattern.pattern,
                    weight: pattern.confidence * pattern.frequency,
                    required: pattern.confidence > 0.95
                });
            }

            // Calculate overall signature confidence
            if (signature.patterns.length > 0) {
                signature.confidence = signature.patterns.reduce((sum, p) => sum + p.weight, 0) / signature.patterns.length;
                signatures.set(cms, signature);
            }
        }

        logger.info('Technology signature generation completed', { 
            signatures: signatures.size 
        });

        return signatures;
    }

    /**
     * Comparative analysis between CMS types
     */
    compareDetectionPatterns(): Map<string, any> {
        logger.info('Starting comparative detection analysis');
        
        const comparison = new Map<string, any>();
        const groupedData = this.groupByCMS();

        for (const [cms, dataPoints] of groupedData.entries()) {
            const stats = {
                siteCount: dataPoints.length,
                avgMetaTags: this.calculateAverage(dataPoints.map(dp => dp.metaTags.length)),
                avgScripts: this.calculateAverage(dataPoints.map(dp => dp.scripts.length)),
                avgDOMElements: this.calculateAverage(dataPoints.map(dp => dp.domElements.length)),
                avgHtmlSize: this.calculateAverage(dataPoints.map(dp => dp.htmlSize)),
                avgLoadTime: this.calculateAverage(dataPoints.map(dp => dp.loadTime)),
                protocolUpgradeRate: dataPoints.filter(dp => dp.protocolUpgraded).length / dataPoints.length,
                avgRedirects: this.calculateAverage(dataPoints.map(dp => dp.totalRedirects)),
                statusCodes: this.groupBy(dataPoints, dp => dp.statusCode),
                detectionConfidence: this.calculateAverage(
                    dataPoints
                        .filter(dp => dp.detectionResults.length > 0)
                        .map(dp => Math.max(...dp.detectionResults.map(r => r.confidence)))
                )
            };

            comparison.set(cms, stats);
        }

        logger.info('Comparative analysis completed', { 
            cmsTypes: comparison.size 
        });

        return comparison;
    }

    // Private helper methods

    private groupByCMS(): Map<string, DetectionDataPoint[]> {
        const grouped = new Map<string, DetectionDataPoint[]>();
        
        for (const dp of this.dataPoints) {
            const cms = this.extractDetectedCMS(dp);
            if (!grouped.has(cms)) {
                grouped.set(cms, []);
            }
            grouped.get(cms)!.push(dp);
        }
        
        return grouped;
    }

    private extractDetectedCMS(dataPoint: DetectionDataPoint): string {
        if (dataPoint.detectionResults.length === 0) return 'Unknown';
        
        const bestResult = dataPoint.detectionResults.reduce((best, current) => 
            current.confidence > best.confidence ? current : best
        );
        
        return bestResult.cms === 'Unknown' || bestResult.confidence < 0.3 ? 'Unknown' : bestResult.cms;
    }

    private createMetaTagKey(metaTag: any): string | null {
        if (metaTag.name) {
            return `name:${metaTag.name}`;
        } else if (metaTag.property) {
            return `property:${metaTag.property}`;
        } else if (metaTag.httpEquiv) {
            return `http-equiv:${metaTag.httpEquiv}`;
        }
        return null;
    }

    private extractScriptPatterns(scriptSrc: string): string[] {
        const patterns: string[] = [];
        
        // Extract filename patterns
        const fileName = scriptSrc.split('/').pop() || '';
        if (fileName.includes('wp-')) patterns.push('script:wp-*');
        if (fileName.includes('jquery')) patterns.push('script:jquery');
        if (fileName.includes('drupal')) patterns.push('script:drupal');
        if (fileName.includes('joomla')) patterns.push('script:joomla');
        
        // Extract path patterns
        if (scriptSrc.includes('/wp-content/')) patterns.push('path:wp-content');
        if (scriptSrc.includes('/sites/')) patterns.push('path:sites');
        if (scriptSrc.includes('/media/')) patterns.push('path:media');
        
        return patterns;
    }

    private extractInlineScriptPatterns(content: string): string[] {
        const patterns: string[] = [];
        
        if (content.includes('wp-admin')) patterns.push('inline:wp-admin');
        if (content.includes('Drupal.')) patterns.push('inline:Drupal.');
        if (content.includes('Joomla.')) patterns.push('inline:Joomla.');
        if (content.includes('WordPress')) patterns.push('inline:WordPress');
        
        return patterns;
    }

    private calculatePatternConfidence(pattern: string, targetCMS: string, groupedData: Map<string, DetectionDataPoint[]>): number {
        let totalOccurrences = 0;
        let targetOccurrences = 0;

        for (const [cms, dataPoints] of groupedData.entries()) {
            const occurrencesInCMS = this.countPatternOccurrences(pattern, dataPoints);
            totalOccurrences += occurrencesInCMS;
            
            if (cms === targetCMS) {
                targetOccurrences = occurrencesInCMS;
            }
        }

        return totalOccurrences > 0 ? targetOccurrences / totalOccurrences : 0;
    }

    private countPatternOccurrences(pattern: string, dataPoints: DetectionDataPoint[]): number {
        let count = 0;
        
        for (const dp of dataPoints) {
            if (pattern.startsWith('name:') || pattern.startsWith('property:') || pattern.startsWith('http-equiv:')) {
                // Meta tag pattern
                for (const metaTag of dp.metaTags) {
                    if (this.createMetaTagKey(metaTag) === pattern) {
                        count++;
                        break; // Count once per site
                    }
                }
            } else if (pattern.startsWith('script:') || pattern.startsWith('path:')) {
                // Script pattern
                for (const script of dp.scripts) {
                    if (script.src && this.extractScriptPatterns(script.src).includes(pattern)) {
                        count++;
                        break; // Count once per site
                    }
                }
            } else if (pattern.startsWith('inline:')) {
                // Inline script pattern
                for (const script of dp.scripts) {
                    if (script.content && this.extractInlineScriptPatterns(script.content).includes(pattern)) {
                        count++;
                        break; // Count once per site
                    }
                }
            } else {
                // DOM pattern (selector)
                for (const domElement of dp.domElements) {
                    if (domElement.selector === pattern) {
                        count++;
                        break; // Count once per site
                    }
                }
            }
        }
        
        return count;
    }

    private calculateCMSCorrelation(pattern: string, groupedData: Map<string, DetectionDataPoint[]>): Record<string, number> {
        const correlation: Record<string, number> = {};
        
        for (const [cms, dataPoints] of groupedData.entries()) {
            const occurrences = this.countPatternOccurrences(pattern, dataPoints);
            correlation[cms] = occurrences / dataPoints.length;
        }
        
        return correlation;
    }

    private calculateAverage(numbers: number[]): number {
        if (numbers.length === 0) return 0;
        return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    }

    private groupBy<T, K>(array: T[], keyFn: (item: T) => K): Record<string, number> {
        const groups: Record<string, number> = {};
        for (const item of array) {
            const key = String(keyFn(item));
            groups[key] = (groups[key] || 0) + 1;
        }
        return groups;
    }
}