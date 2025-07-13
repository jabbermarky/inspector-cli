#!/usr/bin/env node

/**
 * Known WordPress Sites Analysis
 * Tests proposed WordPress patterns against confirmed WordPress sites
 * to measure genuine recall improvement potential
 */

import fs from 'fs';
import path from 'path';

class KnownWordPressSitesAnalyzer {
    constructor() {
        this.wordpressSites = [];
        this.currentWordPressPatterns = [
            {
                name: 'wp-content scripts (current)',
                pattern: '/wp-content/',
                type: 'script-src',
                confidence: 0.9
            },
            {
                name: 'wp-content HTML (current)',
                pattern: 'wp-content',
                type: 'html-content',
                confidence: 0.9
            },
            {
                name: 'wp-json API (current)',
                pattern: 'wp-json',
                type: 'html-content',
                confidence: 0.8
            }
        ];
        this.proposedWordPressPatterns = [
            {
                name: 'wp-content/themes/',
                pattern: '/wp-content/themes/',
                type: 'script-src',
                confidence: 0.95
            },
            {
                name: 'wp-content/uploads/',
                pattern: '/wp-content/uploads/',
                type: 'script-src',
                confidence: 0.90
            },
            {
                name: 'wp-content/plugins/',
                pattern: '/wp-content/plugins/',
                type: 'script-src',
                confidence: 0.90
            },
            {
                name: 'wp-block- CSS classes (Gutenberg)',
                pattern: 'class="[^"]*wp-block-',
                type: 'html-content',
                confidence: 0.85
            },
            {
                name: 'has-*-color CSS classes (specific)',
                pattern: 'class="[^"]*has-[a-z-]+-color',
                type: 'html-content',
                confidence: 0.70
            },
            {
                name: 'alignwide/alignfull classes',
                pattern: 'class="[^"]*align(wide|full)',
                type: 'html-content',
                confidence: 0.85
            },
            {
                name: 'wp-caption classes',
                pattern: 'class="[^"]*wp-caption',
                type: 'html-content',
                confidence: 0.90
            },
            {
                name: 'wp-image-* classes',
                pattern: 'class="[^"]*wp-image-\\d+',
                type: 'html-content',
                confidence: 0.90
            },
            {
                name: 'WordPress body classes',
                pattern: '<body[^>]*class="[^"]*\\b(wordpress|wp-)',
                type: 'html-content',
                confidence: 0.80
            },
            {
                name: 'wp-json/wp/v2/ API',
                pattern: '/wp-json/wp/v2/',
                type: 'html-content',
                confidence: 0.85
            },
            {
                name: 'wp-json/oembed/ API',
                pattern: '/wp-json/oembed/',
                type: 'html-content',
                confidence: 0.85
            },
            {
                name: 'WordPress generator meta',
                pattern: 'WordPress',
                type: 'meta-generator',
                confidence: 0.95
            },
            {
                name: 'wp-admin references',
                pattern: '/wp-admin/',
                type: 'html-content',
                confidence: 0.99
            },
            {
                name: 'wp-login.php references',
                pattern: '/wp-login.php',
                type: 'html-content',
                confidence: 0.99
            }
        ];
        this.results = {
            totalWordPress: 0,
            currentDetection: {
                detected: 0,
                missed: []
            },
            proposedPatterns: {},
            combinedResults: {
                currentOnly: 0,
                withProposed: 0,
                additionalFound: []
            }
        };
    }

    async run() {
        console.log('🧪 Known WordPress Sites Analysis');
        console.log('=================================\n');

        try {
            await this.loadWordPressSites();
            await this.testCurrentPatterns();
            await this.testProposedPatterns();
            await this.analyzeCombinedEffectiveness();
            await this.generateReport();
            
        } catch (error) {
            console.error('❌ Error:', error.message);
            console.error(error.stack);
            process.exit(1);
        }
    }

