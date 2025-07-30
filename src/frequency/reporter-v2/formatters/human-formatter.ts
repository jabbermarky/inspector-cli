import { AggregatedResults } from '../../types/analyzer-interface.js';
import { FormattedSection, ExtendedFrequencyOptions } from '../types.js';
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

export function formatHuman(
  result: AggregatedResults,
  options: ExtendedFrequencyOptions
): string {
  const sections: FormattedSection[] = [];
  
  // 1. Summary (always first)
  const summaryContent = summarySection.formatForHuman(result.summary);
  if (summaryContent) {
    sections.push({
      title: 'Summary',
      content: summaryContent,
      priority: 1
    });
  }
  
  // 2. Filtering stats (if available)
  // Check both possible locations for filtering stats
  const filteringStats = result.summary?.filteringStats;
  const filteringContent = filteringSection.formatForHuman(filteringStats);
  if (filteringContent) {
    sections.push({
      title: 'Filtering',
      content: filteringContent,
      priority: 2
    });
  }
  
  // 3. Headers analysis
  const headersContent = headersSection.formatForHuman(
    result.headers, 
    options.maxItemsPerSection, 
    options.includeValidation || false
  );
  if (headersContent) {
    sections.push({
      title: 'Headers',
      content: headersContent,
      priority: 3
    });
  }
  
  // 4. Meta tags analysis
  const metaContent = metaSection.formatForHuman(result.metaTags, options.maxItemsPerSection);
  if (metaContent) {
    sections.push({
      title: 'Meta Tags',
      content: metaContent,
      priority: 4
    });
  }
  
  // 5. Scripts analysis
  const scriptsContent = scriptsSection.formatForHuman(result.scripts, options.maxItemsPerSection);
  if (scriptsContent) {
    sections.push({
      title: 'Scripts',
      content: scriptsContent,
      priority: 5
    });
  }
  
  // 6. Vendor analysis (if available)
  const vendorContent = vendorSection.formatForHuman(result.vendor, options.maxItemsPerSection);
  if (vendorContent) {
    sections.push({
      title: 'Vendor Analysis',
      content: vendorContent,
      priority: 6
    });
  }
  
  // 6.5. Technology Categorization (NEW ENHANCEMENT)
  const technologyCategorizationContent = technologyCategorizationSection.formatForHuman(result.vendor, options.maxItemsPerSection);
  if (technologyCategorizationContent) {
    sections.push({
      title: 'Technology Categorization',
      content: technologyCategorizationContent,
      priority: 6.5
    });
  }
  
  // 7. Semantic analysis (if available)
  const semanticContent = semanticSection.formatForHuman(result.semantic, options.maxItemsPerSection);
  if (semanticContent) {
    sections.push({
      title: 'Semantic Analysis',
      content: semanticContent,
      priority: 7
    });
  }
  
  // 8. Pattern discovery analysis (if available)
  const patternDiscoveryContent = patternDiscoverySection.formatForHuman(result.discovery, options.maxItemsPerSection);
  if (patternDiscoveryContent) {
    sections.push({
      title: 'Pattern Discovery',
      content: patternDiscoveryContent,
      priority: 8
    });
  }
  
  // 9. Co-occurrence analysis (if available)
  const cooccurrenceContent = cooccurrenceSection.formatForHuman(result.cooccurrence, options.maxItemsPerSection);
  if (cooccurrenceContent) {
    sections.push({
      title: 'Co-occurrence Analysis',
      content: cooccurrenceContent,
      priority: 9
    });
  }
  
  // Removed Technologies analysis - redundant with script/vendor analyzers
  
  // 10. Bias analysis (if available and enabled)
  if (options.includeRecommendations) {
    const biasContent = biasSection.formatForHuman(result.correlations);
    if (biasContent) {
      sections.push({
        title: 'Bias Analysis',
        content: biasContent,
        priority: 10
      });
    }
  }
  
  // Filter out empty sections and sort by priority
  const validSections = sections
    .filter(section => section.content.trim().length > 0)
    .sort((a, b) => a.priority - b.priority);
  
  if (validSections.length === 0) {
    return 'No analysis results available.';
  }
  
  // Join sections with appropriate spacing
  return validSections
    .map(section => section.content)
    .join('\n\n');
}