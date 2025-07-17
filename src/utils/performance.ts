/**
 * Performance measurement utilities for API latency tracking
 */

import { createModuleLogger } from './logger.js';

const logger = createModuleLogger('performance');

export interface TimingMetrics {
  startTime: number;
  endTime: number;
  durationMs: number;
  label: string;
  metadata?: Record<string, any>;
}

export interface DetailedTimingMetrics extends TimingMetrics {
  networkLatencyMs?: number;
  processingLatencyMs?: number;
  retryCount?: number;
  errorOccurred?: boolean;
  errorMessage?: string;
}

/**
 * High-resolution timer for measuring API call performance
 */
export class PerformanceTimer {
  private startTime: number;
  private label: string;
  private metadata: Record<string, any>;
  private checkpoints: Map<string, number>;

  constructor(label: string, metadata?: Record<string, any>) {
    this.startTime = performance.now();
    this.label = label;
    this.metadata = metadata || {};
    this.checkpoints = new Map();
    
    logger.debug('Performance timer started', { label, metadata });
  }

  /**
   * Add a checkpoint for measuring intermediate steps
   */
  checkpoint(name: string): void {
    const now = performance.now();
    this.checkpoints.set(name, now);
    const elapsed = now - this.startTime;
    
    logger.debug('Performance checkpoint', { 
      label: this.label,
      checkpoint: name,
      elapsedMs: elapsed.toFixed(2)
    });
  }

  /**
   * Complete the timer and return metrics
   */
  end(additionalMetadata?: Record<string, any>): DetailedTimingMetrics {
    const endTime = performance.now();
    const durationMs = endTime - this.startTime;
    
    const metrics: DetailedTimingMetrics = {
      startTime: this.startTime,
      endTime,
      durationMs,
      label: this.label,
      metadata: { ...this.metadata, ...additionalMetadata }
    };

    // Calculate intermediate durations if checkpoints exist
    if (this.checkpoints.size > 0) {
      const checkpointData: Record<string, number> = {};
      let previousTime = this.startTime;
      
      for (const [name, time] of this.checkpoints) {
        checkpointData[`${name}Ms`] = time - previousTime;
        previousTime = time;
      }
      
      metrics.metadata = { ...metrics.metadata, checkpoints: checkpointData };
    }

    logger.performance(`${this.label} completed`, durationMs);

    return metrics;
  }

  /**
   * Get elapsed time without ending the timer
   */
  getElapsed(): number {
    return performance.now() - this.startTime;
  }
}

/**
 * Wrapper function for measuring async operation performance
 */
export async function measurePerformance<T>(
  operation: () => Promise<T>,
  label: string,
  metadata?: Record<string, any>
): Promise<{ result: T; metrics: DetailedTimingMetrics }> {
  const timer = new PerformanceTimer(label, metadata);
  
  try {
    const result = await operation();
    const metrics = timer.end({ success: true });
    return { result, metrics };
  } catch (error) {
    const metrics = timer.end({ 
      success: false, 
      errorOccurred: true,
      errorMessage: (error as Error).message 
    });
    throw error;
  }
}

/**
 * Decorator for measuring method performance
 */
export function MeasurePerformance(label?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const methodLabel = label || `${target.constructor.name}.${propertyKey}`;
      const timer = new PerformanceTimer(methodLabel);
      
      try {
        const result = await originalMethod.apply(this, args);
        timer.end({ success: true });
        return result;
      } catch (error) {
        timer.end({ 
          success: false, 
          errorOccurred: true,
          errorMessage: (error as Error).message 
        });
        throw error;
      }
    };
    
    return descriptor;
  };
}

/**
 * Calculate statistics for a set of timing metrics
 */
export function calculateTimingStats(metrics: TimingMetrics[]): {
  count: number;
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  medianMs: number;
  p95Ms: number;
  p99Ms: number;
} {
  if (metrics.length === 0) {
    return {
      count: 0,
      totalMs: 0,
      avgMs: 0,
      minMs: 0,
      maxMs: 0,
      medianMs: 0,
      p95Ms: 0,
      p99Ms: 0
    };
  }

  const durations = metrics.map(m => m.durationMs).sort((a, b) => a - b);
  const count = durations.length;
  const totalMs = durations.reduce((sum, d) => sum + d, 0);
  const avgMs = totalMs / count;
  const minMs = durations[0];
  const maxMs = durations[count - 1];
  const medianMs = durations[Math.floor(count / 2)];
  const p95Ms = durations[Math.floor(count * 0.95)] || maxMs;
  const p99Ms = durations[Math.floor(count * 0.99)] || maxMs;

  return {
    count,
    totalMs,
    avgMs,
    minMs,
    maxMs,
    medianMs,
    p95Ms,
    p99Ms
  };
}

/**
 * Format timing metrics for display
 */
export function formatTimingMetrics(metrics: DetailedTimingMetrics): string {
  const parts = [
    `${metrics.label}: ${metrics.durationMs.toFixed(2)}ms`
  ];

  if (metrics.networkLatencyMs !== undefined) {
    parts.push(`network: ${metrics.networkLatencyMs.toFixed(2)}ms`);
  }

  if (metrics.processingLatencyMs !== undefined) {
    parts.push(`processing: ${metrics.processingLatencyMs.toFixed(2)}ms`);
  }

  if (metrics.retryCount && metrics.retryCount > 0) {
    parts.push(`retries: ${metrics.retryCount}`);
  }

  if (metrics.errorOccurred) {
    parts.push(`error: ${metrics.errorMessage || 'unknown'}`);
  }

  return parts.join(', ');
}