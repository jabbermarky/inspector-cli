import { createModuleLogger } from '../utils/logger.js';
import { validateAndNormalizeUrl, createValidationContext } from '../utils/url/index.js';
import path from 'path';
import fs from 'fs/promises';

const logger = createModuleLogger('learn-meta-analysis');

/**
 * Load existing learn analyses for the provided URLs
 */
export async function loadExistingLearnAnalyses(urls: string[]): Promise<any[]> {
    const isLoadingAll = urls.length === 0;
    logger.info('Loading existing learn analyses', { 
        urlCount: urls.length,
        mode: isLoadingAll ? 'all-analyses' : 'specific-urls'
    });
    
    const analyses: any[] = [];
    const learnDataDir = path.join(process.cwd(), 'data', 'learn');
    const indexPath = path.join(learnDataDir, 'index.json');
    
    try {
        // Check if index exists
        await fs.access(indexPath);
        
        // Read index
        const indexContent = await fs.readFile(indexPath, 'utf-8');
        const index = JSON.parse(indexContent);
        
        if (isLoadingAll) {
            // Load ALL analyses when no URLs specified (for meta-analysis)
            logger.info('Loading all existing analyses for meta-analysis', { totalAnalyses: index.length });
            
            for (const entry of index) {
                try {
                    // Read the actual analysis file
                    const analysisFilePath = path.join(learnDataDir, entry.filepath);
                    const analysisContent = await fs.readFile(analysisFilePath, 'utf-8');
                    const analysisData = JSON.parse(analysisContent);
                    
                    analyses.push({
                        url: entry.url,
                        analysisId: entry.analysisId,
                        timestamp: entry.timestamp,
                        technology: entry.technology,
                        confidence: entry.confidence,
                        analysisData: analysisData
                    });
                    
                    logger.debug('Loaded analysis for meta-analysis', { 
                        url: entry.url,
                        analysisId: entry.analysisId,
                        technology: entry.technology
                    });
                    
                } catch (fileError) {
                    logger.warn('Failed to read analysis file for meta-analysis', { 
                        url: entry.url,
                        filepath: entry.filepath,
                        error: (fileError as Error).message 
                    });
                }
            }
        } else {
            // Load analyses for specific URLs (for cross-site analysis)
            // Normalize URLs for comparison
            const validationContext = createValidationContext('production');
            const normalizedUrls = urls.map(url => {
                try {
                    return validateAndNormalizeUrl(url, { context: validationContext });
                } catch {
                    return url; // Use original if normalization fails
                }
            });
            
            // Find matching entries for each URL
            for (const url of urls) {
                const normalizedUrl = normalizedUrls.find(nUrl => nUrl === url) || 
                                     validateAndNormalizeUrl(url, { context: validationContext });
                
                // Find matching entry by URL
                const matchingEntry = index.find((entry: any) => {
                    return entry.url === normalizedUrl || 
                           entry.url === url ||
                           entry.originalUrl === normalizedUrl ||
                           entry.originalUrl === url;
                });
                
                if (matchingEntry) {
                    try {
                        // Read the actual analysis file
                        const analysisFilePath = path.join(learnDataDir, matchingEntry.filepath);
                        const analysisContent = await fs.readFile(analysisFilePath, 'utf-8');
                        const analysisData = JSON.parse(analysisContent);
                        
                        analyses.push({
                            url: matchingEntry.url,
                            analysisId: matchingEntry.analysisId,
                            timestamp: matchingEntry.timestamp,
                            technology: matchingEntry.technology,
                            confidence: matchingEntry.confidence,
                            analysisData: analysisData
                        });
                        
                        logger.debug('Loaded analysis for URL', { 
                            url: matchingEntry.url,
                            analysisId: matchingEntry.analysisId,
                            technology: matchingEntry.technology
                        });
                        
                    } catch (fileError) {
                        logger.warn('Failed to read analysis file', { 
                            url: matchingEntry.url,
                            filepath: matchingEntry.filepath,
                            error: (fileError as Error).message 
                        });
                    }
                } else {
                    logger.debug('No existing analysis found for URL', { url, normalizedUrl });
                }
            }
        }
        
    } catch (error) {
        logger.error('Failed to load existing analyses', { error: (error as Error).message });
        return [];
    }
    
    logger.info('Loaded existing analyses', { 
        requested: urls.length,
        found: analyses.length
    });
    
    return analyses;
}

/**
 * Create technology-specific meta-analysis prompt
 */
