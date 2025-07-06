# Browser Manager Module

This module provides a unified, purpose-driven browser management system that eliminates code duplication between CMS detection and screenshot capture modules while maintaining specialized behavior for each use case.

## Architecture Overview

The browser manager follows a purpose-based configuration approach where behavior is determined by the intended use case (detection, capture, analysis) rather than inheritance or separate classes.

### Key Design Principles

1. **Purpose-Driven Configuration**: Single manager class with behavior controlled by configuration
2. **Shared Concurrency Control**: Semaphore-based resource management for all modules
3. **Strategy Mapping**: Centralized mapping of purpose to navigation and resource blocking strategies
4. **Unified Error Handling**: Consistent error types and categorization across modules
5. **Resource Optimization**: Efficient browser lifecycle management with automatic cleanup

## Module Structure

```
src/utils/browser/
├── index.ts                    # Main exports and convenience functions
├── types.ts                    # TypeScript interfaces, error classes, and strategy mappings
├── manager.ts                  # Unified BrowserManager class
├── __tests__/                  # Comprehensive test suite (77 tests)
└── README.md                   # This documentation
```

## Usage Examples

### CMS Detection Configuration

```typescript
import { BrowserManager, createDetectionConfig } from '../browser/index.js';

const config = createDetectionConfig({
    resourceBlocking: {
        enabled: true,
        strategy: 'aggressive',
        allowEssentialScripts: true
    },
    navigation: {
        timeout: 5000,
        retryAttempts: 3
    }
});

const browserManager = new BrowserManager(config);
const page = await browserManager.createPage(url);
// Page uses domcontentloaded navigation strategy with aggressive resource blocking
```

### Screenshot Capture Configuration

```typescript
import { BrowserManager, createCaptureConfig } from '../browser/index.js';

const config = createCaptureConfig({
    viewport: { width: 1920, height: 1080 },
    navigation: {
        timeout: 15000,
        additionalWaitTime: 2000
    },
    resourceBlocking: {
        strategy: 'moderate' // Preserves visual elements
    }
});

const browserManager = new BrowserManager(config);
const page = await browserManager.createPage(url);
const dimensions = await browserManager.captureScreenshot(page, './screenshot.png');
```

### Analysis Configuration (Future Use)

```typescript
import { BrowserManager, createAnalysisConfig } from '../browser/index.js';

const config = createAnalysisConfig({
    resourceBlocking: {
        strategy: 'minimal' // Allows most content for analysis
    },
    navigation: {
        timeout: 10000,
        retryAttempts: 2
    }
});
```

## Configuration Options

### Browser Manager Configuration

```typescript
interface BrowserManagerConfig {
    // Core browser settings
    headless: boolean;
    viewport: BrowserViewport;
    userAgent: string;
    
    // Purpose-driven behavior
    purpose: 'detection' | 'capture' | 'analysis';
    
    // Resource management
    resourceBlocking: ResourceBlockingConfig;
    
    // Navigation behavior
    navigation: NavigationConfig;
    
    // Concurrency control
    concurrency: ConcurrencyConfig;
    
    // Debug and monitoring
    debug?: DebugConfig;
}
```

### Purpose-Based Strategy Mapping

| Purpose | Navigation Strategy | Resource Blocking | Use Case |
|---------|-------------------|------------------|----------|
| `detection` | `domcontentloaded` | `aggressive` | CMS detection - fast, content-focused |
| `capture` | `networkidle0` | `moderate` | Screenshot capture - full visual rendering |
| `analysis` | `networkidle2` | `minimal` | Future analysis - comprehensive content access |

### Resource Blocking Strategies

| Strategy | Blocked Resources | Purpose |
|----------|------------------|---------|
| `aggressive` | `['image', 'stylesheet', 'font', 'media', 'websocket']` | CMS detection |
| `moderate` | `['font', 'media', 'websocket']` | Screenshot capture |
| `minimal` | `['websocket']` | Analysis/testing |

## Core Features

### 1. Purpose-Driven Navigation

```typescript
// Navigation strategies automatically selected based on purpose
const NAVIGATION_STRATEGIES = {
    'detection': { waitUntil: 'domcontentloaded' },  // Fast DOM loading
    'capture': { waitUntil: 'networkidle0' },        // Full rendering
    'analysis': { waitUntil: 'networkidle2' }        // Partial network activity
};
```

