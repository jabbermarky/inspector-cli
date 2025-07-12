# New Folder Structure for Inspector CLI

## Complete Directory Structure

```
inspector-cli/
├── src/
│   ├── cli/                                    # CLI Layer - Thin command handlers
│   │   ├── commands/
│   │   │   ├── cms/
│   │   │   │   ├── detect.ts                  # Thin wrapper for detection workflow
│   │   │   │   ├── analyze.ts                 # Thin wrapper for analysis workflow
│   │   │   │   ├── analyze-blocking.ts        # Thin wrapper for blocking analysis
│   │   │   │   ├── ground-truth.ts            # Thin wrapper for ground-truth workflow
│   │   │   │   ├── generate.ts                # Thin wrapper for rule generation
│   │   │   │   └── __tests__/
│   │   │   │       ├── detect.test.ts
│   │   │   │       ├── analyze.test.ts
│   │   │   │       ├── analyze-blocking.test.ts
│   │   │   │       ├── ground-truth.test.ts
│   │   │   │       └── generate.test.ts
│   │   │   ├── ai/
│   │   │   │   ├── assistant.ts               # OpenAI assistant calls
│   │   │   │   ├── assistants.ts              # List assistants
│   │   │   │   ├── chat.ts                    # Chat completions
│   │   │   │   ├── eval.ts                    # Branding evaluation
│   │   │   │   └── __tests__/
│   │   │   │       ├── assistant.test.ts
│   │   │   │       ├── assistants.test.ts
│   │   │   │       ├── chat.test.ts
│   │   │   │       └── eval.test.ts
│   │   │   └── media/
│   │   │       ├── screenshot.ts              # Single screenshot
│   │   │       ├── csv.ts                     # Batch screenshots
│   │   │       ├── footer.ts                  # Image segmentation
│   │   │       └── __tests__/
│   │   │           ├── screenshot.test.ts
│   │   │           ├── csv.test.ts
│   │   │           └── footer.test.ts
│   │   ├── middleware/
│   │   │   ├── validation.ts                  # Input validation
│   │   │   ├── error-handler.ts               # Error formatting
│   │   │   ├── output-formatter.ts            # Output presentation
│   │   │   └── __tests__/
│   │   │       ├── validation.test.ts
│   │   │       ├── error-handler.test.ts
│   │   │       └── output-formatter.test.ts
│   │   ├── registry.ts                        # Command registration
│   │   └── index.ts                           # CLI entry point
│   │
│   ├── workflows/                             # Workflow Layer - Orchestration
│   │   ├── engine/
│   │   │   ├── workflow-engine.ts             # Core engine implementation
│   │   │   ├── workflow-context.ts            # Context management
│   │   │   ├── progress-tracker.ts            # Progress reporting
│   │   │   ├── error-strategies.ts            # Error handling strategies
│   │   │   ├── parallel-executor.ts           # Parallel step execution
│   │   │   └── __tests__/
│   │   │       ├── workflow-engine.test.ts
│   │   │       ├── workflow-context.test.ts
│   │   │       ├── progress-tracker.test.ts
│   │   │       ├── error-strategies.test.ts
│   │   │       └── parallel-executor.test.ts
│   │   ├── definitions/
│   │   │   ├── cms-detection.workflow.ts      # Single URL detection
│   │   │   ├── batch-detection.workflow.ts    # CSV batch processing
│   │   │   ├── ground-truth.workflow.ts       # Interactive analysis
│   │   │   ├── blocking-analysis.workflow.ts  # Bot detection analysis
│   │   │   ├── rule-generation.workflow.ts    # Generate new rules
│   │   │   ├── branding-eval.workflow.ts      # Corporate branding
│   │   │   ├── screenshot.workflow.ts         # Media capture
│   │   │   └── __tests__/
│   │   │       ├── cms-detection.workflow.test.ts
│   │   │       ├── batch-detection.workflow.test.ts
│   │   │       ├── ground-truth.workflow.test.ts
│   │   │       └── branding-eval.workflow.test.ts
│   │   └── steps/
│   │       ├── common/
│   │       │   ├── validation.step.ts         # URL/input validation
│   │       │   ├── browser-setup.step.ts      # Browser initialization
│   │       │   ├── data-storage.step.ts       # Save results
│   │       │   ├── progress-report.step.ts    # Progress updates
│   │       │   └── __tests__/
│   │       │       ├── validation.step.test.ts
│   │       │       ├── browser-setup.step.test.ts
│   │       │       └── data-storage.step.test.ts
│   │       ├── cms/
│   │       │   ├── robots-txt.step.ts         # Bot-resistant approach
│   │       │   ├── page-capture.step.ts       # Capture page data
│   │       │   ├── detection.step.ts          # Run detection
│   │       │   ├── signal-analysis.step.ts    # Analyze signals
│   │       │   ├── version-detection.step.ts  # Detect versions
│   │       │   ├── user-verification.step.ts  # Interactive verify
│   │       │   ├── database-update.step.ts    # Update ground truth
│   │       │   └── __tests__/
│   │       │       ├── robots-txt.step.test.ts
│   │       │       ├── detection.step.test.ts
│   │       │       └── signal-analysis.step.test.ts
│   │       ├── ai/
│   │       │   ├── ai-evaluation.step.ts      # AI analysis
│   │       │   ├── compliance-score.step.ts   # Score compliance
│   │       │   └── __tests__/
│   │       │       └── ai-evaluation.step.test.ts
│   │       └── media/
│   │           ├── screenshot-capture.step.ts  # Take screenshot
│   │           ├── image-segment.step.ts       # Segment images
│   │           └── __tests__/
│   │               └── screenshot-capture.step.test.ts
│   │
│   ├── domains/                               # Domain Layer - Business Logic
│   │   ├── cms/
│   │   │   ├── services/
│   │   │   │   ├── detection.service.ts       # Core CMS detection
│   │   │   │   ├── analysis.service.ts        # Data analysis
│   │   │   │   ├── ground-truth.service.ts    # Ground truth mgmt
│   │   │   │   ├── rule-generation.service.ts # Generate rules
│   │   │   │   ├── blocking-analysis.service.ts # Bot detection
│   │   │   │   ├── signal-analysis.service.ts # Signal processing
│   │   │   │   ├── data-collection.service.ts # Data gathering
│   │   │   │   ├── interactive-ui.service.ts  # User interaction
│   │   │   │   └── __tests__/
│   │   │   │       ├── detection.service.test.ts
│   │   │   │       ├── analysis.service.test.ts
│   │   │   │       ├── ground-truth.service.test.ts
│   │   │   │       ├── signal-analysis.service.test.ts
│   │   │   │       └── data-collection.service.test.ts
│   │   │   ├── models/
│   │   │   │   ├── detection-result.ts        # Result types
│   │   │   │   ├── detection-data-point.ts    # Data structures
│   │   │   │   ├── signal-analysis.ts         # Signal types
│   │   │   │   └── ground-truth-entry.ts      # GT database
│   │   │   ├── strategies/                    # Detection strategies
│   │   │   │   ├── wordpress/
│   │   │   │   │   ├── detector.ts
│   │   │   │   │   └── __tests__/
│   │   │   │   │       └── detector.test.ts
│   │   │   │   ├── drupal/
│   │   │   │   │   ├── detector.ts
│   │   │   │   │   └── __tests__/
│   │   │   │   │       └── detector.test.ts
│   │   │   │   └── joomla/
│   │   │   │       ├── detector.ts
│   │   │   │       └── __tests__/
│   │   │   │           └── detector.test.ts
│   │   │   ├── signals/                       # Signal analyzers
│   │   │   │   ├── script-analyzer.ts
│   │   │   │   ├── html-analyzer.ts
│   │   │   │   ├── meta-analyzer.ts
│   │   │   │   ├── header-analyzer.ts
│   │   │   │   ├── stylesheet-analyzer.ts
│   │   │   │   └── __tests__/
│   │   │   │       ├── script-analyzer.test.ts
│   │   │   │       └── html-analyzer.test.ts
│   │   │   └── repositories/
│   │   │       ├── ground-truth.repository.ts
│   │   │       └── __tests__/
│   │   │           └── ground-truth.repository.test.ts
│   │   ├── ai/
│   │   │   ├── services/
│   │   │   │   ├── provider.service.ts        # AI provider interface
│   │   │   │   ├── evaluation.service.ts      # Evaluation logic
│   │   │   │   ├── assistant.service.ts       # Assistant management
│   │   │   │   ├── chat.service.ts            # Chat completions
│   │   │   │   └── __tests__/
│   │   │   │       ├── provider.service.test.ts
│   │   │   │       └── evaluation.service.test.ts
│   │   │   ├── providers/
│   │   │   │   ├── openai.provider.ts         # OpenAI implementation
│   │   │   │   └── __tests__/
│   │   │   │       └── openai.provider.test.ts
│   │   │   └── prompts/
│   │   │       ├── branding-evaluation.ts     # Branding prompts
│   │   │       └── cms-analysis.ts            # CMS prompts
│   │   └── media/
│   │       ├── services/
│   │       │   ├── screenshot.service.ts      # Screenshot capture
│   │       │   ├── batch-capture.service.ts   # Batch processing
│   │       │   ├── image-processing.service.ts # Image manipulation
│   │       │   └── __tests__/
│   │       │       ├── screenshot.service.test.ts
│   │       │       └── batch-capture.service.test.ts
│   │       └── processors/
│   │           ├── image-segmenter.ts         # Header/footer
│   │           └── __tests__/
│   │               └── image-segmenter.test.ts
│   │
│   ├── infrastructure/                        # Infrastructure Layer
│   │   ├── browser/
│   │   │   ├── browser-manager.ts             # Puppeteer management
│   │   │   ├── browser-pool.ts                # Connection pooling
│   │   │   ├── page-factory.ts                # Page creation
│   │   │   └── __tests__/
│   │   │       ├── browser-manager.test.ts
│   │   │       └── browser-pool.test.ts
│   │   ├── storage/
│   │   │   ├── repositories/
│   │   │   │   ├── cms-data.repository.ts     # CMS data storage
│   │   │   │   ├── ground-truth.repository.ts # GT database
│   │   │   │   └── __tests__/
│   │   │   │       └── cms-data.repository.test.ts
│   │   │   └── adapters/
│   │   │       ├── filesystem.adapter.ts      # File storage
│   │   │       ├── in-memory.adapter.ts       # Testing adapter
│   │   │       └── __tests__/
│   │   │           └── filesystem.adapter.test.ts
│   │   ├── cache/
│   │   │   ├── cache-manager.ts               # Caching strategy
│   │   │   └── __tests__/
│   │   │       └── cache-manager.test.ts
│   │   ├── config/
│   │   │   ├── config-loader.ts               # Load configuration
│   │   │   ├── environment.ts                 # Environment vars
│   │   │   └── __tests__/
│   │   │       └── config-loader.test.ts
│   │   └── container/
│   │       ├── service-container.ts           # DI container
│   │       ├── service-registry.ts            # Service registration
│   │       └── __tests__/
│   │           └── service-container.test.ts
│   │
│   ├── shared/                                # Shared utilities
│   │   ├── types/
│   │   │   ├── cms.types.ts                   # CMS type definitions
│   │   │   ├── workflow.types.ts              # Workflow types
│   │   │   └── api.types.ts                   # API types
│   │   ├── errors/
│   │   │   ├── application.errors.ts          # Custom errors
│   │   │   ├── validation.errors.ts           # Validation errors
│   │   │   └── __tests__/
│   │   │       └── application.errors.test.ts
│   │   ├── utils/
│   │   │   ├── url/
│   │   │   │   ├── normalizer.ts              # URL normalization
│   │   │   │   └── __tests__/
│   │   │   │       └── normalizer.test.ts
│   │   │   ├── retry/
│   │   │   │   ├── retry.ts                   # Retry logic
│   │   │   │   └── __tests__/
│   │   │   │       └── retry.test.ts
│   │   │   └── logger/
│   │   │       ├── logger.ts                  # Logging utility
│   │   │       └── __tests__/
│   │   │           └── logger.test.ts
│   │   └── constants/
│   │       ├── cms.constants.ts               # CMS constants
│   │       └── workflow.constants.ts          # Workflow constants
│   │
│   ├── test-utils/                            # Test utilities (unchanged)
│   │   ├── setup/
│   │   ├── mocks/
│   │   ├── factories/
│   │   ├── matchers/
│   │   └── __tests__/
│   │
│   └── index.ts                               # Application entry point
│
├── dist/                                      # Compiled output
├── data/                                      # Data directory
│   └── cms-analysis/                          # CMS analysis data
├── docs/                                      # Documentation
├── scripts/                                   # Build/utility scripts
├── tests/                                     # Integration test scripts
│   ├── integration/
│   └── e2e/
└── package.json
```

