# Workflow Engine Design

## Overview

Based on the analysis of the ground-truth command's complexity and the CMS detection data flow, this document outlines a comprehensive workflow engine design that will support the refactored Inspector CLI architecture.

## Key Design Principles

1. **Composability** - Small, focused steps that can be combined
2. **Resilience** - Built-in error handling and recovery
3. **Observability** - Comprehensive logging and metrics
4. **Flexibility** - Support both interactive and batch processing
5. **Extensibility** - Easy to add new workflows and steps

## Core Components

### 1. Workflow Engine

```typescript
interface WorkflowEngine {
    // Execute a complete workflow
    execute<TContext, TResult>(
        workflow: Workflow<TContext, TResult>,
        initialContext: TContext
    ): Promise<WorkflowResult<TResult>>;
    
    // Execute with progress tracking
    executeWithProgress<TContext, TResult>(
        workflow: Workflow<TContext, TResult>,
        initialContext: TContext,
        onProgress: ProgressCallback
    ): Promise<WorkflowResult<TResult>>;
    
    // Validate workflow before execution
    validate(workflow: Workflow<any, any>): ValidationResult;
}
```

### 2. Workflow Definition

```typescript
interface Workflow<TContext, TResult> {
    name: string;
    version: string;
    description: string;
    steps: WorkflowStep<any, any>[];
    
    // Configuration
    config: {
        maxRetries?: number;
        timeout?: number;
        parallelization?: ParallelizationStrategy;
        errorHandling?: ErrorHandlingStrategy;
    };
    
    // Hooks
    hooks?: {
        beforeExecute?: (context: TContext) => Promise<void>;
        afterExecute?: (result: WorkflowResult<TResult>) => Promise<void>;
        onError?: (error: Error, context: TContext) => Promise<void>;
    };
}
```

### 3. Workflow Steps

```typescript
interface WorkflowStep<TInput, TOutput> {
    name: string;
    description: string;
    
    // Core execution
    execute(input: TInput, context: WorkflowContext): Promise<TOutput>;
    
    // Validation
    validate?(input: TInput): ValidationResult;
    
    // Error handling
    canRetry?: (error: Error, attempt: number) => boolean;
    onError?: (error: Error, input: TInput) => Promise<TOutput | null>;
    
    // Configuration
    config?: {
        timeout?: number;
        retries?: number;
        requiresPrevious?: boolean;
        canRunInParallel?: boolean;
    };
}
```

### 4. Workflow Context

```typescript
interface WorkflowContext {
    // Workflow metadata
    workflowId: string;
    workflowName: string;
    startTime: Date;
    
    // Step tracking
    currentStep: string;
    completedSteps: string[];
    
    // Data storage
    data: Map<string, any>;
    
    // Services
    services: ServiceContainer;
    
    // Logging
    logger: Logger;
    
    // Methods
    getData<T>(key: string): T | undefined;
    setData(key: string, value: any): void;
    hasData(key: string): boolean;
}
```

## Predefined Workflows

### 1. CMS Detection Workflow

```typescript
class CMSDetectionWorkflow implements Workflow<CMSDetectionInput, CMSDetectionResult> {
    name = 'cms-detection';
    version = '1.0.0';
    
    steps = [
        new ValidateURLStep(),
        new RobotsTxtAnalysisStep(),      // Bot-resistant approach
        new BrowserSetupStep(),
        new PageCaptureStep(),
        new DataExtractionStep(),
        new CMSDetectionStep(),
        new DataStorageStep(),
        new ResultFormattingStep()
    ];
    
    config = {
        maxRetries: 3,
        timeout: 30000,
        errorHandling: ErrorHandlingStrategy.CONTINUE_ON_ERROR
    };
}
```

### 2. Ground Truth Analysis Workflow