### 2. Intelligent Resource Blocking

```typescript
// CMS detection - blocks visual resources, allows essential scripts
const detectionConfig = createDetectionConfig({
    resourceBlocking: {
        strategy: 'aggressive',
        allowEssentialScripts: true,
        allowPatterns: ['/wp-includes/', '/wp-content/', 'drupal', 'joomla']
    }
});

// Screenshot capture - preserves visual elements
const captureConfig = createCaptureConfig({
    resourceBlocking: {
        strategy: 'moderate' // Blocks fonts/media but preserves images/CSS
    }
});
```

### 3. Unified Concurrency Control

```typescript
// Both CMS and Screenshot modules share the same concurrency limits
const config = createDetectionConfig({
    concurrency: {
        maxConcurrent: 2,      // Maximum concurrent browser instances
        acquireTimeout: 30000  // Timeout for acquiring browser resources
    }
});
```

### 4. Comprehensive Error Handling

```typescript
try {
    const page = await browserManager.createPage(url);
} catch (error) {
    if (error instanceof BrowserNetworkError) {
        // Handle network-related errors
        console.log(`Network error: ${error.message}`);
    } else if (error instanceof BrowserTimeoutError) {
        // Handle timeout errors
        console.log(`Timeout after ${error.timeout}ms during ${error.operation}`);
    } else if (error instanceof BrowserResourceError) {
        // Handle resource management errors
        console.log(`Resource error: ${error.message}`);
    }
}
```

### 5. Screenshot Capabilities

```typescript
// Screenshot capture available to all modules
const browserManager = new BrowserManager(captureConfig);
const page = await browserManager.createPage(url);
const [width, height] = await browserManager.captureScreenshot(page, './screenshot.png');
console.log(`Captured screenshot: ${width}x${height}`);
```

## Integration Examples

### CMS Module Integration

```typescript
// src/utils/cms/index.ts
import { BrowserManager, createDetectionConfig, BrowserNetworkError } from '../browser/index.js';

export async function detectCMS(url: string): Promise<CMSDetectionResult> {
    const config = createDetectionConfig({
        resourceBlocking: {
            enabled: true,
            strategy: 'aggressive',
            allowEssentialScripts: true
        }
    });
    
    const browserManager = new BrowserManager(config);
    
    try {
        const page = await browserManager.createPage(url);
        // CMS detection logic using optimized page
    } catch (error) {
        if (error instanceof BrowserNetworkError) {
            return { cms: 'Unknown', error: `Network error: ${error.message}` };
        }
        throw error;
    } finally {
        await browserManager.cleanup();
    }
}
```

### Screenshot Module Integration

```typescript
// src/utils/screenshot/service.ts
import { BrowserManager, createCaptureConfig } from '../browser/index.js';

export class ScreenshotService {
    async captureScreenshot(options: ScreenshotOptions): Promise<ScreenshotResult> {
        const config = createCaptureConfig({
            viewport: { width: options.width, height: 768 },
            navigation: {
                timeout: options.timeout || 15000,
                additionalWaitTime: 2000
            }
        });
        
        const browserManager = new BrowserManager(config);
        
        try {
            const page = await browserManager.createPage(options.url);
            const dimensions = await browserManager.captureScreenshot(page, options.path);
            return { ...options, sizes: dimensions };
        } finally {
            await browserManager.cleanup();
        }
    }
}
```

## Error Types

### BrowserManagerError (Base)
- **Type**: `browser_manager_error`
- **Use**: Base class for all browser manager errors
- **Properties**: `type`, `context`, `cause`

### BrowserNetworkError
- **Type**: `browser_network_error`
- **Use**: Network-related failures (DNS, connection, timeouts)
- **Properties**: `url`, `networkError`

### BrowserResourceError
- **Type**: `browser_resource_error`
- **Use**: Resource management failures (browser launch, page setup)
- **Properties**: `resourceType`

### BrowserTimeoutError
- **Type**: `browser_timeout_error`
- **Use**: Timeout-specific errors with operation context
- **Properties**: `timeout`, `operation`

