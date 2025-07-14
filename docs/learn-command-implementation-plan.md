# Learn Command Implementation Plan

**Document Version**: 1.0  
**Date**: July 14, 2025  
**Author**: Claude  
**Status**: Planning Phase

## Overview

The `learn` command will leverage Large Language Model (LLM) analysis to discover CMS detection patterns from website data. This command extends the successful Duda analysis approach to any website, providing structured pattern identification that can improve CMS detection capabilities.

## Command Specification

### Basic Usage

```bash
# Analyze using existing collected data (default)
node dist/index.js learn <url>

# Collect fresh data and analyze
node dist/index.js learn <url> --collect-data

# Batch analysis with custom prompt
node dist/index.js learn <csv-file> --prompt-template=custom --collect-data
```

### Command Arguments

- `<url>` - Single URL to analyze
- `<csv-file>` - CSV file with URL column for batch analysis

### Command Options

- `--collect-data` - Force fresh data collection instead of using cached data
- `--prompt-template=<name>` - Use specific prompt template (default: 'cms-detection')
- `--model=<model>` - OpenAI model to use (default: 'gpt-4')
- `--output-format=<format>` - Output format: json, summary, both (default: 'both')
- `--dry-run` - Show what data would be sent without making LLM API call
- `--cost-estimate` - Display token count and estimated cost before proceeding

## Architecture Design

### 1. Command Structure

```
src/commands/learn.ts
├── LearnCommand class
├── Data preparation logic
├── LLM integration
├── Output management
└── Error handling
```

### 2. Data Pipeline

```
URL Input → Data Collection/Retrieval → Data Enhancement → LLM Analysis → JSON Response → Storage → Summary Report
```

### 3. Integration Points

- **Existing Data Collection**: Reuse CMS detection data collection infrastructure
- **LLM Service**: Integrate with existing OpenAI API wrapper
- **Storage System**: Utilize existing data storage patterns with new learn/ directory
- **Ground Truth**: Optional integration with ground-truth analysis workflows

## Data Enhancement Specification

### Current Duda Analysis Data

- External script URLs (head section)
- Inline JavaScript content (head + body sections)
- Basic site metadata

### New Data Points to Include

1. **robots.txt Analysis**
    - `robots.txt` file contents
    - HTTP response headers for robots.txt request
    - Status codes and redirects

2. **Enhanced HTTP Headers**
    - Main page response headers (all headers)
    - Server signatures and version information
    - Security headers and policies

3. **Enhanced Meta Tags**
    - All meta tag names and values (not just generator)
    - OpenGraph properties
    - Twitter Card metadata
    - Custom meta properties

4. **DOM Structure Insights**
    - CSS class name patterns
    - ID attribute patterns
    - Custom data attributes
    - Comment blocks in HTML

### Data Collection Enhancement

```javascript
// New data structure for LLM analysis
{
  url: string,
  timestamp: string,
  htmlContent: string,
  scripts: Script[],
  metaTags: MetaTag[],
  httpHeaders: Record<string, string>,
  robotsTxt: {
    content: string,
    headers: Record<string, string>,
    statusCode: number,
    accessible: boolean
  },
  domStructure: {
    classPatterns: string[],
    idPatterns: string[],
    dataAttributes: string[],
    comments: string[]
  }
}
```

## LLM Integration Specification

### 1. Prompt Template System

```
src/templates/prompts/
├── cms-detection.md (default)
├── ecommerce-analysis.md
├── framework-detection.md
└── custom-templates/
```

### 2. Default Prompt Template Enhancement

Based on successful Duda analysis, enhanced with new data points:

