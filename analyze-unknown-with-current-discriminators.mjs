#!/usr/bin/env node

/**
 * Unknown Sites Analysis with Current Discriminators
 * Tests our current 18 discriminative features against sites marked as 'unknown'
 * to identify CMS instances missed due to pattern gaps at collection time
 */

import fs from 'fs';
import path from 'path';
import { loadDiscriminativeFeatures } from './dist/ground-truth/discriminative-features.js';
import { evaluateFeature } from './dist/ground-truth/evaluate-feature.js';

class UnknownSitesCurrentDiscriminatorAnalyzer {
    constructor() {
        this.unknownSites = [];
        this.discriminativeFeatures = [];
        this.results = {
            totalUnknown: 0,
            detectedSites: {
                wordpress: [],
                drupal: [],
                joomla: [],
                multiple: []
            },
            featureEffectiveness: {},
            confidenceDistribution: {
                high: [], // >80%
                medium: [], // 60-80%
                low: [] // <60%
            }
        };
    }

    async run() {
        console.log('🔍 Unknown Sites Analysis with Current Discriminators');
        console.log('====================================================\n');

        try {
            await this.loadDiscriminativeFeatures();
            await this.loadUnknownSites();
            await this.analyzeWithCurrentDiscriminators();
            await this.generateReport();
            
        } catch (error) {
            console.error('❌ Error:', error.message);
            console.error(error.stack);
            process.exit(1);
        }
    }

    async loadDiscriminativeFeatures() {
        console.log('📜 Phase 1: Loading current discriminative features...\n');
        
        this.discriminativeFeatures = loadDiscriminativeFeatures();
        
        console.log(`📋 Loaded ${this.discriminativeFeatures.length} current discriminative features:`);
        
        const cmsCount = {};
        this.discriminativeFeatures.forEach(feature => {
            cmsCount[feature.cms] = (cmsCount[feature.cms] || 0) + 1;
        });
        
        Object.entries(cmsCount).forEach(([cms, count]) => {
            console.log(`  ${cms}: ${count} features`);
        });
        
        // Initialize feature effectiveness tracking
        this.discriminativeFeatures.forEach(feature => {
            this.results.featureEffectiveness[feature.feature] = {
                description: feature.description,
                cms: feature.cms,
                confidence: feature.confidence,
                matches: [],
                totalMatches: 0
            };
        });
        
        console.log();
    }

