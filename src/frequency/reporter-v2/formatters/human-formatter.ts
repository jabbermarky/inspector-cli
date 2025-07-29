import { AggregatedResults } from '../../types/analyzer-interface.js';
import { FormattedSection, ExtendedFrequencyOptions } from '../types.js';
import * as summarySection from '../sections/summary-section.js';
import * as filteringSection from '../sections/filtering-section.js';
import * as headersSection from '../sections/headers-section.js';
import * as metaSection from '../sections/meta-tags-section.js';
import * as scriptsSection from '../sections/scripts-section.js';
import * as semanticSection from '../sections/semantic-section.js';
import * as patternDiscoverySection from '../sections/pattern-discovery-section.js';
import * as technologiesSection from '../sections/technologies-section.js';
import * as biasSection from '../sections/bias-section.js';

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
  
  // 2. Filtering stats (if available) - use a placeholder for now since interface doesn't match
  const filteringContent = ''; // filteringSection.formatForHuman(result.summary?.filteringStats);
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
  
  // 6. Semantic analysis (if available)
  const semanticContent = semanticSection.formatForHuman(result.semantic, options.maxItemsPerSection);
  if (semanticContent) {
    sections.push({
      title: 'Semantic Analysis',
      content: semanticContent,
      priority: 6
    });
  }
  
  // 7. Pattern discovery analysis (if available)
  const patternDiscoveryContent = patternDiscoverySection.formatForHuman(result.discovery, options.maxItemsPerSection);
  if (patternDiscoveryContent) {
    sections.push({
      title: 'Pattern Discovery',
      content: patternDiscoveryContent,
      priority: 7
    });
  }
  
  // 8. Technologies analysis (if available)
  const technologiesContent = technologiesSection.formatForHuman(result.technologies, options.maxItemsPerSection);
  if (technologiesContent) {
    sections.push({
      title: 'Technologies',
      content: technologiesContent,
      priority: 8
    });
  }
  
  // 9. Bias analysis (if available and enabled)
  if (options.includeRecommendations) {
    const biasContent = biasSection.formatForHuman(result.correlations);
    if (biasContent) {
      sections.push({
        title: 'Bias Analysis',
        content: biasContent,
        priority: 9
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