    async loadWordPressSites() {
        console.log('📊 Phase 1: Loading known WordPress sites...\n');
        
        const dataDir = './data/cms-analysis';
        const indexPath = path.join(dataDir, 'index.json');
        
        if (!fs.existsSync(indexPath)) {
            throw new Error('Production data index not found');
        }
        
        const indexContent = fs.readFileSync(indexPath, 'utf8');
        const indexData = JSON.parse(indexContent);
        const indexArray = Array.isArray(indexData) ? indexData : indexData.files;
        
        // Filter for confirmed WordPress sites
        const wordpressEntries = indexArray.filter(entry => 
            entry.cms && entry.cms.toLowerCase() === 'wordpress'
        );
        
        console.log(`📈 Found ${wordpressEntries.length} confirmed WordPress sites`);
        console.log(`📈 Loading data for analysis...`);
        
        let loaded = 0;
        for (const entry of wordpressEntries) {
            const filePath = path.join(dataDir, entry.filePath);
            if (fs.existsSync(filePath)) {
                try {
                    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    this.wordpressSites.push({
                        url: entry.url,
                        confidence: entry.confidence || 0,
                        data: data
                    });
                    loaded++;
                } catch (error) {
                    console.warn(`⚠️  Failed to load ${entry.url}: ${error.message}`);
                }
            }
        }
        
        console.log(`✅ Loaded ${loaded} WordPress sites for analysis`);
        this.results.totalWordPress = loaded;
        console.log();
    }

    async testCurrentPatterns() {
        console.log('🔍 Phase 2: Testing current WordPress detection patterns...\n');
        
        let detected = 0;
        const missed = [];
        
        this.wordpressSites.forEach(site => {
            const isDetected = this.currentWordPressPatterns.some(pattern => 
                this.testPattern(pattern, site.data)
            );
            
            if (isDetected) {
                detected++;
            } else {
                missed.push({
                    url: site.url,
                    confidence: site.confidence
                });
            }
        });
        
        this.results.currentDetection.detected = detected;
        this.results.currentDetection.missed = missed;
        
        const currentRecall = (detected / this.results.totalWordPress) * 100;
        console.log(`📊 Current WordPress Detection Performance:`);
        console.log(`   Detected: ${detected}/${this.results.totalWordPress} (${currentRecall.toFixed(1)}% recall)`);
        console.log(`   Missed: ${missed.length} sites`);
        
        if (missed.length > 0) {
            console.log(`\n🔍 Sites missed by current detection (showing first 10):`);
            missed.slice(0, 10).forEach(site => {
                console.log(`   - ${site.url} (confidence: ${site.confidence})`);
            });
            if (missed.length > 10) {
                console.log(`   ... and ${missed.length - 10} more`);
            }
        }
        console.log();
    }

    async testProposedPatterns() {
        console.log('🧪 Phase 3: Testing proposed WordPress patterns individually...\n');
        
        // Initialize tracking for each proposed pattern
        this.proposedWordPressPatterns.forEach(pattern => {
            this.results.proposedPatterns[pattern.name] = {
                pattern: pattern,
                matches: [],
                missedSiteMatches: [],
                totalMatches: 0,
                recallImprovement: 0
            };
        });
        
        // Test each pattern against all WordPress sites
        this.proposedWordPressPatterns.forEach(pattern => {
            const result = this.results.proposedPatterns[pattern.name];
            
            this.wordpressSites.forEach(site => {
                const matches = this.testPattern(pattern, site.data);
                
                if (matches) {
                    result.matches.push(site.url);
                    result.totalMatches++;
                    
                    // Check if this site was missed by current detection
                    const wasMissed = this.results.currentDetection.missed.some(missed => missed.url === site.url);
                    if (wasMissed) {
                        result.missedSiteMatches.push(site.url);
                    }
                }
            });
            
            // Calculate recall improvement
            const baselineRecall = this.results.currentDetection.detected;
            const newTotal = baselineRecall + result.missedSiteMatches.length;
            const newRecall = (newTotal / this.results.totalWordPress) * 100;
            const currentRecall = (baselineRecall / this.results.totalWordPress) * 100;
            result.recallImprovement = newRecall - currentRecall;
        });
        
        console.log(`📊 Individual Pattern Performance:`);
        console.log();
        console.log('| Pattern | Total Matches | Missed Sites Found | Recall Improvement |');
        console.log('|---------|---------------|--------------------|--------------------|');
        
        Object.entries(this.results.proposedPatterns)
            .sort((a, b) => b[1].recallImprovement - a[1].recallImprovement)
            .forEach(([patternName, result]) => {
                const totalMatches = result.totalMatches;
                const missedFound = result.missedSiteMatches.length;
                const improvement = result.recallImprovement.toFixed(1);
                console.log(`| ${patternName.substring(0, 30)}... | ${totalMatches} | ${missedFound} | +${improvement}% |`);
            });
        
        console.log();
    }