    async loadUnknownSites() {
        console.log('📊 Phase 2: Loading unknown sites from production data...\n');
        
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
                        originalConfidence: entry.confidence || 0,
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

    async analyzeWithCurrentDiscriminators() {
        console.log('🧪 Phase 3: Testing current discriminators against unknown sites...\n');
        
        let sitesAnalyzed = 0;
        let sitesWithDetection = 0;
        
        // Test each unknown site
        this.unknownSites.forEach((site, index) => {
            const detectionResults = this.analyzeSite(site);
            
            if (detectionResults.detectedCms) {
                sitesWithDetection++;
                
                // Add to appropriate CMS category
                const cms = detectionResults.detectedCms.toLowerCase();
                if (this.results.detectedSites[cms]) {
                    this.results.detectedSites[cms].push({
                        url: site.url,
                        confidence: detectionResults.confidence,
                        matchedFeatures: detectionResults.matchedFeatures,
                        originalConfidence: site.originalConfidence
                    });
                    
                    // Categorize by confidence
                    if (detectionResults.confidence >= 0.8) {
                        this.results.confidenceDistribution.high.push({
                            url: site.url,
                            cms: detectionResults.detectedCms,
                            confidence: detectionResults.confidence
                        });
                    } else if (detectionResults.confidence >= 0.6) {
                        this.results.confidenceDistribution.medium.push({
                            url: site.url,
                            cms: detectionResults.detectedCms,
                            confidence: detectionResults.confidence
                        });
                    } else {
                        this.results.confidenceDistribution.low.push({
                            url: site.url,
                            cms: detectionResults.detectedCms,
                            confidence: detectionResults.confidence
                        });
                    }
                }
            }
            
            sitesAnalyzed++;
            
            // Progress indicator
            if ((index + 1) % 50 === 0) {
                console.log(`  Processed ${index + 1}/${this.unknownSites.length} unknown sites...`);
            }
        });
        
        console.log(`✅ Analysis complete for ${sitesAnalyzed} unknown sites`);
        console.log(`📊 Found CMS detection in ${sitesWithDetection} sites (${((sitesWithDetection / sitesAnalyzed) * 100).toFixed(1)}%)\n`);
    }

    analyzeSite(site) {
        const cmsScores = {
            WordPress: 0,
            Drupal: 0,
            Joomla: 0,
            multiple: 0
        };
        
        const matchedFeatures = [];
        
        // Test each discriminative feature
        this.discriminativeFeatures.forEach(feature => {
            const matches = evaluateFeature(feature, site.data);
            
            if (matches) {
                const cms = feature.cms;
                cmsScores[cms] = (cmsScores[cms] || 0) + feature.confidence;
                
                matchedFeatures.push({
                    feature: feature.feature,
                    description: feature.description,
                    cms: cms,
                    confidence: feature.confidence
                });
                
                // Track feature effectiveness
                this.results.featureEffectiveness[feature.feature].matches.push(site.url);
                this.results.featureEffectiveness[feature.feature].totalMatches++;
            }
        });
        
        // Determine detected CMS
        let detectedCms = null;
        let maxScore = 0;
        
        Object.entries(cmsScores).forEach(([cms, score]) => {
            if (score > maxScore && score > 0) {
                maxScore = score;
                detectedCms = cms;
            }
        });
        
        return {
            detectedCms: detectedCms,
            confidence: Math.min(maxScore, 1.0), // Cap at 1.0
            matchedFeatures: matchedFeatures,
            allScores: cmsScores
        };
    }

    async generateReport() {
        console.log('📋 Phase 4: Generating analysis report...\n');
        
        console.log('## Unknown Sites Analysis with Current Discriminators\n');
        
        // Overall summary
        const totalDetected = Object.values(this.results.detectedSites).reduce((sum, sites) => sum + sites.length, 0);
        console.log(`**Summary:**`);
        console.log(`- Total unknown sites analyzed: ${this.results.totalUnknown}`);
        console.log(`- Sites with CMS detection: ${totalDetected} (${((totalDetected / this.results.totalUnknown) * 100).toFixed(1)}%)`);
        console.log(`- Sites remaining unknown: ${this.results.totalUnknown - totalDetected} (${(((this.results.totalUnknown - totalDetected) / this.results.totalUnknown) * 100).toFixed(1)}%)`);
        console.log();
        
        // CMS-specific results
        console.log(`**CMS Detection Results:**`);
        console.log();
        
        Object.entries(this.results.detectedSites).forEach(([cms, sites]) => {
            if (sites.length > 0) {
                console.log(`### ${cms.toUpperCase()} (${sites.length} sites detected)`);
                console.log();
                
                // Sort by confidence
                sites.sort((a, b) => b.confidence - a.confidence);
                
                console.log('| URL | Confidence | Key Features |');
                console.log('|-----|------------|--------------|');
                
                sites.slice(0, 10).forEach(site => {
                    const keyFeatures = site.matchedFeatures
                        .sort((a, b) => b.confidence - a.confidence)
                        .slice(0, 2)
                        .map(f => f.description.substring(0, 30) + '...')
                        .join(', ');
                    console.log(`| ${site.url} | ${(site.confidence * 100).toFixed(0)}% | ${keyFeatures} |`);
                });
                
                if (sites.length > 10) {
                    console.log(`| ... | ... | ${sites.length - 10} more sites |`);
                }
                console.log();
            }
        });
        
        // Feature effectiveness analysis
        console.log(`**Feature Effectiveness (Top 10):**`);
        console.log();
        console.log('| Feature | Matches | % of Unknown Sites | CMS |');
        console.log('|---------|---------|-------------------|-----|');
        
        Object.entries(this.results.featureEffectiveness)
            .sort((a, b) => b[1].totalMatches - a[1].totalMatches)
            .slice(0, 10)
            .forEach(([featureName, result]) => {
                const percentage = ((result.totalMatches / this.results.totalUnknown) * 100).toFixed(1);
                const description = result.description.substring(0, 40) + '...';
                console.log(`| ${description} | ${result.totalMatches} | ${percentage}% | ${result.cms} |`);
            });
        
        console.log();
        
        // Confidence distribution
        console.log(`**Confidence Distribution:**`);
        console.log(`- High confidence (≥80%): ${this.results.confidenceDistribution.high.length} sites`);
        console.log(`- Medium confidence (60-79%): ${this.results.confidenceDistribution.medium.length} sites`);
        console.log(`- Low confidence (<60%): ${this.results.confidenceDistribution.low.length} sites`);
        console.log();
        
        // High-confidence findings
        if (this.results.confidenceDistribution.high.length > 0) {
            console.log(`**High-Confidence Detections (≥80%):**`);
            console.log();
            this.results.confidenceDistribution.high
                .sort((a, b) => b.confidence - a.confidence)
                .slice(0, 15)
                .forEach(site => {
                    console.log(`- ${site.url} → ${site.cms} (${(site.confidence * 100).toFixed(0)}%)`);
                });
            if (this.results.confidenceDistribution.high.length > 15) {
                console.log(`- ... and ${this.results.confidenceDistribution.high.length - 15} more`);
            }
            console.log();
        }
        
        // Impact analysis
        console.log(`**Impact Analysis:**`);
        console.log();
        
        if (totalDetected > 0) {
            console.log(`1. **Missed CMS Detection**: Our current discriminators found ${totalDetected} CMS sites that were missed during original collection`);
            
            const cmsBreakdown = Object.entries(this.results.detectedSites)
                .filter(([_, sites]) => sites.length > 0)
                .map(([cms, sites]) => `${sites.length} ${cms}`)
                .join(', ');
            console.log(`   - Breakdown: ${cmsBreakdown}`);
            
            console.log(`2. **Pattern Effectiveness**: ${Object.values(this.results.featureEffectiveness).filter(f => f.totalMatches > 0).length} features contributed to detection`);
            
            const topFeature = Object.entries(this.results.featureEffectiveness)
                .sort((a, b) => b[1].totalMatches - a[1].totalMatches)[0];
            console.log(`3. **Most Effective Feature**: ${topFeature[1].description} (${topFeature[1].totalMatches} matches)`);
            
            if (this.results.confidenceDistribution.high.length > 0) {
                console.log(`4. **High-Quality Finds**: ${this.results.confidenceDistribution.high.length} sites detected with ≥80% confidence`);
            }
        } else {
            console.log(`1. **No Additional CMS Detection**: Current discriminators did not identify any CMS in unknown sites`);
            console.log(`2. **Unknown Sites Validation**: This suggests our 'unknown' classification was accurate`);
        }
        
        // Save detailed report
        const timestamp = new Date().toISOString().split('T')[0];
        const reportPath = `./reports/unknown-sites-current-discriminators-${timestamp}.json`;
        
        const detailedReport = {
            timestamp: new Date().toISOString(),
            summary: {
                totalUnknown: this.results.totalUnknown,
                totalDetected: totalDetected,
                detectionRate: (totalDetected / this.results.totalUnknown) * 100
            },
            detectedSites: this.results.detectedSites,
            featureEffectiveness: this.results.featureEffectiveness,
            confidenceDistribution: this.results.confidenceDistribution
        };
        
        fs.writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
        console.log(`📄 Detailed report saved to: ${reportPath}`);
    }
}

// Run the analyzer
const analyzer = new UnknownSitesCurrentDiscriminatorAnalyzer();
analyzer.run().catch(console.error);