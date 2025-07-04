# Logging System Documentation

Inspector CLI includes a comprehensive logging system for debugging, monitoring, and performance analysis.

## Log Levels

- **DEBUG** - Detailed information for debugging (cyan)
- **INFO** - General information about operations (green)  
- **WARN** - Warning messages for potential issues (yellow)
- **ERROR** - Error messages for failures (red)
- **SILENT** - No output

## Configuration

### Environment Variables

```bash
# Set log level (default: INFO in production, DEBUG in development)
LOG_LEVEL=DEBUG

# Enable file logging (optional)
INSPECTOR_LOG_FILE=./logs/inspector.log

# Set environment (affects default log level)
NODE_ENV=development
```

### Default Behavior

- **Production** (`NODE_ENV=production`): INFO level, console only
- **Development** (`NODE_ENV=development`): DEBUG level, console only
- **Console output**: Always enabled with colors
- **File output**: Only when `INSPECTOR_LOG_FILE` is set

## Log Format

### Text Format (Default)
```
[2025-07-04T19:17:23.384Z] INFO [utils]: Taking screenshot: https://example.com -> test.png | Data: {"url":"https://example.com","path":"test.png","width":768}
```

### JSON Format
```json
{"timestamp":"2025-07-04T19:17:23.384Z","level":"info","message":"Taking screenshot","module":"utils","data":{"url":"https://example.com"}}
```

## Usage Examples

### Basic Logging
```typescript
import { createModuleLogger } from './utils/logger.js';

const logger = createModuleLogger('mymodule');

logger.info('Operation completed', { userId: 123 });
logger.error('Operation failed', { userId: 123 }, error);
```

### Performance Logging
```typescript
const startTime = Date.now();
// ... operation ...
const duration = Date.now() - startTime;
logger.performance('Complex operation', duration);
```

### API Call Logging
```typescript
logger.apiCall('POST', 'https://api.example.com/data', requestData);
// ... API call ...
logger.apiResponse('POST', 'https://api.example.com/data', 200, responseData);
```

### Screenshot Logging
```typescript
logger.screenshot('https://example.com', './output.png', 1024);
```

## Log Output Examples

### Screenshot Operation (INFO level)
```
INFO [utils]: Taking screenshot: https://example.com -> output.png
INFO [utils]: Screenshot captured: https://example.com -> output.png  
INFO [utils]: Performance: Screenshot capture took 1563ms
```

### Screenshot Operation (DEBUG level)
```
DEBUG [utils]: Starting screenshot capture
INFO [utils]: Taking screenshot: https://example.com -> output.png
DEBUG [utils]: Browser launched successfully
DEBUG [utils]: Page navigation completed
DEBUG [utils]: Page dimensions detected
INFO [utils]: Screenshot captured: https://example.com -> output.png
INFO [utils]: Performance: Screenshot capture took 1563ms
DEBUG [utils]: Screenshot timings
DEBUG [utils]: Browser closed successfully
DEBUG [utils]: Semaphore released
```

### CSV Processing
```
DEBUG [utils]: Loading CSV file: data.csv
INFO [utils]: Successfully loaded CSV file: data.csv
INFO [utils]: Taking screenshot: https://site1.com -> output1.png
INFO [utils]: Performance: Screenshot capture took 1456ms
INFO [utils]: Taking screenshot: https://site2.com -> output2.png
INFO [utils]: Performance: Screenshot capture took 1623ms
```

### Error Scenarios
```
ERROR [utils]: Screenshot failed for https://invalid-url.com
ERROR [genai]: OpenAI API call failed
WARN [utils]: Browser took longer than expected to close
```

## File Logging

Enable file logging by setting the `INSPECTOR_LOG_FILE` environment variable:

```bash
export INSPECTOR_LOG_FILE=./logs/inspector.log
```

- Log files use the same format as console output (minus colors)
- Files are appended to, not overwritten
- Ensure the target directory exists before running
- File rotation is not built-in; use external tools if needed

## Production Recommendations

### Standard Production Setup
```bash
NODE_ENV=production
LOG_LEVEL=INFO
INSPECTOR_LOG_FILE=/var/log/inspector/app.log
```

### High-Volume Production Setup
```bash
NODE_ENV=production  
LOG_LEVEL=WARN
INSPECTOR_LOG_FILE=/var/log/inspector/app.log
```

### Development/Debugging Setup
```bash
NODE_ENV=development
LOG_LEVEL=DEBUG
# Console only for development
```

## Integration with Monitoring

The structured logging format makes it easy to integrate with monitoring systems:

- **ELK Stack**: JSON format works directly with Elasticsearch
- **Splunk**: Structured data can be parsed automatically  
- **CloudWatch**: Timestamp and level are compatible
- **Custom monitoring**: Use the JSON format for easy parsing

## Performance Impact

- **DEBUG level**: Minimal impact, mostly I/O bound operations
- **INFO level**: Very low impact, only major operations logged
- **File logging**: Small overhead for disk writes
- **JSON format**: Slightly higher CPU usage for serialization

The logging system is designed to have minimal impact on application performance while providing comprehensive visibility into operations.