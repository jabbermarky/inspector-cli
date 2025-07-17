/**
 * Two-Phase CMS Analysis Implementation
 * Separates pattern discovery from standardization for better consistency
 */

import { createModuleLogger } from '../logger.js';
import { performLLMAnalysis } from '../../learn/llm-integration.js';
import { CMS_PATTERN_DISCOVERY_PROMPT, CMS_PATTERN_STANDARDIZATION_PROMPT } from '../../prompts/phased-prompts.js';

const logger = createModuleLogger('phased-analysis');

/**
 * Calculate cost from token usage for different models
 */
function calculateCostFromTokens(tokenUsage: any, model: string): number {
  if (!tokenUsage) return 0;
  
  // Simple cost calculation - should be updated with actual model costs
  const inputTokens = tokenUsage.promptTokens || 0;
  const outputTokens = tokenUsage.completionTokens || 0;
  
  // GPT-4 pricing (approximate)
  if (model.includes('gpt-4')) {
    return (inputTokens * 0.00003) + (outputTokens * 0.00006);
  }
  
  // Gemini pricing (approximate)
  if (model.includes('gemini')) {
    return (inputTokens * 0.00001) + (outputTokens * 0.00003);
  }
  
  // Default fallback
  return (inputTokens * 0.00001) + (outputTokens * 0.00003);
}

export interface PhasedAnalysisConfig {
  model: string;
  enablePhasing: boolean;
  phase1Temperature: number;
  phase2Temperature: number;
  // Mixed model support - optional for backward compatibility
  mixedModels?: {
    phase1Model: string;
    phase2Model: string;
  };
}

export interface PhaseResult {
  phase: 1 | 2;
  success: boolean;
  result?: any;
  error?: string;
  tokenUsage?: number;
  cost?: number;
  duration?: number;
  model?: string; // Track which model was used for this phase
  timingMetrics?: {
    apiCallDurationMs: number;
    networkLatencyMs?: number;
    processingLatencyMs?: number;
    checkpoints?: Record<string, number>;
  };
}

export interface PhasedAnalysisResult {
  success: boolean;
  result?: any;
  phases: PhaseResult[];
  totalTokens: number;
  totalCost: number;
  totalDuration: number;
  error?: string;
  mixedModels?: {
    phase1Model: string;
    phase2Model: string;
  };
}

/**
 * Performs two-phase CMS analysis with separate discovery and standardization phases
 */
export async function performPhasedAnalysis(
  websiteData: string,
  config: PhasedAnalysisConfig
): Promise<PhasedAnalysisResult> {
  const startTime = Date.now();
  logger.debug('Starting phased analysis', { 
    model: config.model, 
    enablePhasing: config.enablePhasing 
  });

  const result: PhasedAnalysisResult = {
    success: false,
    phases: [],
    totalTokens: 0,
    totalCost: 0,
    totalDuration: 0
  };

  try {
    if (!config.enablePhasing) {
      // Fall back to single-phase analysis
      logger.debug('Phasing disabled, using single-phase analysis');
      return await performSinglePhaseAnalysis(websiteData, config);
    }

    // Phase 1: Pattern Discovery
    logger.debug('Starting Phase 1: Pattern Discovery');
    const phase1Result = await performPhase1Analysis(websiteData, config);
    result.phases.push(phase1Result);

    if (!phase1Result.success) {
      result.error = `Phase 1 failed: ${phase1Result.error}`;
      return result;
    }

    // Phase 2: Pattern Standardization
    logger.debug('Starting Phase 2: Pattern Standardization');
    const phase2Result = await performPhase2Analysis(phase1Result.result, config);
    result.phases.push(phase2Result);

    if (!phase2Result.success) {
      result.error = `Phase 2 failed: ${phase2Result.error}`;
      return result;
    }

    // Combine results
    result.success = true;
    result.result = phase2Result.result;
    result.totalTokens = result.phases.reduce((sum, phase) => sum + (phase.tokenUsage || 0), 0);
    result.totalCost = result.phases.reduce((sum, phase) => sum + (phase.cost || 0), 0);
    result.totalDuration = Date.now() - startTime;
    
    // Track mixed model usage if enabled
    if (config.mixedModels) {
      result.mixedModels = {
        phase1Model: config.mixedModels.phase1Model,
        phase2Model: config.mixedModels.phase2Model
      };
    }

    logger.debug('Phased analysis completed successfully', {
      totalTokens: result.totalTokens,
      totalCost: result.totalCost,
      totalDuration: result.totalDuration,
      mixedModels: result.mixedModels
    });

    return result;

  } catch (error) {
    result.error = `Phased analysis failed: ${error}`;
    result.totalDuration = Date.now() - startTime;
    logger.error('Phased analysis failed', { error: (error as Error).message });
    return result;
  }
}

/**
 * Phase 1: Pattern Discovery with creativity enabled
 */
