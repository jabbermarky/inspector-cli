#!/usr/bin/env node

/**
 * Discriminator Effectiveness Analyzer
 * Tests our current discriminative features against the collected dataset
 * to assess real-world effectiveness, precision, and recall
 */

import fs from 'fs';
import path from 'path';
import { loadDiscriminativeFeatures } from './dist/ground-truth/discriminative-features.js';
import { evaluateFeature } from './dist/ground-truth/evaluate-feature.js';

class DiscriminatorEffectivenessAnalyzer {
    constructor() {
        this.discriminativeFeatures = [];
        this.productionData = [];
        this.results = {
            features: {},
            cms: {
                wordpress: { samples: 0, detected: 0 },
                drupal: { samples: 0, detected: 0 },
                joomla: { samples: 0, detected: 0 },
                unknown: { samples: 0, detected: 0 }
            }
        };
    }

    async run() {
        console.log('🧪 Discriminator Effectiveness Analysis');
        console.log('======================================\n');

        try {
            await this.loadDiscriminativeFeatures();
            await this.loadProductionData();
            await this.analyzeEffectiveness();
            await this.generateReport();
            
        } catch (error) {
            console.error('❌ Error:', error.message);
            console.error(error.stack);
            process.exit(1);
        }
    }

    async loadDiscriminativeFeatures() {
        console.log('📜 Phase 1: Loading discriminative features...\n');
        
        this.discriminativeFeatures = loadDiscriminativeFeatures();
        
        console.log(`📋 Loaded ${this.discriminativeFeatures.length} discriminative features:`);
        
        const cmsCount = {};
        this.discriminativeFeatures.forEach(feature => {
            cmsCount[feature.cms] = (cmsCount[feature.cms] || 0) + 1;
        });
        
        Object.entries(cmsCount).forEach(([cms, count]) => {
            console.log(`  ${cms}: ${count} features`);
        });
        
        console.log('\\nFeature details:');
        this.discriminativeFeatures.forEach(feature => {
            console.log(`  - ${feature.description} (${feature.cms}, ${feature.confidence})`);
        });
        console.log();
    }

