# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Inspector CLI is a command-line tool for analyzing websites and e-commerce integrations, specifically designed for inspecting PayPal integrations. The tool provides web scraping capabilities, screenshot generation, CMS & platform detection with batch processing, and AI-powered analysis of website content.

## Personal Information

- My name is Mark
- Always use my name whenever responding to my requests

## Review These Documents

see @readme.md for inspector-cli overview and @package.json for available npm commands for this project.
see @docs/test-troubleshooting-workflow.md for troubleshooting assistance.
see @docs/CODE_QUALITY.md for code quality guidelines.

## Development Philosophy

- **Don't make assumptions**: Clarify assumptions with questions before creating plans, writing code, and executing tests.
- **Plan**: Plan before you code. Implementation plans must include a test plan with full algorithmic testing. When implementing multi-phase plans, always stop between phases to allow time for review, optional commits, and plan revisions.
- **Ask**: If you don't understand completely, ask questions until you do.
- **Be systematic**:.
- **KISS**: - keep it simple stupid; in other words, don't over-engineer solutions to problems.
- **NO BS!**: Do not use overconfident language - be precise and honest in your assessments and reviews.
- **Modular Architecture**: Separate concerns into focused modules
- **Pure Functions**: Testable without dependency injection
- **No God Functions**: Small, focused functions with single responsibilities
- **Type Safety**: Leverage TypeScript with types throughout

## Module and Import Conventions

- This project uses ES modules ("type": "module" in package.json) - always use import syntax, never require()

## Important Paths

- ./tmp contains temporary documents and output files
- ./plans contains all planning documents
- ./docs contains all general documents
- ./reports contains the output of various tests and analyses (gitignored)
- ./tools contains custom utilities and tools made for various purposes (gitignored)
- ./scripts contains temporary debug and utility scripts (gitignored)
- ./data contains data files that we keep around

**Note:** The `./tmp`, `./reports`, `./tools`, and `./scripts` directories are gitignored as they contain temporary files, debug scripts, and generated reports that should not be in version control.

## Development Commands

### Build and Run

- `npm run build` - Compile TypeScript to JavaScript and make the binary executable
- `npm run start` - Run the application using ts-node (development)
- `npm run run` - Run TypeScript compiler in watch mode for development

### Testing

**Unit Tests (Vitest)**

- `npm test` - Run Vitest unit tests for core functionality
- `npm run test:watch` - Run Vitest tests in watch mode for development
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

### Data Collection Location

- All collected data stored in: `./data/cms-analysis/`
- Each URL gets a unique JSON file with comprehensive data
- Index file: `./data/cms-analysis/index.json`

### CLI Help

```bash
node dist/index.js detect-cms --help  # Show available options
```

### Frequency Analysis Command

**Analyze pattern frequency across collected CMS data:**

```bash
# Basic frequency analysis (requires 100+ sites by default)
node dist/index.js frequency

# With custom minimum sites threshold
node dist/index.js frequency --min-sites 10

# Output formats
node dist/index.js frequency --output json --output-file frequency.json
node dist/index.js frequency --output csv --output-file frequency.csv
node dist/index.js frequency --output markdown --output-file frequency.md

# Include filter recommendations
node dist/index.js frequency --include-recommendations

# Platform discrimination analysis (Phase 4-5 enhancement)
node dist/index.js frequency --focus-platform-discrimination --min-sites 10

# Temporal filtering options
node dist/index.js frequency --last-days 0                    # Today only
node dist/index.js frequency --last-days 1                    # Yesterday and today
node dist/index.js frequency --last-days 7                    # Last 7 days + today
node dist/index.js frequency --date-start 2024-01-01          # From specific date
node dist/index.js frequency --date-end 2024-12-31            # Until specific date
node dist/index.js frequency --date-start 2024-01-01 --date-end 2024-01-31  # Date range

# Full options
node dist/index.js frequency --help
```

### Learn Command with Discriminative Filtering

**Train AI models with filtered data to reduce token usage:**

```bash
# Basic learning (applies conservative filtering by default)
node dist/index.js learn <url>

# Filtering levels
node dist/index.js learn <url> --filter-level none      # No filtering
node dist/index.js learn <url> --filter-level minimal   # ~2% reduction
node dist/index.js learn <url> --filter-level conservative # ~5% reduction (default)
node dist/index.js learn <url> --filter-level moderate  # ~10% reduction
node dist/index.js learn <url> --filter-level aggressive # ~20% reduction

# Custom filtering
node dist/index.js learn <url> --filter-level custom \
  --filter-headers "server,date" \
  --filter-meta "viewport,charset" \
  --filter-tracking
```

## Unit Testing Patterns (CRITICAL - Use Centralized test-utils)

**IMPORTANT**: Always use the centralized test-utils system located in `src/test-utils/`. This eliminates duplicate mock code and ensures consistency across all tests.
