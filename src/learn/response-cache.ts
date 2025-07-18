/**
 * Response caching system for LLM API calls
 * Provides significant cost savings by caching expensive API responses
 */

import { createModuleLogger } from '../utils/logger.js';
import { LLMResponse, EnhancedDataCollection } from './types.js';
import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const logger = createModuleLogger('response-cache');

interface CacheEntry {
  cacheKey: string;
  response: LLMResponse;
  timestamp: number;
  expiresAt: number;
  metadata: {
    url: string;
    model: string;
    promptLength: number;
    responseLength: number;
    tokenUsage: number;
  };
}

export interface CacheStats {
  hits: number;
  misses: number;
  entries: number;
  totalSizeBytes: number;
  hitRate: number;
  costSaved: number; // Estimated cost savings in USD
}

export class ResponseCache {
  private cacheDir: string;
  private defaultTTL: number; // Time to live in milliseconds
  private stats: CacheStats;
  private maxCacheSize: number; // Maximum cache size in bytes
  private enabled: boolean;

  constructor(options: {
    cacheDir?: string;
    ttlMs?: number;
    maxSizeBytes?: number;
    enabled?: boolean;
  } = {}) {
    this.cacheDir = options.cacheDir || './data/cache/llm-responses';
    this.defaultTTL = options.ttlMs || 24 * 60 * 60 * 1000; // 24 hours
    this.maxCacheSize = options.maxSizeBytes || 100 * 1024 * 1024; // 100MB
    this.enabled = options.enabled !== false;
    
    this.stats = {
      hits: 0,
      misses: 0,
      entries: 0,
      totalSizeBytes: 0,
      hitRate: 0,
      costSaved: 0
    };

    this.initializeCache();
  }

