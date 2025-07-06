# Screenshot Module

This module provides screenshot capture functionality for web pages using Puppeteer with comprehensive validation, error handling, and performance monitoring.

## Architecture

The screenshot module follows a modular service-based architecture:

```
src/utils/screenshot/
├── index.ts           # Main entry point with public API
├── types.ts           # TypeScript interfaces and error classes
├── service.ts         # Main ScreenshotService class
├── browser-manager.ts # Browser lifecycle management
├── validation.ts      # Input validation and normalization
├── __tests__/         # Unit tests
└── README.md         # This documentation
```

## Key Features

- **URL Validation**: Automatic protocol normalization and security validation
- **Browser Management**: Stealth mode, ad blocking, and resource optimization
- **Concurrency Control**: Semaphore-based limiting to prevent resource exhaustion
- **Error Categorization**: Network errors, validation errors, and timeout handling
- **Performance Monitoring**: Detailed timing metrics and logging
- **Resource Cleanup**: Automatic browser cleanup and memory management

## Usage

### Basic Screenshot Capture

```typescript
import { takeScreenshot } from './utils/screenshot/index.js';

// Simple usage
const result = await takeScreenshot('https://example.com', './screenshot.png', 1024);

// Advanced usage with options
const result = await takeScreenshot({
  url: 'https://example.com',
  path: './screenshot.png', 
  width: 1024,
  fullPage: true,
  timeout: 30000,
  blockImages: true,
  userAgent: 'custom-agent'
});
```

### Using the Service Directly

```typescript
import { ScreenshotService } from './utils/screenshot/index.js';

const service = new ScreenshotService();

const result = await service.captureScreenshot({
  url: 'https://example.com',
  path: './screenshot.png',
  width: 1024
});

console.log(`Screenshot saved: ${result.path}`);
console.log(`Page dimensions: ${result.sizes[0]}x${result.sizes[1]}`);
console.log(`Capture took: ${result.duration}ms`);
```

## API Reference

### Main Functions

#### `takeScreenshot(options)`

Primary function for capturing screenshots.

**Parameters:**
- `options: ScreenshotOptions` - Screenshot configuration

**Returns:** `Promise<ScreenshotResult>`

#### `takeAScreenshotPuppeteer(url, path, width)` *(deprecated)*

Legacy function maintained for backward compatibility.

### Types

#### `ScreenshotOptions`

```typescript
interface ScreenshotOptions {
  url: string;           // Target URL
  path: string;          // Output file path
  width: number;         // Viewport width (320-3840)
  fullPage?: boolean;    // Capture full page (default: true)
  timeout?: number;      // Navigation timeout (1000-300000ms)
  blockImages?: boolean; // Block image loading
  blockAds?: boolean;    // Block ads (inherited from config)
  userAgent?: string;    // Custom user agent
}
```

#### `ScreenshotResult`

```typescript
interface ScreenshotResult {
  url: string;              // Captured URL
  path: string;             // Output file path
  width: number;            // Viewport width used
  sizes: [number, number];  // Page dimensions [width, height]
  duration?: number;        // Total capture time (ms)
  navigationTime?: number;  // Navigation time (ms)
  screenshotTime?: number;  // Screenshot capture time (ms)
}
```

### Error Classes

#### `ScreenshotError`

Base error class for all screenshot-related errors.

#### `ScreenshotValidationError`

Thrown when input validation fails. Contains `field` and `value` properties.

#### `ScreenshotNetworkError`

Thrown for network-related errors. Contains `networkError` type classification.

## Configuration

The screenshot module uses the main application configuration:

```typescript
// Configuration is loaded from environment variables and config files
const config = {
  puppeteer: {
    headless: true,
    timeout: 30000,
    viewport: { width: 1024, height: 768 },
    userAgent: 'Mozilla/5.0 (compatible; Inspector-CLI/1.0)',
    blockAds: true,
    blockImages: false,
    maxConcurrency: 2
  }
};
```

## Validation Rules

### URL Validation
- Must be non-empty string
- Automatic HTTPS protocol addition if missing
- Only HTTP/HTTPS protocols allowed
- No directory traversal sequences

### Path Validation
- Must be non-empty string
- Must end with valid image extension (.png, .jpg, .jpeg, .webp)
- No directory traversal (..) allowed
- Basic security validation

### Width Validation
- Must be integer between 320 and 3840 pixels
- Represents viewport width for screenshot

### Timeout Validation
- Must be between 1000ms and 300000ms (5 minutes)
- Controls navigation and page load timeout

## Error Handling

The module provides comprehensive error categorization:

### Network Errors
- **DNS Resolution**: `ERR_NAME_NOT_RESOLVED`
- **Connection**: `ERR_CONNECTION_REFUSED`
- **Timeout**: Navigation timeout exceeded
- **Unknown**: Other network issues

### Validation Errors
- Invalid URL format or protocol
- Invalid file path or extension
- Invalid width or timeout values

### Browser Errors
- Browser launch failures
- Page setup failures
- Screenshot capture failures

## Performance Monitoring

The module tracks detailed performance metrics:

```typescript
const result = await takeScreenshot(options);

console.log(`Total time: ${result.duration}ms`);
console.log(`Navigation: ${result.navigationTime}ms`);
console.log(`Screenshot: ${result.screenshotTime}ms`);
```

## Concurrency Control

Screenshots are subject to semaphore-based concurrency control:

- Maximum concurrent browser instances: 2 (configurable)
- Automatic queuing for excess requests
- Resource cleanup on completion or failure

## Testing

The module includes comprehensive unit tests:

```bash
# Run all screenshot tests
npm test -- src/utils/screenshot/__tests__

# Run specific test file
npm test -- src/utils/screenshot/__tests__/validation.test.ts
```

### Test Coverage

- **Validation**: URL, path, width, timeout validation
- **Error Classes**: Error construction and inheritance
- **Service Integration**: Mocked browser interactions
- **Edge Cases**: Invalid inputs, network failures, cleanup

## Migration from utils.ts

The screenshot functionality was extracted from `utils.ts` to improve maintainability:

### Before (utils.ts)
```typescript
import { takeAScreenshotPuppeteer } from '../utils/utils.js';
```

### After (modular)
```typescript
import { takeScreenshot } from '../utils/screenshot/index.js';
```

**Backward Compatibility**: The old `takeAScreenshotPuppeteer` function is still exported from `utils.ts` for compatibility.

## Related Modules

- **Config Module**: Provides browser and application configuration
- **Logger Module**: Structured logging and performance tracking  
- **File Module**: Path validation and security checks
- **Concurrency Module**: Semaphore-based resource control

## Future Enhancements

- Browser instance pooling
- Screenshot comparison utilities
- Advanced error recovery
- Performance optimization
- Result caching