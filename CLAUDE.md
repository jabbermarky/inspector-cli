# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Inspector CLI is a command-line tool for analyzing websites and e-commerce integrations, specifically designed for inspecting PayPal integrations. The tool provides web scraping capabilities, screenshot generation, CMS detection with batch processing, and AI-powered analysis of website content.

## Development Commands

### Build and Run
- `npm run build` - Compile TypeScript to JavaScript and make the binary executable
- `npm run start` - Run the application using ts-node (development)
- `npm run run` - Run TypeScript compiler in watch mode for development

### Testing
**Unit Tests (Jest)**
- `npm test` - Run Jest unit tests for core functionality
- `npm run test:watch` - Run Jest tests in watch mode for development  
- `npm run test:coverage` - Run tests with coverage reporting and HTML reports

**Integration Tests (Shell Scripts)**
- `npm run test:integration` - Run comprehensive end-to-end workflow validation
- `npm run test:quick` - Run quick smoke tests (2-3 minutes)
- `npm run test:security` - Test API key security and validation
- `npm run test:paths` - Test file path validation and security measures
- `npm run test:csv` - Test CSV processing and race condition fixes
- `npm run test:cleanup` - Test error handling and resource cleanup

**Code Quality**
- `npm run lint` - ESLint code quality checks with TypeScript support
- `npm run lint:fix` - Automatic ESLint error fixing
- `npm run format` - Code formatting with Prettier
- `npm run format:check` - Check code formatting compliance
- `npm run quality` - Combined linting and formatting validation
- `npm run quality:fix` - Fix both linting and formatting issues

## CLI Usage (CRITICAL - Remember across sessions)

### CMS Detection Commands
**IMPORTANT**: After session compaction, always remember these exact commands:

**Single URL Detection:**
```bash
node dist/index.js detect-cms <url>
node dist/index.js detect-cms <url> --collect-data  # Enable data collection
```

**Batch CSV Processing:**
```bash
node dist/index.js detect-cms <csv-file>
node dist/index.js detect-cms <csv-file> --collect-data  # Enable data collection
```

**Build First (if CLI missing):**
```bash
npm run build  # Always run this first if CLI doesn't work
chmod +x dist/index.js  # Make executable if needed
```

### Known Good Test Files
- `good-wordpress.csv` - 10 known WordPress sites for validation
- `good-drupal.csv` - 10 known Drupal sites for validation  
- `good-joomla.csv` - 10 known Joomla sites for validation

### Validation Commands (Use These for Testing)
```bash
# Test WordPress detection (expect 100% success)
node dist/index.js detect-cms good-wordpress.csv --collect-data

# Test Drupal detection (expect 100% success)  
node dist/index.js detect-cms good-drupal.csv --collect-data

# Test Joomla detection (expect 100% success)
node dist/index.js detect-cms good-joomla.csv --collect-data
```

### Data Collection Location
- All collected data stored in: `./data/cms-analysis/`
- Each URL gets a unique JSON file with comprehensive data
- Index file: `./data/cms-analysis/index.json`

### CLI Help
```bash
node dist/index.js detect-cms --help  # Show available options
```

## Unit Testing Patterns (CRITICAL - Use Centralized test-utils)

**IMPORTANT**: Always use the centralized test-utils system located in `src/test-utils/`. This eliminates duplicate mock code and ensures consistency across all tests.

### 🎯 Quick Start Pattern

**✅ ALWAYS use this pattern for new tests:**

```typescript
// Mock dependencies BEFORE other imports (at top level)
jest.mock('../../../logger.js', () => ({
    createModuleLogger: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        apiCall: jest.fn(),
        apiResponse: jest.fn(),
        performance: jest.fn()
    }))
}));

// Add other mocks as needed (retry, config, etc.)
jest.mock('../../../retry.js', () => ({
    withRetry: jest.fn().mockImplementation(async (fn: any) => await fn())
}));

import { jest } from '@jest/globals';
import { YourClassUnderTest } from '../../your-module.js';
import { setupCMSDetectionTests } from '@test-utils';  // Choose appropriate setup

describe('Your Test Suite', () => {
    setupCMSDetectionTests();  // Provides beforeEach/afterEach patterns
    
    // Your test variables
    let instance: YourClassUnderTest;
    let mockPage: any;
    
    beforeEach(() => {
        // Test-specific setup (setup function handles common cleanup)
        instance = new YourClassUnderTest();
        mockPage = {
            content: jest.fn(),
            goto: jest.fn(),
            evaluate: jest.fn()
        } as any;
    });
    
    it('should do something', async () => {
        // Your test logic
        const result = await instance.someMethod(mockPage, 'test-url');
        expect(result).toBeDefined();
    });
});
```

### 🛠️ Available Setup Functions

Choose the appropriate setup function based on your test domain:

| Setup Function | Use For | Includes |
|---|---|---|
| `setupCMSDetectionTests()` | CMS detector/strategy tests | Standard beforeEach/afterEach with jest.clearAllMocks() |
| `setupBrowserTests()` | Browser management tests | Extended timeout (10s), mock cleanup |
| `setupStrategyTests()` | Detection strategy tests | Standard mock patterns |
| `setupAnalysisTests()` | Data analysis tests | Standard patterns |
| `setupScreenshotTests()` | Screenshot/capture tests | Extended timeout (15s) |
| `setupFileTests()` | File operation tests | Standard patterns |
| `setupUrlTests()` | URL utility tests | Standard patterns |
| `setupCommandTests()` | CLI command tests | Extended timeout (30s) |

