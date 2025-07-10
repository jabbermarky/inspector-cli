import { program } from 'commander';
import { detectInputType, extractUrlsFromCSV } from '../utils/utils.js';
import { CMSDetectionIterator, CMSDetectionResult } from '../utils/cms/index.js';
import { createModuleLogger } from '../utils/logger.js';
import { RobotsTxtAnalyzer } from '../utils/robots-txt-analyzer.js';
import { UrlNormalizer } from '../utils/url/normalizer.js';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

const logger = createModuleLogger('ground-truth');

interface GroundTruthSite {
    url: string;
    cms: string;
    version?: string;
    confidence: number;
    addedAt: string;
    verifiedBy: string;
    notes?: string;
    detectedVersion?: string;
    versionSource?: 'meta-generator' | 'manual' | 'header' | 'pattern' | 'unknown';
}

interface GroundTruthDatabase {
    version: string;
    lastUpdated: string;
    sites: GroundTruthSite[];
}

interface DiscriminativeFeature {
    feature: string;
    description: string;
    cms: string;
    confidence: number;
    type: 'script-src' | 'html-content' | 'meta-tag' | 'header' | 'dom-structure';
}

class GroundTruthDiscovery {
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
            console.error('Readline error:', error);
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
        this.compactMode = enabled;
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

