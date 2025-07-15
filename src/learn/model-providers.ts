import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('model-providers');

export type ModelProvider = 'openai' | 'gemini';

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
    'gpt-3.5-turbo-16k'
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
    
    // Gemini 1.5 models (for backward compatibility)
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    
    // Gemini Pro models
    'gemini-pro',
    'gemini-pro-vision'
];

/**
 * Detect the provider based on the model name
 */
export function detectModelProvider(model: string): ModelInfo {
    const normalizedModel = model.toLowerCase().trim();
    
    // Check if it's an OpenAI model
    if (normalizedModel.startsWith('gpt-') || OPENAI_MODELS.includes(normalizedModel)) {
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
           GEMINI_MODELS.some(m => normalizedModel === m || normalizedModel === m.toLowerCase());
}

/**
 * Get all supported models
 */
export function getSupportedModels(): { openai: string[], gemini: string[] } {
    return {
        openai: OPENAI_MODELS,
        gemini: GEMINI_MODELS
    };
}

/**
 * Format model name for display
 */
export function formatModelName(model: string): string {
    const info = detectModelProvider(model);
    return info.displayName;
}