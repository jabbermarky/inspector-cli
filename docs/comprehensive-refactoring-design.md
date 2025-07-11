# Comprehensive Refactoring Design for Inspector CLI

## Executive Summary

This document combines the application architecture refactoring with the workflow engine design to create a cohesive plan for transforming Inspector CLI from a flat command structure into a domain-driven, workflow-based architecture. The refactoring addresses the 91KB ground-truth.ts complexity while establishing patterns for maintainability and extensibility.

## Vision

Transform Inspector CLI into a modular, workflow-driven application that:
- Reduces complexity through domain separation and service decomposition
- Enables flexible workflow composition for complex multi-step operations
- Maintains backward compatibility while improving internal architecture
- Supports both interactive analysis and batch processing at scale

## Architecture Overview

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLI Layer                               │
│  (Command handlers, argument parsing, output formatting)    │
├─────────────────────────────────────────────────────────────┤
│                   Workflow Engine                           │
│  (Orchestration, progress tracking, error handling)         │
├─────────────────────────────────────────────────────────────┤
│                   Domain Services                           │
│  (Business logic organized by domain)                       │
├─────────────────────────────────────────────────────────────┤
│                 Infrastructure Layer                        │
│  (External integrations, data access, utilities)            │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
src/
├── cli/                          # CLI Layer
│   ├── commands/
│   │   ├── cms/                 # CMS detection commands
│   │   │   ├── detect.ts        # Thin wrapper for detection workflow
│   │   │   ├── analyze.ts       # Thin wrapper for analysis workflow
│   │   │   ├── ground-truth.ts  # Thin wrapper for ground-truth workflow
│   │   │   └── generate.ts      # Thin wrapper for rule generation
│   │   ├── ai/                  # AI integration commands
│   │   │   ├── assistant.ts
│   │   │   ├── chat.ts
│   │   │   └── eval.ts          # Corporate branding evaluation
│   │   └── media/               # Media processing commands
│   │       ├── screenshot.ts
│   │       └── csv.ts
│   ├── middleware/              # Cross-cutting concerns
│   │   ├── validation.ts
│   │   ├── error-handler.ts
│   │   └── output-formatter.ts
│   └── registry.ts              # Command registration
│
├── workflows/                   # Workflow Layer
│   ├── engine/
│   │   ├── workflow-engine.ts   # Core engine implementation
│   │   ├── workflow-context.ts  # Context management
│   │   ├── progress-tracker.ts  # Progress reporting
│   │   └── error-strategies.ts  # Error handling strategies
│   ├── definitions/             # Predefined workflows
│   │   ├── cms-detection.ts
│   │   ├── ground-truth-analysis.ts
│   │   ├── batch-processing.ts
│   │   └── branding-evaluation.ts
│   └── steps/                   # Reusable workflow steps
│       ├── common/
│       ├── cms/
│       ├── ai/
│       └── media/
│
├── domains/                     # Domain Layer
│   ├── cms/
│   │   ├── services/
│   │   │   ├── detection.service.ts
│   │   │   ├── analysis.service.ts
│   │   │   ├── ground-truth.service.ts
│   │   │   ├── rule-generation.service.ts
│   │   │   └── blocking-analysis.service.ts
│   │   ├── models/
│   │   ├── strategies/          # Detection strategies
│   │   └── signals/             # Signal analyzers
│   ├── ai/
│   │   ├── services/
│   │   │   ├── provider.service.ts
│   │   │   ├── evaluation.service.ts
│   │   │   └── assistant.service.ts
│   │   ├── providers/           # OpenAI, etc.
│   │   └── prompts/
│   └── media/
│       ├── services/
│       │   ├── screenshot.service.ts
│       │   └── image-processing.service.ts
│       └── processors/
│
├── infrastructure/              # Infrastructure Layer
│   ├── browser/                 # Puppeteer management
│   ├── storage/                 # Data persistence
│   │   ├── repositories/
│   │   └── adapters/           # FileSystem, Database, etc.
│   ├── cache/                   # Caching strategies
│   └── config/                  # Configuration management
│
└── shared/                      # Shared utilities
    ├── types/
    ├── errors/
    └── utils/
