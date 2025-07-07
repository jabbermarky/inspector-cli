/**
 * Bot Blocking Analysis Command
 * 
 * Analyzes collected data to identify bot blocking mechanisms and provides
 * evasion strategy recommendations.
 */

import { program } from 'commander';
import { DataStorage } from '../utils/cms/analysis/storage.js';
import { BotBlockingAnalyzer } from '../utils/cms/analysis/bot-blocking.js';
import { createModuleLogger } from '../utils/logger.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const logger = createModuleLogger('analyze-blocking');

interface BlockingAnalysisOptions {
    dataDir?: string;
    outputDir?: string;
    format?: 'json' | 'csv' | 'markdown';
    minBlockingRate?: number;
    providerFilter?: string[];
    includeUnblocked?: boolean;
}

async function analyzeBlocking(options: BlockingAnalysisOptions = {}) {
    try {
        const {
            dataDir = './data/cms-analysis',
            outputDir = './reports',
            format = 'json',
            minBlockingRate = 0,
            providerFilter,
            includeUnblocked = false
        } = options;

        logger.info('Starting bot blocking analysis', { 
            dataDir, 
            outputDir, 
            format,
            minBlockingRate,
            providerFilter,
            includeUnblocked
        });

        // Initialize data storage and analyzer
        const storage = new DataStorage(dataDir);
        await storage.initialize();
        
        const analyzer = new BotBlockingAnalyzer();

        // Load all data points
        const allDataPoints = await storage.getAllDataPoints();
        logger.info('Loaded data points for analysis', { count: allDataPoints.length });

        if (allDataPoints.length === 0) {
            console.log('❌ No data points found for analysis');
            return;
        }

        // Filter data if needed
        let filteredDataPoints = allDataPoints;
        
        if (!includeUnblocked) {
            // Quick pre-filter to identify potentially blocked sites
            filteredDataPoints = allDataPoints.filter(dp => {
                const title = (dp.title || '').toLowerCase();
                const content = (dp.htmlContent || '').toLowerCase();
                
                return title.includes('access denied') || 
                       title.includes('blocked') ||
                       title.includes('captcha') ||
                       content.includes('cloudflare') ||
                       content.includes('perimeterx') ||
                       dp.statusCode === 403 ||
                       dp.statusCode === 429;
            });
        }

        console.log(`\n🔍 Analyzing ${filteredDataPoints.length} data points for bot blocking...\n`);

        // Generate blocking report
        const report = analyzer.generateBlockingReport(filteredDataPoints);

        // Filter by minimum blocking rate if specified
        if (minBlockingRate > 0 && report.summary.blockingRate < minBlockingRate) {
            console.log(`⚠️  Blocking rate (${(report.summary.blockingRate * 100).toFixed(1)}%) is below minimum threshold (${(minBlockingRate * 100).toFixed(1)}%)`);
        }

        // Filter by provider if specified
        if (providerFilter && providerFilter.length > 0) {
            report.detailedAnalysis = report.detailedAnalysis.filter(analysis => 
                analysis.result.signatures.some(sig => 
                    providerFilter.includes(sig.provider)
                )
            );
        }

        // Display summary
        displaySummary(report);

        // Create output directory
        await fs.mkdir(outputDir, { recursive: true });

        // Generate reports
        await generateReports(report, outputDir, format);

        console.log(`\n✅ Bot blocking analysis complete!`);
        console.log(`📁 Reports saved to: ${outputDir}`);

    } catch (error) {
        logger.error('Bot blocking analysis failed', { error: (error as Error).message });
        console.error('❌ Analysis failed:', (error as Error).message);
        process.exit(1);
    }
}