## Key Changes from Current Structure

### 1. Command Decomposition
**Before:**
```
commands/
├── detect_cms.ts (500+ lines)
├── ground-truth.ts (2,108 lines!)
└── analyze.ts (300+ lines)
```

**After:**
```
cli/commands/cms/detect.ts (~50 lines - just CLI handling)
workflows/definitions/cms-detection.workflow.ts (~100 lines)
domains/cms/services/detection.service.ts (~200 lines)
```

### 2. Ground Truth Refactoring
The 2,108-line `ground-truth.ts` becomes:
- `cli/commands/cms/ground-truth.ts` (50 lines) - CLI interface
- `workflows/definitions/ground-truth.workflow.ts` (150 lines) - Orchestration
- `domains/cms/services/`:
  - `ground-truth.service.ts` (200 lines) - Coordination
  - `data-collection.service.ts` (300 lines) - Data gathering
  - `signal-analysis.service.ts` (400 lines) - Signal processing
  - `interactive-ui.service.ts` (300 lines) - User interaction
- `infrastructure/storage/repositories/ground-truth.repository.ts` (200 lines) - Database

### 3. Shared Logic Extraction
Common functionality moves to infrastructure:
- Browser management → `infrastructure/browser/`
- Storage operations → `infrastructure/storage/`
- URL utilities → `shared/utils/url/`
- Retry logic → `shared/utils/retry/`

