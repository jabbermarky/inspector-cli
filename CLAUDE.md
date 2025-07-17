# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Inspector CLI is a command-line tool for analyzing websites and e-commerce integrations, specifically designed for inspecting PayPal integrations. The tool provides web scraping capabilities, screenshot generation, CMS detection with batch processing, and AI-powered analysis of website content.

## Development Philosophy
- Don't make assumptions.
- KISS - keep it simple stupid; in other words, don't over-engineer solutions to problems.
- Clarify assumptions by asking clarifying questions before coding
- When implementing multi-phase plans, always stop between phases to allow time for review, optional commits, and plan revisions

## Module and Import Conventions

- This project uses ES modules ("type": "module" in package.json) - always use import syntax, never require()

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
- `good-wordpress.csv` - 10+ known WordPress sites for validation
- `good-drupal.csv` - 10+ known Drupal sites for validation  
- `good-joomla.csv` - 10+ known Joomla sites for validation
- `good-duda.csv` - 10+ known Duda sites for validation

### Validation Commands (Use These for Testing)
```bash
# Test WordPress detection (expect 100% success)
node dist/index.js detect-cms good-wordpress.csv --collect-data

# Test Drupal detection (expect 100% success)  
node dist/index.js detect-cms good-drupal.csv --collect-data

# Test Joomla detection (expect 100% success)
node dist/index.js detect-cms good-joomla.csv --collect-data

# Test Duda detection (expect 100% success)
node dist/index.js detect-cms good-duda.csv --collect-data
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
```
```