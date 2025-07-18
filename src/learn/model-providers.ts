import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('model-providers');

export type ModelProvider = 'openai' | 'gemini' | 'claude';

export interface ModelInfo {
    provider: ModelProvider;
    model: string;
    displayName: string;
}

// Define supported models with their providers
const OPENAI_MODELS = [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4-turbo-preview',
    'gpt-4',
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-16k',
    'o1-preview',
    'o1-mini'
];

const GEMINI_MODELS = [
    // Gemini 2.5 models (stable)
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    
    // Gemini 2.5 preview models
    'gemini-2.5-flash-lite-preview-06-17',  // The only available Flash-Lite version
    'gemini-2.5-pro-preview-06-05',
    'gemini-2.5-pro-preview-05-06',
    'gemini-2.5-pro-preview-03-25',
    'gemini-2.5-flash-preview-05-20',
    
    // Gemini 2.0 models
    'gemini-2.0-flash',
    'gemini-2.0-flash-exp',
    'gemini-2.0-flash-lite',
    
    // Gemini 1.5 models (1M context window)
    'gemini-1.5-pro',      // 1M context - ideal for large sites
    'gemini-1.5-flash',    // 1M context - faster alternative
    'gemini-1.5-flash-8b',
    
    // Gemini Pro models
    'gemini-pro',
    'gemini-pro-vision'
];

const CLAUDE_MODELS = [
    // Claude 4 models (2025 - Latest)
    'claude-opus-4-20250514',      // 200k context - most powerful
    'claude-sonnet-4-20250514',    // 200k context - balanced
    
    // Claude 3.7 models (2024)
    'claude-3-7-sonnet-20250219',  // 200k context - latest 3.x series
    
    // Claude 3.5 models (2024)
    'claude-3-5-sonnet-20241022',  // 200k context - proven stable
    'claude-3-5-haiku-20241022',   // 200k context - fastest
    
    // Claude 3 models (legacy)
    'claude-3-haiku-20240307'      // 200k context - legacy fastest
];

/**
 * Detect the provider based on the model name
 */
export function detectModelProvider(model: string): ModelInfo {
    const normalizedModel = model.toLowerCase().trim();
    
    // Check if it's an OpenAI model
    if (normalizedModel.startsWith('gpt-') || normalizedModel.startsWith('o1-') || OPENAI_MODELS.includes(normalizedModel)) {
        logger.debug('Detected OpenAI model', { model });
        return {
            provider: 'openai',
            model: model,
            displayName: `OpenAI ${model}`
        };
    }
    
    // Check if it's a Gemini model
    if (normalizedModel.startsWith('gemini-') || GEMINI_MODELS.some(m => normalizedModel.includes(m))) {
        logger.debug('Detected Gemini model', { model });
        return {
            provider: 'gemini',
            model: model,
            displayName: `Google ${model}`
        };
    }
    
    // Check if it's a Claude model
    if (normalizedModel.startsWith('claude-') || CLAUDE_MODELS.includes(normalizedModel)) {
        logger.debug('Detected Claude model', { model });
        return {
            provider: 'claude',
            model: model,
            displayName: `Anthropic ${model}`
        };
    }
    
    // Default to OpenAI for backward compatibility
    logger.warn('Unknown model provider, defaulting to OpenAI', { model });
    return {
        provider: 'openai',
        model: model,
        displayName: `OpenAI ${model}`
    };
}

/**
 * Validate if a model is supported
 */
export function isModelSupported(model: string): boolean {
    const normalizedModel = model.toLowerCase().trim();
    return OPENAI_MODELS.includes(normalizedModel) || 
           GEMINI_MODELS.some(m => normalizedModel === m || normalizedModel === m.toLowerCase()) ||
           CLAUDE_MODELS.includes(normalizedModel);
}

/**
 * Get all supported models
 */
export function getSupportedModels(): { openai: string[], gemini: string[], claude: string[] } {
    return {
        openai: OPENAI_MODELS,
        gemini: GEMINI_MODELS,
        claude: CLAUDE_MODELS
    };
}

/**
 * Format model name for display
 */
export function formatModelName(model: string): string {
    const info = detectModelProvider(model);
    return info.displayName;
}