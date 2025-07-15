import { createModuleLogger } from '../utils/logger.js';
import { LLMResponse, EnhancedDataCollection } from './types.js';
import { getConfig, ConfigValidator } from '../utils/config.js';
import { withRetryOpenAI } from '../utils/retry.js';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import { detectModelProvider, ModelProvider } from './model-providers.js';

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

// Lazy initialization of Gemini client
let geminiClient: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY environment variable is required');
    }
    geminiClient = new GoogleGenerativeAI(apiKey);
    logger.debug('Gemini client initialized for learn command');
  }
  return geminiClient;
}

/**
 * Perform LLM analysis routing to appropriate provider based on model
 */
export async function performLLMAnalysis(
    data: EnhancedDataCollection, 
    prompt: string, 
    model: string
): Promise<LLMResponse> {
    const modelInfo = detectModelProvider(model);
    
    logger.info('Starting LLM analysis', { 
        url: data.url, 
        model, 
        provider: modelInfo.provider,
        promptLength: prompt.length 
    });
    
    // Route to appropriate provider
    if (modelInfo.provider === 'gemini') {
        return performGeminiAnalysis(data, prompt, model, 'cms-detection');
    }
    
    // Default to OpenAI
    return performOpenAIAnalysis(data, prompt, model);
}

/**
 * Perform LLM analysis using OpenAI API
 */
async function performOpenAIAnalysis(
    data: EnhancedDataCollection, 
    prompt: string, 
    model: string
): Promise<LLMResponse> {
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
        .replace('{dataQuality}', data.dataQuality?.quality || 'unknown')
        .replace('{dataQualityScore}', data.dataQuality?.score?.toFixed(2) || '0.00')
        .replace('{dataQualityIssues}', data.dataQuality?.issues?.join(', ') || 'none')
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
function parseAndValidateResponse(rawResponse: string, responseType: 'cms-detection' | 'meta-analysis' = 'cms-detection'): {
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
        
        // Validate expected structure based on response type
        let validationErrors: string[] = [];
        if (responseType === 'meta-analysis') {
            validationErrors = validateMetaAnalysisResponse(json);
        } else {
            validationErrors = validateCMSDetectionResponse(json);
        }
        
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
 * Validate meta-analysis response structure
 */
function validateMetaAnalysisResponse(json: any): string[] {
    const errors: string[] = [];
    
    // Required top-level fields for meta-analysis
    const requiredFields = [
        'meta_analysis_overview',
        'pattern_consensus',
        'technology_consensus',
        'quality_assessment',
        'implementation_recommendations'
    ];
    
    for (const field of requiredFields) {
        if (!json[field]) {
            errors.push(`Missing required meta-analysis field: ${field}`);
        }
    }
    
    // Validate meta_analysis_overview structure
    if (json.meta_analysis_overview) {
        if (typeof json.meta_analysis_overview.total_analyses_reviewed !== 'string' && 
            typeof json.meta_analysis_overview.total_analyses_reviewed !== 'number') {
            errors.push('meta_analysis_overview.total_analyses_reviewed must be a string or number');
        }
        if (!Array.isArray(json.meta_analysis_overview.technologies_found)) {
            errors.push('meta_analysis_overview.technologies_found must be an array');
        }
    }
    
    // Validate pattern_consensus structure
    if (json.pattern_consensus) {
        const consensusLevels = ['high_consensus_patterns', 'medium_consensus_patterns', 'low_consensus_patterns'];
        for (const level of consensusLevels) {
            if (json.pattern_consensus[level] && !Array.isArray(json.pattern_consensus[level])) {
                errors.push(`pattern_consensus.${level} must be an array`);
            }
        }
    }
    
    return errors;
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

/**
 * Perform direct LLM analysis with Gemini API (faster and cheaper)
 */
export async function performGeminiAnalysis(
    data: any,
    prompt: string,
    model: string = 'gemini-1.5-flash',
    responseType: 'cms-detection' | 'meta-analysis' = 'cms-detection'
): Promise<LLMResponse> {
    logger.info('Starting Gemini analysis', { 
        model,
        promptLength: prompt.length,
        dataSize: JSON.stringify(data).length 
    });
    
    try {
        const gemini = getGeminiClient();
        const geminiModel = gemini.getGenerativeModel({ model });
        
        // Inject data directly into prompt
        const dataJsonString = JSON.stringify(data, null, 2);
        const fullPrompt = `${prompt}\n\n** DATA TO ANALYZE **\n${dataJsonString}`;
        
        logger.info('Performing Gemini analysis', { 
            fullPromptLength: fullPrompt.length,
            estimatedTokens: Math.ceil(fullPrompt.length / 4)
        });
        
        const result = await geminiModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 4000,
                responseMimeType: 'application/json'
            }
        });
        
        const rawResponse = result.response.text();
        
        // Extract usage metrics (Gemini provides these differently)
        const tokenUsage = {
            totalTokens: (result.response.usageMetadata?.totalTokenCount || 0),
            promptTokens: (result.response.usageMetadata?.promptTokenCount || 0),
            completionTokens: (result.response.usageMetadata?.candidatesTokenCount || 0)
        };
        
        logger.info('Gemini analysis completed', { 
            responseLength: rawResponse.length,
            tokenUsage
        });
        
        // Parse and validate the response
        const { json, errors, status } = parseAndValidateResponse(rawResponse, responseType);
        
        const response: LLMResponse = {
            rawResponse,
            parsedJson: json,
            parseErrors: errors,
            validationStatus: status,
            tokenUsage
        };
        
        logger.info('Gemini analysis completed successfully', { 
            model,
            validationStatus: status,
            tokenUsage: response.tokenUsage
        });
        
        return response;
        
    } catch (error) {
        logger.error('Gemini analysis failed', { model }, error as Error);
        throw error;
    }
}

