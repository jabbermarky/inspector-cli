#!/usr/bin/env node

/**
 * Unknown Sites Analysis
 * Analyzes sites marked as 'unknown' CMS to see if we missed WordPress/other CMS
 * due to insufficient detection patterns
 */

import fs from 'fs';
import path from 'path';

class UnknownSitesAnalyzer {
    constructor() {
        this.unknownSites = [];
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
                name: 'Gutenberg CSS classes',
                pattern: 'wp-block-',
                type: 'html-content',
                confidence: 0.85
            },
            {
                name: 'WordPress color classes',
                pattern: 'has-.*-color',
                type: 'html-content',
                confidence: 0.85
            },
            {
                name: 'WordPress alignment classes',
                pattern: 'align(wide|full|center)',
                type: 'html-content',
                confidence: 0.85
            },
            {
                name: 'WordPress body classes',
                pattern: 'class=".*wp-',
                type: 'html-content',
                confidence: 0.80
            },
            {
                name: 'WordPress REST API v2',
                pattern: '/wp-json/wp/v2/',
                type: 'html-content',
                confidence: 0.85
            },
            {
                name: 'WordPress generator meta',
                pattern: 'WordPress',
                type: 'meta-generator',
                confidence: 0.95
            }
        ];
        this.results = {
            totalUnknown: 0,
            potentialWordPress: [],
            patternMatches: {}
        };
    }

    async run() {
        console.log('🔍 Unknown Sites Analysis');
        console.log('=========================\n');

        try {
            await this.loadUnknownSites();
            await this.analyzeWithProposedPatterns();
            await this.generateReport();
            
        } catch (error) {
            console.error('❌ Error:', error.message);
            console.error(error.stack);
            process.exit(1);
        }
    }

    async loadUnknownSites() {
        console.log('📊 Phase 1: Loading unknown sites from production data...\n');
        
        const dataDir = './data/cms-analysis';
        const indexPath = path.join(dataDir, 'index.json');
        
        if (!fs.existsSync(indexPath)) {
            throw new Error('Production data index not found');
        }
        
        const indexContent = fs.readFileSync(indexPath, 'utf8');
        const indexData = JSON.parse(indexContent);
        const indexArray = Array.isArray(indexData) ? indexData : indexData.files;
        
        // Filter for unknown CMS sites
        const unknownEntries = indexArray.filter(entry => 
            !entry.cms || entry.cms.toLowerCase() === 'unknown'
        );
        
        console.log(`📈 Found ${unknownEntries.length} sites marked as unknown CMS`);
        console.log(`📈 Loading data for analysis...`);
        
        let loaded = 0;
        for (const entry of unknownEntries) {
            const filePath = path.join(dataDir, entry.filePath);
            if (fs.existsSync(filePath)) {
                try {
                    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    this.unknownSites.push({
                        url: entry.url,
                        data: data
                    });
                    loaded++;
                } catch (error) {
                    console.warn(`⚠️  Failed to load ${entry.url}: ${error.message}`);
                }
            }
        }
        
        console.log(`✅ Loaded ${loaded} unknown sites for analysis`);
        this.results.totalUnknown = loaded;
        console.log();
    }

    async analyzeWithProposedPatterns() {
        console.log('🧪 Phase 2: Testing proposed WordPress patterns...\n');
        
        // Initialize pattern tracking
        this.proposedWordPressPatterns.forEach(pattern => {
            this.results.patternMatches[pattern.name] = {
                pattern: pattern,
                matches: [],
                count: 0
            };
        });
        
        // Test each unknown site
        this.unknownSites.forEach((site, index) => {
            const matchedPatterns = this.testSiteAgainstPatterns(site);
            
            if (matchedPatterns.length > 0) {
                this.results.potentialWordPress.push({
                    url: site.url,
                    matchedPatterns: matchedPatterns,
                    confidence: this.calculateConfidence(matchedPatterns)
                });
            }
            
            // Progress indicator
            if ((index + 1) % 20 === 0) {
                console.log(`  Processed ${index + 1}/${this.unknownSites.length} unknown sites...`);
            }
        });
        
        console.log(`✅ Analysis complete for ${this.unknownSites.length} unknown sites\n`);
    }

    testSiteAgainstPatterns(site) {
        const matchedPatterns = [];
        
        this.proposedWordPressPatterns.forEach(pattern => {
            let matches = false;
            
            switch (pattern.type) {
                case 'script-src':
                    matches = this.testScriptSrcPattern(pattern, site.data);
                    break;
                case 'html-content':
                    matches = this.testHtmlContentPattern(pattern, site.data);
                    break;
                case 'meta-generator':
                    matches = this.testMetaGeneratorPattern(pattern, site.data);
                    break;
            }
            
            if (matches) {
                matchedPatterns.push(pattern);
                this.results.patternMatches[pattern.name].matches.push(site.url);
                this.results.patternMatches[pattern.name].count++;
            }
        });
        
        return matchedPatterns;
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

    calculateConfidence(matchedPatterns) {
        if (matchedPatterns.length === 0) return 0;
        
        // Sum confidence scores, but cap at 1.0
        const totalConfidence = matchedPatterns.reduce((sum, pattern) => sum + pattern.confidence, 0);
        return Math.min(totalConfidence, 1.0);
    }

    async generateReport() {
        console.log('📋 Phase 3: Generating analysis report...\n');
        
        console.log('## Unknown Sites Analysis Results\n');
        
        // Overall summary
        console.log(`**Summary:**`);
        console.log(`- Total unknown sites analyzed: ${this.results.totalUnknown}`);
        console.log(`- Potential WordPress sites found: ${this.results.potentialWordPress.length}`);
        console.log(`- Potential recall improvement: ${((this.results.potentialWordPress.length / this.results.totalUnknown) * 100).toFixed(1)}%`);
        console.log();
        
        // Pattern effectiveness
        console.log(`**Pattern Effectiveness:**`);
        console.log();
        console.log('| Pattern | Matches | % of Unknown Sites |');
        console.log('|---------|---------|-------------------|');
        
        Object.entries(this.results.patternMatches)
            .sort((a, b) => b[1].count - a[1].count)
            .forEach(([patternName, result]) => {
                const percentage = ((result.count / this.results.totalUnknown) * 100).toFixed(1);
                console.log(`| ${patternName} | ${result.count} | ${percentage}% |`);
            });
        
        console.log();
        
        // High-confidence potential WordPress sites
        const highConfidenceSites = this.results.potentialWordPress
            .filter(site => site.confidence >= 0.8)
            .sort((a, b) => b.confidence - a.confidence);
        
        console.log(`**High-Confidence WordPress Sites** (confidence >= 80%):`);
        console.log();
        
        if (highConfidenceSites.length > 0) {
            console.log('| URL | Confidence | Matched Patterns |');
            console.log('|-----|------------|------------------|');
            
            highConfidenceSites.slice(0, 10).forEach(site => {
                const patterns = site.matchedPatterns.map(p => p.name).join(', ');
                console.log(`| ${site.url} | ${(site.confidence * 100).toFixed(0)}% | ${patterns} |`);
            });
            
            if (highConfidenceSites.length > 10) {
                console.log(`| ... | ... | ${highConfidenceSites.length - 10} more sites |`);
            }
        } else {
            console.log('No high-confidence WordPress sites found.');
        }
        
        console.log();
        
        // Medium-confidence sites summary
        const mediumConfidenceSites = this.results.potentialWordPress
            .filter(site => site.confidence >= 0.6 && site.confidence < 0.8);
        
        console.log(`**Medium-Confidence WordPress Sites** (60-79% confidence): ${mediumConfidenceSites.length} sites`);
        console.log();
        
        // Recommendations
        console.log(`**Recommendations:**`);
        
        const topPatterns = Object.entries(this.results.patternMatches)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 3);
        
        if (topPatterns.length > 0) {
            console.log(`1. **Most Effective Patterns**: Implement these first for maximum recall improvement`);
            topPatterns.forEach(([patternName, result]) => {
                console.log(`   - ${patternName}: ${result.count} potential matches`);
            });
            console.log();
        }
        
        if (this.results.potentialWordPress.length > 0) {
            console.log(`2. **Potential Recall Gain**: Adding these patterns could identify ${this.results.potentialWordPress.length} additional WordPress sites`);
            console.log(`3. **Testing Needed**: Validate these patterns against known WordPress sites to ensure no false positives`);
        } else {
            console.log(`2. **No WordPress Sites Found**: Current patterns may be sufficient, or unknown sites are truly non-WordPress`);
        }
        
        // Save detailed report
        const timestamp = new Date().toISOString().split('T')[0];
        const reportPath = `./reports/unknown-sites-analysis-${timestamp}.json`;
        
        const detailedReport = {
            timestamp: new Date().toISOString(),
            summary: {
                totalUnknown: this.results.totalUnknown,
                potentialWordPress: this.results.potentialWordPress.length,
                potentialRecallImprovement: (this.results.potentialWordPress.length / this.results.totalUnknown) * 100
            },
            patternMatches: this.results.patternMatches,
            potentialWordPressSites: this.results.potentialWordPress
        };
        
        fs.writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
        console.log(`📄 Detailed report saved to: ${reportPath}`);
    }
}

// Run the analyzer
const analyzer = new UnknownSitesAnalyzer();
analyzer.run().catch(console.error);