function displaySummary(report: any) {
    console.log('📊 BOT BLOCKING ANALYSIS SUMMARY');
    console.log('================================\n');
    
    console.log(`🎯 Overview:`);
    console.log(`   Total sites analyzed: ${report.summary.totalSites}`);
    console.log(`   Sites with blocking: ${report.summary.blockedSites}`);
    console.log(`   Blocking rate: ${(report.summary.blockingRate * 100).toFixed(1)}%\n`);
    
    if (report.summary.topProviders.length > 0) {
        console.log(`🏢 Top Blocking Providers:`);
        report.summary.topProviders.slice(0, 5).forEach((provider: any, index: number) => {
            console.log(`   ${index + 1}. ${provider.provider}: ${provider.count} sites`);
        });
        console.log();
    }
    
    if (report.summary.topBlockingMethods.length > 0) {
        console.log(`🛡️  Top Blocking Methods:`);
        report.summary.topBlockingMethods.slice(0, 5).forEach((method: any, index: number) => {
            console.log(`   ${index + 1}. ${method.method}: ${method.count} sites`);
        });
        console.log();
    }
    
    console.log(`🚀 Evasion Strategy Recommendations:`);
    console.log(`   Immediate (easy): ${report.evasionRecommendations.immediate.length} strategies`);
    console.log(`   Advanced (medium): ${report.evasionRecommendations.advanced.length} strategies`);
    console.log(`   Experimental (hard): ${report.evasionRecommendations.experimental.length} strategies\n`);
    
    // Show top immediate recommendations
    if (report.evasionRecommendations.immediate.length > 0) {
        console.log(`💡 Top Immediate Recommendations:`);
        report.evasionRecommendations.immediate.slice(0, 3).forEach((strategy: any, index: number) => {
            console.log(`   ${index + 1}. ${strategy.name} (${(strategy.effectiveness * 100).toFixed(0)}% effective)`);
            console.log(`      ${strategy.description}`);
        });
        console.log();
    }
}

async function generateReports(report: any, outputDir: string, format: string) {
    const timestamp = new Date().toISOString().split('T')[0];
    
    if (format === 'json' || format === 'all') {
        const jsonPath = path.join(outputDir, `bot-blocking-analysis-${timestamp}.json`);
        await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf8');
        console.log(`📄 JSON report: ${jsonPath}`);
    }
    
    if (format === 'csv' || format === 'all') {
        await generateCSVReport(report, outputDir, timestamp);
    }
    
    if (format === 'markdown' || format === 'all') {
        await generateMarkdownReport(report, outputDir, timestamp);
    }
}

async function generateCSVReport(report: any, outputDir: string, timestamp: string) {
    const csvPath = path.join(outputDir, `bot-blocking-sites-${timestamp}.csv`);
    
    const headers = [
        'url', 'is_blocked', 'primary_method', 'risk_level', 'providers', 
        'blocking_categories', 'evasion_strategies', 'confidence_scores'
    ];
    
    const rows = report.detailedAnalysis.map((analysis: any) => [
        analysis.url,
        analysis.result.isBlocked,
        analysis.result.primaryBlockingMethod,
        analysis.result.riskLevel,
        analysis.result.signatures.map((s: any) => s.provider).join(';'),
        analysis.result.signatures.map((s: any) => s.category).join(';'),
        analysis.result.evasionStrategies.map((s: any) => s.name).join(';'),
        analysis.result.signatures.map((s: any) => s.confidence).join(';')
    ]);
    
    const csvContent = [headers, ...rows]
        .map(row => row.map((cell: any) => `"${cell}"`).join(','))
        .join('\n');
    
    await fs.writeFile(csvPath, csvContent, 'utf8');
    console.log(`📊 CSV report: ${csvPath}`);
}