```

## Core Components

### 1. Workflow Engine Integration

The workflow engine becomes the central orchestrator for all complex operations:

```typescript
// Core workflow engine interface
interface WorkflowEngine {
    execute<TContext, TResult>(
        workflow: Workflow<TContext, TResult>,
        initialContext: TContext
    ): Promise<WorkflowResult<TResult>>;
    
    executeWithProgress<TContext, TResult>(
        workflow: Workflow<TContext, TResult>,
        initialContext: TContext,
        onProgress: ProgressCallback
    ): Promise<WorkflowResult<TResult>>;
}

// Integration with CLI commands
class CMSDetectCommand {
    constructor(
        private engine: WorkflowEngine,
        private workflowFactory: WorkflowFactory
    ) {}
    
    async execute(input: string, options: CMSDetectOptions) {
        const workflow = this.workflowFactory.create('cms-detection');
        const context = { input, options };
        
        if (options.progress) {
            return this.engine.executeWithProgress(
                workflow, 
                context,
                this.handleProgress
            );
        }
        
        return this.engine.execute(workflow, context);
    }
}
```

### 2. Domain Service Architecture

Each domain has specialized services that encapsulate business logic:

```typescript
// CMS Domain Services
interface CMSDetectionService {
    detect(url: string, options: DetectionOptions): Promise<DetectionResult>;
    detectBatch(urls: string[], options: DetectionOptions): Promise<BatchDetectionResult>;
}

interface GroundTruthService {
    // Decomposed from 2,108-line monolith
    collectData(url: string): Promise<DetectionDataPoint>;
    analyzeSignals(data: DetectionDataPoint): Promise<SignalAnalysis>;
    verifyInteractive(analysis: SignalAnalysis): Promise<VerifiedResult>;
    updateDatabase(result: VerifiedResult): Promise<void>;
}

// Service implementation with dependency injection
class GroundTruthServiceImpl implements GroundTruthService {
    constructor(
        private dataCollector: DataCollectionService,
        private signalAnalyzer: SignalAnalysisService,
        private uiService: InteractiveUIService,
        private database: GroundTruthRepository
    ) {}
    
    // Each method is focused and testable
    async analyzeSignals(data: DetectionDataPoint): Promise<SignalAnalysis> {
        // Parallel signal analysis (from ground-truth.ts)
        const [scripts, html, meta, headers, styles] = await Promise.all([
            this.signalAnalyzer.analyzeScripts(data.scripts),
            this.signalAnalyzer.analyzeHTML(data.html),
            this.signalAnalyzer.analyzeMeta(data.metadata),
            this.signalAnalyzer.analyzeHeaders(data.headers),
            this.signalAnalyzer.analyzeStylesheets(data.stylesheets)
        ]);
        
        return { scripts, html, meta, headers, styles };
    }
}
```

### 3. Workflow Definitions

Predefined workflows that orchestrate domain services:

```typescript
// Ground Truth Analysis Workflow (replacing monolithic ground-truth.ts)
class GroundTruthAnalysisWorkflow implements Workflow<GroundTruthInput, GroundTruthResult> {
    name = 'ground-truth-analysis';
    version = '2.0.0';
    
    steps = [
        // Phase 1: Bot-resistant data collection
        new LoadExistingDataStep(),
        new RobotsTxtAnalysisStep(),      // 75% success rate approach
        new CMSDetectionWithDataStep(),
        
        // Phase 2: Parallel signal analysis
        new ParallelStep([
            new ScriptSignalAnalysisStep(),
            new HTMLSignalAnalysisStep(),
            new MetaSignalAnalysisStep(),
            new HeaderSignalAnalysisStep(),
            new StylesheetSignalAnalysisStep()
        ]),
        new VersionDetectionStep(),
        
        // Phase 3: Interactive verification
        new DisplayResultsStep(),
        new UserVerificationStep(),
        new DatabaseUpdateStep()
    ];
}

// Corporate Branding Evaluation Workflow (implementing eval.ts vision)
class BrandingEvaluationWorkflow implements Workflow<BrandingInput, BrandingResult> {
    steps = [
        new ValidateURLStep(),
        new CaptureScreenshotStep(),
        new ExtractVisualElementsStep(),
        new LoadBrandingGuidelinesStep(),
        new AIEvaluationStep(),
        new ComplianceScoreStep(),
        new GenerateReportStep()
    ];
}
```

### 4. Step Implementation Pattern

Workflow steps as focused, testable units:

```typescript
// Base step interface
abstract class BaseWorkflowStep<TInput, TOutput> implements WorkflowStep<TInput, TOutput> {
    abstract name: string;
    abstract description: string;
    
