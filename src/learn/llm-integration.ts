import { createModuleLogger } from '../utils/logger.js';
import { LLMResponse, EnhancedDataCollection } from './types.js';
import { getConfig, ConfigValidator } from '../utils/config.js';
import { withRetryOpenAI } from '../utils/retry.js';
import OpenAI from 'openai';

const logger = createModuleLogger('learn-llm-integration');

// Lazy initialization of OpenAI client
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const config = getConfig();
    
    // Validate OpenAI configuration strictly when actually needed
    ConfigValidator.validateForOpenAI(config);
    
    openaiClient = new OpenAI({ apiKey: config.openai.apiKey });
    logger.debug('OpenAI client initialized for learn command');
  }
  return openaiClient;
}

/**
 * Perform LLM analysis using OpenAI API
 */
export async function performLLMAnalysis(
    data: EnhancedDataCollection, 
    prompt: string, 
    model: string
): Promise<LLMResponse> {
    logger.info('Starting LLM analysis', { 
        url: data.url, 
        model, 
        promptLength: prompt.length 
    });
    
    try {
        const config = getConfig();
        const openai = getOpenAIClient();
        
        const createParams: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
            model: model || config.openai.model,
            response_format: { "type": "json_object" },
            messages: [
                { role: "system", content: "You are an expert web technology analyst. Always return valid JSON." },
                { role: "user", content: prompt }
            ],
            max_tokens: config.openai.maxTokens,
            temperature: config.openai.temperature,
            top_p: config.openai.topP,
        };
        
        logger.info('Calling OpenAI Chat API for learn analysis', { 
            model: createParams.model, 
            maxTokens: createParams.max_tokens 
        });
        
        const response = await withRetryOpenAI(
            () => openai.chat.completions.create(createParams),
            'OpenAI Learn Analysis API call'
        );
        
        if (!response.choices || response.choices.length === 0 || !response.choices[0].message) {
            throw new Error('Invalid response from OpenAI API - no choices returned');
        }
        
        const rawResponse = response.choices[0].message.content || '';
        const tokenUsage = response.usage;
        
        logger.debug('OpenAI API response received', { 
            url: data.url,
            model,
            responseLength: rawResponse.length,
            tokensUsed: tokenUsage?.total_tokens,
            promptTokens: tokenUsage?.prompt_tokens,
            completionTokens: tokenUsage?.completion_tokens
        });
        
        // Parse JSON response
        const parseResult = parseAndValidateResponse(rawResponse);
        
        const llmResponse: LLMResponse = {
            rawResponse,
            parsedJson: parseResult.json,
            parseErrors: parseResult.errors,
            validationStatus: parseResult.status,
            tokenUsage: {
                totalTokens: tokenUsage?.total_tokens || 0,
                promptTokens: tokenUsage?.prompt_tokens || 0,
                completionTokens: tokenUsage?.completion_tokens || 0
            }
        };
        
        logger.info('LLM analysis completed successfully', { 
            url: data.url,
            model,
            validationStatus: llmResponse.validationStatus,
            totalTokens: llmResponse.tokenUsage?.totalTokens,
            parseErrors: llmResponse.parseErrors.length
        });
        
        return llmResponse;
        
    } catch (error) {
        logger.error('LLM analysis failed', { url: data.url, model }, error as Error);
        throw error;
    }
}

/**
 * Format prompt template with collected data
 */
export function formatPrompt(template: string, data: EnhancedDataCollection): string {
    logger.debug('Formatting prompt template', { 
        url: data.url,
        templateLength: template.length 
    });
    
    return template
        .replace('{url}', data.url)
        .replace('{timestamp}', data.timestamp)
        .replace('{httpHeaders}', JSON.stringify(data.httpHeaders, null, 2))
        .replace('{robotsTxtContent}', data.robotsTxt?.content || 'Not available')
        .replace('{robotsTxtHeaders}', JSON.stringify(data.robotsTxt?.headers || {}, null, 2))
        .replace('{metaTags}', JSON.stringify(data.metaTags, null, 2))
        .replace('{externalScripts}', JSON.stringify(data.scripts?.filter(s => s.src), null, 2))
        .replace('{inlineScripts}', JSON.stringify(data.scripts?.filter(s => !s.src), null, 2))
        .replace('{classPatterns}', JSON.stringify(data.domStructure?.classPatterns || [], null, 2))
        .replace('{idPatterns}', JSON.stringify(data.domStructure?.idPatterns || [], null, 2))
        .replace('{dataAttributes}', JSON.stringify(data.domStructure?.dataAttributes || [], null, 2))
        .replace('{htmlComments}', JSON.stringify(data.domStructure?.comments || [], null, 2));
}

