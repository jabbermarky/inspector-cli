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
- `npm test` - Run Jest unit tests for core functionality
- `npm run test:watch` - Run Jest tests in watch mode for development  
- `npm run test:coverage` - Run tests with coverage reporting
- `npm run test:integration` - Run comprehensive shell-based integration tests
- Jest is configured with TypeScript support and ES modules
- Unit tests cover retry logic, error handling, and core utilities
- Integration tests validate end-to-end workflows and critical fixes

## Architecture

### Entry Point
- `src/index.ts` - Main CLI application entry point that configures Commander.js and imports all command modules

### Command Structure
The application uses Commander.js with a modular command architecture. Each command is implemented in its own file in `src/commands/`:

- `screenshot.ts` - Single URL screenshot capture
- `csv.ts` - Batch screenshot processing from CSV files
- `footer.ts` - Image segmentation for header/footer extraction
- `assistant.ts` - OpenAI Assistant API integration for image analysis
- `chat.ts` - OpenAI Chat API integration
- `assistants.ts` - List available OpenAI assistants
- `detect_cms.ts` - CMS detection with CSV batch processing (WordPress, Joomla, Drupal)
- `eval.ts` - Evaluation utilities

### Core Modules
- `genai.ts` - OpenAI API integration with support for both Chat and Assistant APIs, includes retry logic and resource cleanup
- `utils/utils.ts` - Utility functions including Puppeteer screenshot capture, CSV parsing, image processing with Jimp, and CMS detection
- `utils/retry.ts` - Exponential backoff retry utility for API resilience and error handling
- `utils/config.ts` - Comprehensive configuration management with validation
- `utils/logger.ts` - Structured logging system with multiple levels and formats
- `brandi_json_schema.ts` - JSON schema validation for AI responses
- `prompts.ts` - System prompts for AI interactions

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
- Requires `OPENAI_API_KEY` environment variable
- Uses dotenv for configuration management

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

- The application uses ES modules (`"type": "module"` in package.json)
- TypeScript configuration is in `tsconfig.json` with Jest type support
- Screenshot files are automatically organized with width suffixes
- The semaphore system prevents browser resource exhaustion during batch operations
- AI responses are validated against specific JSON schemas for structured data extraction
- **Error Handling**: Comprehensive retry logic with exponential backoff for all external API calls
- **Testing**: Jest framework for unit tests, shell scripts for integration testing
- **Code Quality**: ESLint and Prettier configured for consistent code style
- **Logging**: Structured logging with configurable levels and output formats

## Working Guidelines
- Always ask before proceeding to the next TODO