#!/usr/bin/env node

/**
 * Comprehensive Discriminator Validation Analysis
 * Tests all 18 discriminative features against known CMS sites to identify
 * patterns that cause false positives, especially generic patterns like
 * /templates/, /media/, etc.
 */

import fs from 'fs';
import path from 'path';
import { loadDiscriminativeFeatures } from './dist/ground-truth/discriminative-features.js';
import { evaluateFeature } from './dist/ground-truth/evaluate-feature.js';

class AllDiscriminatorsValidator {
    constructor() {
        this.allSites = [];
        this.discriminativeFeatures = [];
        this.results = {};
        this.suspiciousPatterns = [
            'hasTemplatesDirectory',    // /templates/ - could be any framework
            'hasMediaDirectory',        // /media/ - generic media directory
            'hasBootstrap',             // Bootstrap - already proven problematic
            'hasGeneratorMeta',         // Generator meta - very generic
            'hasSitesDirectory',        // /sites/ - could be other systems
            'hasModulesDirectory'       // /modules/ - could be other systems
        ];
    }

    async run() {
        console.log('🧪 Comprehensive Discriminator Validation Analysis');
        console.log('==================================================\n');

        try {
            await this.loadDiscriminativeFeatures();
            await this.loadAllSites();
            await this.validateAllDiscriminators();
            await this.analyzeResults();
            await this.generateReport();
            
        } catch (error) {
            console.error('❌ Error:', error.message);
            console.error(error.stack);
            process.exit(1);
        }
    }

    async loadDiscriminativeFeatures() {
        console.log('📜 Phase 1: Loading all discriminative features...\n');
        
        this.discriminativeFeatures = loadDiscriminativeFeatures();
        
        console.log(`📋 Loaded ${this.discriminativeFeatures.length} discriminative features:`);
        
        const cmsCount = {};
        this.discriminativeFeatures.forEach(feature => {
            cmsCount[feature.cms] = (cmsCount[feature.cms] || 0) + 1;
        });
        
        Object.entries(cmsCount).forEach(([cms, count]) => {
            console.log(`  ${cms}: ${count} features`);
        });
        
        console.log('\n🔍 Features to scrutinize (generic patterns):');
        this.discriminativeFeatures.forEach(feature => {
            if (this.suspiciousPatterns.includes(feature.feature)) {
                console.log(`  ⚠️  ${feature.description} (${feature.cms})`);
            }
        });
        
        console.log();
    }

