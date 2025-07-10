import { program } from 'commander';
import { DataStorage, AnalysisQuery } from '../utils/cms/analysis/storage.js';
import { AnalysisReporter } from '../utils/cms/analysis/reports.js';
import { PatternDiscovery } from '../utils/cms/analysis/patterns.js';
import { createModuleLogger } from '../utils/logger.js';
import * as path from 'path';

const logger = createModuleLogger('analyze');

interface AnalyzeOptions {
    dataDir?: string;
    cms?: string[];
    minConfidence?: number;
    output?: string;
    format?: 'summary' | 'full' | 'patterns' | 'rules' | 'comparative' | 'recommendations';
    export?: 'json' | 'csv' | 'jsonl';
    includeUnknown?: boolean;
    dateRange?: string;
}

/**
 * Main analysis function that processes collected CMS data
 */
export async function analyzeCollectedData(options: AnalyzeOptions): Promise<void> {
    try {
        logger.info('Starting CMS data analysis', options);

        // Initialize data storage
        const dataDir = options.dataDir || './data/cms-analysis';
        const storage = new DataStorage(dataDir);
        await storage.initialize();

        // Get storage statistics
        const stats = await storage.getStatistics();
        console.log(`\n📊 Analysis Overview`);
        console.log(`Data Points: ${stats.totalDataPoints}`);
        console.log(`Total Size: ${Math.round(stats.totalSize / 1024)}KB`);
        console.log(`CMS Types: ${Array.from(stats.cmsDistribution.keys()).join(', ')}`);
        console.log(`Date Range: ${stats.dateRange.earliest?.toISOString().split('T')[0]} to ${stats.dateRange.latest?.toISOString().split('T')[0]}`);

        if (stats.totalDataPoints === 0) {
            console.log('\n❌ No data found. Run detect-cms with --collect-data flag first.');
            return;
        }

        // Build query from options
        const query: AnalysisQuery = {
            includeUnknown: options.includeUnknown ?? true
        };

        if (options.cms && options.cms.length > 0) {
            query.cmsTypes = options.cms;
        }

        if (options.minConfidence !== undefined) {
            query.minConfidence = options.minConfidence;
        }

        if (options.dateRange) {
            const [startStr, endStr] = options.dateRange.split(',');
            query.dateRange = {
                start: new Date(startStr),
                end: new Date(endStr)
            };
        }

        // Query data points
        const dataPoints = await storage.query(query);
        console.log(`\nAnalyzing ${dataPoints.length} data points...\n`);

        if (dataPoints.length === 0) {
            console.log('❌ No data points match the specified criteria.');
            return;
        }

        // Create analysis reporter
        const reporter = new AnalysisReporter(dataPoints);

        // Generate analysis based on format
        let report: string;
        let outputFileName: string;

        switch (options.format || 'summary') {
            case 'full':
                report = await reporter.generateReport();
                outputFileName = 'cms-analysis-full-report.md';
                break;

            case 'patterns':
                report = await reporter.generatePatternSummary();
                outputFileName = 'cms-pattern-summary.md';
                break;

            case 'rules':
                report = await reporter.generateDetectionRules();
                outputFileName = 'cms-detection-rules.md';
                break;

            case 'comparative':
                report = await reporter.generateComparativeAnalysis();
                outputFileName = 'cms-comparative-analysis.md';
                break;

            case 'recommendations':
                report = await reporter.generateRecommendations();
                outputFileName = 'cms-improvement-recommendations.md';
                break;

            default:
                report = await reporter.generatePatternSummary();
                outputFileName = 'cms-pattern-summary.md';
                break;
        }

        // Output results
        if (options.output) {
            const outputPath = path.resolve(options.output);
            await reporter.generateReport(outputPath);
            console.log(`📁 Report saved to: ${outputPath}`);
        } else {
            console.log(report);
        }

        // Handle export option
        if (options.export) {
            const exportPath = `./analysis-export.${options.export}`;
            await storage.export(options.export, exportPath, query);
            console.log(`📤 Data exported to: ${exportPath}`);
        }

        // Generate insights summary
        await generateInsightsSummary(dataPoints);

        logger.info('Analysis completed successfully', {
            dataPoints: dataPoints.length,
            format: options.format,
            outputGenerated: !!options.output
        });

    } catch (error) {
        logger.error('Analysis failed', { error: (error as Error).message });
        console.error(`❌ Analysis failed: ${(error as Error).message}`);
        process.exit(1);
    }
}

/**
 * Generate quick insights summary for console output
 */
