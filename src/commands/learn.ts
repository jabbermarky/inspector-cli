import { program } from 'commander';
import { detectInputType, extractUrlsFromCSV } from '../utils/utils.js';
import { createModuleLogger } from '../utils/logger.js';
import { 
    LearnOptions, 
    processLearnBatch, 
    displayResults, 
    displayDetailedAnalysisReports,
    ensureLearnDirectoryStructure,
    performBulkLLMAnalysis,
    performDirectLLMAnalysis,
    performGeminiAnalysis,
    aggregateDataForBulkUpload,
    loadExistingLearnAnalyses,
    createMetaAnalysisPrompt,
    createTechnologyMetaAnalysisPrompt,
    getCacheStats,
    clearResponseCache,
    generateCacheReport
} from '../learn/index.js';
import { BULK_CMS_ANALYSIS_PROMPT } from '../prompts.js';

const logger = createModuleLogger('learn-command');

program
    .command("learn")
    .description("Perform LLM-powered analysis to discover CMS detection patterns")
    .argument('[input]', 'URL to analyze or CSV file containing URLs (not required for --meta-analysis)')
    .option('--collect-data', 'Force fresh data collection instead of using cached data')
    .option('--force-fresh', 'Force fresh data collection even when it fails (no fallback to cached)')
    .option('--prompt-template <name>', 'Use specific prompt template', 'cms-detection')
    .option('--model <model>', 'OpenAI model to use', 'gpt-4o')
    .option('--output-format <format>', 'Output format: json, summary, both', 'both')
    .option('--dry-run', 'Show what data would be sent without making LLM API call')
    .option('--cost-estimate', 'Display token count and estimated cost before proceeding')
    .option('--summary', 'Show only summary results (skip detailed analysis report)')
    .option('--cross-site-analysis', 'Perform cross-site pattern analysis across multiple URLs')
    .option('--meta-analysis', 'Analyze existing individual learn results for consensus patterns')
    .option('--phased-analysis', 'Use two-phase analysis (discovery + standardization) for better consistency')
    .option('--model-phase1 <model>', 'Model to use for Phase 1 (discovery) in mixed model testing')
    .option('--model-phase2 <model>', 'Model to use for Phase 2 (standardization) in mixed model testing')
    .option('--headed', 'Run browser in non-headless mode (visible GUI) to bypass bot detection')
    .option('--cache-stats', 'Display response cache statistics')
    .option('--cache-clear', 'Clear the response cache')
    .option('--cache-report', 'Generate detailed cache performance report')
    .option('--bulk-file <path>', '[DEPRECATED] Perform bulk analysis using uploaded data file')
    .option('--generate-bulk-data <path>', '[DEPRECATED] Generate bulk data file from URLs for later analysis')
    .action(async (input, options: LearnOptions) => {
        try {
            // Handle cache management operations first
            if (options.cacheStats) {
                const stats = await getCacheStats();
                console.log('\n' + '='.repeat(50));
                console.log('RESPONSE CACHE STATISTICS');
                console.log('='.repeat(50));
                console.log(`Hit Rate: ${(stats.hitRate * 100).toFixed(1)}% (${stats.hits} hits, ${stats.misses} misses)`);
                console.log(`Cache Entries: ${stats.entries}`);
                console.log(`Cache Size: ${(stats.totalSizeBytes / (1024 * 1024)).toFixed(2)} MB`);
                console.log(`Cost Saved: $${stats.costSaved.toFixed(2)}`);
                console.log(`API Calls Avoided: ${stats.hits}`);
                return;
            }
            
            if (options.cacheClear) {
                console.log('Clearing response cache...');
                await clearResponseCache();
                console.log('✓ Response cache cleared successfully');
                return;
            }
            
            if (options.cacheReport) {
                console.log('\n' + '='.repeat(80));
                console.log('RESPONSE CACHE PERFORMANCE REPORT');
                console.log('='.repeat(80));
                const report = await generateCacheReport();
                console.log(report);
                return;
            }
            
            // Ensure learn directory structure exists
            await ensureLearnDirectoryStructure();
            
            // Handle deprecated bulk data generation
            if (options.generateBulkData) {
                console.warn('⚠️  --generate-bulk-data is deprecated. Use --cross-site-analysis instead.');
                console.warn('   New usage: node dist/index.js learn <csv-file> --cross-site-analysis');
                console.warn('');
                const inputType = detectInputType(input);
                let urls: string[] = [];
                
                if (inputType === 'url') {
                    urls = [input];
                } else {
                    urls = extractUrlsFromCSV(input);
                }
                
                logger.info('Starting bulk data generation', { 
                    urlCount: urls.length,
                    outputPath: options.generateBulkData,
                    forceFresh: options.forceFresh
                });
                
                console.log(`Generating bulk data file from ${urls.length} URLs...`);
                console.log(`Output file: ${options.generateBulkData}`);
                
                await aggregateDataForBulkUpload(
                    urls,
                    options.generateBulkData,
                    options.forceFresh,
                    options.headed
                );
                
                console.log(`\n✓ Bulk data file generated successfully!`);
                console.log(`Use: node dist/index.js learn --bulk-file ${options.generateBulkData}`);
                
                return;
            }
            
            // Handle deprecated bulk file analysis
            if (options.bulkFile) {
                console.warn('⚠️  --bulk-file is deprecated. Use --cross-site-analysis instead.');
                console.warn('   New usage: node dist/index.js learn <csv-file> --cross-site-analysis');
                console.warn('');
                
                logger.info('Starting deprecated bulk file analysis', { 
                    bulkFile: options.bulkFile,
                    model: options.model
                });
                
                console.log(`Performing bulk analysis using file: ${options.bulkFile}`);
                
                const llmResponse = await performBulkLLMAnalysis(
                    options.bulkFile,
                    BULK_CMS_ANALYSIS_PROMPT,
                    options.model || 'gpt-4o'
                );
                
                // Display bulk analysis results
                console.log('\n' + '='.repeat(80));
                console.log('BULK ANALYSIS RESULTS');
                console.log('='.repeat(80));
                console.log('\nRaw Analysis:');
                console.log(JSON.stringify(llmResponse.parsedJson, null, 2));
                console.log('\nToken Usage:', llmResponse.tokenUsage);
                console.log('Validation Status:', llmResponse.validationStatus);
                
                logger.info('Bulk analysis completed', { 
                    validationStatus: llmResponse.validationStatus,
                    tokenUsage: llmResponse.tokenUsage
                });
                
                return;
            }
            
            // Handle meta-analysis first (doesn't require input)
            if (options.metaAnalysis) {
                logger.info('Starting meta-analysis of all existing learn results', { 
                    model: options.model
                });
                
                console.log('Loading all existing learn analyses...');
                
                // Load ALL existing analyses for meta-analysis (no URLs specified)
                const existingAnalyses = await loadExistingLearnAnalyses([]);
                if (existingAnalyses.length === 0) {
                    console.error('No existing learn analyses found.');
                    console.error('Run some individual learn analyses first before meta-analysis.');
                    process.exit(1);
                }
                
                // Process analyses in batches to stay within token limits while preserving analytical value
                console.log(`Processing ${existingAnalyses.length} analyses in batches for comprehensive meta-analysis...`);
                
                // Normalize technology names to fix inconsistent classifications
                function normalizeTechnology(tech: string): string {
                    if (!tech) return 'Unknown';
                    
                    const normalized = tech.toLowerCase().trim();
                    
                    // Group all unknown/custom variations
                    if (normalized.includes('unknown') || 
                        normalized.includes('custom') ||
                        normalized === 'custom framework' ||
                        normalized === 'custom php framework' ||
                        normalized === 'custom e-commerce platform' ||
                        normalized === 'custom or unknown') {
                        return normalized.includes('unknown') ? 'Unknown' : 'Custom';
                    }
                    
                    // Standardize Joomla variations
                    if (normalized.includes('joomla')) {
                        return 'Joomla';
                    }
                    
                    // Standardize Next.js
                    if (normalized.includes('next.js') || normalized.includes('nextjs')) {
                        return 'Next.js';
                    }
                    
                    // Keep other technologies as-is but properly capitalized
                    return tech.charAt(0).toUpperCase() + tech.slice(1).toLowerCase();
                }
                
                // Group analyses by normalized technology
                const analysesByTech = existingAnalyses.reduce((acc, analysis) => {
                    const originalTech = analysis.technology || 'unknown';
                    const tech = normalizeTechnology(originalTech);
                    if (!acc[tech]) acc[tech] = [];
                    acc[tech].push({
                        ...analysis,
                        originalTechnology: originalTech, // Keep track of original for debugging
                        technology: tech // Use normalized version
                    });
                    return acc;
                }, {} as Record<string, any[]>);
                
                console.log(`Found analyses for: ${Object.keys(analysesByTech).join(', ')}`);
                
                // Prioritize technologies by significance and interest
                const techPriority = {
                    // High priority: Major CMS platforms and modern frameworks
                    'high': ['WordPress', 'Drupal', 'Joomla', 'Joomla!', 'Duda', 'Next.js', 'Gatsby', 'Astro'],
                    // Medium priority: Site builders and common unknowns
                    'medium': ['Webflow', 'Wix', 'unknown', 'custom', 'Custom Framework'],
                    // Low priority: Specialized tools (analyze only if time permits)
                    'low': ['Roundcube', 'Jira', 'cPanel', 'Apache HTTP Server', 'Web.com']
                };
                
                // Flatten priority list - start with just high priority for testing
                const priorityOrder = [...techPriority.high, ...techPriority.medium, ...techPriority.low];
                const sortedTechs = priorityOrder.filter(tech => analysesByTech[tech])
                    .concat(Object.keys(analysesByTech).filter(tech => !priorityOrder.includes(tech)))
; // Process all technologies
                
                console.log(`\nProcessing technologies in priority order:`);
                sortedTechs.forEach((tech, i) => {
                    const count = analysesByTech[tech]?.length || 0;
                    const priority = techPriority.high.includes(tech) ? 'HIGH' : 
                                   techPriority.medium.includes(tech) ? 'MED' : 'LOW';
                    console.log(`  ${i+1}. ${tech}: ${count} sites [${priority}]`);
                });
                
                // Process each technology separately, then combine results
                const techAnalyses: any[] = [];
                
                for (const technology of sortedTechs) {
                    const techAnalysesList = analysesByTech[technology];
                    if (!techAnalysesList) continue;
                    const analyses = techAnalysesList as any[];
                    if (analyses.length === 0) continue;
                    
                    // Take up to 15 most recent analyses per technology for comprehensive coverage
                    const sampledForTech = analyses
                        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .slice(0, 15)
                        .map((analysis: any) => ({
                            url: analysis.url,
                            analysisId: analysis.analysisId,
                            timestamp: analysis.timestamp,
                            technology: analysis.technology,
                            confidence: analysis.confidence,
                            patterns: {
                                keyPatterns: analysis.analysisData?.analysis?.keyPatterns || [],
                                implementablePatterns: analysis.analysisData?.analysis?.implementablePatterns || []
                            }
                        }));
                    
                    console.log(`Analyzing ${sampledForTech.length} ${technology} sites (${analyses.length} total)...`);
                    
                    const techData = {
                        metadata: {
                            technology,
                            total_analyses: sampledForTech.length,
                            original_total: analyses.length,
                            generation_timestamp: new Date().toISOString(),
                            data_source: 'technology_grouped_analyses'
                        },
                        analyses: sampledForTech
                    };
                    
                    try {
                        // Use specified model or default to Gemini for efficiency
                        const techAnalysis = await performDirectLLMAnalysis(
                            techData,
                            createTechnologyMetaAnalysisPrompt(technology),
                            options.model || 'gemini-1.5-flash'
                        );
                        
                        if (techAnalysis.validationStatus !== 'invalid') {
                            techAnalyses.push({
                                technology,
                                analysis: techAnalysis.parsedJson,
                                metadata: {
                                    analysisCount: sampledForTech.length,
                                    totalCount: analyses.length,
                                    tokenUsage: techAnalysis.tokenUsage
                                }
                            });
                        }
                    } catch (error) {
                        console.warn(`Failed to analyze ${technology}: ${(error as Error).message}`);
                    }
                }
                
                // Combine results into final meta-analysis
                const combinedMetaAnalysis = {
                    meta_analysis_overview: {
                        total_analyses_reviewed: existingAnalyses.length,
                        technologies_analyzed: Object.keys(analysesByTech),
                        successful_tech_analyses: techAnalyses.length,
                        analysis_timestamp: new Date().toISOString()
                    },
                    technology_analyses: techAnalyses,
                    summary: {
                        total_token_usage: techAnalyses.reduce((sum, ta) => sum + (ta.metadata.tokenUsage?.totalTokens || 0), 0),
                        coverage_by_technology: Object.entries(analysesByTech).map(([tech, techList]) => ({
                            technology: tech,
                            total_sites: (techList as any[]).length,
                            analyzed_sites: techAnalyses.find(ta => ta.technology === tech)?.metadata.analysisCount || 0
                        }))
                    }
                };
                
                const metaAnalysis = {
                    rawResponse: JSON.stringify(combinedMetaAnalysis, null, 2),
                    parsedJson: combinedMetaAnalysis,
                    parseErrors: [],
                    validationStatus: 'valid' as const,
                    tokenUsage: {
                        totalTokens: techAnalyses.reduce((sum, ta) => sum + (ta.metadata.tokenUsage?.totalTokens || 0), 0),
                        promptTokens: techAnalyses.reduce((sum, ta) => sum + (ta.metadata.tokenUsage?.promptTokens || 0), 0),
                        completionTokens: techAnalyses.reduce((sum, ta) => sum + (ta.metadata.tokenUsage?.completionTokens || 0), 0)
                    }
                };
                
                // Display meta-analysis results
                console.log('\n' + '='.repeat(80));
                console.log('META-ANALYSIS RESULTS');
                console.log('='.repeat(80));
                console.log('\nRaw Response (first 1000 chars):');
                console.log(metaAnalysis.rawResponse.substring(0, 1000));
                console.log('\nParse Errors:', metaAnalysis.parseErrors);
                console.log('\nMeta-Analysis:');
                console.log(JSON.stringify(metaAnalysis.parsedJson, null, 2));
                console.log('\nToken Usage:', metaAnalysis.tokenUsage);
                console.log('Validation Status:', metaAnalysis.validationStatus);
                
                logger.info('Meta-analysis completed', { 
                    validationStatus: metaAnalysis.validationStatus,
                    tokenUsage: metaAnalysis.tokenUsage
                });
                
                return;
            }
            
            // Check if input is provided for normal analysis
            if (!input) {
                console.error('Error: Please provide a URL or CSV file');
                process.exit(1);
            }
            
            const inputType = detectInputType(input);
            
            // Handle cross-site analysis
            if (options.crossSiteAnalysis) {
                if (inputType === 'url') {
                    console.error('Error: Cross-site analysis requires multiple URLs. Please provide a CSV file.');
                    process.exit(1);
                }
                
                const urls = extractUrlsFromCSV(input);
                logger.info('Starting cross-site pattern analysis', { 
                    urlCount: urls.length,
                    model: options.model
                });
                
                console.log(`Performing cross-site pattern analysis for ${urls.length} URLs...`);
                
                // Collect data from all sites and perform cross-site analysis
                await aggregateDataForBulkUpload(
                    urls,
                    '__temp_cross_site_data__.json',
                    options.forceFresh
                );
                
                const crossSiteAnalysis = await performBulkLLMAnalysis(
                    '__temp_cross_site_data__.json',
                    BULK_CMS_ANALYSIS_PROMPT,
                    options.model || 'gpt-4o'
                );
                
                // Clean up temporary file
                try {
                    await import('fs').then(fs => 
                        fs.promises.unlink('__temp_cross_site_data__.json')
                    );
                } catch {
                    // Ignore cleanup errors
                }
                
                // Display cross-site analysis results
                console.log('\n' + '='.repeat(80));
                console.log('CROSS-SITE PATTERN ANALYSIS RESULTS');
                console.log('='.repeat(80));
                console.log('\nCross-Site Analysis:');
                console.log(JSON.stringify(crossSiteAnalysis.parsedJson, null, 2));
                console.log('\nToken Usage:', crossSiteAnalysis.tokenUsage);
                console.log('Validation Status:', crossSiteAnalysis.validationStatus);
                
                logger.info('Cross-site analysis completed', { 
                    validationStatus: crossSiteAnalysis.validationStatus,
                    tokenUsage: crossSiteAnalysis.tokenUsage
                });
                
                return;
            }
            
            if (inputType === 'url') {
                // Single URL processing
                logger.info('Starting learn analysis for single URL', { 
                    url: input, 
                    options 
                });
                
                const results = await processLearnBatch([input], options);
                displayResults(results);
                
                // Display detailed analysis reports unless summary-only mode
                if (!options.summary) {
                    await displayDetailedAnalysisReports(results);
                }
                
                logger.info('Learn analysis completed', { 
                    url: input, 
                    success: results[0]?.success,
                    analysisId: results[0]?.analysisId
                });
                
            } else {
                // CSV batch processing
                logger.info('Starting CSV batch learn analysis', { 
                    file: input, 
                    options 
                });
                
                const urls = extractUrlsFromCSV(input);
                logger.info('Extracted URLs from CSV', { count: urls.length });
                
                const results = await processLearnBatch(urls, options);
                displayResults(results);
                
                // Display detailed analysis reports unless summary-only mode
                if (!options.summary) {
                    await displayDetailedAnalysisReports(results);
                }
                
                logger.info('CSV batch learn analysis completed', { 
                    total: results.length, 
                    successful: results.filter(r => r.success).length,
                    failed: results.filter(r => !r.success).length
                });
            }
            
        } catch (error) {
            logger.error('Learn command failed', { input }, error as Error);
            console.error('Learn analysis failed:', (error as Error).message);
            process.exit(1);
        } finally {
            // Ensure clean exit to prevent hanging
            // Give a small delay to ensure all async operations complete
            setTimeout(() => {
                process.exit(0);
            }, 100);
        }
    });