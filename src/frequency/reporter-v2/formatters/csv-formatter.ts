import { AggregatedResults } from '../../types/analyzer-interface.js';
import { ExtendedFrequencyOptions } from '../types.js';
import { hasValidPatterns } from '../utils/safe-map-utils.js';
import * as summarySection from '../sections/summary-section.js';
import * as filteringSection from '../sections/filtering-section.js';
import * as headersSection from '../sections/headers-section.js';
import * as metaSection from '../sections/meta-tags-section.js';
import * as scriptsSection from '../sections/scripts-section.js';
import * as semanticSection from '../sections/semantic-section.js';
import * as vendorSection from '../sections/vendor-section.js';
import * as patternDiscoverySection from '../sections/pattern-discovery-section.js';
import * as cooccurrenceSection from '../sections/cooccurrence-section.js';
// Removed technologiesSection - redundant with script/vendor analyzers
import * as biasSection from '../sections/bias-section.js';
import * as technologyCategorizationSection from '../sections/technology-categorization-section.js';

export function formatCSV(
  result: AggregatedResults,
  options: ExtendedFrequencyOptions
): string {
  const sections: string[] = [];
  
  // 1. Summary section
  const summaryRows = summarySection.formatForCSV(result.summary);
  if (summaryRows.length > 0) {
    sections.push('# Summary');
    sections.push(...summaryRows);
    sections.push(''); // Empty line separator
  }
  
  // 2. Filtering section
  const filteringStats = result.summary?.filteringStats;
  const filteringRows = filteringSection.formatForCSV(filteringStats);
  if (filteringRows.length > 0) {
    sections.push('# Data Quality Filtering Statistics');
    sections.push(...filteringRows);
    sections.push(''); // Empty line separator
  }
  
  // 3. Headers section
  if (hasValidPatterns(result.headers)) {
    const headerRows = headersSection.formatForCSV(result.headers);
    if (headerRows.length > 0) {
      sections.push('# HTTP Headers');
      sections.push(...headerRows);
      sections.push(''); // Empty line separator
    }
  }
  
  // 4. Meta tags section
  if (hasValidPatterns(result.metaTags)) {
    const metaRows = metaSection.formatForCSV(result.metaTags);
    if (metaRows.length > 0) {
      sections.push('# Meta Tags');
      sections.push(...metaRows);
      sections.push(''); // Empty line separator
    }
  }
  
  // 5. Scripts section
  if (hasValidPatterns(result.scripts)) {
    const scriptRows = scriptsSection.formatForCSV(result.scripts);
    if (scriptRows.length > 0) {
      sections.push('# Script Patterns');
      sections.push(...scriptRows);
      sections.push(''); // Empty line separator
    }
  }
  
  // 6. Vendor section
  if (result.vendor) {
    const vendorRows = vendorSection.formatForCSV(result.vendor);
    if (vendorRows.length > 0) {
      sections.push('# Vendor Analysis');
      sections.push(...vendorRows);
      sections.push(''); // Empty line separator
    }
  }
  
  // 6.5. Technology Categorization section (NEW ENHANCEMENT)
  if (result.vendor) {
    const technologyCategorizationRows = technologyCategorizationSection.formatForCSV(result.vendor);
    if (technologyCategorizationRows.length > 0) {
      sections.push('# Technology Categorization');
      sections.push(...technologyCategorizationRows);
      sections.push(''); // Empty line separator
    }
  }
  
  // 7. Semantic section
  if (result.semantic) {
    const semanticRows = semanticSection.formatForCSV(result.semantic);
    if (semanticRows.length > 0) {
      sections.push('# Semantic Analysis');
      sections.push(...semanticRows);
      sections.push(''); // Empty line separator
    }
  }
  
  // 8. Pattern discovery section
  if (result.discovery) {
    const discoveryRows = patternDiscoverySection.formatForCSV(result.discovery);
    if (discoveryRows.length > 0) {
      sections.push('# Pattern Discovery');
      sections.push(...discoveryRows);
      sections.push(''); // Empty line separator
    }
  }
  
  // 9. Co-occurrence section
  if (result.cooccurrence) {
    const cooccurrenceRows = cooccurrenceSection.formatForCSV(result.cooccurrence);
    if (cooccurrenceRows.length > 0) {
      sections.push('# Co-occurrence Analysis');
      sections.push(...cooccurrenceRows);
      sections.push(''); // Empty line separator
    }
  }
  
  // Removed Technologies section - redundant with script/vendor analyzers
  
  // 10. Bias section (if enabled)
  if (options.includeRecommendations && result.correlations) {
    const biasRows = biasSection.formatForCSV(result.correlations);
    if (biasRows.length > 0) {
      sections.push('# Bias Analysis');
      sections.push(...biasRows);
      sections.push(''); // Empty line separator
    }
  }
  
  // Remove trailing empty line
  while (sections.length > 0 && sections[sections.length - 1] === '') {
    sections.pop();
  }
  
  return sections.join('\n');
}