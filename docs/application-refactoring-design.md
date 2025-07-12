# Application Refactoring Design

## Executive Summary

This document outlines a proposed refactoring of the Inspector CLI application based on the analysis of its command structure. The refactoring aims to improve maintainability, scalability, and clarity by organizing the codebase around its three primary domains: CMS Detection, AI Integration, and Media Processing.

## Current State Analysis

### Command Distribution
- **12 total commands** in flat structure under `src/commands/`
- **CMS Detection**: 5 commands (42%) - Core domain
- **AI Integration**: 4 commands (33%) - Secondary features
- **Media Processing**: 3 commands (25%) - Supporting utilities

### Key Issues Identified
1. **Flat command structure** - All 12 commands in single directory
2. **Large monolithic file** - `ground-truth.ts` at 91KB suggests feature creep
3. **Incomplete implementation** - `eval.ts` contains TODO placeholder
4. **Unclear separation** - Business logic mixed with CLI concerns
5. **Workflow dependencies** - Implicit relationships between commands

## Clarifying Questions

Before proceeding with the refactoring, please clarify:

1. **Usage Patterns**
   - Which commands are used most frequently?
   - Are there common command sequences users follow?
   - Is the CMS detection → analysis → generation workflow the primary use case?

2. **Ground Truth Complexity**
   - What makes `ground-truth.ts` so large (91KB)?
   - Does it contain multiple responsibilities that could be separated?
   - Is it managing both data and logic?

3. **AI Integration Future**
   - What is the planned functionality for the incomplete `eval.ts`?
   - Will AI features expand beyond current OpenAI integration?
   - Should AI be treated as a plugin system?

4. **Data Flow**
   - Where is CMS detection data currently stored?
   - How do commands share data between steps?
   - Is there a need for a centralized data store?

5. **Performance Requirements**
   - Are batch operations (CSV processing) performance-critical?
   - Should commands support parallel processing?
   - What are typical dataset sizes?

## Assumptions

Based on the analysis, I'm making these assumptions (please correct if wrong):

1. **Primary Use Case**: CMS detection and analysis is the core value proposition
2. **Data Pipeline**: Users typically follow detection → analysis → insights flow
3. **Modularity Goal**: Commands should be thin wrappers around reusable services
4. **Extensibility Need**: New detection strategies and AI models will be added
5. **Batch Processing**: CSV operations are common and need optimization
6. **State Management**: Commands currently share state through filesystem

## Proposed Architecture

### 1. Domain-Driven Structure

```
src/
├── cli/                      # CLI layer (thin command handlers)
│   ├── commands/
│   │   ├── cms/             # CMS detection commands
│   │   ├── ai/              # AI integration commands
│   │   └── media/           # Media processing commands
│   ├── middleware/          # Shared CLI concerns (validation, error handling)
│   └── registry.ts          # Command registration
│
├── core/                    # Core business logic
│   ├── cms/
│   │   ├── detection/       # Detection strategies
│   │   ├── analysis/        # Analysis engines
│   │   ├── rules/           # Rule generation
│   │   └── ground-truth/    # Ground truth management
│   ├── ai/
│   │   ├── providers/       # AI provider interfaces
│   │   ├── evaluation/      # Evaluation framework
│   │   └── prompts/         # Prompt management
│   └── media/
│       ├── capture/         # Screenshot functionality
│       └── processing/      # Image manipulation
│
├── services/               # Application services
│   ├── workflow/           # Workflow orchestration
│   ├── storage/            # Data persistence
│   ├── batch/              # Batch processing
│   └── config/             # Configuration management
│
└── infrastructure/         # External integrations
    ├── browser/            # Puppeteer management
    ├── openai/             # OpenAI client
    └── filesystem/         # File operations
```

### 2. Command Refactoring Strategy

#### Phase 1: Service Extraction
Extract business logic from commands into domain services:

**CMS Domain Services:**
- `CMSDetectionService` - Core detection logic
- `CMSAnalysisService` - Data analysis and reporting
- `RuleGenerationService` - Strategy generation
- `GroundTruthService` - Reference data management
- `BlockingAnalysisService` - Bot detection analysis

**AI Domain Services:**
- `AIProviderService` - Abstract AI provider interface
- `AssistantService` - Assistant management
- `ChatService` - Chat completions
- `EvaluationService` - Model evaluation framework

**Media Domain Services:**
- `ScreenshotService` - URL capture
- `BatchScreenshotService` - CSV processing
- `ImageSegmentationService` - Header/footer extraction

