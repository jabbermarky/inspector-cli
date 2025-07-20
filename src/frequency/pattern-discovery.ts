import { createModuleLogger } from '../utils/logger.js';
import type { DetectionDataPoint } from './types.js';
import { analyzeHeaderSemantics } from './semantic-analyzer.js';
import { findVendorByHeader } from './vendor-patterns.js';

const logger = createModuleLogger('frequency-pattern-discovery');

/**
 * Discovered header pattern
 */
export interface DiscoveredPattern {
  pattern: string;
  type: 'prefix' | 'suffix' | 'contains' | 'regex';
  frequency: number;
  sites: string[];
  examples: string[];
  confidence: number;
  potentialVendor?: string;
  cmsCorrelation?: Record<string, number>;
}

/**
 * Pattern evolution tracking
 */
export interface PatternEvolution {
  pattern: string;
  versions: Array<{
    pattern: string;
    frequency: number;
    timeRange: { start: Date; end: Date };
    examples: string[];
  }>;
  evolutionType: 'versioning' | 'migration' | 'deprecation' | 'new';
  confidence: number;
}

/**
 * Emerging vendor pattern
 */
export interface EmergingVendorPattern {
  vendorName: string;
  patterns: DiscoveredPattern[];
  confidence: number;
  sites: string[];
  characteristics: {
    namingConvention: string;
    commonPrefixes: string[];
    semanticCategories: string[];
  };
}

/**
 * Semantic anomaly detection
 */
export interface SemanticAnomaly {
  headerName: string;
  expectedCategory: string;
  actualCategory: string;
  confidence: number;
  reason: string;
  sites: string[];
}

/**
 * Pattern discovery analysis results
 */
export interface PatternDiscoveryAnalysis {
  discoveredPatterns: DiscoveredPattern[];
  emergingVendors: EmergingVendorPattern[];
  patternEvolution: PatternEvolution[];
  semanticAnomalies: SemanticAnomaly[];
  insights: string[];
}

/**
 * Discover new header patterns from frequency data
 */
export function discoverHeaderPatterns(dataPoints: DetectionDataPoint[]): PatternDiscoveryAnalysis {
  logger.info('Starting pattern discovery analysis', { dataPointCount: dataPoints.length });
  
  const startTime = performance.now();
  
  // Step 1: Extract all unique headers with frequency data
  const headerFrequency = buildHeaderFrequencyMap(dataPoints);
  
  // Step 2: Discover common naming patterns
  const discoveredPatterns = extractNamingPatterns(headerFrequency, dataPoints);
  
  // Step 3: Identify emerging vendor patterns
  const emergingVendors = identifyEmergingVendors(discoveredPatterns, dataPoints);
  
  // Step 4: Analyze pattern evolution
  const patternEvolution = analyzePatternEvolution(dataPoints);
  
  // Step 5: Detect semantic anomalies
  const semanticAnomalies = detectSemanticAnomalies(headerFrequency);
  
  // Step 6: Generate insights
  const insights = generatePatternInsights({
    discoveredPatterns,
    emergingVendors,
    patternEvolution,
    semanticAnomalies
  });
  
  const duration = performance.now() - startTime;
  
  logger.info('Pattern discovery complete', {
    duration: Math.round(duration),
    discoveredPatterns: discoveredPatterns.length,
    emergingVendors: emergingVendors.length,
    patternEvolution: patternEvolution.length,
    semanticAnomalies: semanticAnomalies.length
  });
  
  return {
    discoveredPatterns,
    emergingVendors,
    patternEvolution,
    semanticAnomalies,
    insights
  };
}

/**
 * Build frequency map for all headers
 */
