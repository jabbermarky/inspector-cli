import dns from 'dns';
import { promisify } from 'util';
import { createModuleLogger } from '../logger.js';
import { extractDomain as _extractDomain } from '../url/index.js';

// Re-export for backward compatibility
export const extractDomain = _extractDomain;

const logger = createModuleLogger('dns-validator');

// Promisify DNS functions
const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

export interface DNSValidationResult {
  valid: boolean;
  reason?: string;
  error?: string;
  addresses?: string[];
  duration?: number;
}

export enum DNSSkipReason {
  EMPTY_URL = 'Empty or undefined URL',
  INVALID_FORMAT = 'Invalid domain format',
  NXDOMAIN = 'NXDOMAIN - domain does not exist',
  TIMEOUT = 'DNS timeout',
  RESOLUTION_FAILED = 'DNS resolution failed',
  NETWORK_ERROR = 'Network error during DNS lookup'
}

/**
 * Validates a domain name format
 */
function isValidDomainFormat(domain: string): boolean {
  // Basic domain validation regex
  const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)*[a-zA-Z0-9][a-zA-Z0-9-_]+\.[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

// extractDomain is now imported from the centralized URL utilities

/**
 * Performs DNS validation for a domain
 */
export async function validateDNS(url: string, timeoutMs: number = 5000): Promise<DNSValidationResult> {
  const startTime = Date.now();
  
  // Check for empty URL first
  if (!url || url.trim() === '') {
    logger.warn('Empty URL provided for DNS validation');
    return {
      valid: false,
      reason: DNSSkipReason.EMPTY_URL,
      duration: Date.now() - startTime
    };
  }
  
  const domain = extractDomain(url);
  
  logger.debug('Validating DNS for domain', { url, domain });
  
  // Check domain format first
  if (!isValidDomainFormat(domain)) {
    logger.warn('Invalid domain format', { domain });
    return {
      valid: false,
      reason: DNSSkipReason.INVALID_FORMAT,
      duration: Date.now() - startTime
    };
  }
  
  try {
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('DNS_TIMEOUT')), timeoutMs);
    });
    
    // Try to resolve both IPv4 and IPv6
    const dnsPromises = Promise.race([
      Promise.allSettled([
        resolve4(domain),
        resolve6(domain)
      ]).then(results => {
        const fulfilled = results.find(r => r.status === 'fulfilled');
        if (fulfilled && fulfilled.status === 'fulfilled') {
          return fulfilled.value;
        }
        throw new Error('All DNS resolution attempts failed');
      }),
      timeoutPromise
    ]);
    
    const addresses = await dnsPromises;
    
    logger.debug('DNS resolution successful', { 
      domain, 
      addresses: Array.isArray(addresses) ? addresses : [addresses],
      duration: Date.now() - startTime 
    });
    
    return {
      valid: true,
      addresses: Array.isArray(addresses) ? addresses : [addresses],
      duration: Date.now() - startTime
    };
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    // Handle specific DNS errors
    if (error.message === 'DNS_TIMEOUT') {
      logger.warn('DNS resolution timeout', { domain, timeoutMs, duration });
      return {
        valid: false,
        reason: DNSSkipReason.TIMEOUT,
        error: `DNS timeout after ${timeoutMs}ms`,
        duration
      };
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
      logger.warn('Domain does not exist', { domain, errorCode: error.code, duration });
      return {
        valid: false,
        reason: DNSSkipReason.NXDOMAIN,
        error: error.code,
        duration
      };
    }
    
    if (error.code === 'ENETUNREACH' || error.code === 'ECONNREFUSED') {
      logger.error('Network error during DNS lookup', { domain, error: error.message, duration });
      return {
        valid: false,
        reason: DNSSkipReason.NETWORK_ERROR,
        error: error.message,
        duration
      };
    }
    
    // Generic DNS resolution failure
    logger.error('DNS resolution failed', { domain, error: error.message, duration });
    return {
      valid: false,
      reason: DNSSkipReason.RESOLUTION_FAILED,
      error: error.message,
      duration
    };
  }
}

/**
 * Batch validate multiple URLs
 */
export async function validateDNSBatch(
  urls: string[], 
  options: { 
    timeoutMs?: number;
    concurrency?: number;
  } = {}
): Promise<Map<string, DNSValidationResult>> {
  const { timeoutMs = 5000, concurrency = 10 } = options;
  const results = new Map<string, DNSValidationResult>();
  
  // Process URLs in batches
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (url) => ({
        url,
        result: await validateDNS(url, timeoutMs)
      }))
    );
    
    // Store results
    batchResults.forEach(({ url, result }) => {
      results.set(url, result);
    });
  }
  
  return results;
}