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

**Testing Specific Files (CRITICAL - Remember correct Jest syntax)**
```bash
# CORRECT: Run specific test file
npm test -- --testPathPatterns="filename.test.ts"

# WRONG: This will error (old syntax)
npm test -- --testPathPattern="filename.test.ts"

# Examples:
npm test -- --testPathPatterns="analyze-blocking.functional.test.ts"
npm test -- --testPathPatterns=".*\.functional\.test\.ts"  # All functional tests
npm test -- --testPathPatterns="commands.*test.ts"        # All command tests
```

**Pre-Test Implementation Study Commands (CRITICAL - Always run these FIRST):**
```bash
# 1. Study the actual class/module before testing it
cat src/utils/cms/analysis/storage.ts          # Read implementation
cat src/utils/cms/analysis/types.ts            # Check interfaces

# 2. Find real usage patterns  
grep -r "DataStorage" src/commands/             # How it's used in commands
grep -r "storage\." src/ --include="*.ts"      # Method usage patterns
grep -r "new ClassName" src/ --include="*.ts"  # Constructor usage

# 3. Check existing tests for patterns
ls src/utils/cms/analysis/__tests__/           # See what tests already exist
cat src/utils/cms/analysis/__tests__/*.test.ts # Study existing test patterns

# 4. Verify public API surface
grep -n "export\|public" src/path/to/module.ts # Find exported/public members
```

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

**🚨 CRITICAL TESTING RULES - NEVER VIOLATE THESE:**
- **NEVER DELETE TEST FILES** - Test files represent valuable work and coverage gains
- **NEVER DELETE TESTS** - Individual test cases should be fixed, not removed
- **ALWAYS FIX TYPE ISSUES** - TypeScript errors in tests must be resolved by fixing types, not deleting tests
- **PRESERVE COVERAGE GAINS** - Functional tests especially represent significant coverage improvements

**Testing Best Practices:**
- **Always re-run unit tests for all functions/methods/classes/modules that are changed and fix any errors uncovered**
- **Remember to fix bugs when I ask you to. When I identify a bug, add a specific unit test case for that bug**
- **remember to consult documents in the docs folder before trying to fix bugs.**
- **remember to update relevant docs when bugs are found and code changes are made - try to keep the docs up to date with the current implementation.**

**🎯 Implementation-First Test Development Process:**
1. **DISCOVER**: Read existing source code to understand actual APIs
2. **VALIDATE**: Check how modules are used in real application code  
3. **DESIGN**: Plan tests based on actual interface, not assumptions
4. **IMPLEMENT**: Write tests using real methods and patterns
5. **VERIFY**: Ensure tests exercise actual functionality, not imaginary APIs

**⚠️ Anti-Patterns to Avoid:**
- **Assumption-Based Testing**: Writing tests for APIs you think should exist
- **Standard Pattern Assumption**: Assuming CRUD/REST patterns without verification
- **Complex Mocking**: Mocking filesystem/external APIs instead of application interfaces
- **Imaginary Interface Testing**: Testing methods that don't actually exist
- **Copy-Paste Testing**: Using test patterns from other projects without adaptation

**When encountering TypeScript errors in tests:**
1. **FIRST**: Check actual interface definitions in the source code
2. **THEN**: Update test data/mocks to match real interfaces  
3. **NEVER**: Delete tests or test files as a solution
4. **REMEMBER**: Tests have value - they represent work done and coverage achieved

**🚨 CRITICAL: Test Against ACTUAL Implementation - NEVER Assume APIs**
- **ALWAYS READ THE SOURCE CODE FIRST** before writing any test
- **STUDY THE ACTUAL PUBLIC METHODS** available on classes/modules being tested
- **CHECK HOW THE CODE IS ACTUALLY USED** in existing files (commands, other modules)
- **NEVER assume standard CRUD patterns** - each module may have specialized APIs
- **AVOID "typical API" assumptions** - test what actually exists, not what you expect

**Pre-Test Implementation Study Checklist:**
1. **Read the actual class/module implementation** - understand public methods
2. **Find existing usage examples** - grep for how it's used in real code
3. **Check interface definitions** - verify parameter and return types
4. **Identify the actual API surface** - what methods really exist vs. what you assume
5. **Test through public interfaces only** - don't test internal implementation details

**Examples of Implementation-First Testing:**
```bash
# BEFORE writing storage tests:
# 1. Read the actual DataStorage class
cat src/utils/cms/analysis/storage.ts

# 2. Check how it's actually used  
grep -r "storage\." src/commands/

# 3. Then write tests using ACTUAL methods:
await storage.query({ cmsTypes: ['WordPress'] })  # ✅ Exists
await storage.getDataPoint('url')                 # ❌ Doesn't exist
```

**Functional Testing Specific Guidelines:**
- **Functional tests must use REAL INTERFACES** - they test actual code execution, not mocked behaviors
- **Study the target module's public API** before writing any functional test
- **Use selective mocking** - only mock external dependencies, not the module being tested
- **Validate test assumptions** against real usage patterns in the codebase
- **When mocking fails**, it often means you're testing the wrong interface

**Real Example from DataStorage:**
```typescript
// ❌ WRONG: Testing imaginary API
await storage.getDataPoint('https://example.com');
await storage.bulkStore(dataPoints);

// ✅ RIGHT: Testing actual API  
const results = await storage.query({ cmsTypes: ['WordPress'] });
await storage.storeBatch(dataPoints);
await storage.getAllDataPoints();
```

## Architecture

### URL Handling
- Remember that there is centralized URL handling in src/utils/url