function buildHeaderFrequencyMap(dataPoints: DetectionDataPoint[]): Map<string, {
  frequency: number;
  sites: string[];
  cmsCorrelation: Record<string, number>;
}> {
  const headerMap = new Map<string, Set<string>>();
  const cmsMap = new Map<string, string>();
  
  // Collect headers and CMS data
  for (const dataPoint of dataPoints) {
    let cms = 'Unknown';
    if (dataPoint.detectionResults?.length > 0) {
      const bestDetection = dataPoint.detectionResults
        .sort((a, b) => b.confidence - a.confidence)[0];
      cms = bestDetection?.cms || 'Unknown';
    }
    cmsMap.set(dataPoint.url, cms);
    
    // Collect headers from mainpage
    if (dataPoint.httpHeaders) {
      Object.keys(dataPoint.httpHeaders).forEach(header => {
        const lowerHeader = header.toLowerCase();
        if (!headerMap.has(lowerHeader)) {
          headerMap.set(lowerHeader, new Set());
        }
        headerMap.get(lowerHeader)!.add(dataPoint.url);
      });
    }
    
    // Collect headers from robots.txt
    if (dataPoint.robotsTxt?.httpHeaders) {
      Object.keys(dataPoint.robotsTxt.httpHeaders).forEach(header => {
        const lowerHeader = header.toLowerCase();
        if (!headerMap.has(lowerHeader)) {
          headerMap.set(lowerHeader, new Set());
        }
        headerMap.get(lowerHeader)!.add(dataPoint.url);
      });
    }
  }
  
  // Calculate frequencies and CMS correlations
  const frequencyMap = new Map<string, {
    frequency: number;
    sites: string[];
    cmsCorrelation: Record<string, number>;
  }>();
  
  for (const [header, siteSet] of headerMap.entries()) {
    const sites = Array.from(siteSet);
    const frequency = sites.length / dataPoints.length;
    
    // Calculate CMS correlation
    const cmsCorrelation: Record<string, number> = {};
    for (const site of sites) {
      const cms = cmsMap.get(site) || 'Unknown';
      cmsCorrelation[cms] = (cmsCorrelation[cms] || 0) + 1;
    }
    
    // Convert to percentages
    for (const cms in cmsCorrelation) {
      cmsCorrelation[cms] = cmsCorrelation[cms] / sites.length;
    }
    
    frequencyMap.set(header, {
      frequency,
      sites,
      cmsCorrelation
    });
  }
  
  return frequencyMap;
}

/**
 * Extract common naming patterns from headers
 */
function extractNamingPatterns(
  headerFrequency: Map<string, { frequency: number; sites: string[]; cmsCorrelation: Record<string, number> }>,
  dataPoints: DetectionDataPoint[]
): DiscoveredPattern[] {
  const patterns: DiscoveredPattern[] = [];
  const headers = Array.from(headerFrequency.keys());
  
  // Discover prefix patterns
  const prefixPatterns = discoverPrefixPatterns(headers, headerFrequency, dataPoints.length);
  patterns.push(...prefixPatterns);
  
  // Discover suffix patterns
  const suffixPatterns = discoverSuffixPatterns(headers, headerFrequency, dataPoints.length);
  patterns.push(...suffixPatterns);
  
  // Discover contains patterns (common words/tokens)
  const containsPatterns = discoverContainsPatterns(headers, headerFrequency, dataPoints.length);
  patterns.push(...containsPatterns);
  
  // Discover regex patterns (complex patterns)
  const regexPatterns = discoverRegexPatterns(headers, headerFrequency, dataPoints.length);
  patterns.push(...regexPatterns);
  
  // Filter and score patterns
  const minFrequency = dataPoints.length >= 100 ? 0.05 : 0.10; // Lower threshold for small datasets
  return patterns
    .filter(p => p.frequency >= minFrequency && p.examples.length >= 2) 
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 50); // Top 50 patterns
}

/**
 * Discover common prefix patterns
 */