    async analyzeCombinedEffectiveness() {
        console.log('🎯 Phase 4: Analyzing combined pattern effectiveness...\n');
        
        // Test current patterns only
        let currentOnlyDetected = 0;
        this.wordpressSites.forEach(site => {
            const isDetected = this.currentWordPressPatterns.some(pattern => 
                this.testPattern(pattern, site.data)
            );
            if (isDetected) currentOnlyDetected++;
        });
        
        // Test with all patterns combined
        let combinedDetected = 0;
        const additionalFound = [];
        
        this.wordpressSites.forEach(site => {
            const detectedByCurrent = this.currentWordPressPatterns.some(pattern => 
                this.testPattern(pattern, site.data)
            );
            
            const detectedByProposed = this.proposedWordPressPatterns.some(pattern => 
                this.testPattern(pattern, site.data)
            );
            
            if (detectedByCurrent || detectedByProposed) {
                combinedDetected++;
                
                if (!detectedByCurrent && detectedByProposed) {
                    additionalFound.push({
                        url: site.url,
                        patterns: this.proposedWordPressPatterns
                            .filter(pattern => this.testPattern(pattern, site.data))
                            .map(pattern => pattern.name)
                    });
                }
            }
        });
        
        this.results.combinedResults.currentOnly = currentOnlyDetected;
        this.results.combinedResults.withProposed = combinedDetected;
        this.results.combinedResults.additionalFound = additionalFound;
        
        const currentRecall = (currentOnlyDetected / this.results.totalWordPress) * 100;
        const combinedRecall = (combinedDetected / this.results.totalWordPress) * 100;
        const improvement = combinedRecall - currentRecall;
        
        console.log(`📈 Combined Pattern Effectiveness:`);
        console.log(`   Current patterns only: ${currentOnlyDetected}/${this.results.totalWordPress} (${currentRecall.toFixed(1)}% recall)`);
        console.log(`   With proposed patterns: ${combinedDetected}/${this.results.totalWordPress} (${combinedRecall.toFixed(1)}% recall)`);
        console.log(`   Improvement: +${improvement.toFixed(1)} percentage points`);
        console.log(`   Additional sites found: ${additionalFound.length}`);
        console.log();
    }

    testPattern(pattern, data) {
        switch (pattern.type) {
            case 'script-src':
                return this.testScriptSrcPattern(pattern, data);
            case 'html-content':
                return this.testHtmlContentPattern(pattern, data);
            case 'meta-generator':
                return this.testMetaGeneratorPattern(pattern, data);
            default:
                return false;
        }
    }

    testScriptSrcPattern(pattern, data) {
        if (!data.scripts || !Array.isArray(data.scripts)) return false;
        
        return data.scripts.some(script => {
            return script.src && script.src.toLowerCase().includes(pattern.pattern.toLowerCase());
        });
    }

    testHtmlContentPattern(pattern, data) {
        if (!data.htmlContent) return false;
        
        const regex = new RegExp(pattern.pattern, 'i');
        return regex.test(data.htmlContent);
    }