async function performPhase1Analysis(
  websiteData: string,
  config: PhasedAnalysisConfig
): Promise<PhaseResult> {
  const startTime = Date.now();
  
  try {
    const prompt = CMS_PATTERN_DISCOVERY_PROMPT + '\n\nWEBSITE DATA:\n' + websiteData;
    
    // Determine which model to use for Phase 1
    const modelToUse = config.mixedModels?.phase1Model || config.model;
    
    // Create a mock data object for LLM integration
    const mockData = {
      url: 'phased-analysis',
      timestamp: new Date().toISOString(),
      htmlContent: websiteData,
      scripts: [],
      metaTags: [],
      httpHeaders: {},
      robotsTxt: { content: '', headers: {}, statusCode: 200, accessible: true },
      domStructure: { classPatterns: [], idPatterns: [], dataAttributes: [], comments: [] }
    };
    
    const response = await performLLMAnalysis(mockData, prompt, modelToUse);

    return {
      phase: 1,
      success: true,
      result: response.parsedJson,
      tokenUsage: response.tokenUsage?.totalTokens || 0,
      cost: calculateCostFromTokens(response.tokenUsage, modelToUse),
      duration: Date.now() - startTime,
      model: modelToUse,
      timingMetrics: response.timingMetrics
    };

  } catch (error) {
    const modelToUse = config.mixedModels?.phase1Model || config.model;
    return {
      phase: 1,
      success: false,
      error: (error as Error).message,
      duration: Date.now() - startTime,
      model: modelToUse
    };
  }
}

/**
 * Phase 2: Pattern Standardization with strict consistency
 */
async function performPhase2Analysis(
  phase1Result: any,
  config: PhasedAnalysisConfig
): Promise<PhaseResult> {
  const startTime = Date.now();
  
  try {
    const prompt = CMS_PATTERN_STANDARDIZATION_PROMPT + 
      '\n\nPHASE 1 PATTERNS:\n' + 
      JSON.stringify(phase1Result, null, 2);
    
    // Create a mock data object for LLM integration
    const mockData = {
      url: 'phased-analysis-phase2',
      timestamp: new Date().toISOString(),
      htmlContent: JSON.stringify(phase1Result, null, 2),
      scripts: [],
      metaTags: [],
      httpHeaders: {},
      robotsTxt: { content: '', headers: {}, statusCode: 200, accessible: true },
      domStructure: { classPatterns: [], idPatterns: [], dataAttributes: [], comments: [] }
    };
    
    // Determine which model to use for Phase 2
    const modelToUse = config.mixedModels?.phase2Model || config.model;
    
    const response = await performLLMAnalysis(mockData, prompt, modelToUse);

    return {
      phase: 2,
      success: true,
      result: response.parsedJson,
      tokenUsage: response.tokenUsage?.totalTokens || 0,
      cost: calculateCostFromTokens(response.tokenUsage, modelToUse),
      duration: Date.now() - startTime,
      model: modelToUse,
      timingMetrics: response.timingMetrics
    };

  } catch (error) {
    const modelToUse = config.mixedModels?.phase2Model || config.model;
    return {
      phase: 2,
      success: false,
      error: (error as Error).message,
      duration: Date.now() - startTime,
      model: modelToUse
    };
  }
}

/**
 * Fallback to single-phase analysis when phasing is disabled
 */
async function performSinglePhaseAnalysis(
  websiteData: string,
  config: PhasedAnalysisConfig
): Promise<PhasedAnalysisResult> {
  const startTime = Date.now();
  
  try {
    // Use the original CMS detection prompt for single-phase analysis
    const { CMS_DETECTION_PROMPT } = await import('../../prompts.js');
    const prompt = CMS_DETECTION_PROMPT + '\n\nWEBSITE DATA:\n' + websiteData;
    
    // Create a mock data object for LLM integration
    const mockData = {
      url: 'single-phase-analysis',
      timestamp: new Date().toISOString(),
      htmlContent: websiteData,
      scripts: [],
      metaTags: [],
      httpHeaders: {},
      robotsTxt: { content: '', headers: {}, statusCode: 200, accessible: true },
      domStructure: { classPatterns: [], idPatterns: [], dataAttributes: [], comments: [] }
    };
    
    const response = await performLLMAnalysis(mockData, prompt, config.model);

    return {
      success: true,
      result: response.parsedJson,
      phases: [{
        phase: 1,
        success: true,
        result: response.parsedJson,
        tokenUsage: response.tokenUsage?.totalTokens || 0,
        cost: calculateCostFromTokens(response.tokenUsage, config.model),
        duration: Date.now() - startTime
      }],
      totalTokens: response.tokenUsage?.totalTokens || 0,
      totalCost: calculateCostFromTokens(response.tokenUsage, config.model),
      totalDuration: Date.now() - startTime
    };

  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
      phases: [{
        phase: 1,
        success: false,
        error: (error as Error).message,
        duration: Date.now() - startTime
      }],
      totalTokens: 0,
      totalCost: 0,
      totalDuration: Date.now() - startTime
    };
  }
}

/**
 * Validates that the standardized result follows the expected format
 */
function validateStandardizedResult(result: any): boolean {
  if (!result || typeof result !== 'object') {
    return false;
  }

  // Check required fields
  if (!result.technology || !result.confidence || !result.patterns) {
    return false;
  }

  // Validate patterns array
  if (!Array.isArray(result.patterns)) {
    return false;
  }

  // Check pattern naming conventions
  for (const pattern of result.patterns) {
    if (!pattern.name || !pattern.type || !pattern.confidence) {
      return false;
    }

    // Validate pattern name format
    const validPrefixes = ['meta_', 'header_', 'url_', 'js_', 'css_', 'robots_', 'file_'];
    const hasValidPrefix = validPrefixes.some(prefix => pattern.name.startsWith(prefix));
    
    if (!hasValidPrefix) {
      logger.warn('Invalid pattern name format', { patternName: pattern.name });
      return false;
    }
  }

  return true;
}