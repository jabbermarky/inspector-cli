import { createModuleLogger } from '../utils/logger.js';
import { LearnOptions, LearnResult, AnalysisResult, EnhancedDataCollection, LLMResponse } from './types.js';
import { collectEnhancedData, retrieveCollectedData, collectEnhancedDataWithFallback } from './data-collection.js';
import { performLLMAnalysis, formatPrompt, estimateTokensAndCost } from './llm-integration.js';
import { storeAnalysisResult } from './storage.js';
import { CMS_DETECTION_PROMPT } from '../prompts.js';
import { performPhasedAnalysis, PhasedAnalysisConfig } from '../utils/cms/phased-analysis.js';

const logger = createModuleLogger('learn-analysis');

/**
 * Generate unique analysis ID
 */
export function generateAnalysisId(): string {
    return `learn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Process single URL for learn analysis
 */
export async function processLearnAnalysis(url: string, options: LearnOptions): Promise<LearnResult> {
    const analysisId = generateAnalysisId();
    
    try {
        logger.info('Starting learn analysis', { url, analysisId, options });
        
        // Step 1: Get data (collect fresh with fallback or retrieve existing)
        let data: EnhancedDataCollection;
        if (options.collectData) {
            logger.info('Collecting fresh data with fallback', { url, forceFresh: options.forceFresh });
            data = await collectEnhancedDataWithFallback(url, options.forceFresh, options.headed);
        } else {
            logger.info('Attempting to retrieve existing data', { url });
            const existingData = await retrieveCollectedData(url);
            if (!existingData) {
                logger.warn('No existing data found, collecting fresh data with fallback', { url });
                data = await collectEnhancedDataWithFallback(url, options.forceFresh, options.headed);
            } else {
                data = existingData;
            }
        }
        
        // Step 2: Format prompt
        const promptTemplate = options.promptTemplate === 'cms-detection' ? CMS_DETECTION_PROMPT : CMS_DETECTION_PROMPT;
        const prompt = formatPrompt(promptTemplate, data);
        
        // Step 3: Handle dry run
        if (options.dryRun) {
            console.log('=== DRY RUN MODE ===');
            console.log('URL:', url);
            console.log('Model:', options.model || 'gpt-4o');
            console.log('Prompt length:', prompt.length, 'characters');
            console.log('Data collected:', !!data);
            console.log('=== END DRY RUN ===');
            return { url, success: true, analysisId };
        }
        
        // Step 4: Cost estimation
        if (options.costEstimate) {
            const { tokens, cost } = estimateTokensAndCost(prompt, options.model || 'gpt-4o');
            console.log(`Estimated tokens: ${tokens}`);
            console.log(`Estimated cost: $${cost.toFixed(4)}`);
        }
        
        // Step 5: Perform LLM analysis (single-phase or two-phase)
        let llmResponse;
        
        if (options.phasedAnalysis) {
            logger.info('Performing two-phase LLM analysis', { url, model: options.model || 'gpt-4o' });
            
            // Convert data to string format for phased analysis
            const dataString = JSON.stringify({
                url: data.url,
                htmlContent: data.htmlContent,
                scripts: data.scripts,
                metaTags: data.metaTags,
                httpHeaders: data.httpHeaders,
                robotsTxt: data.robotsTxt,
                domStructure: data.domStructure
            }, null, 2);
            
            const phasedConfig: PhasedAnalysisConfig = {
                model: options.model || 'gpt-4o',
                enablePhasing: true,
                phase1Temperature: 0.2,
                phase2Temperature: 0.0
            };
            
            // Add mixed model support if specified
            if (options.modelPhase1 || options.modelPhase2) {
                phasedConfig.mixedModels = {
                    phase1Model: options.modelPhase1 || options.model || 'gpt-4o',
                    phase2Model: options.modelPhase2 || options.model || 'gpt-4o'
                };
                
                logger.info('Using mixed model configuration', {
                    phase1Model: phasedConfig.mixedModels.phase1Model,
                    phase2Model: phasedConfig.mixedModels.phase2Model
                });
            }
            
            const phasedResult = await performPhasedAnalysis(dataString, phasedConfig);
            
            if (phasedResult.success && phasedResult.result) {
                // Convert phased result back to LLMResponse format
                llmResponse = {
                    rawResponse: JSON.stringify(phasedResult.result, null, 2),
                    parsedJson: phasedResult.result,
                    parseErrors: [],
                    validationStatus: 'valid' as const,
                    tokenUsage: {
                        totalTokens: phasedResult.totalTokens,
                        promptTokens: Math.floor(phasedResult.totalTokens * 0.7), // Estimate
                        completionTokens: Math.floor(phasedResult.totalTokens * 0.3) // Estimate
                    },
                    phasedAnalysis: true,
                    phases: phasedResult.phases,
                    totalCost: phasedResult.totalCost,
                    totalDuration: phasedResult.totalDuration,
                    mixedModels: phasedResult.mixedModels
                };
            } else {
                throw new Error(`Phased analysis failed: ${phasedResult.error}`);
            }
        } else {
            logger.info('Performing single-phase LLM analysis', { url, model: options.model || 'gpt-4o' });
            llmResponse = await performLLMAnalysis(data, prompt, options.model || 'gpt-4o');
        }
        
        // Step 6: Extract insights from LLM response
        const analysisInsights = extractAnalysisInsights(llmResponse);
        
        // Step 7: Create analysis result
        const analysisResult: AnalysisResult = {
            metadata: {
                analysisId,
                url,
                timestamp: new Date().toISOString(),
                model: options.model || 'gpt-4o',
                promptTemplate: options.promptTemplate || 'cms-detection',
                promptVersion: '1.0',
                dataSource: determineDataSource(options, data),
                tokenCount: llmResponse.tokenUsage?.totalTokens || 0,
                estimatedCost: calculateActualCost(llmResponse.tokenUsage, options.model || 'gpt-4o'),
                timingMetrics: extractTimingMetrics(llmResponse)
            },
            inputData: {
                url: data.url, // Use normalized URL from data collection
                collectionMetadata: {
                    timestamp: data.timestamp,
                    enhanced: true
                },
                enhancedData: data
            },
            llmResponse,
            analysis: analysisInsights
        };
        
        // Step 7: Store result
        await storeAnalysisResult(analysisResult);
        
        logger.info('Learn analysis completed successfully', { url, analysisId });
        return { 
            url, 
            success: true, 
            analysisId,
            analysis: {
                technology: analysisInsights.technologyDetected,
                confidence: analysisInsights.confidence,
                keyPatterns: analysisInsights.keyPatterns,
                cost: analysisResult.metadata.estimatedCost,
                tokenCount: analysisResult.metadata.tokenCount,
                dataSource: analysisResult.metadata.dataSource
            }
        };
        
    } catch (error) {
        logger.error('Learn analysis failed', { url, analysisId }, error as Error);
        return { 
            url, 
            success: false, 
            analysisId,
            error: (error as Error).message 
        };
    }
}

/**
 * Process batch of URLs for learn analysis
 */
export async function processLearnBatch(urls: string[], options: LearnOptions): Promise<LearnResult[]> {
    const results: LearnResult[] = [];
    const total = urls.length;
    let completed = 0;
    
    logger.info('Starting batch learn analysis', { total, options });
    console.log(`Processing learn analysis for ${total} URLs...`);
    
    for (const url of urls) {
        try {
            const result = await processLearnAnalysis(url, options);
            completed++;
            
            if (result.success && result.analysis) {
                const confidence = (result.analysis.confidence * 100).toFixed(0);
                const dataSourceIndicator = result.analysis.dataSource === 'fallback-cached' ? ' [fallback]' : '';
                console.log(`[${completed}/${total}] ✓ ${url} → ${result.analysis.technology} (${confidence}% confidence)${dataSourceIndicator}`);
            } else if (result.success) {
                console.log(`[${completed}/${total}] ✓ ${url} → Analysis: ${result.analysisId}`);
            } else {
                console.log(`[${completed}/${total}] ✗ ${url} → Error: ${result.error}`);
            }
            
            results.push(result);
            
        } catch (error) {
            completed++;
            const result: LearnResult = {
                url,
                success: false,
                error: (error as Error).message
            };
            
            console.log(`[${completed}/${total}] ✗ ${url} → Error: ${result.error}`);
            results.push(result);
        }
    }
    
    logger.info('Batch learn analysis completed', { 
        total, 
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
    });
    
    return results;
}

/**
 * Extract analysis insights from LLM response
 */
function extractAnalysisInsights(llmResponse: LLMResponse): {
    confidence: number;
    technologyDetected: string;
    keyPatterns: string[];
    implementablePatterns: string[];
} {
    const defaultInsights = {
        confidence: 0,
        technologyDetected: 'Unknown',
        keyPatterns: [],
        implementablePatterns: []
    };
    
    if (llmResponse.validationStatus === 'invalid' || !llmResponse.parsedJson) {
        return defaultInsights;
    }
    
    try {
        const json = llmResponse.parsedJson;
        
        // Extract technology detection - handle both old and new phased analysis formats
        let technologyDetected = 'Unknown';
        let confidence = 0;
        
        if (json.technology && json.confidence !== undefined) {
            // New phased analysis format
            technologyDetected = json.technology;
            confidence = json.confidence;
        } else if (json.platform_identification?.detected_technology) {
            // Old single-phase format
            technologyDetected = json.platform_identification.detected_technology;
            confidence = json.platform_identification.confidence || 0;
        }
        
        // Extract key patterns - handle both formats
        const keyPatterns: string[] = [];
        
        if (json.patterns && Array.isArray(json.patterns)) {
            // New phased analysis format (Phase 1)
            keyPatterns.push(...json.patterns.map((p: any) => p.pattern_name || p.name || '').filter(Boolean));
        } else if (json.standardized_patterns && Array.isArray(json.standardized_patterns)) {
            // New phased analysis format (Phase 2)
            keyPatterns.push(...json.standardized_patterns.map((p: any) => p.pattern_name || p.name || '').filter(Boolean));
        } else if (json.discriminative_patterns?.high_confidence) {
            // Old single-phase format
            keyPatterns.push(...json.discriminative_patterns.high_confidence.map((p: any) => p.pattern || '').filter(Boolean));
        }
        
        // Extract implementable patterns - handle both formats
        const implementablePatterns: string[] = [];
        
        if (json.patterns && Array.isArray(json.patterns)) {
            // New phased analysis format (Phase 1) - use pattern values as implementable patterns
            implementablePatterns.push(...json.patterns.map((p: any) => p.value || '').filter(Boolean));
        } else if (json.standardized_patterns && Array.isArray(json.standardized_patterns)) {
            // New phased analysis format (Phase 2) - use pattern names as implementable patterns
            implementablePatterns.push(...json.standardized_patterns.map((p: any) => p.pattern_name || '').filter(Boolean));
        } else if (json.implementation_recommendations?.regex_patterns) {
            // Old single-phase format
            implementablePatterns.push(...json.implementation_recommendations.regex_patterns);
        }
        if (json.implementation_recommendations?.required_combinations) {
            implementablePatterns.push(...json.implementation_recommendations.required_combinations);
        }
        
        return {
            confidence: Math.max(0, Math.min(1, confidence)), // Ensure 0-1 range
            technologyDetected,
            keyPatterns: keyPatterns.slice(0, 10), // Limit to top 10
            implementablePatterns: implementablePatterns.slice(0, 10) // Limit to top 10
        };
        
    } catch (error) {
        logger.error('Failed to extract analysis insights', { error: (error as Error).message });
        return defaultInsights;
    }
}

/**
 * Extract timing metrics from LLM response
 */
function extractTimingMetrics(llmResponse: LLMResponse): any {
    const metrics: any = {};
    
    // Handle phased analysis timing
    if (llmResponse.phasedAnalysis && llmResponse.phases) {
        // Extract phase-specific timing
        const phase1 = llmResponse.phases.find((p: any) => p.phase === 1);
        const phase2 = llmResponse.phases.find((p: any) => p.phase === 2);
        
        if (phase1?.timingMetrics) {
            metrics.phase1DurationMs = phase1.timingMetrics.apiCallDurationMs;
        }
        if (phase2?.timingMetrics) {
            metrics.phase2DurationMs = phase2.timingMetrics.apiCallDurationMs;
        }
        
        metrics.totalDurationMs = llmResponse.totalDuration;
        
        // Calculate network latency as average of both phases
        const networkLatencies = [];
        if (phase1?.timingMetrics?.networkLatencyMs) networkLatencies.push(phase1.timingMetrics.networkLatencyMs);
        if (phase2?.timingMetrics?.networkLatencyMs) networkLatencies.push(phase2.timingMetrics.networkLatencyMs);
        if (networkLatencies.length > 0) {
            metrics.networkLatencyMs = networkLatencies.reduce((a, b) => a + b, 0) / networkLatencies.length;
        }
    } else if (llmResponse.timingMetrics) {
        // Single-phase timing
        metrics.apiCallDurationMs = llmResponse.timingMetrics.apiCallDurationMs;
        metrics.totalDurationMs = llmResponse.timingMetrics.apiCallDurationMs;
        metrics.networkLatencyMs = llmResponse.timingMetrics.networkLatencyMs;
        metrics.processingLatencyMs = llmResponse.timingMetrics.processingLatencyMs;
    }
    
    return Object.keys(metrics).length > 0 ? metrics : undefined;
}

/**
 * Calculate actual cost based on token usage
 */
function calculateActualCost(tokenUsage: any, model: string): number {
    if (!tokenUsage) return 0;
    
    const { promptTokens = 0, completionTokens = 0 } = tokenUsage;
    
    // Updated pricing based on current OpenAI rates
    let costPerInputToken = 0.00000250; // Default GPT-4o pricing
    let costPerOutputToken = 0.00001000;
    
    if (model.includes('gpt-4o')) {
        costPerInputToken = 0.00000250; // $2.50 per 1M input tokens
        costPerOutputToken = 0.00001000; // $10.00 per 1M output tokens
    } else if (model.includes('gpt-4-turbo')) {
        costPerInputToken = 0.00001000;
        costPerOutputToken = 0.00003000;
    } else if (model.includes('gpt-4')) {
        costPerInputToken = 0.00003000;
        costPerOutputToken = 0.00006000;
    } else if (model.includes('gpt-3.5-turbo')) {
        costPerInputToken = 0.00000050;
        costPerOutputToken = 0.00000150;
    }
    
    return (promptTokens * costPerInputToken) + (completionTokens * costPerOutputToken);
}

/**
 * Determine the data source for metadata based on options and data characteristics
 */
function determineDataSource(options: LearnOptions, data: EnhancedDataCollection): 'fresh' | 'cached' | 'fallback-cached' {
    const now = new Date();
    const dataTimestamp = new Date(data.timestamp);
    const ageInMinutes = (now.getTime() - dataTimestamp.getTime()) / (1000 * 60);
    
    if (options.collectData) {
        // If we explicitly collected data but it's old, it was likely a fallback
        if (ageInMinutes > 10) {
            return 'fallback-cached';
        }
        return 'fresh';
    } else {
        // Explicitly requested cached data
        return 'cached';
    }
}