### 📦 Available Mock Utilities

Import standardized mocks from `@test-utils`:

```typescript
import { 
    createMockPage,           // Standardized page mock
    createMockBrowserManager, // BrowserManager mock
    createMockStrategy,       // Detection strategy mock
    createMockLogger,         // Logger mock instance
    createTestResultFactory   // CMS detection result factory
} from '@test-utils';
```

### 🎨 Custom Jest Matchers

The test-utils provides custom matchers for CMS detection:

```typescript
import '@test-utils';  // Automatically loads custom matchers

// Use custom matchers in your tests
expect(result).toBeValidCMSResult();
expect(result).toHaveDetectedCMS('WordPress');
expect(result).toHaveConfidenceAbove(0.8);
expect(result).toHaveExecutedWithin(100, 500);
expect(result).toHaveUsedMethods(['meta-tag', 'http-headers']);
expect(result).toBeFailedDetection();
expect('WordPress').toBeValidCMSType();
```

### 🔧 Required Mock Patterns

**Logger Mock (ALWAYS include complete interface):**
```typescript
jest.mock('../../../logger.js', () => ({
    createModuleLogger: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        apiCall: jest.fn(),      // ⚠️ Don't forget these
        apiResponse: jest.fn(),   // ⚠️ Don't forget these  
        performance: jest.fn()    // ⚠️ Don't forget these
    }))
}));
```

**Retry Utility Mock:**
```typescript
jest.mock('../../../retry.js', () => ({
    withRetry: jest.fn().mockImplementation(async (fn: any) => await fn())
}));
```

**Config Mock (for browser tests):**
```typescript
jest.mock('../../config.js', () => ({
    getConfig: jest.fn(() => ({
        puppeteer: {
            timeout: 10000,
            userAgent: 'Mozilla/5.0 (compatible; Inspector-CLI/1.0)',
            viewport: { width: 1024, height: 768 },
            blockAds: true
        }
    }))
}));
```

### ❌ Common Mistakes to Avoid

1. **DON'T use dynamic imports in tests:**
   ```typescript
   // ❌ WRONG - breaks mock hoisting
   const { processCMSDetectionBatch } = await import('../detect_cms.js');
   
   // ✅ CORRECT - static import at top
   import { processCMSDetectionBatch } from '../detect_cms.js';
   ```

2. **DON'T call jest.clearAllMocks() in beforeEach if using setup functions:**
   ```typescript
   // ❌ WRONG - setup functions handle this
   beforeEach(() => {
       jest.clearAllMocks();  // Conflicts with setup function
   });
   
   // ✅ CORRECT - let setup function handle cleanup
   beforeEach(() => {
       // Only test-specific setup here
   });
   ```

3. **DON'T forget complete logger interface:**
   ```typescript
   // ❌ WRONG - missing methods cause undefined errors
   debug: jest.fn(),
   info: jest.fn(),
   warn: jest.fn(),
   error: jest.fn()
   // Missing: apiCall, apiResponse, performance
   ```

4. **DON'T try to type complex Puppeteer objects:**
   ```typescript
   // ❌ WRONG - TypeScript hell
   let mockPage: jest.Mocked<DetectionPage>;
   
   // ✅ CORRECT - use any for complex mocks
   let mockPage: any;
   ```

### 🏗️ Test File Structure Template

```typescript
// 1. MOCKS FIRST (before any imports)
jest.mock('../logger.js', () => ({...}));
jest.mock('../retry.js', () => ({...}));

// 2. IMPORTS
import { jest } from '@jest/globals';
import { ClassUnderTest } from '../module.js';
import { setupCMSDetectionTests } from '@test-utils';

// 3. TEST SUITE
describe('ClassUnderTest', () => {
    setupCMSDetectionTests();  // Choose appropriate setup
    
    // 4. TEST VARIABLES
    let instance: ClassUnderTest;
    let mockDependency: any;
    
    // 5. SETUP
    beforeEach(() => {
        instance = new ClassUnderTest();
        mockDependency = createMockDependency();
    });
    
    // 6. TESTS GROUPED BY FUNCTIONALITY
    describe('Core Functionality', () => {
        it('should handle normal case', () => {
            // Test logic
        });
        
        it('should handle error case', () => {
            // Error testing
        });
    });
});
```

### 🚀 Benefits of Centralized test-utils

- **No code duplication**: Eliminates ~200+ lines of duplicate mock code
- **Consistency**: All tests follow the same patterns
- **Type safety**: Proper TypeScript support with `@test-utils` alias
- **Maintenance**: Changes to mock patterns only need to be made in one place
- **Custom matchers**: Domain-specific assertions for CMS detection
- **Setup functions**: Standardized beforeEach/afterEach patterns

## Analysis Guidelines

### Data Analysis
- When analyzing data, create temporary scripts in the reports folder

## Development Best Practices

### Testing
- **Always re-run unit tests for all functions/methods/classes/modules that are changed and fix any errors uncovered**
- **Remember to fix bugs when I ask you to. When I identify a bug, add a specific unit test case for that bug**
- **remember to consult documents in the docs folder before trying to fix bugs.**
- **remember to update relevant docs when bugs are found and code changes are made - try to keep the docs up to date with the current implementation.**
- **it is not acceptable to delete a test file because of TypeScript issues**

## Architecture

### URL Handling
- Remember that there is centralized URL handling in src/utils/url
