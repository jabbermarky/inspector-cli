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

export function formatMarkdown(
  result: AggregatedResults,
  options: ExtendedFrequencyOptions
): string {
  const sections: string[] = [];
  
  // 1. Summary section (always first)
  const summaryContent = summarySection.formatForMarkdown(result.summary);
  if (summaryContent) {
    sections.push(summaryContent);
  }
  
  // 2. Filtering section
  const filteringStats = result.summary?.filteringStats;
  const filteringContent = filteringSection.formatForMarkdown(filteringStats);
  if (filteringContent) {
    sections.push(filteringContent);
  }
  
  // 3. Headers section
  if (hasValidPatterns(result.headers)) {
    const headersContent = headersSection.formatForMarkdown(result.headers, options.maxItemsPerSection);
    if (headersContent) {
      sections.push(headersContent);
    }
  }
  
  // 4. Meta tags section
  if (hasValidPatterns(result.metaTags)) {
    const metaContent = metaSection.formatForMarkdown(result.metaTags, options.maxItemsPerSection);
    if (metaContent) {
      sections.push(metaContent);
    }
  }
  
  // 5. Scripts section
  if (hasValidPatterns(result.scripts)) {
    const scriptsContent = scriptsSection.formatForMarkdown(result.scripts, options.maxItemsPerSection);
    if (scriptsContent) {
      sections.push(scriptsContent);
    }
  }
  
  // 6. Vendor section
  if (result.vendor) {
    const vendorContent = vendorSection.formatForMarkdown(result.vendor, options.maxItemsPerSection);
    if (vendorContent) {
      sections.push(vendorContent);
    }
  }
  
  // 6.5. Technology Categorization section (NEW ENHANCEMENT)
  if (result.vendor) {
    const technologyCategorizationContent = technologyCategorizationSection.formatForMarkdown(result.vendor, options.maxItemsPerSection);
    if (technologyCategorizationContent) {
      sections.push(technologyCategorizationContent);
    }
  }
  
  // 7. Semantic section
  if (result.semantic) {
    const semanticContent = semanticSection.formatForMarkdown(result.semantic, options.maxItemsPerSection);
    if (semanticContent) {
      sections.push(semanticContent);
    }
  }
  
  // 8. Pattern discovery section
  if (result.discovery) {
    const discoveryContent = patternDiscoverySection.formatForMarkdown(result.discovery, options.maxItemsPerSection);
    if (discoveryContent) {
      sections.push(discoveryContent);
    }
  }
  
  // 9. Co-occurrence section
  if (result.cooccurrence) {
    const cooccurrenceContent = cooccurrenceSection.formatForMarkdown(result.cooccurrence, options.maxItemsPerSection);
    if (cooccurrenceContent) {
      sections.push(cooccurrenceContent);
    }
  }
  
  // Removed Technologies section - redundant with script/vendor analyzers
  
  // 10. Bias section (if enabled)
  if (options.includeRecommendations && result.correlations) {
    const biasContent = biasSection.formatForMarkdown(result.correlations);
    if (biasContent) {
      sections.push(biasContent);
    }
  }
  
  // Filter out empty sections
  const validSections = sections.filter(section => section.trim().length > 0);
  
  if (validSections.length === 0) {
    return '# Frequency Analysis Results\n\nNo analysis results available.';
  }
  
  return validSections.join('\n\n');
}