## Performance Considerations

### 1. Browser Lifecycle Optimization
- **Lazy Browser Launch**: Browser launched only when needed
- **Resource Cleanup**: Automatic cleanup of pages and browser instances
- **Semaphore Control**: Prevents browser resource exhaustion

### 2. Request Interception Efficiency
- **Selective Blocking**: Only blocks resources based on configured strategy
- **Pattern Matching**: Optimized regex patterns for essential script detection
- **Early Abort**: Quick resource blocking decisions

### 3. Navigation Strategy Optimization
- **Purpose-Optimized**: Different wait strategies for different use cases
- **Configurable Timeouts**: Adjustable timeouts per module needs
- **Additional Wait Time**: Optional wait for dynamic content

## Testing

The browser manager module includes comprehensive test coverage:

```bash
# Run all browser manager tests
npm test -- src/utils/browser/

# Run specific test suites
npm test -- src/utils/browser/__tests__/manager.test.ts
npm test -- src/utils/browser/__tests__/types.test.ts
npm test -- src/utils/browser/__tests__/index.test.ts
```

### Test Coverage
- **77 total tests** across 3 test suites
- **82.5% statement coverage** for browser module
- **Testing Areas**:
  - Purpose-based configuration validation
  - Navigation strategy mapping
  - Resource blocking behavior
  - Error handling and categorization
  - Concurrency control
  - Screenshot capture functionality

## Migration Benefits

### Before: Duplicate Browser Managers
```typescript
// CMS had its own browser manager
class CMSBrowserManager { /* 250+ lines */ }

// Screenshot had its own browser manager  
class ScreenshotBrowserManager { /* 200+ lines */ }

// Different concurrency controls, error handling, resource blocking
```

### After: Unified Browser Manager
```typescript
// Single browser manager with purpose-based configuration
class BrowserManager { /* 500+ lines with comprehensive features */ }

// Shared concurrency control, unified error handling, consistent resource blocking
const cmsManager = new BrowserManager(createDetectionConfig());
const screenshotManager = new BrowserManager(createCaptureConfig());
```

### Key Improvements
1. **-450 lines of duplicate code** eliminated
2. **Unified concurrency control** across all modules
3. **Consistent error handling** and logging
4. **Shared screenshot capabilities** available to all modules
5. **Future-proof architecture** for new browser-dependent modules

## Future Enhancements

1. **Additional Purposes**: Easy to add new purposes (testing, monitoring, analysis)
2. **Custom Strategies**: Pluggable navigation and blocking strategies
3. **Performance Monitoring**: Built-in performance metrics and monitoring
4. **Cache Integration**: Browser instance caching for performance
5. **Cloud Browser Support**: Integration with cloud browser services

## Best Practices

### 1. Always Use Cleanup
```typescript
const browserManager = new BrowserManager(config);
try {
    // Browser operations
} finally {
    await browserManager.cleanup(); // Essential for resource management
}
```

### 2. Choose Appropriate Purpose
```typescript
// Use detection for fast content analysis
const detectionConfig = createDetectionConfig();

// Use capture for visual rendering
const captureConfig = createCaptureConfig();

// Use analysis for comprehensive content access
const analysisConfig = createAnalysisConfig();
```

### 3. Configure Resource Blocking Appropriately
```typescript
// CMS detection - aggressive blocking
resourceBlocking: { strategy: 'aggressive', allowEssentialScripts: true }

// Screenshot capture - preserve visual elements
resourceBlocking: { strategy: 'moderate' }

// Analysis - minimal blocking
resourceBlocking: { strategy: 'minimal' }
```

### 4. Handle Errors Appropriately
```typescript
try {
    const page = await browserManager.createPage(url);
} catch (error) {
    if (error instanceof BrowserNetworkError) {
        // Handle network issues (retry, fallback, etc.)
    } else if (error instanceof BrowserTimeoutError) {
        // Handle timeouts (increase timeout, different strategy)
    }
    // Always cleanup on error
    await browserManager.cleanup();
}
```

This unified browser manager provides a robust, scalable foundation for all browser-dependent operations in the Inspector CLI while maintaining the specialized optimizations each module requires.