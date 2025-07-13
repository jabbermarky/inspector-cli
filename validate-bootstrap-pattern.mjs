#!/usr/bin/env node

/**
 * Bootstrap Pattern Validation Analysis
 * Tests the "Bootstrap framework detected" pattern against known CMS sites
 * to determine if it's truly Joomla-specific or causes false positives
 */

import fs from 'fs';
import path from 'path';
import { evaluateFeature } from './dist/ground-truth/evaluate-feature.js';

class BootstrapPatternValidator {
    constructor() {
        this.allSites = [];
        this.bootstrapFeature = {
            feature: 'hasBootstrap',
            description: 'Bootstrap framework detected',
            cms: 'Joomla',
            confidence: 0.8,
            type: 'html'
        };
        this.results = {
            wordpress: { total: 0, bootstrapDetected: 0, sites: [] },
            drupal: { total: 0, bootstrapDetected: 0, sites: [] },
            joomla: { total: 0, bootstrapDetected: 0, sites: [] },
            unknown: { total: 0, bootstrapDetected: 0, sites: [] }
        };
    }

    async run() {
        console.log('🧪 Bootstrap Pattern Validation Analysis');
        console.log('========================================\n');

        try {
            await this.loadAllSites();
            await this.testBootstrapPattern();
            await this.analyzeResults();
            await this.generateReport();
            
        } catch (error) {
            console.error('❌ Error:', error.message);
            console.error(error.stack);
            process.exit(1);
        }
    }