/**
 * Parse and validate JSON response from LLM
 */
function parseAndValidateResponse(rawResponse: string): {
    json: any;
    errors: string[];
    status: 'valid' | 'invalid' | 'partial';
} {
    const errors: string[] = [];
    let json: any = {};
    let status: 'valid' | 'invalid' | 'partial' = 'invalid';
    
    try {
        json = JSON.parse(rawResponse);
        status = 'valid';
        
        // Validate expected structure
        const validationErrors = validateCMSDetectionResponse(json);
        if (validationErrors.length > 0) {
            errors.push(...validationErrors);
            status = 'partial';
        }
        
    } catch (parseError) {
        errors.push(`JSON parse error: ${(parseError as Error).message}`);
        
        // Try to extract partial JSON
        try {
            const partialJson = extractPartialJSON(rawResponse);
            if (partialJson) {
                json = partialJson;
                status = 'partial';
                errors.push('Extracted partial JSON from malformed response');
            }
        } catch (extractError) {
            errors.push(`Failed to extract partial JSON: ${(extractError as Error).message}`);
        }
    }
    
    return { json, errors, status };
}

/**
 * Validate CMS detection response structure
 */
function validateCMSDetectionResponse(json: any): string[] {
    const errors: string[] = [];
    
    // Required top-level fields
    const requiredFields = [
        'platform_identification',
        'discriminative_patterns',
        'version_information',
        'infrastructure_analysis',
        'implementation_recommendations'
    ];
    
    for (const field of requiredFields) {
        if (!json[field]) {
            errors.push(`Missing required field: ${field}`);
        }
    }
    
    // Validate platform_identification structure
    if (json.platform_identification) {
        if (!json.platform_identification.detected_technology) {
            errors.push('Missing platform_identification.detected_technology');
        }
        if (typeof json.platform_identification.confidence !== 'number') {
            errors.push('platform_identification.confidence must be a number');
        }
    }
    
    // Validate discriminative_patterns structure
    if (json.discriminative_patterns) {
        const patternLevels = ['high_confidence', 'medium_confidence', 'low_confidence'];
        for (const level of patternLevels) {
            if (json.discriminative_patterns[level] && !Array.isArray(json.discriminative_patterns[level])) {
                errors.push(`discriminative_patterns.${level} must be an array`);
            }
        }
    }
    
    return errors;
}

/**
 * Extract partial JSON from malformed response
 */
function extractPartialJSON(response: string): any | null {
    // Try to find JSON object boundaries
    const jsonStart = response.indexOf('{');
    const jsonEnd = response.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
        return null;
    }
    
    const jsonCandidate = response.substring(jsonStart, jsonEnd + 1);
    
    try {
        return JSON.parse(jsonCandidate);
    } catch {
        return null;
    }
}

/**
 * Estimate token count and cost for LLM analysis
 */
export function estimateTokensAndCost(prompt: string, model: string): { tokens: number; cost: number } {
    // Rough token estimation (4 characters per token)
    const tokens = Math.ceil(prompt.length / 4);
    
    // Updated cost estimation based on current OpenAI pricing (as of 2024)
    let costPerInputToken = 0.00003; // Default GPT-4o pricing
    let costPerOutputToken = 0.00006; // Default GPT-4o pricing
    
    if (model.includes('gpt-4o')) {
        costPerInputToken = 0.00000250; // $2.50 per 1M input tokens
        costPerOutputToken = 0.00001000; // $10.00 per 1M output tokens
    } else if (model.includes('gpt-4-turbo')) {
        costPerInputToken = 0.00001000; // $10.00 per 1M input tokens
        costPerOutputToken = 0.00003000; // $30.00 per 1M output tokens
    } else if (model.includes('gpt-4')) {
        costPerInputToken = 0.00003000; // $30.00 per 1M input tokens
        costPerOutputToken = 0.00006000; // $60.00 per 1M output tokens
    } else if (model.includes('gpt-3.5-turbo')) {
        costPerInputToken = 0.00000050; // $0.50 per 1M input tokens
        costPerOutputToken = 0.00000150; // $1.50 per 1M output tokens
    }
    
    // Estimate input and output tokens (assume 1/3 output, 2/3 input)
    const inputTokens = Math.ceil(tokens * 0.67);
    const outputTokens = Math.ceil(tokens * 0.33);
    
    const cost = (inputTokens * costPerInputToken) + (outputTokens * costPerOutputToken);
    
    return { tokens, cost };
}