function discoverPrefixPatterns(
  headers: string[],
  headerFrequency: Map<string, { frequency: number; sites: string[]; cmsCorrelation: Record<string, number> }>,
  totalSites: number
): DiscoveredPattern[] {
  const prefixMap = new Map<string, string[]>();
  
  // Group headers by common prefixes (2-12 characters)
  for (const header of headers) {
    for (let len = 2; len <= Math.min(12, header.length - 2); len++) { // -2 to ensure meaningful suffix after prefix
      // Only consider meaningful prefixes (ending with separator)
      if (len < header.length && (header[len] === '-' || header[len] === '_')) {
        const prefix = header.substring(0, len + 1); // Include the separator in the prefix
        if (!prefixMap.has(prefix)) {
          prefixMap.set(prefix, []);
        }
        prefixMap.get(prefix)!.push(header);
      }
    }
  }
  
  const patterns: DiscoveredPattern[] = [];
  
  for (const [prefix, matchingHeaders] of prefixMap.entries()) {
    if (matchingHeaders.length >= 2) { // At least 2 headers with this prefix
      const allSites = new Set<string>();
      let totalFrequency = 0;
      const cmsCorrelation: Record<string, number> = {};
      
      for (const header of matchingHeaders) {
        const headerData = headerFrequency.get(header);
        if (headerData) {
          headerData.sites.forEach(site => allSites.add(site));
          totalFrequency += headerData.frequency;
          
          for (const [cms, correlation] of Object.entries(headerData.cmsCorrelation)) {
            cmsCorrelation[cms] = (cmsCorrelation[cms] || 0) + correlation;
          }
        }
      }
      
      // Normalize CMS correlation
      for (const cms in cmsCorrelation) {
        cmsCorrelation[cms] = cmsCorrelation[cms] / matchingHeaders.length;
      }
      
      const frequency = allSites.size / totalSites;
      
      patterns.push({
        pattern: prefix + '*',
        type: 'prefix',
        frequency,
        sites: Array.from(allSites),
        examples: matchingHeaders.slice(0, 5),
        confidence: Math.min(matchingHeaders.length / 10, 1), // More headers = higher confidence
        cmsCorrelation
      });
    }
  }
  
  return patterns;
}

/**
 * Discover common suffix patterns
 */
function discoverSuffixPatterns(
  headers: string[],
  headerFrequency: Map<string, { frequency: number; sites: string[]; cmsCorrelation: Record<string, number> }>,
  totalSites: number
): DiscoveredPattern[] {
  const suffixMap = new Map<string, string[]>();
  
  // Group headers by common suffixes
  for (const header of headers) {
    for (let len = 2; len <= Math.min(8, header.length - 1); len++) {
      const suffix = header.substring(header.length - len);
      if (!suffixMap.has(suffix)) {
        suffixMap.set(suffix, []);
      }
      suffixMap.get(suffix)!.push(header);
    }
  }
  
  const patterns: DiscoveredPattern[] = [];
  
  for (const [suffix, matchingHeaders] of suffixMap.entries()) {
    if (matchingHeaders.length >= 2) {
      const allSites = new Set<string>();
      const cmsCorrelation: Record<string, number> = {};
      
      for (const header of matchingHeaders) {
        const headerData = headerFrequency.get(header);
        if (headerData) {
          headerData.sites.forEach(site => allSites.add(site));
          
          for (const [cms, correlation] of Object.entries(headerData.cmsCorrelation)) {
            cmsCorrelation[cms] = (cmsCorrelation[cms] || 0) + correlation;
          }
        }
      }
      
      // Normalize CMS correlation
      for (const cms in cmsCorrelation) {
        cmsCorrelation[cms] = cmsCorrelation[cms] / matchingHeaders.length;
      }
      
      const frequency = allSites.size / totalSites;
      
      patterns.push({
        pattern: '*' + suffix,
        type: 'suffix',
        frequency,
        sites: Array.from(allSites),
        examples: matchingHeaders.slice(0, 5),
        confidence: Math.min(matchingHeaders.length / 8, 1),
        cmsCorrelation
      });
    }
  }
  
  return patterns;
}

/**
 * Discover common word/token patterns
 */