```markdown
# Website Technology Analysis

## Site Information

**URL**: {url}
**Collection Date**: {timestamp}
**Analysis Scope**: Comprehensive CMS/Framework Detection

## Analysis Task

Analyze the provided website data to identify:

1. **Primary Technology Stack**: CMS, framework, or platform
2. **Version Information**: Extract version numbers and build information
3. **Hosting/Infrastructure**: CDN, hosting provider, server technology
4. **Development Patterns**: Code patterns indicating specific technologies

## Data Provided

### HTTP Response Headers

{httpHeaders}

### robots.txt Analysis

**Content**: {robotsTxtContent}
**Headers**: {robotsTxtHeaders}

### Meta Tags (Complete)

{metaTags}

### JavaScript Analysis

**External Scripts**: {externalScripts}
**Inline Scripts**: {inlineScripts}

### DOM Structure Patterns

**CSS Classes**: {classPatterns}
**Element IDs**: {idPatterns}  
**Data Attributes**: {dataAttributes}
**HTML Comments**: {htmlComments}

## Required Output Format

Return a JSON object with this exact structure:
{jsonSchema}
```

### 3. JSON Schema Definition

```json
{
  "platform_identification": {
    "detected_technology": "string",
    "category": "cms|framework|custom|ecommerce|unknown",
    "confidence": "number (0-1)",
    "primary_evidence": ["array of key evidence"]
  },
  "discriminative_patterns": {
    "high_confidence": [
      {
        "pattern_type": "string",
        "pattern": "string",
        "confidence": "number (0-1)",
        "description": "string",
        "data_source": "scripts|headers|meta|robots|dom"
      }
    ],
    "medium_confidence": [...],
    "low_confidence": [...]
  },
  "version_information": {
    "version_patterns": [
      {
        "source": "string",
        "pattern": "string",
        "example_value": "string",
        "confidence": "number (0-1)"
      }
    ]
  },
  "infrastructure_analysis": {
    "hosting_provider": "string",
    "cdn_usage": ["array of CDN providers"],
    "server_technology": "string",
    "security_headers": ["array of security features"]
  },
  "implementation_recommendations": {
    "detection_strategy": "string",
    "regex_patterns": ["array of implementable patterns"],
    "required_combinations": ["patterns that should appear together"],
    "exclusion_patterns": ["patterns that indicate false positives"]
  }
}
```

## File Organization

### 1. Output Directory Structure

```
data/
└── learn/
    ├── index.json (master index of all learn analyses)
    ├── by-date/
    │   └── 2025-07-14/
    │       ├── analysis-001-example.com.json
    │       └── analysis-002-wordpress.org.json
    ├── by-technology/
    │   ├── wordpress/
    │   ├── drupal/
    │   ├── react/
    │   └── unknown/
    └── summaries/
        ├── daily-summary-2025-07-14.md
        └── technology-patterns.json
```

### 2. Analysis File Format

```json
{
  "metadata": {
    "analysisId": "unique-id",
    "url": "analyzed-url",
    "timestamp": "ISO-timestamp",
    "model": "gpt-4",
    "promptTemplate": "cms-detection",
    "promptVersion": "1.0",
    "dataSource": "fresh|cached",
    "tokenCount": 1500,
    "estimatedCost": 0.045
  },
  "inputData": {
    "url": "...",
    "collectionMetadata": {...},
    "enhancedData": {...}
  },
  "llmResponse": {
    "rawResponse": "original LLM response",
    "parsedJson": {...},
    "parseErrors": [],
    "validationStatus": "valid|invalid|partial"
  },
  "analysis": {
    "confidence": 0.85,
    "technologyDetected": "WordPress",
    "keyPatterns": [...],
    "implementablePatterns": [...]
  }
}
```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)

- [ ] Create learn command basic structure
- [ ] Implement data enhancement collection
- [ ] Create prompt template system
- [ ] Set up output directory structure

### Phase 2: LLM Integration (Week 1-2)

- [ ] Integrate OpenAI API calls
- [ ] Implement JSON parsing and validation
- [ ] Add error handling and retry logic
- [ ] Create cost estimation functionality

### Phase 3: Analysis Features (Week 2)

- [ ] Implement batch processing for CSV files
- [ ] Add summary report generation
- [ ] Create pattern export functionality
- [ ] Add dry-run and debugging options

### Phase 4: Advanced Features (Week 3)

