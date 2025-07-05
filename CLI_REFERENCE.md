# Inspector CLI - Complete Command Reference

This document provides comprehensive documentation for all available CLI commands in Inspector CLI.

## Command Overview

Inspector CLI provides 8 commands for website analysis, screenshot capture, and AI-powered content analysis:

| Command | Status | Description |
|---------|--------|-------------|
| `screenshot` | ✅ Active | Take single URL screenshots |
| `csv` | ✅ Active | Batch screenshot processing from CSV |
| `footer`/`header` | ✅ Active | Image segmentation (header/footer extraction) |
| `chat` | ✅ Active | OpenAI Chat API analysis |
| `assistant` | ✅ Active | OpenAI Assistant API analysis |
| `assistants` | ✅ Active | List available OpenAI assistants |
| `detect-cms` | ✅ Active | CMS detection and analysis |
| `eval` | ⚠️ Not Implemented | Assistant evaluation framework |

## Command Details

### 1. Screenshot Command

Captures a screenshot of a single URL and saves it as a PNG file.

```bash
inspector screenshot [options] <url> <path>
```

**Arguments:**
- `<url>` - URL to capture (required)
- `<path>` - Output filename without extension (required)

**Options:**
- `-w, --width <width>` - Screenshot width in pixels (default: 768)

**Output:**
- File saved to `./scrapes/<path>_w<width>.png`

**Examples:**
```bash
# Basic screenshot
inspector screenshot https://example.com homepage

# Custom width
inspector screenshot --width=1024 https://example.com homepage

# Mobile view
inspector screenshot --width=375 https://example.com mobile_view
```

### 2. CSV Batch Processing

Processes multiple URLs from a CSV file, taking screenshots at three different widths.

```bash
inspector csv <csv_file>
```

**Arguments:**
- `<csv_file>` - CSV file containing URLs and paths (required)

**CSV Format:**
- First row: Header (skipped)
- Columns: `URL`, `Path`

**Behavior:**
- Automatically captures at 768px, 1024px, and 1536px widths
- Uses semaphore-based concurrency control (max 2 concurrent)
- Sequential processing to prevent resource exhaustion

**Example:**
```bash
inspector csv websites.csv
```

**Sample CSV:**
```csv
URL,Path
https://example.com,example_home
https://shop.example.com,example_shop
```

### 3. Image Segmentation (Footer/Header)

Extracts header and footer segments from screenshot images.

```bash
inspector footer [options] <filename>
inspector header [options] <filename>  # alias for footer
```

**Arguments:**
- `<filename>` - Image file to process (required)

**Options:**
- `-h, --header <size>` - Header height in pixels (default: 1024)
- `-f, --footer <size>` - Footer height in pixels (default: 1024)

**Behavior:**
- If size is 0, no file is created for that segment
- Output files include segment type and height in filename

**Examples:**
```bash
# Extract both header and footer with defaults
inspector footer screenshot.png

# Custom header size, no footer
inspector footer --header=600 --footer=0 screenshot.png

# Custom sizes for both
inspector header --header=800 --footer=400 screenshot.png
```

**Output Files:**
```
screenshot_header_h800.png
screenshot_footer_h400.png
```

### 4. OpenAI Chat API Analysis

Analyzes screenshots using OpenAI's Chat API with vision capabilities.

```bash
inspector chat [options] <screenshot...>
```

**Arguments:**
- `<screenshot...>` - One or more screenshot files to analyze (required)

**Options:**
- `-m, --model <model>` - OpenAI model to use (default: chatgpt-4o-latest)

**Features:**
- Supports multiple image analysis
- Uses retry logic for API resilience
- Returns JSON-formatted analysis

**Examples:**
```bash
# Single image analysis
inspector chat screenshot.png

# Multiple images with specific model
inspector chat -m gpt-4o image1.png image2.png image3.png

# Different model
inspector chat -m gpt-4-vision-preview screenshot.png
```

### 5. OpenAI Assistant API Analysis

Analyzes screenshots using OpenAI's Assistant API for structured analysis.

```bash
inspector assistant [options] <screenshot...>
```

**Arguments:**
- `<screenshot...>` - One or more screenshot files to analyze (required)

**Options:**
- `-a, --assistant <assistant>` - Assistant ID to use
- `-m, --model <model>` - Model to override assistant's default
- `-t, --temperature <temperature>` - Temperature setting (0.0-2.0)
- `-p, --top_p <top_p>` - Top P setting (0.0-1.0)
- `-o, --outfile <outfile>` - Save results to JSON file

**Features:**
- File validation (size limits, existence checks)
- Automatic resource cleanup (prevents billing for unused uploads)
- Structured JSON response format
- Retry logic with exponential backoff

**Examples:**
```bash
# Basic assistant analysis
inspector assistant screenshot.png

# Specific assistant and model
inspector assistant -a asst_123 -m gpt-4o screenshot.png

# Custom parameters with output file
inspector assistant -t 0.7 -p 0.9 -o analysis.json screenshot.png

# Multiple images with custom assistant
inspector assistant -a asst_456 image1.png image2.png
```

### 6. List OpenAI Assistants

Lists all available OpenAI assistants with their IDs and names.

```bash
inspector assistants
```

**Arguments:** None

**Options:** None

**Output:**
- Console list of assistant IDs and names
- Useful for finding assistant IDs for the `assistant` command

**Example:**
```bash
inspector assistants
```

**Sample Output:**
```
asst_abc123 - Website Analyzer
asst_def456 - E-commerce Inspector
asst_ghi789 - Content Reviewer
```

### 7. CMS Detection