function discoverContainsPatterns(
  headers: string[],
  headerFrequency: Map<string, { frequency: number; sites: string[]; cmsCorrelation: Record<string, number> }>,
  totalSites: number
): DiscoveredPattern[] {
  const tokenMap = new Map<string, string[]>();
  
  // Extract meaningful tokens from headers
  for (const header of headers) {
    const tokens = extractTokens(header);
    
    for (const token of tokens) {
      if (token.length >= 3) { // Meaningful tokens only
        if (!tokenMap.has(token)) {
          tokenMap.set(token, []);
        }
        tokenMap.get(token)!.push(header);
      }
    }
  }
  
  const patterns: DiscoveredPattern[] = [];
  
  for (const [token, matchingHeaders] of tokenMap.entries()) {
    if (matchingHeaders.length >= 3) { // At least 3 headers with this token
      const allSites = new Set<string>();
      const cmsCorrelation: Record<string, number> = {};
      
      for (const header of matchingHeaders) {
        const headerData = headerFrequency.get(header);
        if (headerData) {
          headerData.sites.forEach(site => allSites.add(site));
          
          for (const [cms, correlation] of Object.entries(headerData.cmsCorrelation)) {
            cmsCorrelation[cms] = (cmsCorrelation[cms] || 0) + correlation;
          }
        }
      }
      
      // Normalize CMS correlation
      for (const cms in cmsCorrelation) {
        cmsCorrelation[cms] = cmsCorrelation[cms] / matchingHeaders.length;
      }
      
      const frequency = allSites.size / totalSites;
      
      patterns.push({
        pattern: `*${token}*`,
        type: 'contains',
        frequency,
        sites: Array.from(allSites),
        examples: matchingHeaders.slice(0, 5),
        confidence: Math.min(matchingHeaders.length / 15, 1),
        cmsCorrelation
      });
    }
  }
  
  return patterns;
}

/**
 * Discover complex regex patterns
 */
function discoverRegexPatterns(
  headers: string[],
  headerFrequency: Map<string, { frequency: number; sites: string[]; cmsCorrelation: Record<string, number> }>,
  totalSites: number
): DiscoveredPattern[] {
  const patterns: DiscoveredPattern[] = [];
  
  // Common regex patterns to test
  const regexTemplates = [
    { pattern: /^x-[a-z]+-[a-z]+$/, name: 'x-word-word' },
    { pattern: /^[a-z]+-[a-z]+-[a-z]+$/, name: 'word-word-word' },
    { pattern: /^[a-z]+_[a-z]+$/, name: 'word_word' },
    { pattern: /^[a-z]+-id$/, name: 'word-id' },
    { pattern: /^x-[a-z]+-id$/, name: 'x-word-id' },
    { pattern: /^[a-z]+-version$/, name: 'word-version' },
    { pattern: /^[a-z]+-time$/, name: 'word-time' },
    { pattern: /^[a-z]+-cache$/, name: 'word-cache' }
  ];
  
  for (const template of regexTemplates) {
    const matchingHeaders = headers.filter(h => template.pattern.test(h));
    
    if (matchingHeaders.length >= 2) {
      const allSites = new Set<string>();
      const cmsCorrelation: Record<string, number> = {};
      
      for (const header of matchingHeaders) {
        const headerData = headerFrequency.get(header);
        if (headerData) {
          headerData.sites.forEach(site => allSites.add(site));
          
          for (const [cms, correlation] of Object.entries(headerData.cmsCorrelation)) {
            cmsCorrelation[cms] = (cmsCorrelation[cms] || 0) + correlation;
          }
        }
      }
      
      // Normalize CMS correlation
      for (const cms in cmsCorrelation) {
        cmsCorrelation[cms] = cmsCorrelation[cms] / matchingHeaders.length;
      }
      
      const frequency = allSites.size / totalSites;
      
      patterns.push({
        pattern: template.name,
        type: 'regex',
        frequency,
        sites: Array.from(allSites),
        examples: matchingHeaders.slice(0, 5),
        confidence: Math.min(matchingHeaders.length / 5, 1),
        cmsCorrelation
      });
    }
  }
  
  return patterns;
}