- [ ] Multiple prompt template support
- [ ] Integration with existing ground-truth workflows
- [ ] Pattern recommendation engine
- [ ] Automated pattern testing against dataset

## Risk Mitigation

### 1. API Cost Management

- **Token Estimation**: Calculate tokens before API calls
- **Cost Warnings**: Alert users for expensive operations
- **Batch Limits**: Reasonable defaults to prevent runaway costs
- **Rate Limiting**: Respect OpenAI API rate limits

### 2. Data Quality

- **Validation**: Validate JSON responses against schema
- **Fallback Handling**: Graceful handling of malformed responses
- **Data Sanitization**: Clean sensitive data before LLM analysis
- **Error Recovery**: Retry logic for network/API failures

### 3. Privacy & Security

- **Data Filtering**: Remove sensitive information before LLM submission
- **Local Processing**: Keep raw website data local when possible
- **API Key Security**: Secure storage and handling of OpenAI keys
- **Audit Trail**: Log all LLM interactions for review

## Success Metrics

### 1. Technical Metrics

- **Response Quality**: Valid JSON response rate >95%
- **Pattern Accuracy**: Implementable patterns >80% precision
- **Cost Efficiency**: Average cost per analysis <$0.10
- **Processing Speed**: Analysis completion <30 seconds

### 2. Business Metrics

- **Detection Improvement**: Increase in CMS detection accuracy
- **Pattern Discovery**: New discriminative patterns discovered per month
- **User Adoption**: Command usage frequency and feedback
- **Integration Success**: Patterns successfully integrated into detection system

## Dependencies

### 1. External Dependencies

- OpenAI API access and billing
- Existing data collection infrastructure
- Current LLM integration module

### 2. Internal Dependencies

- CMS detection command infrastructure
- Data storage and indexing system
- Ground-truth analysis workflows
- Pattern analysis system

## Future Enhancements

### 1. Short-term (Next Month)

- Support for multiple LLM providers (Claude, Gemini)
- Custom prompt template editor
- Automated pattern validation against known dataset
- Integration with pattern discovery workflow

### 2. Long-term (Next Quarter)

- Machine learning model training from LLM insights
- Automated detection rule generation
- Community pattern sharing and validation
- Real-time pattern effectiveness monitoring

## Questions for Review

1. **Data Privacy**: Are there any data types we should exclude from LLM analysis for privacy reasons?
   **Answer**: Not that I am aware of yet.

2. **Cost Controls**: What should be the default cost limits and warnings for batch operations?
   **Answer**: let's not worry about batch operations yet. deprioritize this option.

3. **Integration Strategy**: How should learn command results integrate with existing CMS detection improvements?
   **Answer**: we'll worry about that after this first command phase.

4. **Prompt Evolution**: How should we version and manage prompt template changes over time?
   **Answer**: Include the base prompt (without the URL-specific data) in the output, along with other metadata about the learn command (URL, data file identifier, timestamp, model used).

5. **Quality Assurance**: What validation should we perform on LLM-generated patterns before implementation?
   **Answer**: we'll worry about after this initial phase.

6. **LLM Integration**: Should this use the existing OpenAI integration in the app? Which model as default?
   **Answer**: use the GPT-4o model as default. we'll add more options later to override this.

7. **Prompt Management**: Should prompts be configurable files or hardcoded? Multiple templates?
**Answer**: There is already a prompts.ts file. add this prompt to that file. we will add an option later to supply a prompt from the command line.

8. **Data Scope**: Same collection limits as CMS detection, or expanded for LLM analysis?
**Answer**: yes, use the same as CMS detection.

9. **Cost Controls**: What should be reasonable default limits for token usage/costs?
**Answer**: let's add some tracking to the output metadata for how many tokens used.

10. **Output Integration**: Should results automatically feed into the pattern analysis system?
**Answer**: No. we will integrate later.
---

**Next Steps**: Review this plan, address questions, and proceed with Phase 1 implementation upon approval.
