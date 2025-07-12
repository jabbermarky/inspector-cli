# Feature-Oriented Folder Structure for Inspector CLI

## Core Principle: Feature Cohesion

Each feature should be self-contained with all its related components in one place. This makes it easy to understand, modify, and test a complete feature without jumping between multiple directories.

## Proposed Structure

```
inspector-cli/
├── src/
│   ├── features/                              # All features organized by domain
│   │   ├── cms-detection/
│   │   │   ├── commands/
│   │   │   │   ├── detect.command.ts         # CLI command handler
│   │   │   │   └── __tests__/
│   │   │   │       └── detect.command.test.ts
│   │   │   ├── workflows/
│   │   │   │   ├── single-url.workflow.ts    # Workflow definition + steps
│   │   │   │   ├── batch.workflow.ts         # Batch processing workflow
│   │   │   │   └── __tests__/
│   │   │   │       ├── single-url.workflow.test.ts
│   │   │   │       └── single-url.workflow.functional.test.ts
│   │   │   ├── services/
│   │   │   │   ├── detector.service.ts       # Core detection logic
│   │   │   │   ├── robots-analyzer.service.ts # Bot-resistant analysis
│   │   │   │   └── __tests__/
│   │   │   │       ├── detector.service.test.ts
│   │   │   │       └── detector.service.integration.test.ts
│   │   │   ├── models/
│   │   │   │   ├── detection-result.ts
│   │   │   │   └── detection-options.ts
│   │   │   ├── strategies/                    # Detection strategies
│   │   │   │   ├── wordpress.strategy.ts
│   │   │   │   ├── drupal.strategy.ts
│   │   │   │   └── __tests__/
│   │   │   │       └── wordpress.strategy.test.ts
│   │   │   ├── __tests__/
│   │   │   │   └── cms-detection.functional.test.ts  # Feature-level functional
│   │   │   └── index.ts                      # Public API exports
│   │   │
│   │   ├── ground-truth/                      # Complex feature gets its own folder
│   │   │   ├── commands/
│   │   │   │   ├── ground-truth.command.ts
│   │   │   │   └── __tests__/
│   │   │   │       └── ground-truth.command.test.ts
│   │   │   ├── workflows/
│   │   │   │   ├── analysis.workflow.ts      # Complete workflow with inline steps
│   │   │   │   └── __tests__/
│   │   │   │       ├── analysis.workflow.test.ts
│   │   │   │       └── analysis.workflow.functional.test.ts
│   │   │   ├── services/
│   │   │   │   ├── data-collector.service.ts
│   │   │   │   ├── signal-analyzer.service.ts
│   │   │   │   ├── interactive-ui.service.ts
│   │   │   │   ├── database.service.ts
│   │   │   │   └── __tests__/
│   │   │   │       ├── data-collector.service.test.ts
│   │   │   │       ├── signal-analyzer.service.test.ts
│   │   │   │       └── signal-analyzer.service.integration.test.ts
│   │   │   ├── analyzers/                     # Signal analyzers
│   │   │   │   ├── script.analyzer.ts
│   │   │   │   ├── html.analyzer.ts
│   │   │   │   ├── meta.analyzer.ts
│   │   │   │   └── __tests__/
│   │   │   │       ├── script.analyzer.test.ts
│   │   │   │       └── html.analyzer.test.ts
│   │   │   ├── models/
│   │   │   │   ├── signal-analysis.ts
│   │   │   │   └── ground-truth-entry.ts
│   │   │   ├── __tests__/
│   │   │   │   ├── ground-truth.functional.test.ts    # Feature-level functional
│   │   │   │   └── ground-truth.integration.test.ts   # Database integration
│   │   │   └── index.ts
│   │   │
│   │   ├── cms-analysis/
│   │   │   ├── commands/
│   │   │   │   ├── analyze.command.ts
│   │   │   │   ├── analyze-blocking.command.ts
│   │   │   │   └── __tests__/
│   │   │   │       ├── analyze.command.test.ts
│   │   │   │       └── analyze-blocking.command.test.ts
│   │   │   ├── workflows/
│   │   │   │   ├── data-analysis.workflow.ts
│   │   │   │   ├── blocking-analysis.workflow.ts
│   │   │   │   └── __tests__/
│   │   │   │       ├── data-analysis.workflow.test.ts
│   │   │   │       └── blocking-analysis.workflow.test.ts
│   │   │   ├── services/
│   │   │   │   ├── analysis.service.ts
│   │   │   │   ├── report-generator.service.ts
│   │   │   │   └── __tests__/
│   │   │   │       ├── analysis.service.test.ts
│   │   │   │       └── report-generator.service.test.ts
│   │   │   ├── __tests__/
│   │   │   │   └── cms-analysis.functional.test.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── rule-generation/
│   │   │   ├── commands/
│   │   │   │   ├── generate.command.ts
│   │   │   │   └── __tests__/
│   │   │   │       └── generate.command.test.ts
│   │   │   ├── workflows/
│   │   │   │   ├── rule-generation.workflow.ts
│   │   │   │   └── __tests__/
│   │   │   │       └── rule-generation.workflow.test.ts
│   │   │   ├── services/
│   │   │   │   ├── pattern-extractor.service.ts
│   │   │   │   ├── rule-builder.service.ts
│   │   │   │   └── __tests__/
│   │   │   │       ├── pattern-extractor.service.test.ts
│   │   │   │       └── rule-builder.service.test.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── screenshot/
│   │   │   ├── commands/
│   │   │   │   ├── screenshot.command.ts
│   │   │   │   ├── csv.command.ts
│   │   │   │   └── __tests__/
│   │   │   │       ├── screenshot.command.test.ts
│   │   │   │       └── csv.command.test.ts
│   │   │   ├── workflows/
│   │   │   │   ├── single-capture.workflow.ts
│   │   │   │   ├── batch-capture.workflow.ts
│   │   │   │   └── __tests__/
│   │   │   │       ├── single-capture.workflow.test.ts
│   │   │   │       └── batch-capture.workflow.test.ts
│   │   │   ├── services/
│   │   │   │   ├── capture.service.ts
│   │   │   │   ├── batch-processor.service.ts
│   │   │   │   └── __tests__/
│   │   │   │       ├── capture.service.test.ts
│   │   │   │       └── batch-processor.service.integration.test.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── ai-evaluation/
│   │   │   ├── commands/
│   │   │   │   ├── eval.command.ts           # Corporate branding evaluation
│   │   │   │   ├── chat.command.ts
│   │   │   │   ├── assistant.command.ts
│   │   │   │   └── __tests__/
│   │   │   │       ├── eval.command.test.ts
│   │   │   │       ├── chat.command.test.ts
│   │   │   │       └── assistant.command.test.ts
│   │   │   ├── workflows/
│   │   │   │   ├── branding-evaluation.workflow.ts
│   │   │   │   ├── chat-analysis.workflow.ts
│   │   │   │   └── __tests__/
│   │   │   │       ├── branding-evaluation.workflow.test.ts
│   │   │   │       └── chat-analysis.workflow.test.ts
│   │   │   ├── services/
│   │   │   │   ├── ai-provider.service.ts
│   │   │   │   ├── compliance-scorer.service.ts
│   │   │   │   └── __tests__/
│   │   │   │       ├── ai-provider.service.test.ts
│   │   │   │       └── ai-provider.service.integration.test.ts
│   │   │   ├── __tests__/
│   │   │   │   └── branding-evaluation.functional.test.ts
│   │   │   └── index.ts
│   │   │
│   │   └── image-processing/
│   │       ├── commands/
│   │       │   ├── footer.command.ts         # Image segmentation
│   │       │   └── __tests__/
│   │       │       └── footer.command.test.ts
│   │       ├── services/
│   │       │   ├── segmenter.service.ts
│   │       │   └── __tests__/
│   │       │       └── segmenter.service.test.ts
│   │       └── index.ts
│   │
│   ├── core/                                  # Core infrastructure only
│   │   ├── workflow-engine/
│   │   │   ├── engine.ts                      # Generic workflow engine
│   │   │   ├── context.ts
│   │   │   ├── step.ts                        # Base step class
│   │   │   ├── workflow.ts                    # Base workflow class
│   │   │   └── __tests__/
│   │   │       ├── engine.test.ts
│   │   │       ├── engine.functional.test.ts
│   │   │       └── context.test.ts
│   │   ├── cli/
│   │   │   ├── command.ts                     # Base command class
│   │   │   ├── registry.ts                    # Command registration
│   │   │   ├── middleware/
│   │   │   │   ├── error-handler.ts
│   │   │   │   ├── validator.ts
│   │   │   │   └── output-formatter.ts
│   │   │   └── __tests__/
│   │   │       ├── command.test.ts
│   │   │       ├── registry.test.ts
│   │   │       └── cli.functional.test.ts
│   │   └── container/
│   │       ├── service-container.ts           # DI container
│   │       └── __tests__/
│   │           └── service-container.test.ts
│   │
│   ├── shared/                                # Truly shared utilities
│   │   ├── browser/
│   │   │   ├── browser-manager.ts
│   │   │   ├── page-factory.ts
│   │   │   └── __tests__/
│   │   │       ├── browser-manager.test.ts
│   │   │       └── browser-manager.integration.test.ts
│   │   ├── storage/
│   │   │   ├── filesystem-adapter.ts
│   │   │   ├── data-repository.ts
│   │   │   └── __tests__/
│   │   │       ├── filesystem-adapter.test.ts
│   │   │       └── filesystem-adapter.integration.test.ts
│   │   ├── utils/
│   │   │   ├── url/
│   │   │   │   ├── normalizer.ts
│   │   │   │   └── __tests__/
│   │   │   │       └── normalizer.test.ts
│   │   │   ├── retry/
│   │   │   │   ├── retry.ts
│   │   │   │   └── __tests__/
│   │   │   │       └── retry.test.ts
│   │   │   ├── logger/
│   │   │   │   ├── logger.ts
│   │   │   │   └── __tests__/
│   │   │   │       └── logger.test.ts
│   │   │   └── __tests__/
│   │   └── types/
│   │       └── common.types.ts
│   │
│   ├── test-utils/                            # Test utilities
│   └── index.ts                               # Main entry point
│
├── tests/                                     # Cross-feature tests
│   ├── integration/
│   │   ├── cms-to-analysis-pipeline.test.ts  # Detection → Analysis
│   │   ├── screenshot-to-ai-pipeline.test.ts  # Screenshot → AI
│   │   ├── batch-processing-pipeline.test.ts  # CSV → Detection → Report
│   │   └── ground-truth-full-workflow.test.ts # Complex multi-feature
│   ├── e2e/
│   │   ├── cli-commands.test.ts               # Test actual CLI commands
│   │   └── complete-workflows.test.ts         # End-to-end scenarios
│   └── performance/
│       ├── batch-processing.perf.test.ts
│       └── memory-usage.perf.test.ts
```

