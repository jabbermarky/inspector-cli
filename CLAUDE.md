# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Inspector CLI is a command-line tool for analyzing websites and e-commerce integrations, specifically designed for inspecting PayPal integrations. The tool provides web scraping capabilities, screenshot generation, CMS detection, and AI-powered analysis of website content.

## Development Commands

### Build and Run
- `npm run build` - Compile TypeScript to JavaScript and make the binary executable
- `npm run start` - Run the application using ts-node (development)
- `npm run run` - Run TypeScript compiler in watch mode for development

### Testing
- No test framework is currently configured (test script returns error)

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
- `detect_cms.ts` - CMS detection (WordPress, Joomla, Drupal)
- `eval.ts` - Evaluation utilities

### Core Modules
- `genai.ts` - OpenAI API integration with support for both Chat and Assistant APIs
- `utils/utils.ts` - Utility functions including Puppeteer screenshot capture, CSV parsing, image processing with Jimp, and CMS detection
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

### Environment Configuration
- Requires `OPENAI_API_KEY` environment variable
- Uses dotenv for configuration management

## Common Usage Patterns

### Screenshot Capture
```bash
inspector screenshot --width=1024 https://example.com site_name
```

### Batch Processing
```bash
inspector csv input_file.csv
```

### AI Analysis
```bash
inspector assistant -m gpt-4o -t 0.5 screenshot1.png screenshot2.png
```

### CMS Detection
```bash
inspector detect_cms https://example.com
```

## Development Notes

- The application uses ES modules (`"type": "module"` in package.json)
- TypeScript configuration is in `tsconfig.json`
- Screenshot files are automatically organized with width suffixes
- The semaphore system prevents browser resource exhaustion during batch operations
- AI responses are validated against specific JSON schemas for structured data extraction