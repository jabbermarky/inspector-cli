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

## Architecture

### Entry Point
- `src/index.ts` - Main CLI application entry point with dotenv configuration, figlet banner, and command imports
- Uses ES modules (`"type": "module"`) with proper environment variable loading
- Implements lazy initialization to avoid requiring OpenAI API key for non-AI commands

### Command Structure
The application uses Commander.js with a modular command architecture. Each command is implemented in its own file in `src/commands/`:

- `screenshot.ts` - Single URL screenshot capture with validation and error handling
- `csv.ts` - Batch screenshot processing from CSV files with semaphore-based concurrency control
- `footer.ts` - Image segmentation for header/footer extraction using Jimp
- `assistant.ts` - OpenAI Assistant API integration with file upload and resource cleanup
- `chat.ts` - OpenAI Chat API integration with vision capabilities
- `assistants.ts` - List available OpenAI assistants with lazy client initialization
- `detect_cms.ts` - Enhanced CMS detection with CSV batch processing, auto-detection, and real-time progress
- `eval.ts` - Evaluation utilities (placeholder implementation)

### Core Modules

#### Configuration & Environment
- `utils/config.ts` - **Enterprise-grade configuration management**:
  - TypeScript interfaces with comprehensive validation
  - ConfigManager singleton with lazy initialization
  - Support for environment variables, config files, and defaults
  - Separate validation for OpenAI-dependent operations (non-strict by default)
  - Environment-specific settings (development/production/test)

#### CMS Detection System
- `utils/cms/` - **Modular CMS detection architecture**:
  - **Strategy Pattern**: Pluggable detection strategies (meta-tag, html-content, api-endpoint)
  - **Detector Pattern**: CMS-specific detectors (WordPress, Joomla, Drupal) with weighted confidence scoring
  - **Browser Manager**: Resource-efficient browser management with request blocking
  - **Types & Interfaces**: Comprehensive TypeScript definitions for all components
  - **Comprehensive Testing**: 107 unit tests with high coverage (85-97% for core modules)

#### Utility Libraries
- `utils/utils.ts` - **Core utility functions**:
  - Puppeteer screenshot capture with stealth mode and ad blocking
  - CSV parsing with flexible column detection
  - Image processing and segmentation with Jimp
  - Semaphore-based concurrency control
  - File path validation and security checks

- `utils/retry.ts` - **Resilient API integration**:
  - Exponential backoff retry logic for API failures
  - OpenAI-specific error handling and rate limiting
  - Configurable retry parameters and operation naming
  - Network error detection and graceful degradation

- `utils/logger.ts` - **Production logging system**:
  - Structured logging with multiple output formats (text/JSON)
  - Configurable log levels (DEBUG, INFO, WARN, ERROR, SILENT)
  - Module-specific loggers with performance tracking
  - File and console output options
  - API call logging and error tracking

- `utils/file/` - **File operations module**:
  - Comprehensive security validation and path sanitization
  - Directory traversal prevention and safe file operations
  - File existence and permission checking
  - Unit tested with 100% coverage

#### AI Integration
- `genai.ts` - **OpenAI API integration**:
  - Lazy client initialization to avoid startup dependencies
  - Support for both Chat and Assistant APIs
  - File upload with validation and automatic cleanup
  - Retry logic with exponential backoff
  - Resource management to prevent billing issues
  
- `brandi_json_schema.ts` - JSON schema validation for AI responses
- `prompts.ts` - System prompts for AI interactions

### Testing Architecture

#### Unit Testing (Jest)
- **Framework**: Jest with TypeScript support and ES modules
- **Configuration**: `jest.config.cjs` with coverage reporting and timeout handling
- **Comprehensive Test Suites**:
  - **CMS Detection**: 107 tests across 7 test suites
    - API Endpoint Strategy: 24 tests (96.87% coverage)
    - Base Detector: 14 tests (85.07% coverage) 
    - WordPress Detector: 15 tests (94.82% coverage)
    - Joomla Detector: 15 tests (100% coverage)
    - Drupal Detector: 18 tests (91.48% coverage)
    - Browser Manager: 7 tests (21.42% coverage - limited by browser mocking complexity)
    - Timeout/Retry: 13 tests covering error handling and performance
  - **Retry Utility**: 13 tests covering network error handling and exponential backoff
  - **File Operations**: 11 tests with 100% coverage for security validation
  - **CSV Processing**: Comprehensive tests for batch operations

#### Integration Testing (Shell Scripts)
- **Comprehensive Testing**: `test_comprehensive.sh` - Full end-to-end workflow validation
- **Quick Validation**: `test_quick.sh` - Fast smoke tests for CI/CD
- **Security Testing**: `test_critical_fixes.sh` - API key security and path validation
- **Specialized Tests**: Targeted testing for CSV processing, error handling, and cleanup

### Key Dependencies
- **Puppeteer** with stealth and adblocker plugins for web scraping
- **OpenAI** for AI-powered image analysis
- **Commander.js** for CLI interface
- **Jimp** for image processing and segmentation
- **CSV-parse** for batch processing

### Screenshot System
Screenshots are saved to `./scrapes/` directory with filename format: `{name}_w{width}.png`
- Supports multiple viewport widths (768, 1024, 1536)
- Uses Puppeteer with stealth mode and ad blocking
- Implements semaphore-based concurrency control (max 2 concurrent)