```typescript
class GroundTruthAnalysisWorkflow implements Workflow<AnalysisInput, AnalysisResult> {
    name = 'ground-truth-analysis';
    version = '2.0.0';
    
    steps = [
        // Phase 1: Data Collection
        new LoadExistingDataStep(),
        new RobotsTxtFetchStep(),
        new CMSDetectionWithDataStep(),
        
        // Phase 2: Signal Analysis
        new ScriptSignalAnalysisStep(),
        new HTMLSignalAnalysisStep(),
        new MetaSignalAnalysisStep(),
        new HeaderSignalAnalysisStep(),
        new StylesheetSignalAnalysisStep(),
        new VersionDetectionStep(),
        
        // Phase 3: Interactive Verification
        new DisplayResultsStep(),
        new UserVerificationStep(),
        new DatabaseUpdateStep()
    ];
    
    config = {
        parallelization: {
            strategy: 'phase',
            phases: {
                'signal-analysis': ['script', 'html', 'meta', 'header', 'stylesheet']
            }
        }
    };
}
```

### 3. Batch Processing Workflow

```typescript
class BatchCMSDetectionWorkflow implements Workflow<BatchInput, BatchResult> {
    name = 'batch-cms-detection';
    version = '1.0.0';
    
    steps = [
        new ValidateCSVStep(),
        new SplitBatchStep(),         // Split into chunks
        new ParallelProcessStep(),    // Process chunks in parallel
        new AggregateResultsStep(),
        new GenerateReportStep(),
        new SaveResultsStep()
    ];
    
    config = {
        parallelization: {
            strategy: 'batch',
            maxConcurrency: 5,
            chunkSize: 10
        }
    };
}
```

### 4. Corporate Branding Evaluation Workflow

```typescript
class BrandingEvaluationWorkflow implements Workflow<BrandingInput, BrandingResult> {
    name = 'branding-evaluation';
    version = '1.0.0';
    
    steps = [
        new CaptureScreenshotStep(),
        new ExtractVisualElementsStep(),
        new LoadBrandingGuidelinesStep(),
        new AIEvaluationStep(),           // Uses eval.ts functionality
        new ComplianceScoreStep(),
        new GenerateReportStep()
    ];
}
```

## Step Implementation Examples

### 1. Bot-Resistant Detection Step

```typescript
class RobotsTxtAnalysisStep implements WorkflowStep<string, RobotsTxtResult> {
    name = 'robots-txt-analysis';
    description = 'Analyze robots.txt for bot detection bypass';
    
    async execute(url: string, context: WorkflowContext): Promise<RobotsTxtResult> {
        const logger = context.logger;
        logger.info('Analyzing robots.txt', { url });
        
        try {
            // Get service from context
            const robotsService = context.services.get(RobotsTxtService);
            
            // Perform analysis
            const result = await robotsService.analyze(url);
            
            // Store result in context for later steps
            context.setData('robotsTxtResult', result);
            
            return result;
        } catch (error) {
            logger.error('Robots.txt analysis failed', { url, error });
            
            // Graceful degradation - continue without bot bypass
            return {
                success: false,
                bypassAvailable: false,
                error: error.message
            };
        }
    }
    
    canRetry(error: Error, attempt: number): boolean {
        // Retry network errors up to 3 times
        return error.name === 'NetworkError' && attempt < 3;
    }
}
```

### 2. Interactive Verification Step

```typescript
class UserVerificationStep implements WorkflowStep<AnalysisResult, VerifiedResult> {
    name = 'user-verification';
    description = 'Interactive user verification of detection results';
    
    async execute(analysis: AnalysisResult, context: WorkflowContext): Promise<VerifiedResult> {
        const uiService = context.services.get(InteractiveUIService);
        
        // Display results with confidence indicators
        await uiService.displayAnalysis(analysis);
        
        // Get user input
        const verification = await uiService.promptVerification({
            suggestedCMS: analysis.detectedCMS,
            confidence: analysis.confidence,
            signals: analysis.signals
        });
        
        // Update ground truth if changed
        if (verification.correctedCMS !== analysis.detectedCMS) {
            context.setData('correctionMade', true);
            context.setData('originalDetection', analysis.detectedCMS);
        }
        
        return {
            ...analysis,
            verifiedCMS: verification.correctedCMS,
            verificationNotes: verification.notes,
            verifiedAt: new Date()
        };
    }
    
    config = {
        requiresPrevious: true,
        canRunInParallel: false
    };
}
```

### 3. Parallel Signal Analysis Step