/**
 * Perform direct LLM analysis with data in prompt (no file upload)
 */
export async function performDirectLLMAnalysis(
    data: any,
    prompt: string,
    model: string,
    responseType: 'cms-detection' | 'meta-analysis' = 'cms-detection'
): Promise<LLMResponse> {
    const modelInfo = detectModelProvider(model);
    
    logger.info('Starting direct LLM analysis', { 
        model,
        provider: modelInfo.provider,
        promptLength: prompt.length,
        dataSize: JSON.stringify(data).length 
    });
    
    // Route to appropriate provider
    if (modelInfo.provider === 'gemini') {
        return performGeminiAnalysis(data, prompt, model, responseType);
    }
    
    // Default to OpenAI
    return performDirectOpenAIAnalysis(data, prompt, model, responseType);
}

/**
 * Perform direct LLM analysis with OpenAI API
 */
async function performDirectOpenAIAnalysis(
    data: any,
    prompt: string,
    model: string,
    responseType: 'cms-detection' | 'meta-analysis' = 'cms-detection'
): Promise<LLMResponse> {
    try {
        const config = getConfig();
        const openai = getOpenAIClient();
        
        // Inject data directly into prompt
        const dataJsonString = JSON.stringify(data, null, 2);
        const fullPrompt = `${prompt}\n\n** DATA TO ANALYZE **\n${dataJsonString}`;
        
        logger.info('Performing direct analysis', { 
            fullPromptLength: fullPrompt.length,
            estimatedTokens: Math.ceil(fullPrompt.length / 4)
        });
        
        const completion = await openai.chat.completions.create({
            model: model || config.openai.model,
            messages: [
                {
                    role: 'user',
                    content: fullPrompt
                }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1,
            max_tokens: 4000
        });
        
        const rawResponse = completion.choices[0]?.message?.content || '';
        const tokenUsage = completion.usage;
        
        logger.info('Direct analysis completed', { 
            responseLength: rawResponse.length,
            tokenUsage
        });
        
        // Parse and validate the response
        const { json, errors, status } = parseAndValidateResponse(rawResponse, responseType);
        
        const response: LLMResponse = {
            rawResponse,
            parsedJson: json,
            parseErrors: errors,
            validationStatus: status,
            tokenUsage: {
                totalTokens: tokenUsage?.total_tokens || 0,
                promptTokens: tokenUsage?.prompt_tokens || 0,
                completionTokens: tokenUsage?.completion_tokens || 0
            }
        };
        
        logger.info('Direct LLM analysis completed successfully', { 
            model,
            validationStatus: status,
            tokenUsage: response.tokenUsage
        });
        
        return response;
        
    } catch (error) {
        logger.error('Direct LLM analysis failed', { model }, error as Error);
        throw error;
    }
}

/**
 * Perform bulk LLM analysis using file upload
 */
export async function performBulkLLMAnalysis(
    dataFilePath: string,
    prompt: string,
    model: string,
    responseType: 'cms-detection' | 'meta-analysis' = 'cms-detection'
): Promise<LLMResponse> {
    const modelInfo = detectModelProvider(model);
    
    logger.info('Starting bulk LLM analysis', { 
        dataFilePath,
        model,
        provider: modelInfo.provider,
        promptLength: prompt.length 
    });
    
    // For non-OpenAI providers, read file and use direct analysis
    if (modelInfo.provider !== 'openai') {
        const fileData = await fs.readFile(dataFilePath, 'utf-8');
        const data = JSON.parse(fileData);
        return performDirectLLMAnalysis(data, prompt, model, responseType);
    }
    
    // Use OpenAI file upload for OpenAI models
    try {
        const config = getConfig();
        const openai = getOpenAIClient();
        
        // Upload the data file
        logger.info('Uploading data file to OpenAI', { dataFilePath });
        const fileBuffer = await fs.readFile(dataFilePath);
        const uploadedFile = await openai.files.create({
            file: new File([fileBuffer], dataFilePath.split('/').pop() || 'data.json', { type: 'application/json' }),
            purpose: 'assistants' // File purpose for analysis
        });
        
        logger.info('File uploaded successfully', { 
            fileId: uploadedFile.id,
            filename: uploadedFile.filename,
            bytes: uploadedFile.bytes
        });
        
        // Create assistant for bulk analysis
        const assistant = await openai.beta.assistants.create({
            name: "CMS Pattern Analyzer",
            instructions: "You are an expert web technology analyst specializing in CMS pattern analysis. Analyze the uploaded data file to identify patterns and discriminative features across multiple websites.",
            model: model || config.openai.model,
            tools: [{ type: "file_search" }],
            tool_resources: {
                file_search: {
                    vector_stores: [{
                        file_ids: [uploadedFile.id]
                    }]
                }
            }
        });
        
        logger.info('Assistant created', { assistantId: assistant.id });
        
        // Create thread and run analysis
        const thread = await openai.beta.threads.create({
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ]
        });
        
        const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: assistant.id,
            response_format: { "type": "json_object" }
        });
        
        // Wait for completion
        let runStatus = run;
        while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
            logger.debug('Run status:', { status: runStatus.status });
        }
        
        if (runStatus.status !== 'completed') {
            throw new Error(`Analysis failed with status: ${runStatus.status}`);
        }
        
        // Get the response
        const messages = await openai.beta.threads.messages.list(thread.id);
        const lastMessage = messages.data[0];
        
        if (!lastMessage || !lastMessage.content || lastMessage.content.length === 0) {
            throw new Error('No response from OpenAI assistant');
        }
        
        const rawResponse = lastMessage.content[0].type === 'text' ? 
            lastMessage.content[0].text.value : 
            JSON.stringify(lastMessage.content[0]);
        
        logger.info('Bulk analysis completed', { 
            threadId: thread.id,
            runId: run.id,
            responseLength: rawResponse.length
        });
        
        // Clean up resources
        await openai.beta.assistants.del(assistant.id);
        await openai.files.del(uploadedFile.id);
        
        // Parse and validate the response
        const { json, errors, status } = parseAndValidateResponse(rawResponse, responseType);
        
        const response: LLMResponse = {
            rawResponse,
            parsedJson: json,
            parseErrors: errors,
            validationStatus: status,
            tokenUsage: {
                totalTokens: runStatus.usage?.total_tokens || 0,
                promptTokens: runStatus.usage?.prompt_tokens || 0,
                completionTokens: runStatus.usage?.completion_tokens || 0
            }
        };
        
        logger.info('Bulk LLM analysis completed successfully', { 
            dataFilePath,
            model,
            validationStatus: status,
            tokenUsage: response.tokenUsage
        });
        
        return response;
        
    } catch (error) {
        logger.error('Bulk LLM analysis failed', { dataFilePath, model }, error as Error);
        throw error;
    }
}