### AI Integration
- Uses OpenAI Assistant API for structured analysis of website screenshots
- Supports both single and multiple image analysis  
- Validates responses against predefined JSON schemas
- Configurable model, temperature, and top_p parameters
- **Error Handling**: Implements exponential backoff retry logic for API failures
- **Resource Management**: Automatic cleanup of uploaded files to prevent billing issues
- **File Validation**: Size limits (20MB), existence checks, and proper error handling

### Environment Configuration
- OpenAI API key only required for AI-powered commands (assistant, chat)
- Uses dotenv for configuration management
- Non-strict validation by default - allows CMS detection without OpenAI setup

## Complete Command Reference

### Core Commands

#### Screenshot Capture
```bash
# Single screenshot
inspector screenshot [--width=<width>] <url> <path>

# Batch processing from CSV
inspector csv <csv_file>

# Image segmentation
inspector footer [--header=<size>] [--footer=<size>] <filename>
inspector header [--header=<size>] [--footer=<size>] <filename>  # alias
```

#### AI Analysis
```bash
# Chat API analysis
inspector chat [--model=<model>] <screenshot...>

# Assistant API analysis
inspector assistant [options] <screenshot...>
# Options: -a/--assistant, -m/--model, -t/--temperature, -p/--top_p, -o/--outfile

# List available assistants
inspector assistants

# Evaluation (NOT IMPLEMENTED)
inspector eval <assistant> <infilename> [options]
```

#### Utility Commands
```bash
# CMS detection (single URL or CSV batch)
inspector detect-cms <url-or-csv>
```

### Example Usage Patterns

```bash
# Take screenshot at specific width
inspector screenshot --width=1024 https://example.com site_name

# Process multiple URLs from CSV
inspector csv input_file.csv

# Analyze screenshots with specific model and temperature
inspector assistant -m gpt-4o -t 0.5 -o results.json screenshot1.png screenshot2.png

# Detect CMS and version (single URL)
inspector detect-cms https://example.com

# Batch CMS detection from CSV
inspector detect-cms websites.csv

# Extract header and footer from screenshot
inspector footer --header=800 --footer=600 screenshot.png
```

## Development Notes

### Technical Architecture
- **ES Modules**: Full ES module support (`"type": "module"` in package.json)
- **TypeScript**: Comprehensive TypeScript configuration with Jest integration
- **Lazy Initialization**: Components initialize only when needed to avoid startup dependencies
- **Configuration Management**: Environment variable loading with .env file support
- **Concurrency Control**: Semaphore-based resource management prevents browser exhaustion

### Production Features
- **Error Resilience**: Exponential backoff retry logic for all external API calls
- **Resource Management**: Automatic cleanup of temporary files and API resources
- **Security**: Path validation, API key validation, and safe file operations
- **Performance**: Concurrent processing with configurable limits
- **Monitoring**: Structured logging with performance tracking and error reporting

### Quality Assurance
- **Testing Strategy**: Jest unit tests + shell script integration tests
- **High Test Coverage**: 50.63% overall coverage with 85-97% for core CMS modules
- **Code Quality**: ESLint + Prettier with automated fixing
- **Type Safety**: Comprehensive TypeScript interfaces and validation
- **Coverage**: HTML coverage reports with configurable thresholds
- **Documentation**: Extensive markdown documentation for all components

### File Organization
- Screenshot files: `./scrapes/{name}_w{width}.png`
- Test coverage: `./coverage/` with HTML reports
- Configuration: Optional `inspector.config.json` and `.env` files
- Documentation: Comprehensive `.md` files for all major components

## Documentation Architecture

The project includes comprehensive documentation covering all aspects of development and usage:

### Core Documentation
- **`CLAUDE.md`** - This file: Architecture overview and development guidance
- **`CLI_REFERENCE.md`** - Complete command reference with examples and options
- **`readme.md`** - Quick start guide and basic usage examples

### Technical Documentation
- **`TESTING.md`** - Testing strategy, framework documentation, and test execution
- **`ERROR_HANDLING.md`** - Retry logic, error handling patterns, and production features
- **`CONFIGURATION.md`** - Configuration management, environment variables, and validation
- **`LOGGING.md`** - Logging system architecture and configuration options
- **`CODE_QUALITY.md`** - ESLint, Prettier setup, and code style guidelines

### Analysis Documentation
- **`REVIEW_FINDINGS.md`** - Code review findings and improvement recommendations
- **Additional Files**: Various analysis and planning documents

### Usage Documentation
All commands include:
- Comprehensive help text
- Input validation with clear error messages
- Example usage patterns
- Output format documentation
- Error handling guidance

## Working Guidelines
- **Documentation First**: All new features require documentation updates
- **Testing Required**: Both unit and integration tests for new functionality
- **Code Quality**: All code must pass ESLint and Prettier checks
- **Error Handling**: Implement retry logic and graceful degradation
- **Security**: Validate all inputs and handle sensitive data appropriately

## Workflow Principles

### Test Management
- When tests are failing, fix the failing tests instead of deleting the test suite
- Maintain high test coverage (target: 85%+ for core modules)
- Use proper mocking for complex dependencies (browser, external APIs)
- Write comprehensive test suites that cover error conditions and edge cases