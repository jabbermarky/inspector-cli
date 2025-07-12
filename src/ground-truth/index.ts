import { CMSDetectionIterator } from '../utils/cms/index.js';
import { createModuleLogger } from '../utils/logger.js';
import { RobotsTxtAnalyzer } from '../utils/robots-txt-analyzer.js';
import { UrlNormalizer } from '../utils/url/normalizer.js';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { DiscriminativeFeature, GroundTruthOptions, GroundTruthResult } from './types.js';
import { displayMessage } from './interactive-ui.js';

export * from './types.js';
export { displayMessage } from './interactive-ui.js';

const logger = createModuleLogger('ground-truth');

export async function analyzeGroundTruth(
    url: string,
    options: GroundTruthOptions
): Promise<GroundTruthResult> {
    
    displayMessage(`\n Analyzing: ${url}`);
    if (!options.compact) {
        displayMessage('═'.repeat(80));
    }

    // Step 1: Analyze robots.txt first
    if (!options.compact) {
        displayMessage('\n Robots.txt Analysis:');
        displayMessage('─'.repeat(50));
    }
    
    const robotsAnalysis = await this.robotsAnalyzer.analyze(url);
    
    if (options.compact) {
        // Compact: Show key result with main signals
        if (robotsAnalysis.error) {
            displayMessage(`   🤖 robots.txt: ❌ ${robotsAnalysis.error}`);
        } else {
            const topSignals = robotsAnalysis.signals.slice(0, 2).join(', ');
            displayMessage(`   🤖 robots.txt: ${robotsAnalysis.cms} (${(robotsAnalysis.confidence * 100).toFixed(1)}%)${topSignals ? ` via ${topSignals}` : ''}`);
        }
    } else {
        // Full output
        displayMessage(`📍 robots.txt URL: ${robotsAnalysis.url}`);
        
        if (robotsAnalysis.error) {
            displayMessage(`❌ Error: ${robotsAnalysis.error}`);
        } else {
            displayMessage(`✅ Success: ${robotsAnalysis.content.length} bytes`);
            displayMessage(`🎯 Detection: ${robotsAnalysis.cms} (${(robotsAnalysis.confidence * 100).toFixed(1)}%)`);
            
            if (robotsAnalysis.signals.length > 0) {
                displayMessage(`📋 Signals found:`);
                robotsAnalysis.signals.forEach(signal => {
                    displayMessage(`   • ${signal}`);
                });
            }
            
            // Show interesting headers
            const interestingHeaders = this.robotsAnalyzer.getInterestingHeaders(robotsAnalysis.headers);
            if (Object.keys(interestingHeaders).length > 0) {
                displayMessage(`📊 HTTP Headers:`);
                Object.entries(interestingHeaders).forEach(([key, value]) => {
                    displayMessage(`   ${key}: ${value}`);
                });
            }
        }
    }

    // Step 2: Initialize CMS detection with data collection
    let cmsIterator: CMSDetectionIterator | null = null;
    try {
        cmsIterator = new CMSDetectionIterator({
            collectData: true,
            collectionConfig: {
                includeHtmlContent: true,
                includeDomAnalysis: true,
                includeScriptAnalysis: true,
                maxHtmlSize: 500000,
                outputFormat: 'json'
            }
        });
    } catch (error) {
        logger.error('Failed to initialize CMS detection iterator', { error: (error as Error).message });
        throw new Error(`CMS detection initialization failed: ${(error as Error).message}`);
    }

    if (!cmsIterator) {
        throw new Error('CMS detection iterator is not initialized');
    }

    try {
        // Step 3: Perform main page detection
        if (!options.compact) {
            displayMessage('\n🌐 Main Page Detection:');
            displayMessage('─'.repeat(50));
        }
        
        const result = await cmsIterator.detect(url);
        
        if (options.compact) {
            if (result.error) {
                displayMessage(`   🌐 main page: ❌ ${result.error}`);
            } else {
                displayMessage(`   🌐 main page: ${result.cms} (${(result.confidence * 100).toFixed(1)}%) | ${result.executionTime}ms`);
            }
        } else {
            displayMessage(`📊 Detection Result: ${result.cms} (${(result.confidence * 100).toFixed(1)}% confidence) | ${result.executionTime}ms`);
            
            if (result.error) {
                displayMessage(`❌ Error: ${result.error}`);
            }
        }

        // Step 4: Combine results and show comparison
        if (options.compact) {
            // Compact: Show final decision with confidence comparison
            const finalCms = robotsAnalysis.confidence > result.confidence ? robotsAnalysis.cms : result.cms;
            const finalConfidence = Math.max(robotsAnalysis.confidence, result.confidence);
            const method = robotsAnalysis.confidence > result.confidence ? 'robots.txt' : 'main page';
            
            if (robotsAnalysis.cms !== 'Unknown' && result.cms !== 'Unknown') {
                if (robotsAnalysis.cms.toLowerCase() === result.cms.toLowerCase()) {
                    displayMessage(`   ✅ Final: ${finalCms} (${(finalConfidence * 100).toFixed(1)}%) - both methods agree`);
                } else {
                    displayMessage(`   ⚠️  Final: ${finalCms} (${(finalConfidence * 100).toFixed(1)}%) via ${method} - methods disagree`);
                }
            } else {
                displayMessage(`   📊 Final: ${finalCms} (${(finalConfidence * 100).toFixed(1)}%) via ${method}`);
            }
        } else {
            displayMessage('\n🔄 Detection Comparison:');
            displayMessage('─'.repeat(50));
            
            const robotsConf = (robotsAnalysis.confidence * 100).toFixed(1);
            const mainConf = (result.confidence * 100).toFixed(1);
            
            displayMessage(`🤖 robots.txt: ${robotsAnalysis.cms} (${robotsConf}%)`);
            displayMessage(`🌐 main page:  ${result.cms} (${mainConf}%)`);
            
            if (robotsAnalysis.cms !== 'Unknown' && result.cms !== 'Unknown') {
                if (robotsAnalysis.cms.toLowerCase() === result.cms.toLowerCase()) {
                    displayMessage(`✅ Agreement: Both methods detected ${result.cms}`);
                } else {
                    displayMessage(`⚠️  Disagreement: robots.txt says ${robotsAnalysis.cms}, main page says ${result.cms}`);
                }
            }
        }

        // Step 5: Load and analyze the collected data
        const dataPath = this.findDataFile(url);
        if (dataPath) {
            const detectedVersions = await this.analyzeCollectedData(dataPath);
            
            // Use the higher confidence result for the prompt
            const finalCms = robotsAnalysis.confidence > result.confidence ? robotsAnalysis.cms : result.cms;
            const finalConfidence = Math.max(robotsAnalysis.confidence, result.confidence);
            
            // Select the best version for the detected CMS
            const bestVersion = this.selectBestVersion(detectedVersions, finalCms);
            
            return await this.promptForGroundTruthDecision(url, finalCms, finalConfidence, detectedVersions, bestVersion);
        } else {
            displayMessage('\n❌ No data file found for analysis');
            return { shouldContinue: true };
        }

    } catch (error) {
        // Only show error if not shutting down
        if (!this.isShuttingDown) {
            displayMessage(`\n❌ Error analyzing ${url}:`, (error as Error).message);
        }
        return { shouldContinue: true };
    } finally {
        // CMSDetectionIterator cleanup is handled internally
    }
}

