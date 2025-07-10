# Configuration Management

Inspector CLI uses a comprehensive configuration system that supports environment variables, configuration files, and default values with full validation.

## Configuration Sources

Configuration is loaded in the following order (later sources override earlier ones):

1. **Default values** - Built-in defaults for all settings
2. **Configuration files** - JSON files with structured settings
3. **Environment variables** - Individual settings via env vars

## Configuration Files

### Supported Locations

The application searches for configuration files in this order:

1. `./inspector.config.json` (project root)
2. `./config/inspector.json` (config directory)
3. `./inspector.config.json` (current working directory)

### Example Configuration File

```json
{
  "openai": {
    "model": "gpt-4o",
    "temperature": 0.7,
    "topP": 1.0,
    "maxTokens": 4096
  },
  "puppeteer": {
    "headless": true,
    "timeout": 30000,
    "viewport": {
      "width": 1024,
      "height": 768
    },
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "blockAds": true,
    "blockImages": false,
    "maxConcurrency": 2
  },
  "app": {
    "environment": "development",
    "screenshotDir": "./scrapes",
    "logLevel": "DEBUG",
    "logFormat": "text"
  },
  "api": {
    "retryAttempts": 3,
    "retryDelay": 1000,
    "requestTimeout": 60000,
    "enableCaching": false
  }
}
```

## Environment Variables

All configuration options can be overridden via environment variables. See `.env.example` for the complete list.

### Key Environment Variables

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o
OPENAI_TEMPERATURE=0.7

# Puppeteer Configuration
PUPPETEER_HEADLESS=true
PUPPETEER_TIMEOUT=30000
PUPPETEER_MAX_CONCURRENCY=2

# Application Configuration
NODE_ENV=production
SCREENSHOT_DIR=./screenshots
LOG_LEVEL=INFO
```

## Configuration Validation

The configuration system includes comprehensive validation:

### OpenAI Configuration
- **apiKey**: Must be non-empty string starting with "sk-"
- **temperature**: Must be between 0 and 2
- **topP**: Must be between 0 and 1
- **maxTokens**: Must be between 1 and 128000

### Puppeteer Configuration
- **timeout**: Must be at least 1000ms
- **viewport.width**: Must be between 320 and 3840
- **viewport.height**: Must be between 240 and 2160
- **maxConcurrency**: Must be between 1 and 10

### Application Configuration
- **environment**: Must be 'development', 'production', or 'test'
- **logLevel**: Must be 'DEBUG', 'INFO', 'WARN', 'ERROR', or 'SILENT'
- **logFormat**: Must be 'text' or 'json'
- **screenshotDir**: Must be non-empty string

### API Configuration
- **retryAttempts**: Must be between 0 and 10
- **retryDelay**: Must be between 100 and 30000ms
- **requestTimeout**: Must be between 1000 and 300000ms

## Usage in Code

```typescript
import { getConfig } from './utils/config.js';

const config = getConfig();

// Access configuration values
console.log(config.openai.model);
console.log(config.puppeteer.timeout);
console.log(config.app.logLevel);
```

## Configuration Management API

```typescript
import { ConfigManager, getConfig, reloadConfig } from './utils/config.js';

// Get current configuration
const config = getConfig();

// Reload configuration (useful after changing env vars or config files)
reloadConfig();

// Get singleton instance for advanced usage
const configManager = ConfigManager.getInstance();
```

## Default Values

### OpenAI Defaults
- **model**: "gpt-4o"
- **temperature**: 0.7
- **topP**: 1.0
- **maxTokens**: 4096

### Puppeteer Defaults
- **headless**: true
- **timeout**: 30000ms
- **viewport**: 1024x768
- **blockAds**: true
- **blockImages**: false
- **maxConcurrency**: 2

### Application Defaults
- **environment**: "development"
- **screenshotDir**: "./scrapes"
- **logLevel**: "DEBUG" (development), "INFO" (production)
- **logFormat**: "text"

### API Defaults
- **retryAttempts**: 3
- **retryDelay**: 1000ms
- **requestTimeout**: 60000ms
- **enableCaching**: false

## Error Handling

The configuration system provides detailed error messages for validation failures:

```
Error: OpenAI temperature must be between 0 and 2
Error: Puppeteer timeout must be at least 1000ms
Error: App environment must be one of: development, production, test
```

## Best Practices

### Development
```bash
NODE_ENV=development
LOG_LEVEL=DEBUG
PUPPETEER_HEADLESS=false  # See browser for debugging
```

### Production
```bash
NODE_ENV=production
LOG_LEVEL=INFO
INSPECTOR_LOG_FILE=/var/log/inspector/app.log
API_ENABLE_CACHING=true
```

### Testing
```bash
NODE_ENV=test
LOG_LEVEL=SILENT
PUPPETEER_TIMEOUT=10000
```

## Configuration File vs Environment Variables

### Use Configuration Files When:
- Settings are shared across team/deployments
- Complex nested configurations
- Version-controlled environment-specific settings

### Use Environment Variables When:
- Sensitive data (API keys, tokens)
- Deployment-specific overrides
- CI/CD pipeline configurations
- Container/cloud deployments

## Troubleshooting

### Common Issues

1. **"OpenAI API key is not set"**
   - Set `OPENAI_API_KEY` environment variable
   - Ensure it starts with "sk-"

2. **"Invalid file path"**
   - Check `SCREENSHOT_DIR` path exists
   - Verify directory permissions

3. **"Configuration validation failed"**
   - Review error message for specific validation failure
   - Check data types and ranges in configuration

### Debug Configuration Loading

Set `LOG_LEVEL=DEBUG` to see detailed configuration loading:

```
DEBUG [config]: Loading configuration
DEBUG [config]: Loading config file: ./inspector.config.json
INFO [config]: Configuration loaded successfully
```

The configuration system is designed to be robust, secure, and easy to use across different deployment scenarios while providing comprehensive validation and helpful error messages.