import { createModuleLogger } from '../utils/logger.js';
import { LearnOptions, LearnResult, AnalysisResult, EnhancedDataCollection, LLMResponse } from './types.js';
import { collectEnhancedData, retrieveCollectedData, collectEnhancedDataWithFallback } from './data-collection.js';
import { performLLMAnalysis, formatPrompt, estimateTokensAndCost } from './llm-integration.js';
import { storeAnalysisResult } from './storage.js';
import { CMS_DETECTION_PROMPT } from '../prompts.js';

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
            data = await collectEnhancedDataWithFallback(url, options.forceFresh);
        } else {
            logger.info('Attempting to retrieve existing data', { url });
            const existingData = await retrieveCollectedData(url);
            if (!existingData) {
                logger.warn('No existing data found, collecting fresh data with fallback', { url });
                data = await collectEnhancedDataWithFallback(url, options.forceFresh);
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
        
        // Step 5: Perform LLM analysis
        logger.info('Performing LLM analysis', { url, model: options.model || 'gpt-4o' });
        const llmResponse = await performLLMAnalysis(data, prompt, options.model || 'gpt-4o');
        
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
                estimatedCost: calculateActualCost(llmResponse.tokenUsage, options.model || 'gpt-4o')
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
        
        // Extract technology detection
        const technologyDetected = json.platform_identification?.detected_technology || 'Unknown';
        const confidence = json.platform_identification?.confidence || 0;
        
        // Extract key patterns from high confidence discriminative patterns
        const keyPatterns: string[] = [];
        if (json.discriminative_patterns?.high_confidence) {
            keyPatterns.push(...json.discriminative_patterns.high_confidence.map((p: any) => p.pattern || '').filter(Boolean));
        }
        
        // Extract implementable patterns from implementation recommendations
        const implementablePatterns: string[] = [];
        if (json.implementation_recommendations?.regex_patterns) {
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