export function createTechnologyMetaAnalysisPrompt(technology: string): string {
    return `** ROLE **
You are an expert web technology analyst specializing in ${technology} pattern analysis. You analyze multiple ${technology} detection results to identify the most reliable and consistent patterns for this specific technology.

** TASK **
Analyze the uploaded dataset containing ${technology} detection results from multiple sites to identify:
1. **Consistent Patterns**: Which patterns appear reliably across ${technology} sites
2. **Pattern Reliability**: How consistently patterns are detected
3. **Confidence Calibration**: How well confidence scores align with pattern quality
4. **Implementation Guidance**: Most reliable patterns for automated ${technology} detection

** CRITICAL TECHNOLOGY NAMING REQUIREMENTS **
You MUST use these exact technology names and classifications:
- **WordPress** (not "wordpress", "WordPress.org", "WordPress.com")
- **Drupal** (not "drupal", "Drupal 7", "Drupal 8/9/10")
- **Joomla** (not "joomla", "Joomla!", "joomla!")
- **Shopify** (not "shopify")
- **Magento** (not "magento", "Adobe Commerce")
- **Next.js** (not "nextjs", "next", "Next")
- **Wix** (not "wix")
- **Webflow** (not "webflow")
- **Duda** (not "duda")
- **Unknown** (not "unknown", "Unknown CMS", "unidentified")
- **Custom** (not "custom", "Custom Framework", "custom framework", "custom cms", "Custom CMS")

When uncertain between multiple technologies, use "Unknown" rather than inventing hybrid names.

** ANALYSIS OBJECTIVES **
1. **Pattern Frequency**: Identify patterns that appear in most ${technology} sites
2. **Reliability Assessment**: Determine which patterns are most trustworthy
3. **False Positive Prevention**: Identify patterns that might cause incorrect detection
4. **Implementation Priority**: Rank patterns by detection reliability

** REQUIRED OUTPUT FORMAT **
Return a JSON object with this exact structure:

{
  "technology_analysis": {
    "technology": "${technology}",
    "sites_analyzed": "number",
    "pattern_coverage": "percentage of sites with reliable patterns"
  },
  "pattern_consensus": {
    "high_reliability_patterns": [
      {
        "pattern": "pattern_text",
        "pattern_type": "meta_tag|javascript_global|http_header|dom_element",
        "frequency": "number (0.0-1.0)",
        "average_confidence": "number (0.0-1.0)",
        "sites_found": "number",
        "reliability_score": "number (0.0-1.0)"
      }
    ],
    "medium_reliability_patterns": [],
    "low_reliability_patterns": []
  },
  "implementation_recommendations": {
    "primary_detection_patterns": [
      {
        "pattern": "pattern_text",
        "weight": "number (0.0-1.0)",
        "detection_strategy": "required|optional|supplementary"
      }
    ],
    "pattern_combinations": [
      {
        "patterns": ["pattern1", "pattern2"],
        "combined_reliability": "number (0.0-1.0)",
        "detection_confidence": "number (0.0-1.0)"
      }
    ]
  },
  "quality_metrics": {
    "pattern_consistency": "number (0.0-1.0)",
    "detection_reliability": "number (0.0-1.0)",
    "false_positive_risk": "low|medium|high"
  }
}`;
}

/**
 * Create meta-analysis prompt for analyzing existing individual analyses
 */