```typescript
class ParallelSignalAnalysisStep implements WorkflowStep<DataPoint, SignalAnalysis> {
    name = 'parallel-signal-analysis';
    
    async execute(dataPoint: DataPoint, context: WorkflowContext): Promise<SignalAnalysis> {
        const analysisService = context.services.get(SignalAnalysisService);
        
        // Run all signal analyses in parallel
        const [scripts, html, meta, headers, styles] = await Promise.all([
            analysisService.analyzeScripts(dataPoint.scripts),
            analysisService.analyzeHTML(dataPoint.html),
            analysisService.analyzeMeta(dataPoint.metadata),
            analysisService.analyzeHeaders(dataPoint.headers),
            analysisService.analyzeStylesheets(dataPoint.stylesheets)
        ]);
        
        return {
            scriptSignals: scripts,
            htmlSignals: html,
            metaSignals: meta,
            headerSignals: headers,
            stylesheetSignals: styles,
            timestamp: new Date()
        };
    }
}
```

## Error Handling Strategies

### 1. Continue on Error
```typescript
enum ErrorHandlingStrategy {
    FAIL_FAST,           // Stop on first error
    CONTINUE_ON_ERROR,   // Log and continue
    RETRY_WITH_BACKOFF,  // Exponential backoff
    FALLBACK_CHAIN      // Try alternative steps
}
```

### 2. Error Recovery Example
```typescript
class DataStorageStep implements WorkflowStep<DetectionResult, void> {
    async execute(result: DetectionResult, context: WorkflowContext): Promise<void> {
        try {
            await this.storeToFileSystem(result);
        } catch (error) {
            context.logger.warn('Primary storage failed, trying fallback', { error });
            
            // Try in-memory cache as fallback
            const cache = context.services.get(CacheService);
            await cache.store(result.url, result);
            
            // Mark for later retry
            context.setData('pendingStorage', [...(context.getData('pendingStorage') || []), result]);
        }
    }
}
```

## Progress Tracking

```typescript
interface ProgressCallback {
    (progress: ProgressInfo): void;
}

interface ProgressInfo {
    workflow: string;
    currentStep: string;
    stepsCompleted: number;
    totalSteps: number;
    percentComplete: number;
    estimatedTimeRemaining?: number;
    currentStepProgress?: {
        message: string;
        percent?: number;
    };
}
```

## Usage Examples

### 1. Simple CMS Detection
```typescript
const engine = new WorkflowEngine();
const workflow = new CMSDetectionWorkflow();

const result = await engine.execute(workflow, {
    url: 'https://example.com',
    options: { collectData: true }
});
```

### 2. Batch Processing with Progress
```typescript
const batchWorkflow = new BatchCMSDetectionWorkflow();

await engine.executeWithProgress(
    batchWorkflow,
    { csvFile: 'sites.csv' },
    (progress) => {
        console.log(`Processing: ${progress.currentStep} (${progress.percentComplete}%)`);
    }
);
```

### 3. Custom Workflow Composition
```typescript
const customWorkflow: Workflow<any, any> = {
    name: 'custom-analysis',
    version: '1.0.0',
    steps: [
        new RobotsTxtAnalysisStep(),
        new CMSDetectionStep(),
        new CustomAnalysisStep(),
        new ReportGenerationStep()
    ],
    config: {
        errorHandling: ErrorHandlingStrategy.CONTINUE_ON_ERROR
    }
};

const result = await engine.execute(customWorkflow, { urls: [...] });
```

## Benefits

1. **Modularity** - Each step is independent and testable
2. **Reusability** - Steps can be shared across workflows
3. **Flexibility** - Easy to create custom workflows
4. **Observability** - Built-in progress and error tracking
5. **Resilience** - Comprehensive error handling
6. **Performance** - Support for parallel execution
7. **Maintainability** - Clear separation of concerns

## Migration Path

1. **Phase 1**: Implement core workflow engine
2. **Phase 2**: Create step implementations for existing logic
3. **Phase 3**: Migrate ground-truth.ts to workflow-based approach
4. **Phase 4**: Convert other commands to use workflows
5. **Phase 5**: Add workflow CLI commands for custom compositions

## Conclusion

This workflow engine design addresses the complexity found in the ground-truth analysis while providing a flexible foundation for all Inspector CLI operations. It maintains the sophisticated capabilities of the current system while improving maintainability, testability, and extensibility.