    async loadAllSites() {
        console.log('📊 Phase 2: Loading representative sample of all CMS sites...\n');
        
        const dataDir = './data/cms-analysis';
        const indexPath = path.join(dataDir, 'index.json');
        
        if (!fs.existsSync(indexPath)) {
            throw new Error('Production data index not found');
        }
        
        const indexContent = fs.readFileSync(indexPath, 'utf8');
        const indexData = JSON.parse(indexContent);
        const indexArray = Array.isArray(indexData) ? indexData : indexData.files;
        
        // Get balanced sample across all CMS types
        const cmsGroups = {
            wordpress: [],
            drupal: [],
            joomla: [],
            unknown: []
        };
        
        indexArray.forEach(entry => {
            const cms = entry.cms ? entry.cms.toLowerCase() : 'unknown';
            if (cmsGroups[cms]) {
                cmsGroups[cms].push(entry);
            }
        });
        
        // Take balanced sample (max 80 per CMS type)
        const sampleEntries = [];
        Object.entries(cmsGroups).forEach(([cms, entries]) => {
            const shuffled = this.shuffleArray(entries);
            const sample = shuffled.slice(0, Math.min(80, entries.length));
            sampleEntries.push(...sample);
            console.log(`📈 ${cms}: ${sample.length} sites sampled (from ${entries.length} total)`);
        });
        
        console.log(`📈 Loading ${sampleEntries.length} sites for validation...`);
        
        let loaded = 0;
        for (const entry of sampleEntries) {
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
        
        console.log(`✅ Loaded ${loaded} sites for comprehensive validation\n`);
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    async validateAllDiscriminators() {
        console.log('🔍 Phase 3: Testing all discriminators against all CMS types...\n');
        
        // Initialize results tracking for each feature
        this.discriminativeFeatures.forEach(feature => {
            this.results[feature.feature] = {
                feature: feature,
                cmsTesting: {
                    wordpress: { total: 0, detected: 0, sites: [] },
                    drupal: { total: 0, detected: 0, sites: [] },
                    joomla: { total: 0, detected: 0, sites: [] },
                    unknown: { total: 0, detected: 0, sites: [] }
                },
                falsePositiveRate: 0,
                truePositiveRate: 0,
                precision: 0,
                isSuspicious: this.suspiciousPatterns.includes(feature.feature)
            };
        });
        
        // Count total sites by CMS
        const cmsCounts = { wordpress: 0, drupal: 0, joomla: 0, unknown: 0 };
        this.allSites.forEach(site => {
            cmsCounts[site.cms]++;
        });
        
        // Set totals
        this.discriminativeFeatures.forEach(feature => {
            Object.keys(cmsCounts).forEach(cms => {
                this.results[feature.feature].cmsTesting[cms].total = cmsCounts[cms];
            });
        });
        
        // Test each feature against each site
        let sitesProcessed = 0;
        this.allSites.forEach(site => {
            this.discriminativeFeatures.forEach(feature => {
                const matches = evaluateFeature(feature, site.data);
                const result = this.results[feature.feature];
                const cms = site.cms;
                
                if (matches) {
                    result.cmsTesting[cms].detected++;
                    result.cmsTesting[cms].sites.push({
                        url: site.url,
                        confidence: site.confidence
                    });
                }
            });
            
            sitesProcessed++;
            if (sitesProcessed % 50 === 0) {
                console.log(`  Processed ${sitesProcessed}/${this.allSites.length} sites...`);
            }
        });
        
        console.log(`✅ Validation complete for ${this.allSites.length} sites across all ${this.discriminativeFeatures.length} discriminators\n`);
    }

    async analyzeResults() {
        console.log('📈 Phase 4: Analyzing discriminator effectiveness and false positive rates...\n');
        
        // Calculate metrics for each feature
        Object.values(this.results).forEach(result => {
            const feature = result.feature;
            const expectedCms = feature.cms.toLowerCase();
            
            // Calculate true positives, false positives, etc.
            let truePositives = 0;
            let falsePositives = 0;
            let totalPositiveDetections = 0;
            let totalExpectedCmsSites = 0;
            
            Object.entries(result.cmsTesting).forEach(([cms, testing]) => {
                totalPositiveDetections += testing.detected;
                
                if (cms === expectedCms) {
                    truePositives = testing.detected;
                    totalExpectedCmsSites = testing.total;
                } else {
                    falsePositives += testing.detected;
                }
            });
            
            // Calculate rates
            result.truePositiveRate = totalExpectedCmsSites > 0 ? (truePositives / totalExpectedCmsSites) * 100 : 0;
            result.falsePositiveRate = totalPositiveDetections > 0 ? (falsePositives / totalPositiveDetections) * 100 : 0;
            result.precision = totalPositiveDetections > 0 ? (truePositives / totalPositiveDetections) * 100 : 0;
        });
        
        console.log('📊 Discriminator Performance Analysis Complete');
    }

    async generateReport() {
        console.log('📋 Phase 5: Generating comprehensive validation report...\n');
        
        console.log('## Comprehensive Discriminator Validation Results\n');
        
        // Sort by false positive rate (worst first)
        const sortedResults = Object.values(this.results)
            .sort((a, b) => b.falsePositiveRate - a.falsePositiveRate);
        
        console.log('### 🚨 False Positive Rate Analysis (Worst First)\n');
        console.log('| Feature | Expected CMS | False Positive Rate | Precision | True Positive Rate | Status |');
        console.log('|---------|--------------|--------------------|-----------|--------------------|--------|');
        
        sortedResults.forEach(result => {
            const feature = result.feature;
            const fps = result.falsePositiveRate.toFixed(1);
            const precision = result.precision.toFixed(1);
            const tpr = result.truePositiveRate.toFixed(1);
            
            let status = '✅ GOOD';
            if (result.falsePositiveRate > 50) status = '❌ INVALID';
            else if (result.falsePositiveRate > 20) status = '⚠️ RISKY';
            else if (result.falsePositiveRate > 10) status = '🔍 MONITOR';
            
            const suspicious = result.isSuspicious ? ' 🎯' : '';
            
            console.log(`| ${feature.description.substring(0, 40)}...${suspicious} | ${feature.cms} | ${fps}% | ${precision}% | ${tpr}% | ${status} |`);
        });
        
        console.log();
        
        // Problematic patterns
        const problematicPatterns = sortedResults.filter(r => r.falsePositiveRate > 20);
        
        if (problematicPatterns.length > 0) {
            console.log(`### ❌ INVALID Discriminators (>20% False Positive Rate)\n`);
            
            problematicPatterns.forEach(result => {
                console.log(`**${result.feature.description}** (${result.feature.cms})`);
                console.log(`- False Positive Rate: ${result.falsePositiveRate.toFixed(1)}%`);
                console.log(`- Precision: ${result.precision.toFixed(1)}%`);
                console.log();
                
                console.log(`False positives detected in:`);
                Object.entries(result.cmsTesting).forEach(([cms, testing]) => {
                    if (cms !== result.feature.cms.toLowerCase() && testing.detected > 0) {
                        const rate = ((testing.detected / testing.total) * 100).toFixed(1);
                        console.log(`- ${cms.toUpperCase()}: ${testing.detected}/${testing.total} sites (${rate}%)`);
                        
                        // Show examples
                        if (testing.sites.length > 0) {
                            const examples = testing.sites.slice(0, 3).map(s => s.url).join(', ');
                            console.log(`  Examples: ${examples}`);
                        }
                    }
                });
                console.log();
            });
        }
        
        // Good patterns
        const goodPatterns = sortedResults.filter(r => r.falsePositiveRate <= 10 && r.precision >= 80);
        
        if (goodPatterns.length > 0) {
            console.log(`### ✅ RELIABLE Discriminators (≤10% False Positive Rate, ≥80% Precision)\n`);
            
            goodPatterns.forEach(result => {
                console.log(`**${result.feature.description}** (${result.feature.cms})`);
                console.log(`- False Positive Rate: ${result.falsePositiveRate.toFixed(1)}%`);
                console.log(`- Precision: ${result.precision.toFixed(1)}%`);
                console.log(`- True Positive Rate: ${result.truePositiveRate.toFixed(1)}%`);
                console.log();
            });
        }
        
        // Specific analysis for suspicious patterns
        console.log(`### 🎯 Analysis of Suspected Generic Patterns\n`);
        
        this.suspiciousPatterns.forEach(suspiciousFeature => {
            const result = this.results[suspiciousFeature];
            if (result) {
                console.log(`**${result.feature.description}** (${result.feature.cms})`);
                console.log(`- Suspicion: Generic pattern without CMS name`);
                console.log(`- False Positive Rate: ${result.falsePositiveRate.toFixed(1)}%`);
                console.log(`- Verdict: ${result.falsePositiveRate > 20 ? '❌ CONFIRMED PROBLEMATIC' : result.falsePositiveRate > 10 ? '⚠️ NEEDS MONITORING' : '✅ ACCEPTABLE'}`);
                console.log();
            }
        });
        
        // Recommendations
        console.log(`### 📝 Implementation Recommendations\n`);
        
        const invalidCount = problematicPatterns.length;
        const goodCount = goodPatterns.length;
        
        console.log(`1. **Immediate Action Required**: Remove ${invalidCount} discriminators with >20% false positive rate`);
        console.log(`2. **Reliable Patterns**: ${goodCount} discriminators are safe for production use`);
        console.log(`3. **Focus on CMS-Specific Patterns**: Patterns containing CMS names (wp-content, drupal-settings, joomla-script-options) perform best`);
        console.log(`4. **Avoid Generic Directory Names**: /templates/, /media/, /modules/ are used by multiple systems`);
        
        if (problematicPatterns.length > 0) {
            console.log();
            console.log(`**Discriminators to Remove:**`);
            problematicPatterns.forEach(result => {
                console.log(`- ${result.feature.feature} (${result.feature.description})`);
            });
        }
        
        // Save detailed report
        const timestamp = new Date().toISOString().split('T')[0];
        const reportPath = `./reports/all-discriminators-validation-${timestamp}.json`;
        
        const detailedReport = {
            timestamp: new Date().toISOString(),
            summary: {
                totalDiscriminators: this.discriminativeFeatures.length,
                totalSitesTested: this.allSites.length,
                invalidDiscriminators: invalidCount,
                reliableDiscriminators: goodCount
            },
            results: this.results,
            recommendations: {
                remove: problematicPatterns.map(r => r.feature.feature),
                keep: goodPatterns.map(r => r.feature.feature)
            }
        };
        
        fs.writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
        console.log(`\n📄 Detailed validation report saved to: ${reportPath}`);
    }
}

// Run the validator
const validator = new AllDiscriminatorsValidator();
validator.run().catch(console.error);