    protected logger: Logger;
    
    async execute(input: TInput, context: WorkflowContext): Promise<TOutput> {
        this.logger = context.logger;
        
        try {
            // Validate input
            if (this.validate) {
                const validation = this.validate(input);
                if (!validation.isValid) {
                    throw new ValidationError(validation.errors);
                }
            }
            
            // Execute step logic
            return await this.doExecute(input, context);
            
        } catch (error) {
            // Handle errors based on configuration
            if (this.canRetry?.(error, context.attemptNumber)) {
                throw new RetryableError(error);
            }
            
            if (this.onError) {
                return await this.onError(error, input);
            }
            
            throw error;
        }
    }
    
    protected abstract doExecute(input: TInput, context: WorkflowContext): Promise<TOutput>;
}

// Concrete step example
class RobotsTxtAnalysisStep extends BaseWorkflowStep<string, RobotsTxtResult> {
    name = 'robots-txt-analysis';
    description = 'Analyze robots.txt for bot detection bypass';
    
    protected async doExecute(url: string, context: WorkflowContext): Promise<RobotsTxtResult> {
        const robotsService = context.services.get(RobotsTxtService);
        const result = await robotsService.analyze(url);
        
        // Store in context for later steps
        context.setData('robotsTxtResult', result);
        
        return result;
    }
    
    canRetry(error: Error, attempt: number): boolean {
        return error.name === 'NetworkError' && attempt < 3;
    }
}
```

## Integration Patterns

### 1. CLI to Workflow Bridge

```typescript
// Command handler delegates to workflow
export class DetectCMSCommand implements Command {
    constructor(private container: ServiceContainer) {}
    