## Example: Self-Contained Workflow

Here's how a complete feature would look:

```typescript
// src/features/cms-detection/workflows/single-url.workflow.ts

import { Workflow, Step, Context } from '@core/workflow-engine';
import { DetectorService } from '../services/detector.service';
import { RobotsAnalyzerService } from '../services/robots-analyzer.service';

export class SingleUrlDetectionWorkflow extends Workflow {
  name = 'cms-detection-single';
  
  constructor(
    private detector: DetectorService,
    private robotsAnalyzer: RobotsAnalyzerService
  ) {
    super();
  }
  
  // All steps defined inline - no need to hunt for them
  steps = [
    new Step('validate-url', async (ctx: Context) => {
      const { url } = ctx.input;
      if (!isValidUrl(url)) {
        throw new Error('Invalid URL');
      }
      return url;
    }),
    
    new Step('analyze-robots', async (ctx: Context) => {
      // Bot-resistant approach
      const robotsData = await this.robotsAnalyzer.analyze(ctx.data.url);
      ctx.setData('robotsData', robotsData);
      return robotsData;
    }),
    
    new Step('detect-cms', async (ctx: Context) => {
      const result = await this.detector.detect(
        ctx.data.url,
        ctx.data.robotsData
      );
      return result;
    }),
    
    new Step('store-results', async (ctx: Context) => {
      if (ctx.input.options.collectData) {
        await ctx.storage.save('cms-detection', ctx.data.result);
      }
      return ctx.data.result;
    })
  ];
}
```