    async processUrl(url: string): Promise<{shouldContinue: boolean}> {
        // Check if we're shutting down
        if (this.isShuttingDown) {
            return { shouldContinue: false };
        }
        
        console.log(`\n🔍 Analyzing: ${url}`);
        if (!this.compactMode) {
            console.log('═'.repeat(80));
        }

        // Step 1: Analyze robots.txt first
        if (!this.compactMode) {
            console.log('\n🤖 Robots.txt Analysis:');
            console.log('─'.repeat(50));
        }
        
        const robotsAnalysis = await this.robotsAnalyzer.analyze(url);
        
        if (this.compactMode) {
            // Compact: Show key result with main signals
            if (robotsAnalysis.error) {
                console.log(`   🤖 robots.txt: ❌ ${robotsAnalysis.error}`);
            } else {
                const topSignals = robotsAnalysis.signals.slice(0, 2).join(', ');
                console.log(`   🤖 robots.txt: ${robotsAnalysis.cms} (${(robotsAnalysis.confidence * 100).toFixed(1)}%)${topSignals ? ` via ${topSignals}` : ''}`);
            }
        } else {
            // Full output
            console.log(`📍 robots.txt URL: ${robotsAnalysis.url}`);
            
            if (robotsAnalysis.error) {
                console.log(`❌ Error: ${robotsAnalysis.error}`);
            } else {
                console.log(`✅ Success: ${robotsAnalysis.content.length} bytes`);
                console.log(`🎯 Detection: ${robotsAnalysis.cms} (${(robotsAnalysis.confidence * 100).toFixed(1)}%)`);
                
                if (robotsAnalysis.signals.length > 0) {
                    console.log(`📋 Signals found:`);
                    robotsAnalysis.signals.forEach(signal => {
                        console.log(`   • ${signal}`);
                    });
                }
                
                // Show interesting headers
                const interestingHeaders = this.robotsAnalyzer.getInterestingHeaders(robotsAnalysis.headers);
                if (Object.keys(interestingHeaders).length > 0) {
                    console.log(`📊 HTTP Headers:`);
                    Object.entries(interestingHeaders).forEach(([key, value]) => {
                        console.log(`   ${key}: ${value}`);
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
            if (!this.compactMode) {
                console.log('\n🌐 Main Page Detection:');
                console.log('─'.repeat(50));
            }
            
            const result = await cmsIterator.detect(url);
            
            if (this.compactMode) {
                if (result.error) {
                    console.log(`   🌐 main page: ❌ ${result.error}`);
                } else {
                    console.log(`   🌐 main page: ${result.cms} (${(result.confidence * 100).toFixed(1)}%) | ${result.executionTime}ms`);
                }
            } else {
                console.log(`📊 Detection Result: ${result.cms} (${(result.confidence * 100).toFixed(1)}% confidence) | ${result.executionTime}ms`);
                
                if (result.error) {
                    console.log(`❌ Error: ${result.error}`);
                }
            }

            // Step 4: Combine results and show comparison
            if (this.compactMode) {
                // Compact: Show final decision with confidence comparison
                const finalCms = robotsAnalysis.confidence > result.confidence ? robotsAnalysis.cms : result.cms;
                const finalConfidence = Math.max(robotsAnalysis.confidence, result.confidence);
                const method = robotsAnalysis.confidence > result.confidence ? 'robots.txt' : 'main page';
                
                if (robotsAnalysis.cms !== 'Unknown' && result.cms !== 'Unknown') {
                    if (robotsAnalysis.cms.toLowerCase() === result.cms.toLowerCase()) {
                        console.log(`   ✅ Final: ${finalCms} (${(finalConfidence * 100).toFixed(1)}%) - both methods agree`);
                    } else {
                        console.log(`   ⚠️  Final: ${finalCms} (${(finalConfidence * 100).toFixed(1)}%) via ${method} - methods disagree`);
                    }
                } else {
                    console.log(`   📊 Final: ${finalCms} (${(finalConfidence * 100).toFixed(1)}%) via ${method}`);
                }
            } else {
                console.log('\n🔄 Detection Comparison:');
                console.log('─'.repeat(50));
                
                const robotsConf = (robotsAnalysis.confidence * 100).toFixed(1);
                const mainConf = (result.confidence * 100).toFixed(1);
                
                console.log(`🤖 robots.txt: ${robotsAnalysis.cms} (${robotsConf}%)`);
                console.log(`🌐 main page:  ${result.cms} (${mainConf}%)`);
                
                if (robotsAnalysis.cms !== 'Unknown' && result.cms !== 'Unknown') {
                    if (robotsAnalysis.cms.toLowerCase() === result.cms.toLowerCase()) {
                        console.log(`✅ Agreement: Both methods detected ${result.cms}`);
                    } else {
                        console.log(`⚠️  Disagreement: robots.txt says ${robotsAnalysis.cms}, main page says ${result.cms}`);
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
                console.log('\n❌ No data file found for analysis');
                return { shouldContinue: true };
            }

        } catch (error) {
            // Only show error if not shutting down
            if (!this.isShuttingDown) {
                console.error(`\n❌ Error analyzing ${url}:`, (error as Error).message);
            }
            return { shouldContinue: true };
        } finally {
            // CMSDetectionIterator cleanup is handled internally
        }
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
            console.warn(`⚠️  Error reading index file: ${(error as Error).message}`);
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
            if (this.compactMode) {
                // Compact: Show version info if detected
                const versionInfo = this.extractVersionInfo(data);
                if (versionInfo.length > 0) {
                    const bestVersion = versionInfo[0]; // Already sorted by confidence
                    console.log(`   🔢 Version: ${bestVersion.version} (${bestVersion.source})`);
                }
            } else {
                console.log(`\n🔬 Discriminative Feature Analysis:`);
                console.log('─'.repeat(80));
                
                let featuresFound = 0;
                const cmsSignals: { [key: string]: number } = {};
                
                this.discriminativeFeatures.forEach(feature => {
                    const present = this.evaluateFeature(feature, data);
                    if (present) {
                        featuresFound++;
                        cmsSignals[feature.cms] = (cmsSignals[feature.cms] || 0) + feature.confidence;
                        
                        const indicator = this.getConfidenceIndicator(feature.confidence);
                        console.log(`   ${indicator} ${feature.description} (${feature.cms})`);
                    }
                });
                
                if (featuresFound === 0) {
                    console.log('   ❌ No discriminative features found');
                }
                
                // Show CMS likelihood based on signals
                console.log(`\n📈 CMS Signal Strength:`);
                console.log('─'.repeat(40));
                
                const sortedSignals = Object.entries(cmsSignals)
                    .sort(([,a], [,b]) => b - a);
                
                if (sortedSignals.length > 0) {
                    sortedSignals.forEach(([cms, score]) => {
                        const percentage = (score * 100).toFixed(1);
                        const bar = '█'.repeat(Math.round(score * 20));
                        console.log(`   ${cms.padEnd(10)} ${bar} ${percentage}%`);
                    });
                } else {
                    console.log('   No clear CMS signals detected');
                }
                
                
                // Show comprehensive signal analysis
                this.showComprehensiveSignalAnalysis(data);
            }
            
            // Return version information for use in prompts
            return this.extractVersionInfo(data);
            
        } catch (error) {
            console.error(`❌ Error analyzing data: ${(error as Error).message}`);
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

    private showVersionAnalysis(data: any): void {
        console.log(`\n🔢 Version Analysis:`);
        console.log('─'.repeat(40));
        
        const versionInfo = this.extractVersionInfo(data);
        
        if (versionInfo.length > 0) {
            versionInfo.forEach(info => {
                console.log(`   ${info.cms} ${info.version} (${info.source})`);
                if (info.confidence) {
                    console.log(`     Confidence: ${info.confidence}`);
                }
                if (info.pattern) {
                    console.log(`     Pattern: ${info.pattern}`);
                }
            });
        } else {
            console.log('   No version information detected');
        }
        
        // Show version hints
        const hints = this.getVersionHints(data);
        if (hints.length > 0) {
            console.log(`\n   💡 Version Hints:`);
            hints.forEach(hint => {
                console.log(`     - ${hint}`);
            });
        }
    }
    
    private extractVersionInfo(data: any): Array<{cms: string, version: string, source: string, confidence?: string, pattern?: string}> {
        const versions = [];
        
        // Check generator meta tag
        if (data.metaTags) {
            const generator = data.metaTags.find((tag: any) => tag.name === 'generator');
            if (generator && generator.content) {
                const content = generator.content.toLowerCase();
                
                // WordPress version patterns
                if (content.includes('wordpress')) {
                    const wpMatch = content.match(/wordpress[^\d]*(\d+\.\d+(?:\.\d+)?)/);
                    if (wpMatch) {
                        versions.push({
                            cms: 'WordPress',
                            version: wpMatch[1],
                            source: 'meta-generator',
                            confidence: 'high',
                            pattern: generator.content
                        });
                    }
                }
                
                // Drupal version patterns
                if (content.includes('drupal')) {
                    const drupalMatch = content.match(/drupal[^\d]*(\d+\.\d+(?:\.\d+)?)/);
                    if (drupalMatch) {
                        versions.push({
                            cms: 'Drupal',
                            version: drupalMatch[1],
                            source: 'meta-generator',
                            confidence: 'high',
                            pattern: generator.content
                        });
                    }
                }
                
                // Joomla version patterns
                if (content.includes('joomla')) {
                    const joomlaMatch = content.match(/joomla[^\d]*(\d+\.\d+(?:\.\d+)?)/);
                    if (joomlaMatch) {
                        versions.push({
                            cms: 'Joomla',
                            version: joomlaMatch[1],
                            source: 'meta-generator',
                            confidence: 'high',
                            pattern: generator.content
                        });
                    }
                }
            }
        }
        
        // Check script paths for version hints (highly restrictive to avoid plugin/theme versions)
        if (data.scripts) {
            data.scripts.forEach((script: any) => {
                if (script.src) {
                    const src = script.src.toLowerCase();
                    
                    // WordPress core version patterns (highly restrictive)
                    // Only target specific WordPress core administrative files known to contain WordPress version
                    // Avoid wp-includes/js/jquery/* as these contain jQuery versions, not WordPress versions
                    // Avoid generic wp-includes files as these often contain plugin/theme versions
                    if (src.includes('wp-admin/js/') && 
                        (src.includes('wp-admin/js/common') || 
                         src.includes('wp-admin/js/wp-admin') ||
                         src.includes('wp-admin/js/dashboard'))) {
                        const wpVersionMatch = src.match(/[?&]ver=(\d+\.\d+(?:\.\d+)?)/);
                        if (wpVersionMatch && this.isValidWordPressVersion(wpVersionMatch[1])) {
                            versions.push({
                                cms: 'WordPress',
                                version: wpVersionMatch[1],
                                source: 'script-path',
                                confidence: 'medium',
                                pattern: script.src
                            });
                        }
                    }
                    
                    // Alternative: Look for wp-includes files that are core WordPress system files
                    else if (src.includes('wp-includes/js/') && 
                             (src.includes('wp-includes/js/wp-embed.min.js') ||
                              src.includes('wp-includes/js/wp-util.min.js'))) {
                        const wpVersionMatch = src.match(/[?&]ver=(\d+\.\d+(?:\.\d+)?)/);
                        if (wpVersionMatch && this.isValidWordPressVersion(wpVersionMatch[1])) {
                            versions.push({
                                cms: 'WordPress',
                                version: wpVersionMatch[1],
                                source: 'script-path',
                                confidence: 'low', // Lower confidence for wp-includes
                                pattern: script.src
                            });
                        }
                    }
                    
                    // Drupal version in script paths (more specific)
                    if (src.includes('/sites/') && src.includes('drupal')) {
                        const drupalVersionMatch = src.match(/drupal[^\d]*(\d+\.\d+(?:\.\d+)?)/);
                        if (drupalVersionMatch && this.isValidDrupalVersion(drupalVersionMatch[1])) {
                            versions.push({
                                cms: 'Drupal',
                                version: drupalVersionMatch[1],
                                source: 'script-path',
                                confidence: 'medium',
                                pattern: script.src
                            });
                        }
                    }
                    
                    // Joomla version in script paths (more specific)
                    if (src.includes('/media/system/') || src.includes('/media/jui/')) {
                        const joomlaVersionMatch = src.match(/joomla[^\d]*(\d+\.\d+(?:\.\d+)?)/);
                        if (joomlaVersionMatch && this.isValidJoomlaVersion(joomlaVersionMatch[1])) {
                            versions.push({
                                cms: 'Joomla',
                                version: joomlaVersionMatch[1],
                                source: 'script-path',
                                confidence: 'medium',
                                pattern: script.src
                            });
                        }
                    }
                }
            });
        }
        
        // Check HTTP headers
        if (data.httpHeaders) {
            Object.entries(data.httpHeaders).forEach(([name, value]: [string, any]) => {
                if (typeof value === 'string') {
                    const headerValue = value.toLowerCase();
                    
                    // Check X-Powered-By header
                    if (name.toLowerCase() === 'x-powered-by') {
                        const wpMatch = headerValue.match(/wordpress[^\d]*(\d+\.\d+(?:\.\d+)?)/);
                        if (wpMatch) {
                            versions.push({
                                cms: 'WordPress',
                                version: wpMatch[1],
                                source: 'http-header',
                                confidence: 'high',
                                pattern: `${name}: ${value}`
                            });
                        }
                    }
                    
                    // Check other headers for version info
                    const versionMatch = headerValue.match(/(wordpress|drupal|joomla)[^\d]*(\d+(?:\.\d+)?(?:\.\d+)?)/);
                    if (versionMatch) {
                        const detectedVersion = versionMatch[2];
                        const cms = versionMatch[1].charAt(0).toUpperCase() + versionMatch[1].slice(1);
                        
                        // Validate version based on CMS
                        let isValid = false;
                        if (cms === 'WordPress') {
                            isValid = this.isValidWordPressVersion(detectedVersion);
                        } else if (cms === 'Drupal') {
                            isValid = this.isValidDrupalVersion(detectedVersion);
                        } else if (cms === 'Joomla') {
                            isValid = this.isValidJoomlaVersion(detectedVersion);
                        }
                        
                        if (isValid) {
                            versions.push({
                                cms: cms,
                                version: detectedVersion,
                                source: 'http-header',
                                confidence: 'high', // HTTP headers are more reliable than script paths
                                pattern: `${name}: ${value}`
                            });
                        }
                    }
                }
            });
        }
        
        // Remove duplicates and sort by confidence
        const uniqueVersions = versions.filter((version, index, self) => 
            index === self.findIndex(v => v.cms === version.cms && v.version === version.version)
        );
        
        return uniqueVersions.sort((a, b) => {
            const confidenceOrder = { 'high': 3, 'medium': 2, 'low': 1 };
            return (confidenceOrder[b.confidence as keyof typeof confidenceOrder] || 0) - 
                   (confidenceOrder[a.confidence as keyof typeof confidenceOrder] || 0);
        });
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
        console.log(`\n🔬 Discriminative Signal Analysis:`);
        console.log('─'.repeat(80));
        
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
    
    private analyzeScriptSignals(data: any): Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, examples?: string[]}> {
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
    
    private analyzeHtmlSignals(data: any): Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, details?: string}> {
        const signals: Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, details?: string}> = [];
        const html = (data.htmlContent || '').toLowerCase();
        const targetUrl = data.url || '';
        
        // WordPress HTML patterns - only count same-domain references
        const wpContentMatch = this.hasSameDomainHtmlPattern(data.htmlContent, 'wp-content', targetUrl);
        const wpContentCount = wpContentMatch ? this.countSameDomainHtmlPatterns(data.htmlContent, 'wp-content', targetUrl) : 0;
        const wpJsonMatch = this.hasSameDomainHtmlPattern(data.htmlContent, 'wp-json', targetUrl);
        const wpJsonCount = wpJsonMatch ? this.countSameDomainHtmlPatterns(data.htmlContent, 'wp-json', targetUrl) : 0;
        const wpBlockCount = (html.match(/wp-block-/g) || []).length;
        
        signals.push({
            signal: 'wp-content references (WordPress)',
            confidence: 'high' as const,
            match: wpContentCount > 0,
            cms: 'WordPress',
            details: wpContentCount > 0 ? `${wpContentCount} instances` : undefined
        });
        
        signals.push({
            signal: 'wp-json API endpoints (WordPress)',
            confidence: 'high' as const,
            match: wpJsonCount > 0,
            cms: 'WordPress',
            details: wpJsonCount > 0 ? `${wpJsonCount} references` : undefined
        });
        
        signals.push({
            signal: 'Gutenberg blocks (WordPress 5.0+)',
            confidence: 'medium' as const,
            match: wpBlockCount > 0,
            cms: 'WordPress',
            details: wpBlockCount > 0 ? `${wpBlockCount} blocks` : undefined
        });
        
        // Drupal HTML patterns
        const drupalSettingsMatch = html.includes('drupal.settings');
        const drupalJsMatch = html.includes('drupal.js');
        
        signals.push({
            signal: 'drupal.settings object (Drupal)',
            confidence: 'high' as const,
            match: drupalSettingsMatch,
            cms: 'drupal'
        });
        
        signals.push({
            signal: 'drupal.js references (Drupal)',
            confidence: 'medium' as const,
            match: drupalJsMatch,
            cms: 'drupal'
        });
        
        // Joomla HTML patterns
        const joomlaSystemMessage = html.includes('system-message');
        const joomlaContent = html.includes('com_content');
        const joomlaScriptOptions = html.includes('joomla-script-options new');
        
        signals.push({
            signal: 'joomla-script-options new (100% Joomla)',
            confidence: 'high' as const,
            match: joomlaScriptOptions,
            cms: 'Joomla'
        });
        
        signals.push({
            signal: 'system-message class (Joomla)',
            confidence: 'medium' as const,
            match: joomlaSystemMessage,
            cms: 'Joomla'
        });
        
        signals.push({
            signal: 'com_content component (Joomla)',
            confidence: 'medium' as const,
            match: joomlaContent,
            cms: 'Joomla'
        });
        
        return signals;
    }
    
    private analyzeMetaSignals(data: any): Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, content?: string}> {
        const signals: Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, content?: string}> = [];
        const metaTags = data.metaTags || [];
        
        // Generator meta tag
        const generator = metaTags.find((tag: any) => tag.name === 'generator');
        const generatorContent = generator?.content || '';
        
        signals.push({
            signal: 'WordPress generator tag',
            confidence: 'high' as const,
            match: generatorContent.toLowerCase().includes('wordpress'),
            cms: 'WordPress',
            content: generatorContent.toLowerCase().includes('wordpress') ? generatorContent : undefined
        });
        
        signals.push({
            signal: 'Drupal generator tag',
            confidence: 'high' as const,
            match: generatorContent.toLowerCase().includes('drupal'),
            cms: 'drupal',
            content: generatorContent.toLowerCase().includes('drupal') ? generatorContent : undefined
        });
        
        signals.push({
            signal: 'Joomla generator tag',
            confidence: 'high' as const,
            match: generatorContent.toLowerCase().includes('joomla'),
            cms: 'Joomla',
            content: generatorContent.toLowerCase().includes('joomla') ? generatorContent : undefined
        });
        
        return signals;
    }
    
    private analyzeHeaderSignals(data: any): Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, value?: string}> {
        const signals: Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, value?: string}> = [];
        const mainHeaders = data.httpHeaders || {};
        const robotsHeaders = data.robotsTxt?.httpHeaders || {};
        
        // Analyze headers from both sources
        const analyzeHeaderSource = (headers: Record<string, string>, source: 'main' | 'robots') => {
            const sourceLabel = source === 'robots' ? ' (robots.txt)' : '';
            
            // WordPress headers
            const xPingback = headers['x-pingback'] || headers['X-Pingback'];
            const linkHeader = headers['link'] || headers['Link'];
            const wpJsonInLink = linkHeader && linkHeader.toLowerCase().includes('wp-json');
            
            if (xPingback) {
                signals.push({
                    signal: `X-Pingback header (WordPress)${sourceLabel}`,
                    confidence: 'high' as const,
                    match: true,
                    cms: 'WordPress',
                    value: xPingback
                });
            }
            
            if (wpJsonInLink) {
                signals.push({
                    signal: `wp-json in Link header (WordPress)${sourceLabel}`,
                    confidence: 'high' as const,
                    match: true,
                    cms: 'WordPress',
                    value: linkHeader
                });
            }
            
            // Drupal headers
            const xDrupalCache = headers['x-drupal-cache'] || headers['X-Drupal-Cache'];
            const xDrupalDynamicCache = headers['x-drupal-dynamic-cache'] || headers['X-Drupal-Dynamic-Cache'];
            
            if (xDrupalCache) {
                signals.push({
                    signal: `X-Drupal-Cache header (Drupal)${sourceLabel}`,
                    confidence: 'high' as const,
                    match: true,
                    cms: 'drupal',
                    value: xDrupalCache
                });
            }
            
            if (xDrupalDynamicCache) {
                signals.push({
                    signal: `X-Drupal-Dynamic-Cache (Drupal 8+)${sourceLabel}`,
                    confidence: 'high' as const,
                    match: true,
                    cms: 'drupal',
                    value: xDrupalDynamicCache
                });
            }
            
            // General headers with CMS info
            const xGenerator = headers['x-generator'] || headers['X-Generator'];
            const xContentEncodedBy = headers['x-content-encoded-by'] || headers['X-Content-Encoded-By'];
            
            if (xGenerator) {
                signals.push({
                    signal: `X-Generator header${sourceLabel}`,
                    confidence: 'high' as const,
                    match: true,
                    value: xGenerator
                });
            }
            
            if (xContentEncodedBy) {
                signals.push({
                    signal: `X-Content-Encoded-By header${sourceLabel}`,
                    confidence: 'high' as const,
                    match: true,
                    value: xContentEncodedBy
                });
            }
            
            // Enhanced cookie analysis for all CMS types
            const cookiePatterns = this.analyzeCookiePatterns(headers);
            cookiePatterns.forEach(pattern => {
                if (pattern.match) {
                    signals.push({
                        ...pattern,
                        signal: pattern.signal + sourceLabel
                    });
                }
            });
            
            // X-Pingback alternatives for other CMSs
            const pingbackAlternatives = this.analyzePingbackAlternatives(headers);
            pingbackAlternatives.forEach(alt => {
                if (alt.match) {
                    signals.push({
                        ...alt,
                        signal: alt.signal + sourceLabel
                    });
                }
            });
        };
        
        // Analyze both main page and robots.txt headers
        analyzeHeaderSource(mainHeaders, 'main');
        analyzeHeaderSource(robotsHeaders, 'robots');
        
        return signals;
    }
    
    private analyzeCookiePatterns(headers: any): Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, value?: string}> {
        const cookieSignals: Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, value?: string}> = [];
        
        // Look for Set-Cookie headers
        const setCookieHeaders = Object.keys(headers).filter(key => 
            key.toLowerCase().includes('set-cookie') || key.toLowerCase() === 'cookie'
        );
        
        setCookieHeaders.forEach(headerName => {
            const cookieValue = headers[headerName];
            if (typeof cookieValue === 'string') {
                const lowerValue = cookieValue.toLowerCase();
                
                // WordPress cookie patterns
                if (lowerValue.includes('wordpress') || lowerValue.includes('wp-')) {
                    cookieSignals.push({
                        signal: 'WordPress cookies',
                        confidence: 'medium' as const,
                        match: true,
                        cms: 'WordPress',
                        value: cookieValue
                    });
                }
                
                // Drupal cookie patterns
                if (lowerValue.includes('drupal') || lowerValue.includes('sess') && lowerValue.includes('drupal')) {
                    cookieSignals.push({
                        signal: 'Drupal session cookies',
                        confidence: 'medium' as const,
                        match: true,
                        cms: 'drupal',
                        value: cookieValue
                    });
                }
                
                // Joomla cookie patterns
                if (lowerValue.includes('joomla') || lowerValue.includes('joomla_session')) {
                    cookieSignals.push({
                        signal: 'Joomla session cookies',
                        confidence: 'medium' as const,
                        match: true,
                        cms: 'Joomla',
                        value: cookieValue
                    });
                }
                
                // Generic CMS session patterns
                if (lowerValue.includes('phpsessid') || lowerValue.includes('sessionid')) {
                    cookieSignals.push({
                        signal: 'PHP session cookies',
                        confidence: 'low' as const,
                        match: true,
                        value: cookieValue
                    });
                }
            }
        });
        
        return cookieSignals;
    }
    