Analyzes websites to detect Content Management Systems and their configurations. Supports both single URL analysis and batch processing from CSV files.

```bash
inspector detect-cms <input>
```

**Arguments:**
- `<input>` - Website URL or CSV file containing URLs (required)

**Input Types:**
- **Single URL**: Direct website analysis
- **CSV File**: Batch processing with flexible column detection

**Features:**
- **Detection**: WordPress, Joomla, and Drupal
- **Version Identification**: CMS versions when available
- **Plugin Discovery**: WordPress plugins found in HTML
- **Endpoint Testing**: CMS-specific API endpoints and files
- **Batch Processing**: Concurrent analysis with progress tracking
- **Error Resilience**: Continues processing if individual URLs fail
- **Smart Input Detection**: Automatically detects URL vs CSV file

**CSV Support:**
- **Flexible Format**: Looks for 'url', 'urls', 'website', or 'link' columns
- **Case Insensitive**: Column names can be uppercase or lowercase
- **Ignores Other Columns**: Processes only URL data
- **Concurrency Control**: Uses semaphore for controlled parallelism

**Detection Methods:**
- Meta tag analysis (`generator` meta tags)
- HTML content scanning for CMS signatures
- API endpoint testing (WordPress JSON API)
- File existence checks (CHANGELOG.txt for Drupal)
- Header analysis for CMS indicators

**Examples:**

**Single URL Analysis:**
```bash
# Basic CMS detection
inspector detect-cms https://example.com

# WordPress site analysis
inspector detect-cms https://wordpress-site.com
```

**CSV Batch Processing:**
```bash
# Process URLs from CSV file
inspector detect-cms websites.csv

# Works with various CSV formats
inspector detect-cms product_list.csv
```

**CSV Format Examples:**
```csv
# Simple format
url,path
https://example.com,example_site
https://shop.example.com,shop_site

# Alternative column names (all supported)
URL,description
https://wordpress-site.com,WordPress Blog
https://joomla-site.com,Company Site

# Mixed case (works fine)
Website,Notes
https://drupal-site.com,News Portal
```

**Single URL Output:**
```
Detected CMS for https://example.com:
CMS: WordPress
Version: 6.2.1
```

**CSV Batch Output:**
```
Processing CMS detection for 10 URLs...
[1/10] ✓ example.com → WordPress 6.2.1
[2/10] ✓ shop-site.com → Unknown
[3/10] ✗ bad-url.com → Error: Connection timeout
...

CMS Detection Results (10 URLs processed):
✓ 8 successful, ✗ 2 failed

Successful detections:
- example.com: WordPress 6.2.1
- shop-site.com: Unknown
- drupal-site.com: Drupal 9.4.0

Failed URLs:
- bad-url.com: Connection timeout
- broken-site.com: Invalid response
```

**Performance:**
- **Concurrent Processing**: Respects `config.puppeteer.maxConcurrency` setting
- **Real-time Progress**: Live updates during batch processing
- **Error Continuation**: Individual failures don't stop batch processing
- **Clean URL Display**: Shows URLs without protocol for readability

### 8. Assistant Evaluation (Not Implemented)

Framework for evaluating assistant performance against screenshot datasets.

```bash
inspector eval <assistant> <infilename> [options]
```

**Arguments:**
- `<assistant>` - Assistant ID to evaluate (required)
- `<infilename>` - JSON file with evaluation data (required)

**Options:**
- `-o, --outfile <outfile>` - Save evaluation results to file
- `-t, --temperature <temperature>` - Temperature setting
- `-p, --top_p <top_p>` - Top P setting

**Status:** ⚠️ **NOT IMPLEMENTED**
- Command is defined in CLI but functionality is not complete
- Marked with TODO comments in source code

## Global Behavior

### Error Handling
- All commands include comprehensive error handling
- API calls use exponential backoff retry logic
- Network errors are handled gracefully with retry mechanisms
- File operations include validation and proper error messages

### Logging
- Structured logging throughout all operations
- Configurable log levels (debug, info, warn, error)
- Operation tracking for debugging and monitoring

### Resource Management
- Browser instances are properly cleaned up
- OpenAI file uploads are automatically deleted after use
- Semaphore-based concurrency control prevents resource exhaustion
- Timeout handling for long-running operations

### Output Files
- Screenshots saved to `./scrapes/` directory
- Automatic filename formatting with width and segment suffixes
- JSON output files can be specified with `-o` option
- File existence validation before processing

## Environment Requirements

### Required Environment Variables
```bash
OPENAI_API_KEY=your-openai-api-key-here
```

### Optional Configuration
```bash
LOG_LEVEL=info          # debug, info, warn, error
PUPPETEER_TIMEOUT=30000 # Browser timeout in milliseconds
```

### File Structure
```
./scrapes/              # Default screenshot output directory
.env                    # Environment variables (optional)
inspector.config.json   # Configuration file (optional)
```

## Error Codes and Troubleshooting

### Common Exit Codes
- `0` - Success
- `1` - General error (invalid arguments, file not found, etc.)
- Network errors are retried automatically with exponential backoff

### Common Issues
- **Missing API key**: Set `OPENAI_API_KEY` environment variable
- **File not found**: Check file paths and permissions
- **Network timeouts**: Commands include retry logic; check internet connectivity
- **Large files**: OpenAI has 20MB file size limit for uploads
- **Rate limits**: Automatic retry with exponential backoff handles rate limiting

### Debug Mode
```bash
LOG_LEVEL=debug inspector <command>
```

This enables verbose logging for troubleshooting command execution and API interactions.