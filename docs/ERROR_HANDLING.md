# Error Handling and Retry Logic

This document describes the comprehensive error handling and retry logic implemented in Inspector CLI to ensure production-grade reliability.

## Overview

Inspector CLI now includes robust error handling with exponential backoff retry logic for all external API calls, comprehensive file validation, and automatic resource cleanup to prevent issues in production environments.

## Retry Utility (`src/utils/retry.ts`)

### Features
- **Exponential Backoff**: Configurable retry delays with exponential increase
- **Smart Error Detection**: Identifies retryable vs non-retryable errors
- **Network Error Handling**: Handles ECONNRESET, ETIMEDOUT, ENOTFOUND, etc.
- **OpenAI-Specific Errors**: Handles rate_limit_exceeded, insufficient_quota, server_error
- **Configurable Limits**: Maximum retries, delay ranges, and backoff multipliers

### Configuration
```typescript
interface RetryConfig {
  maxRetries: number;        // Default: 3
  initialDelayMs: number;    // Default: 1000ms
  maxDelayMs: number;        // Default: 30000ms  
  backoffMultiplier: number; // Default: 2
  retryableErrors: string[]; // Configurable error types
}
```

### Usage Examples
```typescript
// Basic retry with default config
const result = await withRetry(() => apiCall(), {}, 'API operation');

// OpenAI-specific retry wrapper
const response = await withRetryOpenAI(() => openai.chat.completions.create(params));

// Custom configuration
const data = await withRetry(
  () => fetchData(),
  { maxRetries: 5, initialDelayMs: 500 },
  'Data fetch operation'
);
```

## Enhanced OpenAI Integration (`src/genai.ts`)

### Improvements
- **All API calls use retry logic**: Chat, Assistant, File operations
- **File validation**: Size limits (20MB), existence checks, readability validation  
- **Resource cleanup**: Automatic deletion of uploaded files to prevent billing issues
- **Comprehensive logging**: Structured logs for debugging and monitoring

### Key Functions Enhanced

#### `callChat()`
- Retries on network and API failures
- Validates screenshot files before processing
- Enhanced error messages and logging

#### `callAssistant()`
- File validation with size and existence checks
- Automatic cleanup of uploaded files on success/failure
- Retry logic for thread creation and message retrieval

#### `getOpenAIAssistants()`
- Retry logic for assistant list retrieval
- Proper error handling and logging

## CMS Detection Improvements (`src/utils/utils.ts`)

### Enhanced Error Handling
- **Browser Launch**: Retry logic for Puppeteer browser initialization
- **Page Navigation**: Timeout handling with retries for page loading
- **API Endpoint Checks**: Graceful degradation when WordPress/Drupal APIs fail
- **Resource Cleanup**: Proper browser instance cleanup even on errors

### Timeout Strategy
- Individual timeouts for different detection operations
- Graceful fallback when specific checks fail
- Comprehensive error categorization and logging

## Testing Coverage

### Unit Tests (`src/utils/__tests__/retry.test.ts`)
- **13 comprehensive test cases** covering all retry scenarios
- Network error simulation and validation
- OpenAI-specific error handling verification
- Edge case testing (non-Error objects, custom configurations)
- Error detection by code, type, and message content

### Test Scenarios Covered
✅ Successful operations on first try  
✅ Retry on retryable errors with exponential backoff  
✅ Non-retryable errors fail immediately  
✅ Maximum retry limits are respected  
✅ OpenAI-specific error handling (rate limits, quotas)  
✅ Network error resilience (ECONNRESET, ETIMEDOUT)  
✅ Error classification accuracy  

## Error Categories

### Retryable Errors
- **Network**: ECONNRESET, ENOTFOUND, ECONNREFUSED, ETIMEDOUT
- **OpenAI API**: rate_limit_exceeded, insufficient_quota, server_error, timeout
- **General**: Any temporary service issues

### Non-Retryable Errors  
- **Validation**: Invalid input, missing files, malformed data
- **Authentication**: Invalid API keys, permission errors
- **Client**: Programming errors, invalid parameters

## Production Benefits

### Reliability
- **Transient Failure Recovery**: Automatically handles temporary network issues
- **Rate Limit Compliance**: Respects API rate limits with intelligent backoff
- **Resource Protection**: Prevents browser instance leaks and memory issues

### Cost Control
- **File Cleanup**: Prevents OpenAI billing for unused uploaded files
- **Efficient Retries**: Exponential backoff prevents overwhelming services
- **Resource Monitoring**: Comprehensive logging for cost tracking

### Observability
- **Structured Logging**: Detailed logs for all retry attempts and failures
- **Operation Tracking**: Clear identification of what operations are retrying
- **Error Categorization**: Distinguish between retryable and permanent failures

## Configuration

### Environment Variables
```bash
# Logging level affects retry operation visibility
LOG_LEVEL=debug  # Shows all retry attempts
LOG_LEVEL=info   # Shows retry successes and final failures
LOG_LEVEL=error  # Shows only final failures
```

### Retry Behavior Customization
You can customize retry behavior by modifying the default configurations in:
- `DEFAULT_RETRY_CONFIG` in `src/utils/retry.ts` for general operations
- OpenAI-specific configuration in `withRetryOpenAI()` function

## Monitoring and Debugging

### Log Messages
- **Debug**: Individual retry attempts with delay information
- **Info**: Successful recovery after retries  
- **Warn**: Retry attempts with error details
- **Error**: Final failures after all retries exhausted

### Example Log Output
```
[WARN] [retry]: OpenAI API call failed, retrying in 1000ms | Data: {"attempt":0,"error":"rate_limit_exceeded","delayMs":1000}
[INFO] [retry]: OpenAI API call succeeded after 1 retries
```

## Best Practices

1. **Use appropriate retry wrappers**: `withRetryOpenAI()` for OpenAI calls, `withRetry()` for others
2. **Provide descriptive operation names**: Helps with debugging and monitoring
3. **Configure appropriate timeouts**: Balance between reliability and user experience
4. **Monitor retry patterns**: High retry rates may indicate infrastructure issues
5. **Test error scenarios**: Use unit tests to verify error handling behavior

This comprehensive error handling system ensures Inspector CLI is production-ready with enterprise-grade reliability and proper resource management.