  private async initializeCache(): Promise<void> {
    if (!this.enabled) return;

    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      await this.loadStats();
      logger.debug('Response cache initialized', {
        cacheDir: this.cacheDir,
        ttlMs: this.defaultTTL,
        maxSizeBytes: this.maxCacheSize,
        enabled: this.enabled
      });
    } catch (error) {
      logger.error('Failed to initialize response cache', {}, error as Error);
      this.enabled = false;
    }
  }

  /**
   * Generate cache key from analysis parameters
   */
  private generateCacheKey(
    prompt: string,
    model: string,
    data: EnhancedDataCollection,
    phase?: string
  ): string {
    // Include relevant parameters that affect the response
    const keyData = {
      promptHash: createHash('sha256').update(prompt).digest('hex'),
      model,
      url: data.url,
      phase: phase || 'single',
      // Include data quality metrics to avoid cache hits on different data
      dataQuality: data.dataQuality?.score || 0,
      timestamp: data.timestamp.split('T')[0] // Daily granularity for cache
    };

    return createHash('sha256')
      .update(JSON.stringify(keyData))
      .digest('hex');
  }

  /**
   * Get cached response if available and valid
   */
  async get(
    prompt: string,
    model: string,
    data: EnhancedDataCollection,
    phase?: string
  ): Promise<LLMResponse | null> {
    if (!this.enabled) return null;

    const cacheKey = this.generateCacheKey(prompt, model, data, phase);
    
    try {
      const cacheFile = path.join(this.cacheDir, `${cacheKey}.json`);
      const cacheData = await fs.readFile(cacheFile, 'utf8');
      const entry: CacheEntry = JSON.parse(cacheData);

      // Check if cache entry is still valid
      if (Date.now() > entry.expiresAt) {
        logger.debug('Cache entry expired', { 
          cacheKey, 
          url: data.url,
          expiredAt: new Date(entry.expiresAt).toISOString()
        });
        await this.delete(cacheKey);
        this.stats.misses++;
        return null;
      }

      // Cache hit!
      this.stats.hits++;
      this.updateHitRate();
      
      // Estimate cost savings (approximate OpenAI pricing)
      const estimatedCostSaved = this.estimateCostSaved(entry.response.tokenUsage);
      this.stats.costSaved += estimatedCostSaved;

      logger.info('Cache hit', {
        cacheKey,
        url: data.url,
        model,
        phase: phase || 'single',
        tokensSaved: entry.response.tokenUsage?.totalTokens || 0,
        estimatedCostSaved,
        age: Date.now() - entry.timestamp
      });

      return entry.response;

    } catch (error) {
      // Cache miss or read error
      this.stats.misses++;
      this.updateHitRate();
      
      logger.debug('Cache miss', { 
        cacheKey, 
        url: data.url,
        model,
        phase: phase || 'single',
        error: (error as Error).message
      });
      
      return null;
    }
  }

  /**
   * Store response in cache
   */
  async set(
    prompt: string,
    model: string,
    data: EnhancedDataCollection,
    response: LLMResponse,
    phase?: string,
    customTTL?: number
  ): Promise<void> {
    if (!this.enabled) return;

    const cacheKey = this.generateCacheKey(prompt, model, data, phase);
    const ttl = customTTL || this.defaultTTL;
    
    const entry: CacheEntry = {
      cacheKey,
      response,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      metadata: {
        url: data.url,
        model,
        promptLength: prompt.length,
        responseLength: response.rawResponse.length,
        tokenUsage: response.tokenUsage?.totalTokens || 0
      }
    };

    try {
      const cacheFile = path.join(this.cacheDir, `${cacheKey}.json`);
      await fs.writeFile(cacheFile, JSON.stringify(entry, null, 2));
      
      this.stats.entries++;
      this.updateCacheSize();
      
      logger.debug('Response cached', {
        cacheKey,
        url: data.url,
        model,
        phase: phase || 'single',
        tokensCached: response.tokenUsage?.totalTokens || 0,
        expiresAt: new Date(entry.expiresAt).toISOString()
      });

      // Cleanup old entries if cache is getting too large
      await this.cleanupIfNeeded();

    } catch (error) {
      logger.error('Failed to cache response', {
        cacheKey,
        url: data.url,
        model
      }, error as Error);
    }
  }

  /**
   * Delete specific cache entry
   */
  private async delete(cacheKey: string): Promise<void> {
    try {
      const cacheFile = path.join(this.cacheDir, `${cacheKey}.json`);
      await fs.unlink(cacheFile);
      this.stats.entries = Math.max(0, this.stats.entries - 1);
    } catch (error) {
      // Ignore deletion errors
    }
  }

  /**
   * Clean up expired entries and manage cache size
   */
  private async cleanupIfNeeded(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      const now = Date.now();
      let totalSize = 0;
      const fileStats: { file: string; size: number; mtime: number; expired: boolean }[] = [];

      // Collect file statistics
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(this.cacheDir, file);
        const stat = await fs.stat(filePath);
        totalSize += stat.size;

        let expired = false;
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const entry: CacheEntry = JSON.parse(content);
          expired = now > entry.expiresAt;
        } catch {
          expired = true; // Treat malformed files as expired
        }

        fileStats.push({
          file,
          size: stat.size,
          mtime: stat.mtimeMs,
          expired
        });
      }

      // Remove expired entries
      const expiredFiles = fileStats.filter(f => f.expired);
      for (const fileInfo of expiredFiles) {
        await fs.unlink(path.join(this.cacheDir, fileInfo.file));
        totalSize -= fileInfo.size;
      }

      // If still over size limit, remove oldest entries
      if (totalSize > this.maxCacheSize) {
        const activeFiles = fileStats
          .filter(f => !f.expired)
          .sort((a, b) => a.mtime - b.mtime); // Oldest first

        for (const fileInfo of activeFiles) {
          if (totalSize <= this.maxCacheSize) break;
          
          await fs.unlink(path.join(this.cacheDir, fileInfo.file));
          totalSize -= fileInfo.size;
        }
      }

      this.stats.totalSizeBytes = totalSize;
      this.stats.entries = fileStats.length - expiredFiles.length;
      
      if (expiredFiles.length > 0) {
        logger.debug('Cache cleanup completed', {
          expiredRemoved: expiredFiles.length,
          totalSize,
          entries: this.stats.entries
        });
      }

    } catch (error) {
      logger.error('Cache cleanup failed', {}, error as Error);
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    if (!this.enabled) return;

    try {
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(this.cacheDir, file));
        }
      }
      
      this.stats = {
        hits: 0,
        misses: 0,
        entries: 0,
        totalSizeBytes: 0,
        hitRate: 0,
        costSaved: 0
      };
      
      await this.saveStats();
      
      logger.info('Cache cleared successfully');
    } catch (error) {
      logger.error('Failed to clear cache', {}, error as Error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    if (!this.enabled) {
      return {
        hits: 0,
        misses: 0,
        entries: 0,
        totalSizeBytes: 0,
        hitRate: 0,
        costSaved: 0
      };
    }

    await this.updateCacheSize();
    return { ...this.stats };
  }

  /**
   * Update cache statistics
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  private async updateCacheSize(): Promise<void> {
    try {
      // Ensure cache directory exists
      await fs.mkdir(this.cacheDir, { recursive: true });
      
      const files = await fs.readdir(this.cacheDir);
      let totalSize = 0;
      let entryCount = 0;

      for (const file of files) {
        if (file.endsWith('.json')) {
          const stat = await fs.stat(path.join(this.cacheDir, file));
          totalSize += stat.size;
          entryCount++;
        }
      }

      this.stats.totalSizeBytes = totalSize;
      this.stats.entries = entryCount;
    } catch (error) {
      logger.error('Failed to update cache size', {}, error as Error);
    }
  }

  /**
   * Estimate cost saved by cache hit (approximate OpenAI pricing)
   */
  private estimateCostSaved(tokenUsage: { totalTokens: number; promptTokens: number; completionTokens: number } | undefined): number {
    if (!tokenUsage) return 0;
    
    // Approximate OpenAI GPT-4 pricing (as of 2024)
    const INPUT_COST_PER_1K = 0.03; // $0.03 per 1k input tokens
    const OUTPUT_COST_PER_1K = 0.06; // $0.06 per 1k output tokens
    
    const inputCost = (tokenUsage.promptTokens / 1000) * INPUT_COST_PER_1K;
    const outputCost = (tokenUsage.completionTokens / 1000) * OUTPUT_COST_PER_1K;
    
    return inputCost + outputCost;
  }

  /**
   * Load cache statistics from disk
   */
  private async loadStats(): Promise<void> {
    try {
      const statsFile = path.join(this.cacheDir, 'cache-stats.json');
      const statsData = await fs.readFile(statsFile, 'utf8');
      this.stats = { ...this.stats, ...JSON.parse(statsData) };
    } catch {
      // Use default stats if file doesn't exist or is invalid
    }
  }

  /**
   * Save cache statistics to disk
   */
  private async saveStats(): Promise<void> {
    try {
      const statsFile = path.join(this.cacheDir, 'cache-stats.json');
      await fs.writeFile(statsFile, JSON.stringify(this.stats, null, 2));
    } catch (error) {
      logger.error('Failed to save cache stats', {}, error as Error);
    }
  }

  /**
   * Generate cache report
   */
  async generateReport(): Promise<string> {
    const stats = await this.getStats();
    const hitRatePercent = (stats.hitRate * 100).toFixed(1);
    const cacheSizeMB = (stats.totalSizeBytes / (1024 * 1024)).toFixed(2);
    
    return `
## LLM Response Cache Report

### Cache Statistics
- **Hit Rate**: ${hitRatePercent}% (${stats.hits} hits, ${stats.misses} misses)
- **Cache Entries**: ${stats.entries}
- **Cache Size**: ${cacheSizeMB} MB
- **Cost Saved**: $${stats.costSaved.toFixed(2)}

### Performance Impact
- **API Calls Avoided**: ${stats.hits}
- **Response Time**: Instant for cache hits
- **Cost Efficiency**: ${hitRatePercent}% of analyses cost nothing

### Cache Health
- **Enabled**: ${this.enabled ? 'Yes' : 'No'}
- **TTL**: ${this.defaultTTL / (1000 * 60 * 60)} hours
- **Max Size**: ${(this.maxCacheSize / (1024 * 1024)).toFixed(0)} MB
    `.trim();
  }
}