## Benefits of Feature-Oriented Structure

### 1. **Feature Cohesion**
- All related code in one place
- Easy to understand the complete feature
- No jumping between distant directories

### 2. **Simplified Development**
To add a new feature:
1. Create a new folder under `features/`
2. Add command, workflow, services, and models
3. Export public API in `index.ts`
4. Register command in CLI

### 3. **Clear Dependencies**
- Features can depend on `core/` and `shared/`
- Features should not depend on other features
- If sharing is needed, move to `shared/`

### 4. **Comprehensive Testing Strategy**
- **Unit tests** - Co-located with each component (`*.test.ts`)
- **Functional tests** - Feature-level workflow testing (`*.functional.test.ts`)
- **Integration tests** - Real external dependencies (`*.integration.test.ts`)
- **Cross-feature tests** - Multi-feature workflows in `/tests/integration/`
- **E2E tests** - Complete system testing in `/tests/e2e/`

### 5. **Refactoring-Friendly**
- Move/rename entire features easily
- Delete features without hunting for pieces
- Clear boundaries for breaking changes

## Migration Example: Ground Truth

The 2,108-line `ground-truth.ts` becomes a self-contained feature:

```
ground-truth/
├── commands/
│   └── ground-truth.command.ts (50 lines)
├── workflows/
│   └── analysis.workflow.ts (300 lines - includes all steps)
├── services/
│   ├── data-collector.service.ts (300 lines)
│   ├── signal-analyzer.service.ts (400 lines)
│   ├── interactive-ui.service.ts (300 lines)
│   └── database.service.ts (200 lines)
├── analyzers/
│   ├── script.analyzer.ts (150 lines)
│   ├── html.analyzer.ts (150 lines)
│   └── [other analyzers]
└── models/
    └── [type definitions]
```