#### Phase 2: Command Simplification
Transform commands into thin CLI handlers:

```typescript
// Before: Mixed concerns in detect_cms.ts
export async function processCMSDetection(input, options) {
    // 100+ lines of business logic
}

// After: Thin CLI handler
export async function detectCMSCommand(input, options) {
    const service = container.get(CMSDetectionService);
    const config = parseOptions(options);
    
    try {
        const results = await service.detect(input, config);
        presenter.display(results, options.format);
    } catch (error) {
        errorHandler.handle(error);
    }
}
```

### 3. Workflow Management

Introduce explicit workflow coordination:

```typescript
interface Workflow {
    name: string;
    steps: WorkflowStep[];
    execute(context: WorkflowContext): Promise<WorkflowResult>;
}

class CMSAnalysisWorkflow implements Workflow {
    steps = [
        new DetectionStep(),
        new AnalysisStep(),
        new ReportGenerationStep()
    ];
}
```

### 4. Data Layer Improvements

Centralize data management:

```typescript
interface DataRepository<T> {
    store(data: T): Promise<string>;
    retrieve(id: string): Promise<T>;
    query(criteria: QueryCriteria): Promise<T[]>;
}

class CMSDetectionRepository implements DataRepository<DetectionResult> {
    // Implements storage strategies (file, database, etc.)
}
```

### 5. Ground Truth Decomposition

Break down the monolithic ground-truth.ts:

```
ground-truth/
├── repository/          # Data storage
├── validators/          # Validation rules
├── importers/          # Data import strategies
├── exporters/          # Data export formats
└── queries/            # Query builders
```

## Migration Plan

### Phase 1: Foundation (Week 1-2)
1. Create new directory structure
2. Implement core service interfaces
3. Set up dependency injection container
4. Create service factory pattern

### Phase 2: Service Extraction (Week 3-4)
1. Extract CMS detection logic → `CMSDetectionService`
2. Extract screenshot logic → `ScreenshotService`
3. Extract AI integration → `AIProviderService`
4. Implement service tests

### Phase 3: Command Migration (Week 5-6)
1. Migrate commands one by one
2. Keep backward compatibility
3. Add deprecation notices
4. Update documentation

### Phase 4: Workflow Implementation (Week 7)
1. Implement workflow engine
2. Define standard workflows
3. Add workflow CLI commands
4. Create workflow templates

### Phase 5: Data Layer (Week 8)
1. Implement repository pattern
2. Migrate to centralized storage
3. Add data migration tools
4. Implement caching strategy

### Phase 6: Cleanup (Week 9)
1. Remove deprecated code
2. Optimize performance
3. Complete documentation
4. Update tests

## Benefits of Refactoring

1. **Maintainability**
   - Clear separation of concerns
   - Easier to locate and modify code
   - Reduced coupling between components

2. **Testability**
   - Services can be tested in isolation
   - Mocking becomes straightforward
   - Better test coverage possible

3. **Extensibility**
   - Easy to add new commands
   - Plugin architecture for AI providers
   - Strategy pattern for detection methods

4. **Performance**
   - Batch operations can be optimized
   - Caching can be centralized
   - Parallel processing simplified

5. **Developer Experience**
   - Clear code organization
   - Consistent patterns
   - Better IDE support

## Risk Mitigation

1. **Backward Compatibility**
   - Maintain CLI interface during migration
   - Use adapter pattern for legacy code
   - Comprehensive migration guide

2. **Testing Coverage**
   - Write tests before refactoring
   - Maintain test suite throughout
   - Add integration tests for workflows

3. **Incremental Migration**
   - Small, reviewable pull requests
   - Feature flags for new code paths
   - Ability to rollback changes

## Success Metrics

1. **Code Quality**
   - Reduced file sizes (target: <200 lines per file)
   - Increased test coverage (target: >80%)
   - Decreased cyclomatic complexity

2. **Developer Velocity**
   - Time to add new command reduced by 50%
   - Bug fix time reduced by 40%
   - Onboarding time for new developers reduced

3. **Performance**
   - Batch processing speed improved by 30%
   - Memory usage reduced by 25%
   - Startup time maintained or improved

## Next Steps

1. Review and approve this design
2. Answer clarifying questions
3. Prioritize refactoring phases
4. Create detailed technical specifications
5. Begin Phase 1 implementation

## Open Questions

1. Should we introduce a plugin system for extensibility?
2. Is there a need for a GUI or web interface in the future?
3. Should we consider moving to a monorepo structure?
4. What are the deployment and distribution requirements?
5. Should we implement command aliases for common workflows?