    private analyzePingbackAlternatives(headers: any): Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, value?: string}> {
        const pingbackSignals: Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, value?: string}> = [];
        
        // Look for various pingback/trackback alternatives
        const pingbackHeaders = [
            'x-trackback',
            'x-webmention',
            'x-xmlrpc',
            'x-rpc-endpoint',
            'x-api-endpoint'
        ];
        
        pingbackHeaders.forEach(headerName => {
            const headerValue = headers[headerName] || headers[headerName.replace('x-', 'X-')];
            if (headerValue) {
                const lowerValue = headerValue.toLowerCase();
                
                // WordPress-like patterns
                if (lowerValue.includes('xmlrpc') || lowerValue.includes('wp-')) {
                    pingbackSignals.push({
                        signal: `${headerName} endpoint (WordPress-like)`,
                        confidence: 'medium' as const,
                        match: true,
                        cms: 'WordPress',
                        value: headerValue
                    });
                }
                
                // Drupal-like patterns
                if (lowerValue.includes('services') || lowerValue.includes('rest')) {
                    pingbackSignals.push({
                        signal: `${headerName} endpoint (Drupal-like)`,
                        confidence: 'medium' as const,
                        match: true,
                        cms: 'drupal',
                        value: headerValue
                    });
                }
                
                // Generic API endpoints
                if (lowerValue.includes('api') || lowerValue.includes('rpc')) {
                    pingbackSignals.push({
                        signal: `${headerName} API endpoint`,
                        confidence: 'low' as const,
                        match: true,
                        value: headerValue
                    });
                }
            }
        });
        
        return pingbackSignals;
    }
    
    private analyzeStylesheetSignals(data: any): Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, examples?: string[]}> {
        const signals: Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, examples?: string[]}> = [];
        const stylesheets = data.stylesheets || [];
        
        // WordPress stylesheet patterns
        const wpThemes = stylesheets.filter((s: any) => s.href && s.href.toLowerCase().includes('/wp-content/themes/'));
        const wpPlugins = stylesheets.filter((s: any) => s.href && s.href.toLowerCase().includes('/wp-content/plugins/'));
        
        signals.push({
            signal: '/wp-content/themes/ (WordPress)',
            confidence: 'high' as const,
            match: wpThemes.length > 0,
            cms: 'WordPress',
            examples: wpThemes.slice(0, 2).map((s: any) => s.href)
        });
        
        signals.push({
            signal: '/wp-content/plugins/ (WordPress)',
            confidence: 'high' as const,
            match: wpPlugins.length > 0,
            cms: 'WordPress',
            examples: wpPlugins.slice(0, 1).map((s: any) => s.href)
        });
        
        // Drupal stylesheet patterns
        const drupalThemes = stylesheets.filter((s: any) => s.href && s.href.toLowerCase().includes('/themes/'));
        const drupalModules = stylesheets.filter((s: any) => s.href && s.href.toLowerCase().includes('/modules/'));
        
        signals.push({
            signal: '/themes/ directory (Drupal)',
            confidence: 'medium' as const,
            match: drupalThemes.length > 0,
            cms: 'drupal',
            examples: drupalThemes.slice(0, 1).map((s: any) => s.href)
        });
        
        signals.push({
            signal: '/modules/ directory (Drupal)',
            confidence: 'medium' as const,
            match: drupalModules.length > 0,
            cms: 'drupal',
            examples: drupalModules.slice(0, 1).map((s: any) => s.href)
        });
        
        // Joomla stylesheet patterns
        const joomlaTemplates = stylesheets.filter((s: any) => s.href && s.href.toLowerCase().includes('/templates/'));
        const joomlaMedia = stylesheets.filter((s: any) => s.href && s.href.toLowerCase().includes('/media/'));
        
        signals.push({
            signal: '/templates/ directory (Joomla)',
            confidence: 'high' as const,
            match: joomlaTemplates.length > 0,
            cms: 'Joomla',
            examples: joomlaTemplates.slice(0, 2).map((s: any) => s.href)
        });
        
        signals.push({
            signal: '/media/ stylesheets (Joomla)',
            confidence: 'medium' as const,
            match: joomlaMedia.length > 0,
            cms: 'Joomla',
            examples: joomlaMedia.slice(0, 1).map((s: any) => s.href)
        });
        
        return signals;
    }
    
    private analyzeVersionSignals(data: any): Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, version?: string, hint?: string}> {
        const signals: Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, version?: string, hint?: string}> = [];
        const versionInfo = this.extractVersionInfo(data);
        const hints = this.getVersionHints(data);
        
        // Add detected versions
        versionInfo.forEach(info => {
            signals.push({
                signal: `${info.cms} version detected`,
                confidence: info.confidence as 'high'|'medium'|'low',
                match: true,
                cms: info.cms.toLowerCase(),
                version: info.version
            });
        });
        
        // Add version hints
        hints.forEach(hint => {
            signals.push({
                signal: 'Version hint',
                confidence: 'low' as const,
                match: true,
                hint: hint
            });
        });
        
        return signals;
    }
    
    private displaySignalCategory(title: string, signals: Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, examples?: string[], details?: string, content?: string, value?: string, version?: string, hint?: string}>): void {
        const confidenceIcon = (conf: string) => conf === 'high' ? '🟢' : conf === 'medium' ? '🟡' : '🔴';
        const matchIcon = (match: boolean) => match ? '✅' : '❌';
        
        console.log(`\n${confidenceIcon(signals[0]?.confidence || 'low')} ${title} ${confidenceIcon(signals[0]?.confidence || 'low')}`);
        
        signals.forEach(signal => {
            if (signal.match) {
                console.log(`   ${matchIcon(signal.match)} ${signal.signal}`);
                if (signal.examples && signal.examples.length > 0) {
                    signal.examples.forEach(example => {
                        console.log(`     ${example}`);
                    });
                }
                if (signal.details) {
                    console.log(`     ${signal.details}`);
                }
                if (signal.content) {
                    console.log(`     ${signal.content}`);
                }
                if (signal.value) {
                    console.log(`     ${signal.value}`);
                }
                if (signal.version) {
                    console.log(`     Version: ${signal.version}`);
                }
                if (signal.hint) {
                    console.log(`     💡 ${signal.hint}`);
                }
            }
        });
        
        // Show "No patterns found" only if ALL signals are missing
        const matchingSignals = signals.filter(s => s.match);
        const missingSignals = signals.filter(s => !s.match && s.cms);
        
        if (matchingSignals.length === 0 && missingSignals.length > 0) {
            const missingSummary = missingSignals.map(s => s.signal.split(' ')[0]).join(', ');
            console.log(`   ${matchIcon(false)} No ${missingSummary} patterns found`);
        }
    }
    
    private displaySignalStrengthSummary(...signalGroups: Array<Array<{match: boolean, cms?: string, confidence: 'high'|'medium'|'low'}>>): void {
        console.log(`\n📈 SIGNAL STRENGTH SUMMARY:`);
        
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
            console.log(`   ${cms.padEnd(10)} ${bar.padEnd(20)} ${percentage.toFixed(1)}% (${matchCount}/${totalCount} signals)`);
        });
    }

    private showAdditionalContext(data: any): void {
        console.log(`\n📋 Additional Context:`);
        console.log('─'.repeat(40));
        
        // Generator meta tag
        const generator = data.metaTags?.find((tag: any) => tag.name === 'generator');
        if (generator) {
            console.log(`   Generator: ${generator.content}`);
        }
        
        // Key headers
        const poweredBy = data.httpHeaders?.['x-powered-by'];
        if (poweredBy) {
            console.log(`   Powered By: ${poweredBy}`);
        }
        
        // Script count
        const scriptCount = data.scripts?.length || 0;
        console.log(`   Scripts: ${scriptCount}`);
        
        // Stylesheet count
        const stylesheetCount = data.stylesheets?.length || 0;
        console.log(`   Stylesheets: ${stylesheetCount}`);
        
        // HTML size
        const htmlSize = data.htmlContent?.length || 0;
        console.log(`   HTML Size: ${(htmlSize / 1024).toFixed(1)}KB`);
        
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
                console.log(`   Patterns: ${foundPatterns.map(p => p.name).join(', ')}`);
            }
        }
    }

    private async promptForGroundTruthDecision(url: string, detectedCms: string, confidence: number, detectedVersions: Array<{cms: string, version: string, source: string, confidence?: string}> = [], bestVersion: {cms: string, version: string, source: string, confidence?: string} | null = null): Promise<{shouldContinue: boolean}> {
        console.log(`\n🤔 Add to ground truth?`);
        
        // Use best version if available, otherwise find first matching version
        const suggestedVersion = bestVersion || detectedVersions.find(v => v.cms.toLowerCase() === detectedCms.toLowerCase());
        const versionText = suggestedVersion ? ` ${suggestedVersion.version}` : '';
        
        // Smart interaction based on confidence
        if (confidence >= 0.9) {
            // Auto-accept for very high confidence
            console.log(`   [Enter] ${detectedCms}${versionText}  [c] Correct  [s] Skip  [?] Help`);
            const choice = await this.askQuestion('');
            
            if (choice === '' || choice.toLowerCase() === 'y') {
                await this.addToGroundTruth(url, detectedCms, confidence, '', suggestedVersion?.version);
                console.log(`✅ Auto-accepted: ${detectedCms}${versionText}`);
                return { shouldContinue: true };
            } else if (choice.toLowerCase() === 'c') {
                const result = await this.handleCorrection(url, confidence, detectedVersions);
                return { shouldContinue: result.shouldContinue };
            } else if (choice.toLowerCase() === 's') {
                console.log(`⏭️  Skipped`);
                return { shouldContinue: true };
            } else if (choice === '?') {
                this.showHelp();
                return await this.promptForGroundTruthDecision(url, detectedCms, confidence, detectedVersions);
            }
        } else if (confidence >= 0.7) {
            // One-key decisions for medium confidence
            console.log(`   [Enter] ${detectedCms}${versionText}  [c] Correct  [s] Skip  [?] Help`);
            const choice = await this.askQuestion('');
            
            if (choice === '' || choice.toLowerCase() === 'y') {
                await this.addToGroundTruth(url, detectedCms, confidence, '', suggestedVersion?.version);
                console.log(`✅ Added: ${detectedCms}${versionText}`);
                return { shouldContinue: true };
            } else if (choice.toLowerCase() === 'c') {
                const result = await this.handleCorrection(url, confidence, detectedVersions);
                return { shouldContinue: result.shouldContinue };
            } else if (choice.toLowerCase() === 's') {
                console.log(`⏭️  Skipped`);
                return { shouldContinue: true };
            } else if (choice === '?') {
                this.showHelp();
                return await this.promptForGroundTruthDecision(url, detectedCms, confidence, detectedVersions);
            }
        } else {
            // Explicit choice for low confidence
            console.log(`   [1] WordPress  [2] Drupal  [3] Joomla  [4] Other/Static  [s] Skip`);
            const choice = await this.askQuestion('Classification needed: ');
            
            const cmsMap = { '1': 'WordPress', '2': 'drupal', '3': 'Joomla', '4': 'other' };
            
            if (choice === 's') {
                console.log(`⏭️  Skipped`);
                return { shouldContinue: true };
            } else if (choice in cmsMap) {
                const selectedCms = cmsMap[choice as keyof typeof cmsMap];
                const selectedVersion = detectedVersions.find(v => v.cms.toLowerCase() === selectedCms);
                await this.addToGroundTruth(url, selectedCms, confidence, '', selectedVersion?.version);
                console.log(`✅ Added: ${selectedCms}${selectedVersion ? ` v${selectedVersion.version}` : ''}`);
                return { shouldContinue: true };
            } else {
                console.log('Invalid choice. Please try again.');
                return await this.promptForGroundTruthDecision(url, detectedCms, confidence, detectedVersions);
            }
        }
        
        return { shouldContinue: true };
    }
    
    private async handleCorrection(url: string, confidence: number, detectedVersions: Array<{cms: string, version: string, source: string, confidence?: string}>): Promise<{shouldContinue: boolean}> {
        const actualCms = await this.askQuestion('Actual CMS (WordPress/drupal/Joomla/other): ');
        
        // Suggest detected version if available for the corrected CMS
        const suggestedVersion = detectedVersions.find(v => v.cms.toLowerCase() === actualCms.toLowerCase());
        const versionPrompt = suggestedVersion 
            ? `Version (detected: ${suggestedVersion.version}) or Enter for detected: `
            : 'Version (e.g., 6.1.0) or Enter if unknown: ';
        
        const inputVersion = await this.askQuestion(versionPrompt);
        const version = inputVersion || suggestedVersion?.version;
        const notes = await this.askQuestion('Notes (optional): ');
        
        await this.addToGroundTruth(url, actualCms, confidence, notes, version);
        console.log(`✅ Corrected to: ${actualCms}${version ? ` v${version}` : ''}`);
        
        // Only prompt to continue when user made corrections (they might want to review)
        const continueChoice = await this.askQuestion('Continue to next URL? (y/n): ');
        return { shouldContinue: continueChoice.toLowerCase() !== 'n' };
    }
    
    private showHelp(): void {
        console.log(`\n📖 Help:`);
        console.log(`   Enter    = Accept detection as shown`);
        console.log(`   c        = Correct the CMS type or version`);
        console.log(`   s        = Skip this site (don't add to ground truth)`);
        console.log(`   ?        = Show this help`);
        console.log(`   \nConfidence levels:`);
        console.log(`   90%+     = Auto-suggest (very reliable)`);
        console.log(`   70-90%   = One-key accept (reliable)`);
        console.log(`   <70%     = Manual classification (uncertain)`);
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
                console.warn(`⚠️  Could not extract version info: ${(error as Error).message}`);
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

    private askQuestion(question: string): Promise<string> {
        return new Promise((resolve, reject) => {
            if (this.isShuttingDown || !this.rl) {
                reject(new Error('Application is shutting down'));
                return;
            }
            
            // If input is piped, auto-accept
            if (!process.stdin.isTTY) {
                resolve(''); // Default to empty string (auto-accept)
                return;
            }
            
            // No timeout for user input - let them take their time to review
            this.rl.question(question, (answer) => {
                resolve(answer);
            });
        });
    }

    async cleanup(): Promise<void> {
        this.isShuttingDown = true;
        if (this.rl) {
            try {
                // Remove all listeners first to prevent error events
                this.rl.removeAllListeners();
                
                // Close the readline interface
                this.rl.close();
                
                // Set to null to prevent further use
                this.rl = null as any;
            } catch {
                // Ignore errors during cleanup - this is expected
            }
        }
    }

    async showStats(): Promise<void> {
        if (!fs.existsSync(this.groundTruthPath)) {
            console.log('❌ No ground truth database found');
            return;
        }
        
        const content = fs.readFileSync(this.groundTruthPath, 'utf8');
        const database: GroundTruthDatabase = JSON.parse(content);
        
        console.log(`\n📊 Ground Truth Statistics:`);
        console.log('═'.repeat(50));
        console.log(`   Total Sites: ${database.sites.length}`);
        console.log(`   Last Updated: ${new Date(database.lastUpdated).toLocaleString()}`);
        
        const cmsCounts: { [key: string]: number } = {};
        database.sites.forEach(site => {
            cmsCounts[site.cms] = (cmsCounts[site.cms] || 0) + 1;
        });
        
        console.log(`\n📈 CMS Distribution:`);
        Object.entries(cmsCounts).forEach(([cms, count]) => {
            console.log(`   ${cms.padEnd(12)} ${count} sites`);
        });
        
        // Version distribution
        console.log(`\n🔢 Version Distribution:`);
        const versionCounts: { [key: string]: { [version: string]: number } } = {};
        database.sites.forEach(site => {
            if (site.version) {
                if (!versionCounts[site.cms]) {
                    versionCounts[site.cms] = {};
                }
                versionCounts[site.cms][site.version] = (versionCounts[site.cms][site.version] || 0) + 1;
            }
        });
        
        Object.entries(versionCounts).forEach(([cms, versions]) => {
            console.log(`   ${cms}:`);
            Object.entries(versions).forEach(([version, count]) => {
                console.log(`     v${version}: ${count} sites`);
            });
        });
        
        console.log(`\n📋 Recent Additions:`);
        const recent = database.sites
            .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
            .slice(0, 5);
        
        recent.forEach(site => {
            const date = new Date(site.addedAt).toLocaleDateString();
            const versionText = site.version ? ` v${site.version}` : '';
            console.log(`   ${date} - ${site.url} (${site.cms}${versionText})`);
        });
    }
}