Total: ~2,100 lines, but organized in focused, testable units all in one location.

## Comparison with Previous Proposal

| Aspect | Previous (Layer-Based) | New (Feature-Based) |
|--------|----------------------|-------------------|
| **Finding code** | Check 6+ directories | Check 1 feature directory |
| **Adding features** | Touch many layers | Add to features/ folder |
| **Understanding flow** | Jump between layers | Read top to bottom |
| **Testing** | Mock across layers | Test within feature |
| **Refactoring** | Update multiple locations | Move one folder |

## Workflow Composition

For cross-feature workflows, compose at the command level:

```typescript
// src/features/cms-analysis/workflows/comprehensive-analysis.workflow.ts

export class ComprehensiveAnalysisWorkflow extends Workflow {
  steps = [
    // Reuse detection workflow as a sub-workflow
    new SubWorkflowStep(
      'detect-cms',
      () => container.get(SingleUrlDetectionWorkflow)
    ),
    
    // Continue with analysis-specific steps
    new Step('analyze-data', async (ctx) => {
      const detectionResult = ctx.data.subworkflows['detect-cms'].result;
      // Analysis logic here
    })
  ];
}
```

## Test Placement Strategy

### Test Types and Locations

1. **Unit Tests** (`.test.ts`)
   - **Location**: Next to source files in `__tests__/` directories
   - **Scope**: Single class/function in isolation
   - **Mocking**: Mock all dependencies

2. **Functional Tests** (`.functional.test.ts`)
   - **Location**: Within feature `__tests__/` directories  
   - **Scope**: Complete feature workflow with real implementations
   - **Mocking**: Only external services (APIs, filesystem)

3. **Integration Tests** (`.integration.test.ts`)
   - **Location**: Within feature for feature-specific integrations
   - **Scope**: Feature + real external dependencies
   - **Example**: Browser interactions, database operations

4. **Cross-Feature Integration Tests**
   - **Location**: `/tests/integration/` at project root
   - **Scope**: Multiple features working together
   - **Example**: CMS detection → analysis pipeline

5. **E2E Tests**
   - **Location**: `/tests/e2e/` at project root
   - **Scope**: Complete system from CLI to output
   - **Example**: Actual CLI command execution

### Jest Configuration Support

```javascript
// jest.config.js - Run tests by type or feature
module.exports = {
  projects: [
    { displayName: 'unit', testMatch: ['**/*.test.ts'] },
    { displayName: 'functional', testMatch: ['**/*.functional.test.ts'] },
    { displayName: 'integration', testMatch: ['**/*.integration.test.ts'] },
    { displayName: 'e2e', testMatch: ['tests/e2e/**/*.test.ts'] }
  ]
};
```

### NPM Scripts

```json
{
  "scripts": {
    "test": "jest --selectProjects unit",
    "test:functional": "jest --selectProjects functional", 
    "test:integration": "jest --selectProjects integration",
    "test:e2e": "jest --selectProjects e2e",
    "test:feature": "jest --testPathPattern=features/cms-detection"
  }
}
```

## Conclusion

This feature-oriented structure maintains the benefits of the workflow engine while drastically simplifying development. Each feature is self-contained, making the codebase easier to understand, modify, and test. The comprehensive testing strategy ensures quality at every level - from individual components to complete workflows. The structure follows the principle of "high cohesion, low coupling" - keeping related things together and unrelated things apart.