### 4. New Workflow Layer
Introduces workflow orchestration:
- Engine for step execution
- Progress tracking
- Error handling strategies
- Parallel execution support

## Migration Mapping

| Current File | New Location(s) |
|--------------|-----------------|
| `commands/detect_cms.ts` | `cli/commands/cms/detect.ts`<br>`workflows/definitions/cms-detection.workflow.ts`<br>`domains/cms/services/detection.service.ts` |
| `commands/ground-truth.ts` | Split across 8+ files in domains and workflows |
| `commands/analyze.ts` | `cli/commands/cms/analyze.ts`<br>`domains/cms/services/analysis.service.ts` |
| `commands/screenshot.ts` | `cli/commands/media/screenshot.ts`<br>`domains/media/services/screenshot.service.ts` |
| `utils/browser/` | `infrastructure/browser/` |
| `utils/cms/` | `domains/cms/strategies/` and `domains/cms/signals/` |
| `utils/url/` | `shared/utils/url/` |
| `genai.js` | `domains/ai/providers/openai.provider.ts` |

## Benefits of New Structure

1. **Separation of Concerns**
   - CLI handles only argument parsing and output
   - Workflows handle orchestration
   - Services contain business logic
   - Infrastructure handles external dependencies

2. **Testability**
   - Each layer can be tested independently
   - Mock boundaries are clear
   - Unit tests are simple and focused

3. **Maintainability**
   - No file exceeds 400 lines
   - Single responsibility per file
   - Clear module boundaries

4. **Extensibility**
   - New workflows by composing steps
   - New commands without touching core logic
   - Plugin-style architecture for providers

5. **Discoverability**
   - Logical organization by domain
   - Consistent naming patterns
   - Clear layer responsibilities