/**
 * Extract meaningful tokens from header name
 */
function extractTokens(header: string): string[] {
  // Split on common delimiters and extract meaningful parts
  const tokens = header.toLowerCase()
    .split(/[-_\s.]+/)
    .filter(token => token.length >= 2);
  
  // Also extract continuous letter sequences
  const letterSequences = header.toLowerCase().match(/[a-z]{3,}/g) || [];
  
  return [...new Set([...tokens, ...letterSequences])];
}

/**
 * Identify emerging vendor patterns
 */
function identifyEmergingVendors(
  discoveredPatterns: DiscoveredPattern[],
  dataPoints: DetectionDataPoint[]
): EmergingVendorPattern[] {
  const vendorCandidates = new Map<string, {
    patterns: DiscoveredPattern[];
    sites: Set<string>;
    characteristics: any;
  }>();
  
  // Group patterns by potential vendor
  for (const pattern of discoveredPatterns) {
    // Use lower thresholds for test datasets
    const minConfidence = dataPoints.length >= 100 ? 0.3 : 0.1;
    const minFrequency = dataPoints.length >= 100 ? 0.05 : 0.01;
    
    if (pattern.confidence > minConfidence && pattern.frequency > minFrequency) {
      // Try to identify vendor from pattern
      const potentialVendor = inferVendorFromPattern(pattern);
      
      
      if (potentialVendor && !isKnownVendor(potentialVendor)) {
        if (!vendorCandidates.has(potentialVendor)) {
          vendorCandidates.set(potentialVendor, {
            patterns: [],
            sites: new Set(),
            characteristics: {
              namingConvention: '',
              commonPrefixes: [],
              semanticCategories: []
            }
          });
        }
        
        const candidate = vendorCandidates.get(potentialVendor)!;
        candidate.patterns.push(pattern);
        pattern.sites.forEach(site => candidate.sites.add(site));
      }
    }
  }
  
  // Analyze characteristics and build vendor patterns
  const emergingVendors: EmergingVendorPattern[] = [];
  
  for (const [vendorName, candidate] of vendorCandidates.entries()) {
    if (candidate.patterns.length >= 2) { // At least 2 patterns for a vendor
      // Analyze naming conventions
      const namingConventions = candidate.patterns.map(p => 
        analyzeNamingConvention(p.examples[0] || '')
      );
      const dominantConvention = findMostCommon(namingConventions);
      
      // Extract common prefixes
      const prefixes = candidate.patterns
        .filter(p => p.type === 'prefix')
        .map(p => p.pattern.replace('*', ''));
      
      // Analyze semantic categories
      const semanticCategories = candidate.patterns
        .flatMap(p => p.examples)
        .map(header => analyzeHeaderSemantics(header).category.primary);
      const uniqueCategories = [...new Set(semanticCategories)];
      
      const confidence = candidate.patterns.reduce((sum, p) => sum + p.confidence, 0) / candidate.patterns.length;
      
      emergingVendors.push({
        vendorName,
        patterns: candidate.patterns,
        confidence,
        sites: Array.from(candidate.sites),
        characteristics: {
          namingConvention: dominantConvention,
          commonPrefixes: prefixes,
          semanticCategories: uniqueCategories
        }
      });
    }
  }
  
  return emergingVendors.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Analyze pattern evolution over time
 */
function analyzePatternEvolution(dataPoints: DetectionDataPoint[]): PatternEvolution[] {
  // Group data points by time periods
  const timeGroups = groupDataPointsByTime(dataPoints);
  
  if (timeGroups.length < 2) {
    return []; // Need at least 2 time periods for evolution analysis
  }
  
  const evolutions: PatternEvolution[] = [];
  
  // Compare patterns between time periods
  for (let i = 1; i < timeGroups.length; i++) {
    const earlier = timeGroups[i - 1];
    const later = timeGroups[i];
    
    const earlierPatterns = extractPatternsFromTimeGroup(earlier);
    const laterPatterns = extractPatternsFromTimeGroup(later);
    
    // Find version evolution patterns
    const versionEvolutions = findVersionEvolutions(earlierPatterns, laterPatterns);
    evolutions.push(...versionEvolutions);
    
    // Find new patterns
    const newPatterns = findNewPatterns(earlierPatterns, laterPatterns);
    evolutions.push(...newPatterns);
    
    // Find deprecated patterns
    const deprecatedPatterns = findDeprecatedPatterns(earlierPatterns, laterPatterns);
    evolutions.push(...deprecatedPatterns);
  }
  
  return evolutions;
}

/**
 * Detect semantic anomalies in headers
 */
function detectSemanticAnomalies(
  headerFrequency: Map<string, { frequency: number; sites: string[]; cmsCorrelation: Record<string, number> }>
): SemanticAnomaly[] {
  const anomalies: SemanticAnomaly[] = [];
  
  for (const [header, data] of headerFrequency.entries()) {
    if (data.frequency > 0.01) { // Only analyze reasonably common headers
      const semanticAnalysis = analyzeHeaderSemantics(header);
      const knownVendor = findVendorByHeader(header);
      
      // Check for category mismatches
      const expectedCategory = predictExpectedCategory(header, knownVendor);
      
      if (expectedCategory && expectedCategory !== semanticAnalysis.category.primary) {
        anomalies.push({
          headerName: header,
          expectedCategory,
          actualCategory: semanticAnalysis.category.primary,
          confidence: semanticAnalysis.category.confidence,
          reason: `Header name suggests ${expectedCategory} but categorized as ${semanticAnalysis.category.primary}`,
          sites: data.sites.slice(0, 10)
        });
      }
      
      // Check for vendor mismatches
      if (knownVendor && semanticAnalysis.category.vendor !== knownVendor.name) {
        anomalies.push({
          headerName: header,
          expectedCategory: 'vendor-mismatch',
          actualCategory: semanticAnalysis.category.vendor || 'unknown',
          confidence: 0.8,
          reason: `Known vendor ${knownVendor.name} but semantic analysis suggests ${semanticAnalysis.category.vendor}`,
          sites: data.sites.slice(0, 10)
        });
      }
    }
  }
  
  return anomalies.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Generate insights from pattern discovery analysis
 */
function generatePatternInsights(analysis: Omit<PatternDiscoveryAnalysis, 'insights'>): string[] {
  const insights: string[] = [];
  
  // Pattern discovery insights
  if (analysis.discoveredPatterns.length > 0) {
    const topPattern = analysis.discoveredPatterns[0];
    insights.push(
      `Most common discovered pattern: ${topPattern.pattern} found in ${Math.round(topPattern.frequency * 100)}% of sites with ${topPattern.examples.length} variations`
    );
  }
  
  // Emerging vendor insights
  if (analysis.emergingVendors.length > 0) {
    const topVendor = analysis.emergingVendors[0];
    insights.push(
      `Emerging vendor pattern detected: ${topVendor.vendorName} with ${topVendor.patterns.length} header patterns across ${topVendor.sites.length} sites`
    );
  }
  
  // Evolution insights
  if (analysis.patternEvolution.length > 0) {
    const evolutions = analysis.patternEvolution.filter(e => e.evolutionType === 'versioning');
    if (evolutions.length > 0) {
      insights.push(
        `Header evolution detected: ${evolutions.length} patterns showing version evolution or migration trends`
      );
    }
  }
  
  // Anomaly insights
  if (analysis.semanticAnomalies.length > 0) {
    const highConfidenceAnomalies = analysis.semanticAnomalies.filter(a => a.confidence > 0.7);
    if (highConfidenceAnomalies.length > 0) {
      insights.push(
        `Semantic anomalies detected: ${highConfidenceAnomalies.length} headers with unexpected categorization (confidence > 70%)`
      );
    }
  }
  
  return insights;
}

// Helper functions

function inferVendorFromPattern(pattern: DiscoveredPattern): string | undefined {
  const patternName = pattern.pattern.toLowerCase();
  const examples = pattern.examples.map(e => e.toLowerCase());
  
  // Check for known vendor indicators in pattern
  const vendorIndicators = [
    { name: 'cloudflare', patterns: ['cf-', 'cloudflare'] },
    { name: 'fastly', patterns: ['fastly', 'fl-'] },
    { name: 'akamai', patterns: ['akamai', 'ak-'] },
    { name: 'amazon', patterns: ['aws', 'amazon', 'amz'] },
    { name: 'microsoft', patterns: ['ms-', 'microsoft', 'azure'] },
    { name: 'google', patterns: ['goog', 'google', 'gc-'] }
  ];
  
  for (const vendor of vendorIndicators) {
    if (vendor.patterns.some(p => patternName.includes(p) || examples.some(e => e.includes(p)))) {
      return vendor.name;
    }
  }
  
  // Extract vendor name from prefix patterns (e.g., "newvendor-*" -> "newvendor")
  if (pattern.type === 'prefix') {
    const prefixMatch = patternName.match(/^([a-z]+)[-_]\*$/);
    if (prefixMatch && prefixMatch[1].length >= 3) {
      const potentialVendor = prefixMatch[1];
      // Check if this looks like a vendor name (not a common word)
      const commonWords = ['content', 'cache', 'request', 'response', 'session', 'user', 'api', 'data'];
      if (!commonWords.includes(potentialVendor)) {
        return potentialVendor;
      }
    }
  }
  
  // Extract vendor name from contains patterns (e.g., "*newvendor*" -> "newvendor")
  if (pattern.type === 'contains') {
    const containsMatch = patternName.match(/^\*([a-z]{3,})\*$/);
    if (containsMatch) {
      const potentialVendor = containsMatch[1];
      // Check if this looks like a vendor name (not a common word)
      const commonWords = ['content', 'cache', 'request', 'response', 'session', 'user', 'api', 'data', 'version', 'total'];
      if (!commonWords.includes(potentialVendor)) {
        return potentialVendor;
      }
    }
  }
  
  return undefined;
}

function isKnownVendor(vendorName: string): boolean {
  // Check if vendor is already in our known vendor patterns
  return findVendorByHeader(`x-${vendorName}-test`) !== undefined;
}

function analyzeNamingConvention(header: string): string {
  if (/^[a-z]+(-[a-z]+)*$/.test(header)) return 'kebab-case';
  if (/^[a-zA-Z]+([A-Z][a-z]*)*$/.test(header)) return 'camelCase';
  if (/^[a-z]+(_[a-z]+)*$/.test(header)) return 'underscore_case';
  if (/^[A-Z]+(_[A-Z]+)*$/.test(header)) return 'UPPER_CASE';
  return 'mixed';
}

function findMostCommon<T>(items: T[]): T {
  const counts = new Map<T, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }
  
  let maxCount = 0;
  let mostCommon = items[0];
  for (const [item, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = item;
    }
  }
  
  return mostCommon;
}

function groupDataPointsByTime(dataPoints: DetectionDataPoint[]): DetectionDataPoint[][] {
  // Simple time grouping - can be enhanced with proper temporal analysis
  const sorted = dataPoints
    .filter(dp => dp.timestamp)
    .map(dp => ({ ...dp, timestamp: new Date(dp.timestamp!) })) // Ensure Date objects
    .sort((a, b) => a.timestamp!.getTime() - b.timestamp!.getTime());
  
  if (sorted.length < 10) return [sorted]; // Not enough data for temporal analysis
  
  // Split into 2-3 time periods
  const midpoint = Math.floor(sorted.length / 2);
  return [
    sorted.slice(0, midpoint),
    sorted.slice(midpoint)
  ];
}

function extractPatternsFromTimeGroup(dataPoints: DetectionDataPoint[]): string[] {
  const headers = new Set<string>();
  
  for (const dp of dataPoints) {
    if (dp.httpHeaders) {
      Object.keys(dp.httpHeaders).forEach(h => headers.add(h.toLowerCase()));
    }
    if (dp.robotsTxt?.httpHeaders) {
      Object.keys(dp.robotsTxt.httpHeaders).forEach(h => headers.add(h.toLowerCase()));
    }
  }
  
  return Array.from(headers);
}

function findVersionEvolutions(earlier: string[], later: string[]): PatternEvolution[] {
  // Simplified version evolution detection
  const evolutions: PatternEvolution[] = [];
  
  // Look for patterns like header-v1 vs header-v2
  const versionPattern = /^(.+)-?v?(\d+)$/;
  
  const earlierVersions = new Map<string, string[]>();
  const laterVersions = new Map<string, string[]>();
  
  for (const header of earlier) {
    const match = header.match(versionPattern);
    if (match) {
      const base = match[1];
      if (!earlierVersions.has(base)) earlierVersions.set(base, []);
      earlierVersions.get(base)!.push(header);
    }
  }
  
  for (const header of later) {
    const match = header.match(versionPattern);
    if (match) {
      const base = match[1];
      if (!laterVersions.has(base)) laterVersions.set(base, []);
      laterVersions.get(base)!.push(header);
    }
  }
  
  // Find evolved patterns
  for (const [base, earlierHeaders] of earlierVersions.entries()) {
    const laterHeaders = laterVersions.get(base);
    if (laterHeaders && !arraysEqual(earlierHeaders, laterHeaders)) {
      evolutions.push({
        pattern: base + '-*',
        versions: [
          {
            pattern: earlierHeaders.join(', '),
            frequency: earlierHeaders.length / earlier.length,
            timeRange: { start: new Date(), end: new Date() }, // Simplified
            examples: earlierHeaders
          },
          {
            pattern: laterHeaders.join(', '),
            frequency: laterHeaders.length / later.length,
            timeRange: { start: new Date(), end: new Date() }, // Simplified
            examples: laterHeaders
          }
        ],
        evolutionType: 'versioning',
        confidence: 0.8
      });
    }
  }
  
  return evolutions;
}

function findNewPatterns(earlier: string[], later: string[]): PatternEvolution[] {
  const newHeaders = later.filter(h => !earlier.includes(h));
  
  if (newHeaders.length > 0) {
    return [{
      pattern: 'new-patterns',
      versions: [{
        pattern: newHeaders.join(', '),
        frequency: newHeaders.length / later.length,
        timeRange: { start: new Date(), end: new Date() },
        examples: newHeaders.slice(0, 5)
      }],
      evolutionType: 'new',
      confidence: 0.6
    }];
  }
  
  return [];
}

function findDeprecatedPatterns(earlier: string[], later: string[]): PatternEvolution[] {
  const deprecatedHeaders = earlier.filter(h => !later.includes(h));
  
  if (deprecatedHeaders.length > 0) {
    return [{
      pattern: 'deprecated-patterns',
      versions: [{
        pattern: deprecatedHeaders.join(', '),
        frequency: deprecatedHeaders.length / earlier.length,
        timeRange: { start: new Date(), end: new Date() },
        examples: deprecatedHeaders.slice(0, 5)
      }],
      evolutionType: 'deprecation',
      confidence: 0.6
    }];
  }
  
  return [];
}

function predictExpectedCategory(header: string, knownVendor: any): string | undefined {
  const lowerHeader = header.toLowerCase();
  
  // Simple heuristics for expected categories
  if (lowerHeader.includes('cache')) return 'caching';
  if (lowerHeader.includes('security') || lowerHeader.includes('csp') || lowerHeader.includes('hsts')) return 'security';
  if (lowerHeader.includes('analytics') || lowerHeader.includes('tracking')) return 'analytics';
  if (lowerHeader.includes('wp') || lowerHeader.includes('wordpress')) return 'cms';
  if (lowerHeader.includes('shop') || lowerHeader.includes('commerce')) return 'ecommerce';
  
  return undefined;
}

function arraysEqual<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((val, i) => val === b[i]);
}