    testMetaGeneratorPattern(pattern, data) {
        if (!data.metaTags || !Array.isArray(data.metaTags)) return false;
        
        return data.metaTags.some(tag => {
            return tag.name && tag.name.toLowerCase() === 'generator' &&
                   tag.content && tag.content.toLowerCase().includes(pattern.pattern.toLowerCase());
        });
    }

    async generateReport() {
        console.log('📋 Phase 5: Generating recommendations...\n');
        
        console.log('## WordPress Pattern Analysis Results\n');
        
        // Top performing patterns
        const topPatterns = Object.entries(this.results.proposedPatterns)
            .filter(([_, result]) => result.recallImprovement > 0)
            .sort((a, b) => b[1].recallImprovement - a[1].recallImprovement)
            .slice(0, 5);
        
        console.log(`**🎯 Top 5 Most Effective Patterns:**`);
        topPatterns.forEach(([patternName, result], index) => {
            console.log(`${index + 1}. **${patternName}**: +${result.recallImprovement.toFixed(1)}% recall (${result.missedSiteMatches.length} additional sites)`);
        });
        console.log();
        
        // Zero-improvement patterns (potential false positive risks)
        const zeroImprovementPatterns = Object.entries(this.results.proposedPatterns)
            .filter(([_, result]) => result.recallImprovement === 0)
            .map(([patternName, _]) => patternName);
        
        if (zeroImprovementPatterns.length > 0) {
            console.log(`**⚠️ Patterns with No Recall Improvement:**`);
            zeroImprovementPatterns.forEach(patternName => {
                console.log(`- ${patternName}`);
            });
            console.log(`*These patterns don't help with known WordPress sites and may cause false positives.*`);
            console.log();
        }
        
        // Implementation recommendations
        console.log(`**📝 Implementation Recommendations:**`);
        console.log();
        
        if (topPatterns.length > 0) {
            console.log(`1. **Implement High-Impact Patterns**: Start with top 3 patterns for immediate ${topPatterns.slice(0, 3).reduce((sum, [_, result]) => sum + result.recallImprovement, 0).toFixed(1)}% recall improvement`);
            
            console.log(`2. **Safe Patterns** (likely WordPress-specific):`);
            topPatterns.forEach(([patternName, result]) => {
                if (patternName.includes('wp-') || patternName.includes('WordPress')) {
                    console.log(`   - ${patternName}`);
                }
            });
            
            console.log(`3. **Caution Patterns** (may cause false positives):`);
            topPatterns.forEach(([patternName, result]) => {
                if (patternName.includes('color') || patternName.includes('align') || patternName.includes('has-')) {
                    console.log(`   - ${patternName} (validate against non-WordPress sites)`);
                }
            });
        }
        
        console.log(`4. **Current Detection Status**: ${this.results.currentDetection.detected}/${this.results.totalWordPress} WordPress sites detected (${((this.results.currentDetection.detected / this.results.totalWordPress) * 100).toFixed(1)}% recall)`);
        
        if (this.results.combinedResults.additionalFound.length > 0) {
            console.log(`5. **Potential Gain**: Could detect ${this.results.combinedResults.additionalFound.length} additional WordPress sites`);
        }
        
        // Save detailed report
        const timestamp = new Date().toISOString().split('T')[0];
        const reportPath = `./reports/wordpress-pattern-analysis-${timestamp}.json`;
        
        const detailedReport = {
            timestamp: new Date().toISOString(),
            summary: {
                totalWordPressSites: this.results.totalWordPress,
                currentRecall: (this.results.currentDetection.detected / this.results.totalWordPress) * 100,
                potentialRecall: (this.results.combinedResults.withProposed / this.results.totalWordPress) * 100,
                additionalSitesFound: this.results.combinedResults.additionalFound.length
            },
            currentDetection: this.results.currentDetection,
            proposedPatterns: this.results.proposedPatterns,
            combinedResults: this.results.combinedResults
        };
        
        fs.writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    }
}

// Run the analyzer
const analyzer = new KnownWordPressSitesAnalyzer();
analyzer.run().catch(console.error);