export class GroundTruthDiscovery {
    private rl: readline.Interface;
    private groundTruthPath: string;
    private discriminativeFeatures: DiscriminativeFeature[];
    private robotsAnalyzer: RobotsTxtAnalyzer;
    private isShuttingDown: boolean = false;
    private compactMode: boolean = false;

    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        // Add error handler for readline
        this.rl.on('error', (error) => {
            if (error.message && error.message.includes('readline was closed')) {
                // Suppress this specific error
                return;
            }
            displayMessage('Readline error:', error);
        });
        
        // Handle SIGINT (Ctrl+C) gracefully
        process.on('SIGINT', () => {
            this.isShuttingDown = true;
            this.cleanup().then(() => process.exit(0));
        });
        
        this.groundTruthPath = './data/ground-truth-sites.json';
        this.discriminativeFeatures = this.loadDiscriminativeFeatures();
        this.robotsAnalyzer = new RobotsTxtAnalyzer();
    }

    setCompactMode(enabled: boolean): void {
        options.compact = enabled;
    }

    private loadDiscriminativeFeatures(): DiscriminativeFeature[] {
        // Based on our ground truth analysis, these are the most discriminative features
        return [
            {
                feature: 'hasWpContent',
                description: 'Scripts loaded from /wp-content/ directory',
                cms: 'WordPress',
                confidence: 0.9,
                type: 'script-src'
            },
            {
                feature: 'hasWpContentInHtml',
                description: 'HTML contains wp-content references',
                cms: 'WordPress',
                confidence: 0.9,
                type: 'html-content'
            },
            {
                feature: 'hasWpJsonLink',
                description: 'HTML contains wp-json API references',
                cms: 'WordPress',
                confidence: 0.8,
                type: 'html-content'
            },
            {
                feature: 'hasDrupalSites',
                description: 'Scripts loaded from /sites/ directory',
                cms: 'drupal',
                confidence: 0.8,
                type: 'script-src'
            },
            {
                feature: 'hasJoomlaTemplates',
                description: 'Stylesheets loaded from /templates/ directory',
                cms: 'Joomla',
                confidence: 0.9,
                type: 'script-src'
            },
            {
                feature: 'hasJoomlaScriptOptions',
                description: 'joomla-script-options new class (100% Joomla signature)',
                cms: 'Joomla',
                confidence: 1.0,
                type: 'dom-structure'
            },
            {
                feature: 'generatorContainsJoomla',
                description: 'Generator meta tag contains Joomla',
                cms: 'Joomla',
                confidence: 0.8,
                type: 'meta-tag'
            },
            {
                feature: 'hasJoomlaJUI',
                description: 'Scripts loaded from /media/jui/js/ (Joomla UI library)',
                cms: 'Joomla',
                confidence: 0.95,
                type: 'script-src'
            },
            {
                feature: 'hasJoomlaMedia',
                description: 'Scripts loaded from /media/ directory',
                cms: 'Joomla',
                confidence: 0.6,
                type: 'script-src'
            },
            {
                feature: 'hasBootstrap',
                description: 'Bootstrap framework detected',
                cms: 'Joomla',
                confidence: 0.8,
                type: 'script-src'
            },
            {
                feature: 'hasGeneratorMeta',
                description: 'Generator meta tag present',
                cms: 'multiple',
                confidence: 0.7,
                type: 'meta-tag'
            },
        ];
    }


    private findDataFile(url: string): string | null {
        const dataDir = './data/cms-analysis';
        const indexPath = path.join(dataDir, 'index.json');
        
        if (!fs.existsSync(indexPath)) {
            return null;
        }

        try {
            const indexContent = fs.readFileSync(indexPath, 'utf8');
            const indexData = JSON.parse(indexContent);
            const indexArray = Array.isArray(indexData) ? indexData : indexData.files;
            
            // Normalize the search URL to match the format stored in the index
            const normalizedSearchUrl = this.normalizeUrlForDataFileSearch(url);
            
            // Find the most recent entry for this URL with flexible matching
            const entry = indexArray
                .filter((item: any) => {
                    const normalizedStoredUrl = this.normalizeUrlForDataFileSearch(item.url);
                    return normalizedStoredUrl === normalizedSearchUrl;
                })
                .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
            
            if (entry) {
                return path.join(dataDir, entry.filePath);
            }
        } catch (error) {
            displayMessage(`⚠️  Error reading index file: ${(error as Error).message}`);
        }
        
        return null;
    }

    /**
     * Normalize URL for data file search to handle different URL formats
     * Removes protocol, www prefix, and trailing slashes for consistent matching
     */
    private normalizeUrlForDataFileSearch(url: string): string {
        if (!url) return '';
        
        try {
            let normalized = url.toLowerCase().trim();
            
            // Remove protocol
            normalized = normalized.replace(/^https?:\/\//, '');
            
            // Remove www prefix
            normalized = normalized.replace(/^www\./, '');
            
            // Remove trailing slash
            normalized = normalized.replace(/\/$/, '');
            
            // Remove port numbers (common defaults)
            normalized = normalized.replace(/:80$/, '').replace(/:443$/, '');
            
            return normalized;
        } catch {
            // If any parsing fails, return the original URL
            return url;
        }
    }

    private async analyzeCollectedData(dataPath: string): Promise<Array<{cms: string, version: string, source: string, confidence?: string}>> {
        try {
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            
            // Skip verbose analysis in compact mode, but show key version info
            if (options.compact) {
                // Compact: Show version info if detected
                const versionInfo = this.extractVersionInfo(data);
                if (versionInfo.length > 0) {
                    const bestVersion = versionInfo[0]; // Already sorted by confidence
                    displayMessage(`   🔢 Version: ${bestVersion.version} (${bestVersion.source})`);
                }
            } else {
                displayMessage(`\n🔬 Discriminative Feature Analysis:`);
                displayMessage('─'.repeat(80));
                
                let featuresFound = 0;
                const cmsSignals: { [key: string]: number } = {};
                
                this.discriminativeFeatures.forEach(feature => {
                    const present = this.evaluateFeature(feature, data);
                    if (present) {
                        featuresFound++;
                        cmsSignals[feature.cms] = (cmsSignals[feature.cms] || 0) + feature.confidence;
                        
                        const indicator = this.getConfidenceIndicator(feature.confidence);
                        displayMessage(`   ${indicator} ${feature.description} (${feature.cms})`);
                    }
                });
                
                if (featuresFound === 0) {
                    displayMessage('   ❌ No discriminative features found');
                }
                
                // Show CMS likelihood based on signals
                displayMessage(`\n📈 CMS Signal Strength:`);
                displayMessage('─'.repeat(40));
                
                const sortedSignals = Object.entries(cmsSignals)
                    .sort(([,a], [,b]) => b - a);
                
                if (sortedSignals.length > 0) {
                    sortedSignals.forEach(([cms, score]) => {
                        const percentage = (score * 100).toFixed(1);
                        const bar = '█'.repeat(Math.round(score * 20));
                        displayMessage(`   ${cms.padEnd(10)} ${bar} ${percentage}%`);
                    });
                } else {
                    displayMessage('   No clear CMS signals detected');
                }
                
                
                // Show comprehensive signal analysis
                this.showComprehensiveSignalAnalysis(data);
            }
            
            // Return version information for use in prompts
            return this.extractVersionInfo(data);
            
        } catch (error) {
            displayMessage(`❌ Error analyzing data: ${(error as Error).message}`);
            return [];
        }
    }

    private evaluateFeature(feature: DiscriminativeFeature, data: any): boolean {
        const targetUrl = data.url || '';
        
        switch (feature.feature) {
            case 'hasWpContent':
                return data.scripts?.some((script: any) => 
                    script.src?.toLowerCase().includes('/wp-content/') && 
                    this.isSameDomainScript(script.src, targetUrl)) || false;
            
            case 'hasWpContentInHtml':
                // For HTML content, we need to check if wp-content references are same-domain
                return this.hasSameDomainHtmlPattern(data.htmlContent, 'wp-content', targetUrl);
            
            case 'hasWpJsonLink':
                return this.hasSameDomainHtmlPattern(data.htmlContent, 'wp-json', targetUrl);
            
            case 'hasDrupalSites':
                return data.scripts?.some((script: any) => 
                    script.src?.toLowerCase().includes('/sites/') && 
                    this.isSameDomainScript(script.src, targetUrl)) || false;
            
            case 'hasJoomlaTemplates':
                return data.stylesheets?.some((stylesheet: any) => 
                    stylesheet.href?.toLowerCase().includes('/templates/') && 
                    this.isSameDomainScript(stylesheet.href, targetUrl)) || false;
            
            case 'hasJoomlaScriptOptions':
                return data.htmlContent?.includes('joomla-script-options new') || false;
            
            case 'generatorContainsJoomla':
                return data.metaTags?.some((tag: any) => 
                    tag.name === 'generator' && tag.content?.toLowerCase().includes('joomla')) || false;
            
            case 'hasJoomlaJUI':
                return data.scripts?.some((script: any) => 
                    script.src?.toLowerCase().includes('/media/jui/js/') && 
                    this.isSameDomainScript(script.src, targetUrl)) || false;
            
            case 'hasJoomlaMedia':
                return data.scripts?.some((script: any) => 
                    script.src?.toLowerCase().includes('/media/') && 
                    this.isSameDomainScript(script.src, targetUrl)) || false;
            
            case 'hasBootstrap':
                return data.scripts?.some((script: any) => 
                    script.src?.toLowerCase().includes('bootstrap')) || false;
            
            case 'hasGeneratorMeta':
                return data.metaTags?.some((tag: any) => tag.name === 'generator') || false;
            
            default:
                return false;
        }
    }

    /**
     * Check if HTML content contains same-domain references to a pattern
     */
    private hasSameDomainHtmlPattern(htmlContent: string, pattern: string, targetUrl: string): boolean {
        if (!htmlContent) return false;

        const targetDomain = this.extractDomain(targetUrl);
        
        // Look for URLs containing the pattern
        const urlRegex = new RegExp(`https?://[^\\s"']+${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\s"']*`, 'gi');
        const matches = htmlContent.match(urlRegex);

        if (matches) {
            for (const match of matches) {
                const matchDomain = this.extractDomain(match);
                if (this.isSameDomain(targetDomain, matchDomain)) {
                    return true;
                }
            }
        }

        // Also check for relative URLs (which implicitly belong to the same domain)
        const relativeRegex = new RegExp(`/${pattern}`, 'gi');
        let match;
        
        while ((match = relativeRegex.exec(htmlContent)) !== null) {
            const matchIndex = match.index;
            
            // Check 50 characters before the match for protocol indicators
            const contextStart = Math.max(0, matchIndex - 50);
            const beforeContext = htmlContent.substring(contextStart, matchIndex);
            
            // If there's a protocol (http:// or https://) in the context before this match,
            // it means this is part of an absolute URL, so skip it
            if (beforeContext.includes('http://') || beforeContext.includes('https://')) {
                continue;
            }
            
            // This appears to be a genuine relative URL, return true
            return true;
        }

        return false;
    }

    /**
     * Count same-domain HTML pattern matches
     */
    private countSameDomainHtmlPatterns(htmlContent: string, pattern: string, targetUrl: string): number {
        if (!htmlContent) return 0;

        const targetDomain = this.extractDomain(targetUrl);
        let count = 0;
        
        // Look for URLs containing the pattern
        const urlRegex = new RegExp(`https?://[^\\s"']+${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\s"']*`, 'gi');
        const matches = htmlContent.match(urlRegex);

        if (matches) {
            for (const match of matches) {
                const matchDomain = this.extractDomain(match);
                if (this.isSameDomain(targetDomain, matchDomain)) {
                    count++;
                }
            }
        }

        // Also count relative URLs (which implicitly belong to the same domain)
        const relativeRegex = new RegExp(`/${pattern}`, 'gi');
        let match;
        
        while ((match = relativeRegex.exec(htmlContent)) !== null) {
            const matchIndex = match.index;
            
            // Check context before the match for protocol indicators
            // Look back for the start of the URL (quotes, spaces, or line boundaries)
            const contextStart = Math.max(0, matchIndex - 100);
            const beforeContext = htmlContent.substring(contextStart, matchIndex);
            
            // Find the last URL boundary before our match
            const lastQuote = Math.max(beforeContext.lastIndexOf('"'), beforeContext.lastIndexOf("'"));
            const lastSpace = Math.max(beforeContext.lastIndexOf(' '), beforeContext.lastIndexOf('\t'), beforeContext.lastIndexOf('\n'));
            const lastBoundary = Math.max(lastQuote, lastSpace, 0);
            
            // Get the text from the last boundary to our match
            const urlCandidate = beforeContext.substring(lastBoundary).trim().replace(/^["']/, '');
            
            // If this URL candidate contains a protocol, it's an absolute URL
            if (urlCandidate.includes('://')) {
                continue;
            }
            
            // This appears to be a genuine relative URL, count it
            count++;
        }

        return count;
    }

    /**
     * Extract domain from URL for HTML pattern matching
     */
    private extractDomain(url: string): string {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.toLowerCase();
        } catch {
            return '';
        }
    }

    /**
     * Check if two domains are the same for HTML pattern matching
     */
    private isSameDomain(domain1: string, domain2: string): boolean {
        // Only exact matches are considered the same domain
        // blog.example.com and example.com are DIFFERENT domains
        return domain1 === domain2;
    }

    private getConfidenceIndicator(confidence: number): string {
        if (confidence >= 0.8) return '🟢';
        if (confidence >= 0.6) return '🟡';
        return '🔴';
    }

    
    private isValidWordPressVersion(version: string): boolean {
        // WordPress versions should be in format X.Y or X.Y.Z where X is 4-10, Y is 0-20, Z is 0-20
        const match = version.match(/^(\d+)\.(\d+)(?:\.(\d+))?$/);
        if (!match) return false;
        
        const major = parseInt(match[1]);
        const minor = parseInt(match[2]);
        const patch = match[3] ? parseInt(match[3]) : 0;
        
        // WordPress versions: 4.0+ (modern WordPress) - rejects old plugin/theme versions
        return major >= 4 && major <= 10 && minor >= 0 && minor <= 20 && patch >= 0 && patch <= 20;
    }
    
    private isValidDrupalVersion(version: string): boolean {
        // Drupal versions can be X (major only) or X.Y or X.Y.Z where X is 6-11, Y is 0-50, Z is 0-50
        const match = version.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?$/);
        if (!match) return false;
        
        const major = parseInt(match[1]);
        const minor = match[2] ? parseInt(match[2]) : 0;
        const patch = match[3] ? parseInt(match[3]) : 0;
        
        // Drupal versions: 6.x to 11.x range, allow major-only versions like "10"
        return major >= 6 && major <= 11 && minor >= 0 && minor <= 50 && patch >= 0 && patch <= 50;
    }
    
    private isValidJoomlaVersion(version: string): boolean {
        // Joomla versions should be in format X.Y or X.Y.Z where X is 1-5, Y is 0-10, Z is 0-50
        const match = version.match(/^(\d+)\.(\d+)(?:\.(\d+))?$/);
        if (!match) return false;
        
        const major = parseInt(match[1]);
        const minor = parseInt(match[2]);
        const patch = match[3] ? parseInt(match[3]) : 0;
        
        // Joomla versions: 1.x to 5.x range
        return major >= 1 && major <= 5 && minor >= 0 && minor <= 10 && patch >= 0 && patch <= 50;
    }
    
    private selectBestVersion(detectedVersions: Array<{cms: string, version: string, source: string, confidence?: string}>, cms: string): {cms: string, version: string, source: string, confidence?: string} | null {
        // Filter versions for the detected CMS
        const cmsVersions = detectedVersions.filter(v => v.cms.toLowerCase() === cms.toLowerCase());
        
        if (cmsVersions.length === 0) {
            return null;
        }
        
        // Priority order: meta-generator (highest) > http-header > script-path (lowest)
        const priorityOrder = {
            'meta-generator': 3,
            'http-header': 2,
            'script-path': 1
        };
        
        // Sort by priority and confidence
        const sortedVersions = cmsVersions.sort((a, b) => {
            const aPriority = priorityOrder[a.source as keyof typeof priorityOrder] || 0;
            const bPriority = priorityOrder[b.source as keyof typeof priorityOrder] || 0;
            
            if (aPriority !== bPriority) {
                return bPriority - aPriority; // Higher priority first
            }
            
            // If same priority, sort by confidence
            const confidenceOrder = { 'high': 3, 'medium': 2, 'low': 1 };
            const aConf = confidenceOrder[a.confidence as keyof typeof confidenceOrder] || 0;
            const bConf = confidenceOrder[b.confidence as keyof typeof confidenceOrder] || 0;
            
            return bConf - aConf;
        });
        
        return sortedVersions[0];
    }

    /**
     * Check if a script URL belongs to the same domain as the target URL
     */
    private isSameDomainScript(scriptUrl: string, targetUrl: string): boolean {
        try {
            // If script URL is relative, it's same domain
            if (!scriptUrl.startsWith('http')) {
                return true;
            }

            const scriptDomain = new URL(scriptUrl).hostname.toLowerCase();
            const targetDomain = new URL(targetUrl).hostname.toLowerCase();

            // Only exact matches are considered the same domain
            // blog.example.com and example.com are DIFFERENT domains
            return scriptDomain === targetDomain;
        } catch {
            // If URL parsing fails, assume it's not same domain
            return false;
        }
    }
    
    private getVersionHints(data: any): string[] {
        const hints = [];
        
        // Check for modern WordPress patterns
        if (data.htmlContent && data.htmlContent.toLowerCase().includes('wp-json')) {
            hints.push('REST API suggests WordPress 4.7+');
        }
        
        // Check for Gutenberg blocks
        if (data.htmlContent && data.htmlContent.toLowerCase().includes('wp-block-')) {
            hints.push('Block editor suggests WordPress 5.0+');
        }
        
        // Check for Drupal 8+ patterns
        if (data.scripts && data.scripts.some((s: any) => s.src && s.src.includes('/core/'))) {
            hints.push('Core directory suggests Drupal 8+');
        }
        
        // Check for Joomla 4+ patterns
        if (data.scripts && data.scripts.some((s: any) => s.src && s.src.includes('/media/system/js/'))) {
            hints.push('Media system structure suggests Joomla 3.0+');
        }
        
        // Check for jQuery version hints
        if (data.scripts) {
            const jqueryScript = data.scripts.find((s: any) => s.src && s.src.includes('jquery'));
            if (jqueryScript) {
                const versionMatch = jqueryScript.src.match(/jquery[^\d]*(\d+\.\d+(?:\.\d+)?)/);
                if (versionMatch) {
                    hints.push(`jQuery ${versionMatch[1]} detected`);
                }
            }
        }
        
        return hints;
    }

    private showComprehensiveSignalAnalysis(data: any): void {
        displayMessage(`\n🔬 Discriminative Signal Analysis:`);
        displayMessage('─'.repeat(80));
        
        // Analyze all signal categories
        const scriptSignals = this.analyzeScriptSignals(data);
        const htmlSignals = this.analyzeHtmlSignals(data);
        const metaSignals = this.analyzeMetaSignals(data);
        const headerSignals = this.analyzeHeaderSignals(data);
        const stylesheetSignals = this.analyzeStylesheetSignals(data);
        const versionSignals = this.analyzeVersionSignals(data);
        
        // Display each category
        this.displaySignalCategory('SCRIPT PATTERNS', scriptSignals);
        this.displaySignalCategory('HTML CONTENT PATTERNS', htmlSignals);
        this.displaySignalCategory('META TAG SIGNALS', metaSignals);
        this.displaySignalCategory('HTTP HEADERS', headerSignals);
        this.displaySignalCategory('STYLESHEET PATTERNS', stylesheetSignals);
        this.displaySignalCategory('VERSION ANALYSIS', versionSignals);
        
        // Calculate and display signal strength summary
        this.displaySignalStrengthSummary(scriptSignals, htmlSignals, metaSignals, headerSignals, stylesheetSignals);
    }
    
    private displaySignalCategory(title: string, signals: Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, examples?: string[], details?: string, content?: string, value?: string, version?: string, hint?: string}>): void {
        const confidenceIcon = (conf: string) => conf === 'high' ? '🟢' : conf === 'medium' ? '🟡' : '🔴';
        const matchIcon = (match: boolean) => match ? '✅' : '❌';
        
        displayMessage(`\n${confidenceIcon(signals[0]?.confidence || 'low')} ${title} ${confidenceIcon(signals[0]?.confidence || 'low')}`);
        
        signals.forEach(signal => {
            if (signal.match) {
                displayMessage(`   ${matchIcon(signal.match)} ${signal.signal}`);
                if (signal.examples && signal.examples.length > 0) {
                    signal.examples.forEach(example => {
                        displayMessage(`     ${example}`);
                    });
                }
                if (signal.details) {
                    displayMessage(`     ${signal.details}`);
                }
                if (signal.content) {
                    displayMessage(`     ${signal.content}`);
                }
                if (signal.value) {
                    displayMessage(`     ${signal.value}`);
                }
                if (signal.version) {
                    displayMessage(`     Version: ${signal.version}`);
                }
                if (signal.hint) {
                    displayMessage(`     💡 ${signal.hint}`);
                }
            }
        });
        
        // Show "No patterns found" only if ALL signals are missing
        const matchingSignals = signals.filter(s => s.match);
        const missingSignals = signals.filter(s => !s.match && s.cms);
        
        if (matchingSignals.length === 0 && missingSignals.length > 0) {
            const missingSummary = missingSignals.map(s => s.signal.split(' ')[0]).join(', ');
            displayMessage(`   ${matchIcon(false)} No ${missingSummary} patterns found`);
        }
    }
    
    private displaySignalStrengthSummary(...signalGroups: Array<Array<{match: boolean, cms?: string, confidence: 'high'|'medium'|'low'}>>): void {
        displayMessage(`\n📈 SIGNAL STRENGTH SUMMARY:`);
        
        const cmsScores = { WordPress: 0, drupal: 0, Joomla: 0 };
        const cmsCounts = { WordPress: 0, drupal: 0, Joomla: 0 };
        
        signalGroups.forEach(group => {
            group.forEach(signal => {
                if (signal.cms && signal.match) {
                    const weight = signal.confidence === 'high' ? 3 : signal.confidence === 'medium' ? 2 : 1;
                    cmsScores[signal.cms as keyof typeof cmsScores] += weight;
                }
                if (signal.cms) {
                    cmsCounts[signal.cms as keyof typeof cmsCounts]++;
                }
            });
        });
        
        // Calculate percentages
        const maxScore = Math.max(...Object.values(cmsScores));
        
        Object.entries(cmsScores).forEach(([cms, score]) => {
            const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
            const bar = '█'.repeat(Math.round(percentage / 5));
            const matchCount = signalGroups.flat().filter(s => s.cms === cms && s.match).length;
            const totalCount = cmsCounts[cms as keyof typeof cmsCounts];
            displayMessage(`   ${cms.padEnd(10)} ${bar.padEnd(20)} ${percentage.toFixed(1)}% (${matchCount}/${totalCount} signals)`);
        });
    }

    private showAdditionalContext(data: any): void {
        displayMessage(`\n📋 Additional Context:`);
        displayMessage('─'.repeat(40));
        
        // Generator meta tag
        const generator = data.metaTags?.find((tag: any) => tag.name === 'generator');
        if (generator) {
            displayMessage(`   Generator: ${generator.content}`);
        }
        
        // Key headers
        const poweredBy = data.httpHeaders?.['x-powered-by'];
        if (poweredBy) {
            displayMessage(`   Powered By: ${poweredBy}`);
        }
        
        // Script count
        const scriptCount = data.scripts?.length || 0;
        displayMessage(`   Scripts: ${scriptCount}`);
        
        // Stylesheet count
        const stylesheetCount = data.stylesheets?.length || 0;
        displayMessage(`   Stylesheets: ${stylesheetCount}`);
        
        // HTML size
        const htmlSize = data.htmlContent?.length || 0;
        displayMessage(`   HTML Size: ${(htmlSize / 1024).toFixed(1)}KB`);
        
        // Show some key patterns
        if (data.htmlContent) {
            const html = data.htmlContent.toLowerCase();
            const patterns = [
                { name: 'WordPress', pattern: 'wp-' },
                { name: 'Drupal', pattern: 'drupal' },
                { name: 'Joomla', pattern: 'joomla' },
                { name: 'jQuery', pattern: 'jquery' },
                { name: 'React', pattern: 'react' },
                { name: 'Angular', pattern: 'angular' },
                { name: 'Vue', pattern: 'vue' }
            ];
            
            const foundPatterns = patterns.filter(p => html.includes(p.pattern));
            if (foundPatterns.length > 0) {
                displayMessage(`   Patterns: ${foundPatterns.map(p => p.name).join(', ')}`);
            }
        }
    }

    private normalizeUrlForGroundTruth(url: string): string {
        try {
            // First use the existing URL normalizer to add protocol
            const normalized = UrlNormalizer.normalizeUrl(url, { defaultProtocol: 'https' });
            
            // Additional normalization for ground truth deduplication
            const urlObj = new URL(normalized);
            
            // Normalize to https (most sites support it)
            urlObj.protocol = 'https:';
            
            // Add www if missing for common domains (avoid IP addresses and localhost)
            if (!urlObj.hostname.startsWith('www.') && 
                !urlObj.hostname.includes('localhost') && 
                !urlObj.hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) { // not IP address
                urlObj.hostname = 'www.' + urlObj.hostname;
            }
            
            // Remove trailing slash from path
            if (urlObj.pathname === '/') {
                urlObj.pathname = '';
            }
            
            // Remove default ports
            if ((urlObj.protocol === 'https:' && urlObj.port === '443') ||
                (urlObj.protocol === 'http:' && urlObj.port === '80')) {
                urlObj.port = '';
            }
            
            // Use existing cleanUrl and normalizeDomain utilities
            let result = UrlNormalizer.cleanUrl(urlObj.toString(), false); // Remove query params
            result = UrlNormalizer.normalizeDomain(result);
            
            return result.replace(/\/$/, ''); // Remove final trailing slash
        } catch {
            // If URL parsing fails, return original
            return url;
        }
    }

    private async addToGroundTruth(url: string, cms: string, confidence: number, notes: string, version?: string): Promise<void> {
        const normalizedUrl = this.normalizeUrlForGroundTruth(url);
        let database: GroundTruthDatabase;
        
        // Load existing database or create new one
        if (fs.existsSync(this.groundTruthPath)) {
            const content = fs.readFileSync(this.groundTruthPath, 'utf8');
            database = JSON.parse(content);
        } else {
            database = {
                version: '1.0',
                lastUpdated: new Date().toISOString(),
                sites: []
            };
        }
        
        // Check if normalized URL already exists
        const existingIndex = database.sites.findIndex(site => this.normalizeUrlForGroundTruth(site.url) === normalizedUrl);
        
        // Get detected version information from the data (use original URL for file lookup)
        const dataPath = this.findDataFile(url);
        let detectedVersion: string | undefined;
        let versionSource: 'meta-generator' | 'manual' | 'header' | 'pattern' | 'unknown' = 'unknown';
        
        if (dataPath && fs.existsSync(dataPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
                const versionInfo = this.extractVersionInfo(data);
                if (versionInfo.length > 0) {
                    // Use the highest confidence version detection
                    const bestVersion = versionInfo[0];
                    if (bestVersion.cms.toLowerCase() === cms.toLowerCase()) {
                        detectedVersion = bestVersion.version;
                        versionSource = bestVersion.source as any;
                    }
                }
            } catch (error) {
                displayMessage(`⚠️  Could not extract version info: ${(error as Error).message}`);
            }
        }
        
        const newSite: GroundTruthSite = {
            url: normalizedUrl,
            cms: cms,
            version: version || undefined,
            confidence: confidence,
            addedAt: new Date().toISOString(),
            verifiedBy: 'ground-truth-discovery',
            notes: notes || undefined,
            detectedVersion: detectedVersion,
            versionSource: versionSource
        };
        
        if (existingIndex >= 0) {
            database.sites[existingIndex] = newSite;
        } else {
            database.sites.push(newSite);
        }
        
        database.lastUpdated = new Date().toISOString();
        
        // Ensure directory exists
        const dir = path.dirname(this.groundTruthPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        // Save database
        fs.writeFileSync(this.groundTruthPath, JSON.stringify(database, null, 2));
    }




