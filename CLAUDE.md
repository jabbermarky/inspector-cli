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

## Unit Testing Patterns (CRITICAL - Mocking Complex Classes)

### Common Mocking Errors & Solutions

**PROBLEM**: Repeatedly making the same TypeScript errors when mocking complex classes after context compaction.

#### BrowserManager Mocking
**❌ WRONG**: Mocking `navigate()` or `navigateWithRetry()` - these methods don't exist
**✅ CORRECT**: BrowserManager actual methods:
```typescript
const mockBrowserManager = {
    createPageInIsolatedContext: jest.fn(),  // Returns { page, context }
    closeContext: jest.fn(),
    getNavigationInfo: jest.fn(),           // Returns NavigationResult | null
    cleanup: jest.fn()
} as unknown as BrowserManager;
```

#### Puppeteer Page Mocking  
**❌ WRONG**: Trying to fully type DetectionPage/ManagedPage - too complex
**✅ CORRECT**: Use `any` type for page mocks:
```typescript
const createMockPage = (): any => ({
    url: jest.fn().mockReturnValue('https://example.com'),
    goto: jest.fn(),
    evaluate: jest.fn(),
    content: jest.fn(),
    title: jest.fn(),
    waitForSelector: jest.fn(),
    waitForTimeout: jest.fn(),
    setDefaultNavigationTimeout: jest.fn()
});
```

#### Strategy Mock Extensions
**❌ WRONG**: Trying to access properties like `_robotsTxtData` without extending interface
**✅ CORRECT**: Create extended interfaces for test-specific data:
```typescript
// For robots.txt tests
interface RobotsTxtTestPage extends DetectionPage {
    _robotsTxtData?: {
        accessible: boolean;
        content: string;
        patterns: { disallowedPaths: string[]; sitemapUrls: string[]; } | null;
    } | null;
}

// Then cast: mockPage as DetectionPage when calling methods
```

#### Mock Function Return Values
**❌ WRONG**: Returning complex objects from mocked URL validation
**✅ CORRECT**: URL validation functions return strings, not objects:
```typescript
// validateAndNormalizeUrl returns string, not validation object
validateAndNormalizeUrl.mockReturnValue('https://example.com');

// For errors, make it throw:
validateAndNormalizeUrl.mockImplementation(() => {
    throw new Error('Invalid URL format');
});
```

#### Test Execution Time Assertions
**❌ WRONG**: `expect(time).toBeGreaterThan(0)` often fails with 0
**✅ CORRECT**: Use `toBeGreaterThanOrEqual(0)` for timing assertions

### DataCollector Specific Issues
**PROBLEM**: DataCollector has complex private methods that need proper mocking setup
**SOLUTION**: Focus on testing the public interface and error scenarios rather than internal implementation

### Key Principles
1. **Use `any` type for complex Puppeteer objects** - avoids TypeScript hell
2. **Mock actual method names** - check the real class interface first  
3. **Cast when needed** - `mockPage as DetectionPage` for method calls
4. **Test error scenarios** - make mocks throw errors, don't return error objects
5. **Be flexible with timing** - use `>=` not `>` for execution time assertions

## Analysis Guidelines

### Data Analysis
- When analyzing data, create temporary scripts in the reports folder

## Architecture

[... rest of the existing content remains unchanged ...]