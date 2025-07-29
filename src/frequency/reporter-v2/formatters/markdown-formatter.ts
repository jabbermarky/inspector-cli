import { AggregatedResults } from '../../types/analyzer-interface.js';
import { ExtendedFrequencyOptions } from '../types.js';
import { hasValidPatterns } from '../utils/safe-map-utils.js';
import * as summarySection from '../sections/summary-section.js';
import * as filteringSection from '../sections/filtering-section.js';
import * as headersSection from '../sections/headers-section.js';
import * as metaSection from '../sections/meta-tags-section.js';
import * as scriptsSection from '../sections/scripts-section.js';
import * as biasSection from '../sections/bias-section.js';

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
  const filteringContent = filteringSection.formatForMarkdown(result.summary?.filteringStats);
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
  
  // 6. Bias section (if enabled)
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