    async execute(args: Arguments): Promise<void> {
        const engine = this.container.get(WorkflowEngine);
        const presenter = this.container.get(OutputPresenter);
        
        try {
            // Determine workflow based on input
            const workflow = args.csv 
                ? new BatchCMSDetectionWorkflow()
                : new CMSDetectionWorkflow();
            
            // Execute with progress if requested
            const result = await engine.executeWithProgress(
                workflow,
                { input: args.input, options: args },
                (progress) => presenter.showProgress(progress)
            );
            
            // Present results
            presenter.present(result, args.format);
            
        } catch (error) {
            presenter.error(error);
            process.exit(1);
        }
    }
}
```

### 2. Service Container Setup

```typescript
// Dependency injection container configuration
export function configureServices(): ServiceContainer {
    const container = new ServiceContainer();
    
    // Infrastructure
    container.singleton(BrowserManager, () => new BrowserManagerImpl());
    container.singleton(FileSystemAdapter, () => new NodeFileSystemAdapter());
    
    // Domain services
    container.singleton(CMSDetectionService, (c) => 
        new CMSDetectionServiceImpl(
            c.get(BrowserManager),
            c.get(DetectionStrategyFactory)
        )
    );
    
    container.singleton(GroundTruthService, (c) =>
        new GroundTruthServiceImpl(
            c.get(DataCollectionService),
            c.get(SignalAnalysisService),
            c.get(InteractiveUIService),
            c.get(GroundTruthRepository)
        )
    );
    
    // Workflow engine
    container.singleton(WorkflowEngine, (c) =>
        new WorkflowEngineImpl(
            c.get(Logger),
            c.get(MetricsCollector)
        )
    );
    
    return container;
}
```

### 3. Data Flow Example

```typescript
// How data flows through the refactored system
async function executeCMSDetection(url: string) {
    // 1. CLI receives command
    const command = new DetectCMSCommand(container);
    
    // 2. Command creates workflow
    const workflow = new CMSDetectionWorkflow();
    
    // 3. Workflow engine executes steps
    const result = await engine.execute(workflow, { url });
    
    // 4. Each step uses domain services
    // Step 1: ValidationStep -> ValidationService
    // Step 2: RobotsTxtStep -> RobotsTxtService
    // Step 3: DetectionStep -> CMSDetectionService
    // Step 4: StorageStep -> DataRepository
    
    // 5. Results flow back through presenter
    return presenter.format(result);
}
```

## Migration Strategy

### Phase 1: Foundation (Weeks 1-2)
1. Set up new directory structure alongside existing code
2. Implement workflow engine core
3. Create service container and dependency injection
4. Establish testing patterns for new architecture

### Phase 2: Domain Services (Weeks 3-4)
1. Extract CMS detection logic into services
2. Decompose ground-truth.ts into focused services:
   - DataCollectionService (lines 1-500)
   - SignalAnalysisService (lines 501-1200)
   - InteractiveUIService (lines 1201-1700)
   - GroundTruthRepository (lines 1701-2108)
3. Create AI and Media domain services
4. Implement comprehensive service tests

### Phase 3: Workflow Implementation (Weeks 5-6)
1. Create workflow step implementations
2. Define standard workflows for each command
3. Implement progress tracking and error handling
4. Add workflow tests with mocked services

### Phase 4: Command Migration (Weeks 7-8)
1. Migrate commands to use workflows:
   - Start with simple commands (assistants, chat)
   - Progress to complex commands (detect-cms, ground-truth)
2. Maintain backward compatibility with adapters
3. Add integration tests for complete flows

### Phase 5: Optimization (Week 9)
1. Implement caching strategies
2. Add parallel processing for batch operations
3. Optimize workflow performance
4. Add comprehensive monitoring

### Phase 6: Cleanup (Week 10)
1. Remove old command implementations
2. Archive deprecated code
3. Update all documentation
4. Conduct final testing

## Benefits Realization

### Immediate Benefits
- **Testability**: 90% of code becomes unit testable (up from ~40%)
- **Clarity**: Maximum file size reduced from 2,108 to ~300 lines
- **Modularity**: Clear separation between CLI, workflow, domain, and infrastructure

### Long-term Benefits
- **Extensibility**: New workflows created by composing existing steps
- **Maintainability**: Changes isolated to specific services or steps
- **Performance**: Parallel execution and caching built into architecture
- **Observability**: Comprehensive logging and metrics at each layer

### Specific Improvements

1. **Ground Truth Refactoring**
   - From: 2,108-line monolith with 46 methods
   - To: 4 focused services with 10-15 methods each
   - Result: 75% reduction in complexity per component

2. **Workflow Flexibility**
   - From: Hard-coded command logic
   - To: Composable workflow steps
   - Result: New workflows created without code changes

3. **Error Handling**
   - From: Scattered try-catch blocks
   - To: Centralized error strategies
   - Result: Consistent error handling across application

## Risk Mitigation

### Technical Risks
1. **Breaking Changes**
   - Mitigation: Adapter pattern for backward compatibility
   - Testing: Comprehensive integration tests before/after

2. **Performance Regression**
   - Mitigation: Benchmark critical paths
   - Optimization: Lazy loading and caching strategies

3. **Workflow Complexity**
   - Mitigation: Start with simple workflows
   - Documentation: Clear workflow authoring guide

### Process Risks
1. **Migration Duration**
   - Mitigation: Incremental migration with feature flags
   - Fallback: Ability to revert to old implementation

2. **Team Adoption**
   - Mitigation: Comprehensive documentation and examples
   - Support: Pair programming during transition

## Success Metrics

### Code Quality Metrics
- File size: No file > 300 lines (currently ground-truth.ts is 2,108)
- Cyclomatic complexity: < 10 per method (currently up to 50)
- Test coverage: > 85% (currently ~60%)
- Type coverage: 100% (maintain current level)

### Performance Metrics
- Batch processing: 30% faster through parallelization
- Memory usage: 25% reduction through streaming
- Startup time: < 2 seconds (maintain current)

### Developer Experience
- Time to add new command: < 2 hours (currently 4-6 hours)
- Time to fix bugs: 50% reduction
- Onboarding time: 1 day (currently 3-5 days)

## Conclusion

This comprehensive refactoring design combines domain-driven architecture with a flexible workflow engine to address the current limitations of Inspector CLI. By decomposing the monolithic ground-truth.ts and establishing clear architectural boundaries, we create a maintainable, extensible, and testable codebase that can evolve with future requirements while preserving all existing functionality.