async function generateMarkdownReport(report: any, outputDir: string, timestamp: string) {
    const mdPath = path.join(outputDir, `bot-blocking-analysis-${timestamp}.md`);
    
    let markdown = `# Bot Blocking Analysis Report\n\n`;
    markdown += `Generated: ${new Date().toISOString()}\n\n`;
    
    markdown += `## Summary\n\n`;
    markdown += `- **Total sites analyzed**: ${report.summary.totalSites}\n`;
    markdown += `- **Sites with blocking**: ${report.summary.blockedSites}\n`;
    markdown += `- **Blocking rate**: ${(report.summary.blockingRate * 100).toFixed(1)}%\n\n`;
    
    markdown += `## Top Blocking Providers\n\n`;
    report.summary.topProviders.forEach((provider: any, index: number) => {
        markdown += `${index + 1}. **${provider.provider}**: ${provider.count} sites\n`;
    });
    markdown += `\n`;
    
    markdown += `## Top Blocking Methods\n\n`;
    report.summary.topBlockingMethods.forEach((method: any, index: number) => {
        markdown += `${index + 1}. **${method.method}**: ${method.count} sites\n`;
    });
    markdown += `\n`;
    
    markdown += `## Evasion Strategy Recommendations\n\n`;
    
    markdown += `### Immediate Actions (Easy)\n\n`;
    report.evasionRecommendations.immediate.forEach((strategy: any) => {
        markdown += `#### ${strategy.name}\n`;
        markdown += `- **Effectiveness**: ${(strategy.effectiveness * 100).toFixed(0)}%\n`;
        markdown += `- **Description**: ${strategy.description}\n`;
        markdown += `- **Implementation**: ${strategy.implementation}\n`;
        markdown += `- **Risks**: ${strategy.risks.join(', ')}\n\n`;
    });
    
    markdown += `### Advanced Strategies (Medium Difficulty)\n\n`;
    report.evasionRecommendations.advanced.forEach((strategy: any) => {
        markdown += `#### ${strategy.name}\n`;
        markdown += `- **Effectiveness**: ${(strategy.effectiveness * 100).toFixed(0)}%\n`;
        markdown += `- **Description**: ${strategy.description}\n`;
        markdown += `- **Implementation**: ${strategy.implementation}\n`;
        markdown += `- **Risks**: ${strategy.risks.join(', ')}\n\n`;
    });
    
    markdown += `### Experimental Approaches (Hard)\n\n`;
    report.evasionRecommendations.experimental.forEach((strategy: any) => {
        markdown += `#### ${strategy.name}\n`;
        markdown += `- **Effectiveness**: ${(strategy.effectiveness * 100).toFixed(0)}%\n`;
        markdown += `- **Description**: ${strategy.description}\n`;
        markdown += `- **Implementation**: ${strategy.implementation}\n`;
        markdown += `- **Risks**: ${strategy.risks.join(', ')}\n\n`;
    });
    
    markdown += `## Detailed Site Analysis\n\n`;
    markdown += `| URL | Blocked | Method | Risk | Providers |\n`;
    markdown += `|-----|---------|--------|------|----------|\n`;
    
    report.detailedAnalysis
        .filter((a: any) => a.result.isBlocked)
        .slice(0, 50) // Limit for readability
        .forEach((analysis: any) => {
            const providers = analysis.result.signatures.map((s: any) => s.provider).join(', ');
            markdown += `| ${analysis.url} | ✅ | ${analysis.result.primaryBlockingMethod} | ${analysis.result.riskLevel} | ${providers} |\n`;
        });
    
    await fs.writeFile(mdPath, markdown, 'utf8');
    console.log(`📝 Markdown report: ${mdPath}`);
}

// Command setup
program
    .command('analyze-blocking')
    .description('Analyze bot blocking mechanisms in collected data')
    .option('-d, --data-dir <dir>', 'Data directory path', './data/cms-analysis')
    .option('-o, --output-dir <dir>', 'Output directory for reports', './reports')
    .option('-f, --format <format>', 'Report format (json|csv|markdown|all)', 'json')
    .option('-m, --min-blocking-rate <rate>', 'Minimum blocking rate to report', parseFloat)
    .option('-p, --provider-filter <providers...>', 'Filter by specific providers')
    .option('--include-unblocked', 'Include unblocked sites in analysis')
    .action(async (options) => {
        await analyzeBlocking(options);
    });

export { analyzeBlocking };