    async loadProductionData() {
        console.log('📊 Phase 2: Loading production dataset...\n');
        
        const dataDir = './data/cms-analysis';
        const indexPath = path.join(dataDir, 'index.json');
        
        if (!fs.existsSync(indexPath)) {
            throw new Error('Production data index not found');
        }
        
        const indexContent = fs.readFileSync(indexPath, 'utf8');
        const indexData = JSON.parse(indexContent);
        const indexArray = Array.isArray(indexData) ? indexData : indexData.files;
        
        // Use a reasonable sample size for comprehensive analysis
        const sampleSize = Math.min(200, indexArray.length);
        const sampleData = this.shuffleArray(indexArray).slice(0, sampleSize);
        
        console.log(`📈 Loading ${sampleData.length} production samples...`);
        
        let loaded = 0;
        for (const entry of sampleData) {
            const filePath = path.join(dataDir, entry.filePath);
            if (fs.existsSync(filePath)) {
                try {
                    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    this.productionData.push({
                        url: entry.url,
                        actualCms: entry.cms?.toLowerCase() || 'unknown',
                        confidence: entry.confidence || 0,
                        data: data
                    });
                    loaded++;
                } catch (error) {
                    console.warn(`⚠️  Failed to load ${entry.url}: ${error.message}`);
                }
            }
        }
        
        console.log(`✅ Loaded ${loaded} production samples`);
        
        // Display CMS distribution
        const cmsDistribution = {};
        this.productionData.forEach(item => {
            cmsDistribution[item.actualCms] = (cmsDistribution[item.actualCms] || 0) + 1;
        });
        
        console.log('\\n📊 Production Sample Distribution:');
        Object.entries(cmsDistribution).forEach(([cms, count]) => {
            console.log(`  ${cms}: ${count} samples`);
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

    async analyzeEffectiveness() {
        console.log('🔍 Phase 3: Analyzing discriminator effectiveness...\n');
        
        // Initialize results tracking
        this.discriminativeFeatures.forEach(feature => {
            this.results.features[feature.feature] = {
                feature: feature,
                truePositives: 0,
                falsePositives: 0,
                trueNegatives: 0,
                falseNegatives: 0,
                matches: [],
                mismatches: []
            };
        });
        
        // Test each production sample
        this.productionData.forEach((sample, index) => {
            this.analyzeSample(sample);
            
            // Progress indicator
            if ((index + 1) % 50 === 0) {
                console.log(`  Processed ${index + 1}/${this.productionData.length} samples...`);
            }
        });
        
        console.log(`✅ Analysis complete for ${this.productionData.length} samples\\n`);
    }

    analyzeSample(sample) {
        const actualCms = sample.actualCms;
        
        // Test each discriminative feature
        this.discriminativeFeatures.forEach(feature => {
            const matches = evaluateFeature(feature, sample.data);
            const expectedCms = feature.cms.toLowerCase();
            const isCorrectCms = actualCms === expectedCms;
            const featureResult = this.results.features[feature.feature];
            
            if (matches) {
                if (isCorrectCms) {
                    featureResult.truePositives++;
                } else {
                    featureResult.falsePositives++;
                }
                
                featureResult.matches.push({
                    url: sample.url,
                    actualCms: actualCms,
                    expectedCms: expectedCms,
                    correct: isCorrectCms
                });
            } else {
                if (isCorrectCms) {
                    featureResult.falseNegatives++;
                } else {
                    featureResult.trueNegatives++;
                }
                
                if (isCorrectCms) {
                    featureResult.mismatches.push({
                        url: sample.url,
                        actualCms: actualCms,
                        expectedCms: expectedCms,
                        reason: 'false_negative'
                    });
                }
            }
        });
    }

    calculateMetrics(result) {
        const { truePositives, falsePositives, trueNegatives, falseNegatives } = result;
        
        const precision = truePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;
        const recall = truePositives > 0 ? truePositives / (truePositives + falseNegatives) : 0;
        const f1Score = (precision + recall) > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
        const accuracy = (truePositives + trueNegatives) / (truePositives + falsePositives + trueNegatives + falseNegatives);
        
        return {
            precision: precision * 100,
            recall: recall * 100,
            f1Score: f1Score * 100,
            accuracy: accuracy * 100,
            truePositives,
            falsePositives,
            trueNegatives,
            falseNegatives
        };
    }

    async generateReport() {
        console.log('📋 Phase 4: Generating effectiveness report...\n');
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalFeatures: this.discriminativeFeatures.length,
                totalSamples: this.productionData.length
            },
            featureAnalysis: {},
            cmsAnalysis: {}
        };

        // Analyze each feature
        console.log('## Discriminator Effectiveness Analysis\\n');
        
        // Group by CMS
        const cmsSummary = {};
        Object.entries(this.results.features).forEach(([featureName, result]) => {
            const cms = result.feature.cms.toLowerCase();
            if (!cmsSummary[cms]) {
                cmsSummary[cms] = [];
            }
            
            const metrics = this.calculateMetrics(result);
            cmsSummary[cms].push({
                feature: result.feature,
                metrics: metrics,
                result: result
            });
            
            report.featureAnalysis[featureName] = {
                feature: result.feature,
                metrics: metrics,
                sampleDetails: {
                    matches: result.matches.length,
                    mismatches: result.mismatches.length
                }
            };
        });

        // Generate CMS-specific reports
        Object.entries(cmsSummary).forEach(([cms, features]) => {
            console.log(`### ${cms.toUpperCase()} Features (${features.length} features tested)\\n`);
            
            features.sort((a, b) => b.metrics.f1Score - a.metrics.f1Score);
            
            console.log('| Feature | Precision | Recall | F1 Score | True Positives | False Negatives |');
            console.log('|---------|-----------|---------|----------|----------------|-----------------|');
            
            features.forEach(({ feature, metrics, result }) => {
                console.log(`| ${feature.description.substring(0, 40)}... | ${metrics.precision.toFixed(1)}% | ${metrics.recall.toFixed(1)}% | ${metrics.f1Score.toFixed(1)}% | ${metrics.truePositives} | ${metrics.falseNegatives} |`);
            });
            
            console.log('\\n');
            
            // Add analysis insights
            const avgPrecision = features.reduce((sum, f) => sum + f.metrics.precision, 0) / features.length;
            const avgRecall = features.reduce((sum, f) => sum + f.metrics.recall, 0) / features.length;
            const avgF1 = features.reduce((sum, f) => sum + f.metrics.f1Score, 0) / features.length;
            
            console.log(`**${cms.toUpperCase()} Analysis**:`);
            console.log(`- Average Precision: ${avgPrecision.toFixed(1)}%`);
            console.log(`- Average Recall: ${avgRecall.toFixed(1)}%`);
            console.log(`- Average F1 Score: ${avgF1.toFixed(1)}%`);
            
            // Identify best and worst performers
            const bestFeature = features[0];
            const worstFeature = features[features.length - 1];
            
            console.log(`- Best Performer: ${bestFeature.feature.description} (F1: ${bestFeature.metrics.f1Score.toFixed(1)}%)`);
            console.log(`- Needs Improvement: ${worstFeature.feature.description} (F1: ${worstFeature.metrics.f1Score.toFixed(1)}%)`);
            console.log('\\n');
            
            report.cmsAnalysis[cms] = {
                totalFeatures: features.length,
                averages: { precision: avgPrecision, recall: avgRecall, f1Score: avgF1 },
                bestFeature: bestFeature.feature.feature,
                worstFeature: worstFeature.feature.feature
            };
        });

        // Save detailed report
        const reportPath = `./reports/discriminator-effectiveness-${new Date().toISOString().split('T')[0]}.json`;
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📄 Detailed report saved to: ${reportPath}`);
        
        // Generate summary insights
        console.log('\\n## Key Insights\\n');
        this.generateInsights(report);
    }

    generateInsights(report) {
        const allFeatures = Object.values(report.featureAnalysis);
        
        // Overall performance
        const avgPrecision = allFeatures.reduce((sum, f) => sum + f.metrics.precision, 0) / allFeatures.length;
        const avgRecall = allFeatures.reduce((sum, f) => sum + f.metrics.recall, 0) / allFeatures.length;
        
        console.log(`1. **Overall Performance**: ${avgPrecision.toFixed(1)}% precision, ${avgRecall.toFixed(1)}% recall`);
        
        // High performers
        const highPerformers = allFeatures.filter(f => f.metrics.f1Score > 70).sort((a, b) => b.metrics.f1Score - a.metrics.f1Score);
        console.log(`2. **High Performers** (F1 > 70%): ${highPerformers.length} features`);
        highPerformers.slice(0, 3).forEach(f => {
            console.log(`   - ${f.feature.description} (${f.metrics.f1Score.toFixed(1)}%)`);
        });
        
        // Low performers
        const lowPerformers = allFeatures.filter(f => f.metrics.f1Score < 30).sort((a, b) => a.metrics.f1Score - b.metrics.f1Score);
        console.log(`3. **Needs Improvement** (F1 < 30%): ${lowPerformers.length} features`);
        lowPerformers.slice(0, 3).forEach(f => {
            console.log(`   - ${f.feature.description} (${f.metrics.f1Score.toFixed(1)}%)`);
        });
        
        // Perfect precision features
        const perfectPrecision = allFeatures.filter(f => f.metrics.precision === 100 && f.metrics.truePositives > 0);
        console.log(`4. **Perfect Precision**: ${perfectPrecision.length} features with 100% precision`);
        
        // High recall features
        const highRecall = allFeatures.filter(f => f.metrics.recall > 80);
        console.log(`5. **High Recall**: ${highRecall.length} features with >80% recall`);
    }
}

// Run the analyzer
const analyzer = new DiscriminatorEffectivenessAnalyzer();
analyzer.run().catch(console.error);