export function createMetaAnalysisPrompt(): string {
    return `** ROLE **
You are an expert web technology analyst specializing in meta-analysis of CMS detection results. You analyze multiple individual LLM analyses to identify consensus patterns, inconsistencies, and reliability metrics.

** TASK **
Analyze the uploaded dataset containing individual LLM analysis results from multiple sites to identify:
1. **Pattern Consensus**: Which discriminative patterns appear consistently across analyses
2. **Analysis Quality**: How reliable and consistent the individual analyses are
3. **Technology Agreement**: Where analyses agree/disagree on technology detection
4. **Confidence Calibration**: How well confidence scores align with actual detection quality
5. **Implementation Insights**: Which patterns are most reliable for automated detection

** CRITICAL TECHNOLOGY NAMING REQUIREMENTS **
You MUST use these exact technology names and classifications:
- **WordPress** (not "wordpress", "WordPress.org", "WordPress.com")
- **Drupal** (not "drupal", "Drupal 7", "Drupal 8/9/10")
- **Joomla** (not "joomla", "Joomla!", "joomla!")
- **Shopify** (not "shopify")
- **Magento** (not "magento", "Adobe Commerce")
- **Next.js** (not "nextjs", "next", "Next")
- **Wix** (not "wix")
- **Webflow** (not "webflow")
- **Duda** (not "duda")
- **Unknown** (not "unknown", "Unknown CMS", "unidentified")
- **Custom** (not "custom", "Custom Framework", "custom framework", "custom cms", "Custom CMS")

When uncertain between multiple technologies, use "Unknown" rather than inventing hybrid names.

** ANALYSIS OBJECTIVES **
1. **Consensus Building**: Identify patterns that multiple analyses agree on
2. **Quality Assessment**: Evaluate the consistency and reliability of individual analyses
3. **Pattern Validation**: Determine which discriminative patterns are most reliable
4. **Confidence Analysis**: Assess how well confidence scores predict accuracy
5. **Implementation Guidance**: Provide recommendations based on consensus findings

** INPUT DATA FORMAT **
The uploaded file contains individual LLM analysis results with:
- Individual technology detections and confidence scores
- Discriminative patterns found by each analysis
- Pattern classifications (high/medium/low confidence)
- Evidence and reasoning from each analysis

** CRITICAL ANALYSIS FOCUS **
Pay special attention to:
1. **Pattern Frequency**: How often the same patterns appear across different analyses
2. **Confidence Consistency**: Whether similar patterns get similar confidence scores
3. **Technology Agreement**: Whether analyses agree on technology identification
4. **Evidence Quality**: Which types of evidence are most consistently identified
5. **Outlier Detection**: Analyses that significantly disagree with consensus

** REQUIRED OUTPUT FORMAT **
Return a JSON object with this exact structure:

{
  "meta_analysis_overview": {
    "total_analyses_reviewed": "number",
    "technologies_found": ["array of technologies identified"],
    "consensus_strength": "number (0.0-1.0)",
    "analysis_quality_score": "number (0.0-1.0)"
  },
  "pattern_consensus": {
    "high_consensus_patterns": [
      {
        "id": "pattern_identifier",
        "pattern": "pattern_text",
        "pattern_type": "http_header|meta_tag|javascript_global|etc",
        "consensus_rate": "number (0.0-1.0)",
        "average_confidence": "number (0.0-1.0)",
        "technology": "associated_technology",
        "analyses_found": "number",
        "description": "consensus_description"
      }
    ],
    "medium_consensus_patterns": [
      {
        "id": "pattern_identifier",
        "pattern": "pattern_text",
        "pattern_type": "http_header|meta_tag|javascript_global|etc",
        "consensus_rate": "number (0.0-1.0)",
        "average_confidence": "number (0.0-1.0)",
        "technology": "associated_technology",
        "analyses_found": "number",
        "description": "consensus_description"
      }
    ],
    "low_consensus_patterns": [
      {
        "id": "pattern_identifier",
        "pattern": "pattern_text",
        "pattern_type": "http_header|meta_tag|javascript_global|etc",
        "consensus_rate": "number (0.0-1.0)",
        "average_confidence": "number (0.0-1.0)",
        "technology": "associated_technology",
        "analyses_found": "number",
        "description": "consensus_description"
      }
    ]
  },
  "technology_consensus": {
    "by_technology": {
      "technology_name": {
        "total_sites": "number",
        "consensus_patterns": ["array of high-consensus pattern IDs"],
        "average_confidence": "number (0.0-1.0)",
        "confidence_consistency": "number (0.0-1.0)",
        "most_reliable_indicators": ["array of most reliable patterns"]
      }
    }
  },
  "quality_assessment": {
    "analysis_consistency": "number (0.0-1.0)",
    "confidence_calibration": "number (0.0-1.0)",
    "pattern_standardization": "number (0.0-1.0)",
    "evidence_quality": "number (0.0-1.0)",
    "outlier_analyses": [
      {
        "analysis_id": "string",
        "url": "string",
        "deviation_reason": "string",
        "confidence_deviation": "number"
      }
    ]
  },
  "implementation_recommendations": {
    "most_reliable_patterns": [
      {
        "pattern_id": "string",
        "pattern": "string",
        "reliability_score": "number (0.0-1.0)",
        "implementation_priority": "high|medium|low",
        "technology": "string",
        "usage_recommendation": "string"
      }
    ],
    "pattern_combinations": [
      {
        "technology": "string",
        "required_patterns": ["array of pattern IDs that should appear together"],
        "confidence_boost": "number representing confidence increase when combined",
        "reliability": "number (0.0-1.0)"
      }
    ],
    "confidence_thresholds": {
      "by_technology": {
        "technology_name": {
          "high_confidence_threshold": "number (0.0-1.0)",
          "medium_confidence_threshold": "number (0.0-1.0)",
          "low_confidence_threshold": "number (0.0-1.0)"
        }
      }
    }
  },
  "insights_and_findings": {
    "key_insights": ["array of key findings from meta-analysis"],
    "improvement_recommendations": ["array of recommendations for better analysis"],
    "pattern_gaps": ["patterns that should be present but are missing"],
    "false_positive_risks": ["patterns that may cause false positives"]
  }
}`;
}