export async function generateInsightsSummary(dataPoints: any[]): Promise<void> {
    const patternDiscovery = new PatternDiscovery(dataPoints);
    const comparison = patternDiscovery.compareDetectionPatterns();

    console.log('\n🔍 Quick Insights:');
    
    // Most detected CMS
    const detectedCMS = Array.from(comparison.entries())
        .filter(([cms]) => cms !== 'Unknown')
        .sort((a, b) => b[1].siteCount - a[1].siteCount);

    if (detectedCMS.length > 0) {
        const [topCMS, topStats] = detectedCMS[0];
        console.log(`   Most Common: ${topCMS} (${topStats.siteCount} sites, ${Math.round(topStats.detectionConfidence * 100)}% avg confidence)`);
    }

    // Detection challenges
    const unknownStats = comparison.get('Unknown');
    if (unknownStats && unknownStats.siteCount > 0) {
        console.log(`   Undetected: ${unknownStats.siteCount} sites (${Math.round(unknownStats.avgMetaTags)} avg meta tags)`);
    }

    // Performance leader
    const fastestCMS = Array.from(comparison.entries())
        .filter(([cms]) => cms !== 'Unknown')
        .sort((a, b) => a[1].avgLoadTime - b[1].avgLoadTime);

    if (fastestCMS.length > 0) {
        const [fastest, stats] = fastestCMS[0];
        console.log(`   Fastest: ${fastest} (${Math.round(stats.avgLoadTime)}ms avg load time)`);
    }

    console.log('\n💡 Next Steps:');
    console.log('   1. Run --format=rules to see suggested detection improvements');
    console.log('   2. Run --format=recommendations for actionable next steps');
    console.log('   3. Collect more data with detect-cms --collect-data for better analysis\n');
}

// Command definitions
program
    .command('analyze')
    .description('Analyze collected CMS detection data to discover patterns and generate insights')
    .option('--data-dir <path>', 'Directory containing analysis data', './data/cms-analysis')
    .option('--cms <types...>', 'Filter analysis to specific CMS types (e.g., WordPress, Drupal)')
    .option('--min-confidence <number>', 'Minimum detection confidence threshold (0.0-1.0)', parseFloat)
    .option('--output <path>', 'Save report to file')
    .option('--format <type>', 'Report format: summary, full, patterns, rules, comparative, recommendations', 'summary')
    .option('--export <format>', 'Export data in specified format: json, csv, jsonl')
    .option('--include-unknown', 'Include sites with unknown CMS in analysis')
    .option('--date-range <range>', 'Date range filter (format: YYYY-MM-DD,YYYY-MM-DD)')
    .action(async (options: AnalyzeOptions) => {
        await analyzeCollectedData(options);
    });

program
    .command('analyze-compare')
    .description('Compare detection patterns between different CMS types')
    .argument('<cms1>', 'First CMS type to compare')
    .argument('<cms2>', 'Second CMS type to compare')
    .option('--data-dir <path>', 'Directory containing analysis data', './data/cms-analysis')
    .option('--output <path>', 'Save comparison report to file')
    .action(async (cms1: string, cms2: string, options: { dataDir?: string; output?: string }) => {
        try {
            logger.info('Starting CMS comparison analysis', { cms1, cms2 });

            const storage = new DataStorage(options.dataDir || './data/cms-analysis');
            await storage.initialize();

            // Query data for both CMS types
            const cms1Data = await storage.query({ cmsTypes: [cms1], includeUnknown: false });
            const cms2Data = await storage.query({ cmsTypes: [cms2], includeUnknown: false });

            if (cms1Data.length === 0 || cms2Data.length === 0) {
                console.log(`❌ Insufficient data for comparison. Found ${cms1Data.length} ${cms1} sites and ${cms2Data.length} ${cms2} sites.`);
                return;
            }

            console.log(`\n🔄 Comparing ${cms1} (${cms1Data.length} sites) vs ${cms2} (${cms2Data.length} sites)\n`);

            // Generate comparative analysis
            const allData = [...cms1Data, ...cms2Data];
            const reporter = new AnalysisReporter(allData);
            const comparison = await reporter.generateComparativeAnalysis();

            if (options.output) {
                await reporter.generateReport(options.output);
                console.log(`📁 Comparison saved to: ${options.output}`);
            } else {
                console.log(comparison);
            }

        } catch (error) {
            logger.error('Comparison analysis failed', { error: (error as Error).message });
            console.error(`❌ Analysis failed: ${(error as Error).message}`);
            process.exit(1);
        }
    });

program
    .command('analyze-stats')
    .description('Show statistics about collected CMS detection data')
    .option('--data-dir <path>', 'Directory containing analysis data', './data/cms-analysis')
    .action(async (options: { dataDir?: string }) => {
        try {
            const storage = new DataStorage(options.dataDir || './data/cms-analysis');
            await storage.initialize();

            const stats = await storage.getStatistics();

            console.log('\n📊 CMS Detection Data Statistics\n');
            console.log(`Total Data Points: ${stats.totalDataPoints}`);
            console.log(`Total Storage Size: ${Math.round(stats.totalSize / 1024)}KB`);
            console.log(`Average Confidence: ${Math.round(stats.avgConfidence * 100)}%`);
            
            if (stats.dateRange.earliest && stats.dateRange.latest) {
                console.log(`Date Range: ${stats.dateRange.earliest.toISOString().split('T')[0]} to ${stats.dateRange.latest.toISOString().split('T')[0]}`);
            }

            console.log('\nCMS Distribution:');
            for (const [cms, count] of stats.cmsDistribution.entries()) {
                const percentage = Math.round((count / stats.totalDataPoints) * 100);
                console.log(`  ${cms}: ${count} sites (${percentage}%)`);
            }

            console.log('\n💡 Tips:');
            console.log('  - Run "inspector analyze" for pattern discovery');
            console.log('  - Use "inspector detect-cms --collect-data <url>" to gather more data');
            console.log('  - Try "inspector analyze --format=recommendations" for improvement suggestions\n');

        } catch (error) {
            logger.error('Stats analysis failed', { error: (error as Error).message });
            console.error(`❌ Failed to get statistics: ${(error as Error).message}`);
            process.exit(1);
        }
    });