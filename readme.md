# Readme

This is the inspector command line application for inspecting PayPal integrations.

## command line options:
### Screenshot a single URL to a PNG file
```
inspector screenshot [--width=<width>] <url> <path>
```

width is an option to specify the width of the capture in px. Default is 768.
url is a required argument that is the URL of the page to capture
path is a required argument that is the path of where to save the file. The default extension is .png. the default path is ./scrapes. The width is appended to the filename. 

Example:

capture google home page into a file at path ./scrapes/google_home_w1024.png
```
inspector screenshot --width=1024 https://www.google.com google_home
```

### Screenshot multiple URLs from a CSV file
```
inspector csv <csvfile>
```

csvfile is a required argument that contains one row per url, with 2 columns: URL & Path.

The first row of the file is a header and will be skipped.

Screenshots are taken per row @ 3 widths: 768, 1024, 1536.

### Create image segments from the header and footer of an image file
```bash
inspector footer [--header=<headerSize>] [--footer=<footerSize>] <filename>
# or
inspector header [--header=<headerSize>] [--footer=<footerSize>] <filename>
```

- **Arguments**: `<filename>` - Image file to process
- **Options**:
  - `-h, --header <headerSize>` - Height of the header segment in pixels (default: 1024)
  - `-f, --footer <footerSize>` - Height of the footer segment in pixels (default: 1024)
- **Note**: If 0 is passed for either option, no file is created for that segment
- **Output**: Files are created with segment type and height appended to filename

**Example:**

Extract header (512px) and footer (default 1024px) from an image:

```bash
inspector footer --header=512 ./scrapes/google_home_1024.png

# Creates 2 files:
# ./scrapes/google_home_1024_header_h512.png
# ./scrapes/google_home_1024_footer_h1024.png
```

## Development Commands

### Build and Run
- `npm run build` - Compile TypeScript to JavaScript and make the binary executable
- `npm run start` - Run the application using ts-node (development)
- `npm run dev` - Run TypeScript compiler in watch mode for development

### Testing

#### Unit Tests (Jest)
- `npm test` - Run Jest unit tests for core functionality
- `npm run test:watch` - Run Jest tests in watch mode for development
- `npm run test:coverage` - Run tests with coverage reporting

#### Integration Tests (Shell Scripts)
- `npm run test:integration` - Run comprehensive integration test suite
- `npm run test:quick` - Run quick verification tests (2-3 minutes)
- `npm run test:security` - Test API key security and path validation
- `npm run test:paths` - Test file path validation and security
- `npm run test:csv` - Test CSV processing and race condition fixes
- `npm run test:cleanup` - Test error handling and resource cleanup

See [TESTING.md](TESTING.md) for detailed testing information.

### Code Quality
- `npm run lint` - Run ESLint to check code quality
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run quality` - Run both linting and format checking
- `npm run quality:fix` - Fix both linting and formatting issues

### AI Analysis Commands

#### Analyze screenshots with OpenAI Chat API
```bash
inspector chat [--model=<model>] <screenshot...>
```

- **Arguments**: One or more screenshot files to analyze
- **Options**: 
  - `-m, --model <model>` - OpenAI model to use (default: chatgpt-4o-latest)
- **Example**: `inspector chat -m gpt-4o screenshot1.png screenshot2.png`

#### Analyze screenshots with OpenAI Assistant API
```bash
inspector assistant [options] <screenshot...>
```

- **Arguments**: One or more screenshot files to analyze
- **Options**:
  - `-a, --assistant <assistant>` - Specify the assistant to use
  - `-m, --model <model>` - Model to use
  - `-t, --temperature <temperature>` - Temperature setting (decimal)
  - `-p, --top_p <top_p>` - Top P setting
  - `-o, --outfile <outfile>` - Save output to a file
- **Example**: `inspector assistant -m gpt-4o -t 0.5 -o analysis.json screenshot.png`

#### List available OpenAI assistants
```bash
inspector assistants
```

- **Description**: Lists all available OpenAI assistants with their IDs and names
- **Example**: `inspector assistants`

### Evaluation Command

#### Evaluate assistant against screenshots (NOT IMPLEMENTED)
```bash
inspector eval <assistant> <infilename> [options]
```

- **Arguments**:
  - `<assistant>` - Assistant ID to use for evaluation
  - `<infilename>` - JSON file containing evaluation data
- **Options**:
  - `-o, --outfile <outfile>` - Save output to a file
  - `-t, --temperature <temperature>` - Temperature setting
  - `-p, --top_p <top_p>` - Top P setting
- **Status**: ⚠️ **NOT IMPLEMENTED** - Command defined but functionality not complete

### CMS Detection

#### Detect Content Management System (Single URL or Batch CSV)
```bash
inspector detect-cms <input>
```

- **Description**: Analyzes websites to detect if they use WordPress, Joomla, or Drupal. Supports both single URL analysis and batch processing from CSV files.
- **Arguments**: `<input>` - Website URL or CSV file containing URLs
- **Auto-Detection**: Automatically determines if input is a URL or CSV file
- **Features**: 
  - **CMS Detection**: WordPress, Joomla, and Drupal with version identification
  - **Plugin Discovery**: WordPress plugins found in HTML content
  - **Batch Processing**: Concurrent analysis with real-time progress tracking
  - **Error Resilience**: Continues processing if individual URLs fail
  - **Flexible CSV**: Supports various column names (url, website, link)
  - **Clean Output**: Progress indicators and comprehensive summary results

**Single URL Example:**
```bash
inspector detect-cms https://example.com
```

**CSV Batch Example:**
```bash
inspector detect-cms websites.csv
```

**Sample CSV format:**
```csv
url,description
https://wordpress-site.com,Main Site
https://joomla-site.com,Company Blog
https://drupal-site.com,News Portal
```

**Batch Output Example:**
```
Processing CMS detection for 3 URLs...
[1/3] ✓ wordpress-site.com → WordPress 6.2.1
[2/3] ✓ joomla-site.com → Unknown  
[3/3] ✓ drupal-site.com → Drupal 9.4.0

CMS Detection Results (3 URLs processed):
✓ 3 successful, ✗ 0 failed
```

## Environment Setup

Required environment variables:
```bash
OPENAI_API_KEY=your-openai-api-key-here
```

You can set this in a `.env` file in the project root.