// Command registration
program
    .command('ground-truth')
    .description('Interactive ground truth site discovery and management')
    .argument('[input]', 'URL or CSV file containing URLs to analyze')
    .option('--stats', 'Show ground truth database statistics')
    .option('--batch', 'Process multiple URLs without interactive prompts')
    .option('--compact', 'Show compact output with less detailed analysis')
    .action(async (input: string, options: { stats?: boolean, batch?: boolean, compact?: boolean }) => {
        const discovery = new GroundTruthDiscovery();
        
        // Enable compact mode if requested
        if (options.compact) {
            discovery.setCompactMode(true);
        }
        
        try {
            if (options.stats) {
                await discovery.showStats();
                return;
            }
            
            if (!input) {
                console.log('❌ Please provide a URL or CSV file');
                return;
            }
            
            // Always treat as batch - single URLs become a batch of 1
            const inputType = detectInputType(input);
            let urls: string[] = [];
            
            if (inputType === 'csv') {
                urls = await extractUrlsFromCSV(input);
                console.log(`📋 Loaded ${urls.length} URLs from CSV`);
            } else {
                urls = [input];
            }
            
            if (options.batch) {
                console.log('🔄 Batch processing mode (no interactive prompts)');
                // TODO: Implement batch processing
            }
            
            for (let i = 0; i < urls.length; i++) {
                const url = urls[i];
                try {
                    const result = await discovery.processUrl(url);
                    
                    // If user indicated they don't want to continue, stop processing
                    if (!result.shouldContinue) {
                        console.log(`\n🛑 Stopping at user request`);
                        break;
                    }
                } catch (error) {
                    // Only log error if it's not a shutdown error
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    if (errorMessage !== 'Application is shutting down' && 
                        errorMessage !== 'readline was closed' && 
                        errorMessage !== 'Input timeout') {
                        console.error(`\n❌ Error processing ${url}:`, errorMessage);
                    }
                    break;
                }
            }
            
            // Show completion message
            if (urls.length > 1) {
                console.log(`\n✅ Completed processing ${urls.length} URLs`);
            }
            
        } catch (error) {
            console.error('❌ Error:', (error as Error).message);
        } finally {
            // Clean shutdown sequence
            try {
                await discovery.cleanup();
            } catch {
                // Ignore cleanup errors
            }
            
            // Force exit to prevent hanging
            process.nextTick(() => {
                // Close stdin to prevent readline events
                if (process.stdin.isTTY) {
                    process.stdin.pause();
                    process.stdin.unref();
                }
                
                // Suppress specific readline errors during shutdown
                process.removeAllListeners('uncaughtException');
                process.removeAllListeners('unhandledRejection');
                
                // Add specific error handlers that suppress readline errors
                process.on('uncaughtException', (error) => {
                    if (error.message && error.message.includes('readline was closed')) {
                        return; // Suppress this specific error
                    }
                    console.error('Uncaught exception:', error);
                });
                
                process.on('unhandledRejection', (error) => {
                    if (error && typeof error === 'object' && 'message' in error && 
                        typeof error.message === 'string' && error.message.includes('readline was closed')) {
                        return; // Suppress this specific error
                    }
                    console.error('Unhandled rejection:', error);
                });
                
                // Exit after a short delay to ensure all output is flushed
                setTimeout(() => {
                    process.exit(0);
                }, 100);
            });
        }
    });