// Global cache instance
export const globalResponseCache = new ResponseCache({
  enabled: process.env.NODE_ENV !== 'test' // Disable in tests
});

/**
 * Wrapper function to add caching to OpenAI analysis
 */
export async function withOpenAIResponseCache(
  analysisFunction: (data: EnhancedDataCollection, prompt: string, model: string) => Promise<LLMResponse>,
  data: EnhancedDataCollection,
  prompt: string,
  model: string,
  phase?: string,
  customTTL?: number
): Promise<LLMResponse> {
  // Check cache first
  const cachedResponse = await globalResponseCache.get(prompt, model, data, phase);
  if (cachedResponse) {
    return cachedResponse;
  }

  // Cache miss - perform analysis
  const response = await analysisFunction(data, prompt, model);
  
  // Cache the response
  await globalResponseCache.set(prompt, model, data, response, phase, customTTL);
  
  return response;
}

/**
 * Wrapper function to add caching to Gemini analysis
 */
export async function withGeminiResponseCache(
  analysisFunction: (data: any, prompt: string, model: string, responseType: 'cms-detection' | 'meta-analysis') => Promise<LLMResponse>,
  data: EnhancedDataCollection,
  prompt: string,
  model: string,
  responseType: 'cms-detection' | 'meta-analysis' = 'cms-detection',
  phase?: string,
  customTTL?: number
): Promise<LLMResponse> {
  // Check cache first
  const cachedResponse = await globalResponseCache.get(prompt, model, data, phase);
  if (cachedResponse) {
    return cachedResponse;
  }

  // Cache miss - perform analysis
  const response = await analysisFunction(data, prompt, model, responseType);
  
  // Cache the response
  await globalResponseCache.set(prompt, model, data, response, phase, customTTL);
  
  return response;
}

/**
 * Wrapper function to add caching to Claude analysis
 */
export async function withClaudeResponseCache(
  analysisFunction: (data: EnhancedDataCollection, prompt: string, model: string) => Promise<LLMResponse>,
  data: EnhancedDataCollection,
  prompt: string,
  model: string,
  phase?: string,
  customTTL?: number
): Promise<LLMResponse> {
  // Check cache first
  const cachedResponse = await globalResponseCache.get(prompt, model, data, phase);
  if (cachedResponse) {
    return cachedResponse;
  }

  // Cache miss - perform analysis
  const response = await analysisFunction(data, prompt, model);
  
  // Cache the response
  await globalResponseCache.set(prompt, model, data, response, phase, customTTL);
  
  return response;
}