    async loadAllSites() {
        console.log('📊 Phase 1: Loading all sites from production data...\n');
        
        const dataDir = './data/cms-analysis';
        const indexPath = path.join(dataDir, 'index.json');
        
        if (!fs.existsSync(indexPath)) {
            throw new Error('Production data index not found');
        }
        
        const indexContent = fs.readFileSync(indexPath, 'utf8');
        const indexData = JSON.parse(indexContent);
        const indexArray = Array.isArray(indexData) ? indexData : indexData.files;
        
        console.log(`📈 Loading sample from ${indexArray.length} total sites...`);
        
        // Take a reasonable sample for validation
        const sampleSize = Math.min(300, indexArray.length);
        const sampleData = this.shuffleArray(indexArray).slice(0, sampleSize);
        
        let loaded = 0;
        for (const entry of sampleData) {
            const filePath = path.join(dataDir, entry.filePath);
            if (fs.existsSync(filePath)) {
                try {
                    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    
                    const cms = entry.cms ? entry.cms.toLowerCase() : 'unknown';
                    this.allSites.push({
                        url: entry.url,
                        cms: cms,
                        confidence: entry.confidence || 0,
                        data: data
                    });
                    loaded++;
                } catch (error) {
                    console.warn(`⚠️  Failed to load ${entry.url}: ${error.message}`);
                }
            }
        }
        
        console.log(`✅ Loaded ${loaded} sites for Bootstrap pattern validation`);
        
        // Show distribution
        const distribution = {};
        this.allSites.forEach(site => {
            distribution[site.cms] = (distribution[site.cms] || 0) + 1;
        });
        
        console.log('\n📊 Sample Distribution:');
        Object.entries(distribution).forEach(([cms, count]) => {
            console.log(`  ${cms}: ${count} sites`);
        });
        console.log();
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    async testBootstrapPattern() {
        console.log('🔍 Phase 2: Testing Bootstrap pattern against all CMS types...\n');
        
        this.allSites.forEach((site, index) => {
            const cms = site.cms;
            
            // Initialize CMS category if not exists
            if (!this.results[cms]) {
                this.results[cms] = { total: 0, bootstrapDetected: 0, sites: [] };
            }
            
            this.results[cms].total++;
            
            // Test Bootstrap pattern
            const hasBootstrap = this.testBootstrapDetection(site.data);
            
            if (hasBootstrap) {
                this.results[cms].bootstrapDetected++;
                this.results[cms].sites.push({
                    url: site.url,
                    confidence: site.confidence,
                    bootstrapEvidence: this.getBootstrapEvidence(site.data)
                });
            }
            
            // Progress indicator
            if ((index + 1) % 50 === 0) {
                console.log(`  Processed ${index + 1}/${this.allSites.length} sites...`);
            }
        });
        
        console.log(`✅ Bootstrap pattern testing complete for ${this.allSites.length} sites\n`);
    }

    testBootstrapDetection(data) {
        // This replicates the actual Bootstrap detection logic from evaluate-feature.js
        if (!data.htmlContent) return false;
        
        const htmlContent = data.htmlContent.toLowerCase();
        
        // Check for Bootstrap patterns
        const bootstrapPatterns = [
            'bootstrap',
            'class="[^"]*\\bcol-',
            'class="[^"]*\\brow\\b',
            'class="[^"]*\\bcontainer',
            'class="[^"]*\\bbtn\\b',
            'bootstrap\\.min\\.css',
            'bootstrap\\.css',
            '/bootstrap/',
            'data-bs-',
            'data-toggle'
        ];
        
        return bootstrapPatterns.some(pattern => {
            const regex = new RegExp(pattern, 'i');
            return regex.test(htmlContent);
        });
    }

    getBootstrapEvidence(data) {
        if (!data.htmlContent) return [];
        
        const evidence = [];
        const htmlContent = data.htmlContent.toLowerCase();
        
        // Collect specific evidence
        if (htmlContent.includes('bootstrap')) evidence.push('bootstrap keyword');
        if (/class="[^"]*\bcol-/.test(htmlContent)) evidence.push('Bootstrap grid classes');
        if (/class="[^"]*\bcontainer/.test(htmlContent)) evidence.push('Bootstrap container');
        if (/class="[^"]*\bbtn\b/.test(htmlContent)) evidence.push('Bootstrap button classes');
        if (/bootstrap\.min\.css/.test(htmlContent)) evidence.push('Bootstrap CSS file');
        if (/data-bs-/.test(htmlContent)) evidence.push('Bootstrap 5 data attributes');
        if (/data-toggle/.test(htmlContent)) evidence.push('Bootstrap data-toggle');
        
        return evidence;
    }

    async analyzeResults() {
        console.log('📈 Phase 3: Analyzing Bootstrap pattern false positive rate...\n');
        
        console.log('📊 Bootstrap Detection by CMS Type:');
        console.log();
        console.log('| CMS | Total Sites | Bootstrap Detected | False Positive Rate |');
        console.log('|-----|-------------|--------------------|--------------------|');
        
        Object.entries(this.results).forEach(([cms, result]) => {
            if (result.total > 0) {
                const rate = ((result.bootstrapDetected / result.total) * 100).toFixed(1);
                const isFalsePositive = cms !== 'joomla' && result.bootstrapDetected > 0;
                const fpMarker = isFalsePositive ? ' ⚠️' : '';
                console.log(`| ${cms.toUpperCase()}${fpMarker} | ${result.total} | ${result.bootstrapDetected} | ${rate}% |`);
            }
        });
        
        console.log();
    }

    async generateReport() {
        console.log('📋 Phase 4: Generating validation report...\n');
        
        console.log('## Bootstrap Pattern Validation Results\n');
        
        // Calculate false positive rate
        let totalNonJoomla = 0;
        let falsePositives = 0;
        
        Object.entries(this.results).forEach(([cms, result]) => {
            if (cms !== 'joomla') {
                totalNonJoomla += result.total;
                falsePositives += result.bootstrapDetected;
            }
        });
        
        const falsePositiveRate = totalNonJoomla > 0 ? (falsePositives / totalNonJoomla) * 100 : 0;
        
        console.log(`**False Positive Analysis:**`);
        console.log(`- Non-Joomla sites tested: ${totalNonJoomla}`);
        console.log(`- False positives detected: ${falsePositives}`);
        console.log(`- False positive rate: ${falsePositiveRate.toFixed(1)}%`);
        console.log();
        
        // Joomla detection rate
        const joomlaResult = this.results.joomla;
        if (joomlaResult && joomlaResult.total > 0) {
            const joomlaDetectionRate = (joomlaResult.bootstrapDetected / joomlaResult.total) * 100;
            console.log(`**Joomla Detection Rate:**`);
            console.log(`- Joomla sites tested: ${joomlaResult.total}`);
            console.log(`- Bootstrap detected: ${joomlaResult.bootstrapDetected}`);
            console.log(`- Detection rate: ${joomlaDetectionRate.toFixed(1)}%`);
            console.log();
        }
        
        // Detailed false positive examples
        console.log(`**False Positive Examples:**`);
        console.log();
        
        Object.entries(this.results).forEach(([cms, result]) => {
            if (cms !== 'joomla' && result.sites.length > 0) {
                console.log(`### ${cms.toUpperCase()} Sites with Bootstrap Detection:`);
                console.log();
                
                result.sites.slice(0, 5).forEach(site => {
                    console.log(`**${site.url}**`);
                    console.log(`- Evidence: ${site.bootstrapEvidence.join(', ')}`);
                    console.log();
                });
                
                if (result.sites.length > 5) {
                    console.log(`... and ${result.sites.length - 5} more ${cms} sites`);
                    console.log();
                }
            }
        });
        
        // Recommendations
        console.log(`**Validation Conclusion:**`);
        console.log();
        
        if (falsePositiveRate > 10) {
            console.log(`❌ **INVALID PATTERN**: Bootstrap detection has ${falsePositiveRate.toFixed(1)}% false positive rate`);
            console.log(`   - This pattern is NOT suitable for Joomla detection`);
            console.log(`   - Bootstrap is widely used across many frameworks and CMS platforms`);
            console.log(`   - Remove this discriminator to avoid false positives`);
        } else if (falsePositiveRate > 5) {
            console.log(`⚠️ **QUESTIONABLE PATTERN**: Bootstrap detection has ${falsePositiveRate.toFixed(1)}% false positive rate`);
            console.log(`   - Consider increasing confidence threshold or adding additional constraints`);
            console.log(`   - Monitor for false positives in production`);
        } else {
            console.log(`✅ **VALID PATTERN**: Bootstrap detection has acceptable ${falsePositiveRate.toFixed(1)}% false positive rate`);
            if (joomlaResult && joomlaResult.total > 0) {
                const joomlaRate = (joomlaResult.bootstrapDetected / joomlaResult.total) * 100;
                console.log(`   - Detects ${joomlaRate.toFixed(1)}% of Joomla sites`);
            }
        }
        
        // Specific recommendations
        console.log();
        console.log(`**Recommendations:**`);
        
        if (falsePositiveRate > 5) {
            console.log(`1. **Remove Bootstrap discriminator** from Joomla detection`);
            console.log(`2. **Focus on Joomla-specific patterns** like joomla-script-options, /templates/, /media/jui/`);
            console.log(`3. **Use more specific Bootstrap + Joomla combinations** if needed`);
        } else {
            console.log(`1. **Bootstrap pattern acceptable** for Joomla detection`);
            console.log(`2. **Monitor false positive rate** in production`);
            console.log(`3. **Consider lowering confidence score** to reflect uncertainty`);
        }
        
        // Save detailed report
        const timestamp = new Date().toISOString().split('T')[0];
        const reportPath = `./reports/bootstrap-pattern-validation-${timestamp}.json`;
        
        const detailedReport = {
            timestamp: new Date().toISOString(),
            summary: {
                totalSitesTested: this.allSites.length,
                falsePositiveRate: falsePositiveRate,
                totalFalsePositives: falsePositives,
                totalNonJoomla: totalNonJoomla
            },
            results: this.results,
            conclusion: falsePositiveRate > 10 ? 'INVALID' : falsePositiveRate > 5 ? 'QUESTIONABLE' : 'VALID'
        };
        
        fs.writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
        console.log(`\n📄 Detailed validation report saved to: ${reportPath}`);
    }
}

// Run the validator
const validator = new BootstrapPatternValidator();
validator.run().catch(console.error);