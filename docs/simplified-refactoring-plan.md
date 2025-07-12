# Simplified Refactoring Plan for Inspector CLI

## Overview

This document outlines the implementation plan for the simplified refactoring design. The plan focuses on decomposing the 2,108-line ground-truth.ts monolith into focused services while maintaining feature-oriented organization without complex workflow orchestration.

## Goals

### Primary Goals
- ✅ **Decompose Monolith**: Break down ground-truth.ts into 6 focused services
- ✅ **Feature Organization**: Organize code by feature rather than technical layers
- ✅ **Maintain Functionality**: Preserve all existing capabilities
- ✅ **Improve Testability**: Enable comprehensive unit and integration testing

### Secondary Goals
- ✅ **Reduce Complexity**: Maximum file size of 600 lines (vs. current 2,108)
- ✅ **Increase Maintainability**: Clear service boundaries and responsibilities
- ✅ **Enable Extensibility**: Simple service composition for new features

### Non-Goals
- ❌ **Complex Workflow Engine**: Avoid over-engineering with workflow abstractions
- ❌ **Breaking Changes**: Maintain CLI compatibility during migration
- ❌ **Architectural Sophistication**: Prioritize simplicity over complex patterns

## Implementation Plan

### Phase 1: Foundation Setup (Week 1)

#### 1.1 Create New Directory Structure
```bash
mkdir -p src/features/ground-truth/{commands,services,analyzers,models}
mkdir -p src/features/cms-detection/{commands,services,strategies,models}
mkdir -p src/features/analysis/{commands,services}
mkdir -p src/features/screenshot/{commands,services}
mkdir -p src/features/ai-evaluation/{commands,services}
mkdir -p src/shared/{browser,storage,utils,cli}
mkdir -p src/container
```

#### 1.2 Implement Service Container
```typescript
// src/container/service-container.ts
export class ServiceContainer {
    private services = new Map<string, any>();
    private factories = new Map<string, () => any>();
    
    register<T>(name: string, factory: () => T): void {
        this.factories.set(name, factory);
    }
    
    get<T>(name: string): T {
        if (!this.services.has(name)) {
            const factory = this.factories.get(name);
            if (!factory) {
                throw new Error(`Service ${name} not registered`);
            }
            this.services.set(name, factory());
        }
        return this.services.get(name);
    }
}
```

#### 1.3 Create Base Command Pattern
```typescript
// src/shared/cli/base-command.ts
export abstract class BaseCommand {
    constructor(protected container: ServiceContainer) {}
    
    protected handleError(error: Error): void {
        const logger = this.container.get<Logger>('Logger');
        logger.error('Command failed', error);
        console.error('Error:', error.message);
        process.exit(1);
    }
    
    protected formatOutput(result: any, format: string): void {
        const formatter = this.container.get<OutputFormatter>('OutputFormatter');
        formatter.display(result, format);
    }
}
```

#### 1.4 Setup Testing Infrastructure
- Update Jest configuration for new directory structure
- Create test utilities and mocks
- Establish testing patterns for services

**Deliverables:**
- [ ] New directory structure created
- [ ] Service container implemented and tested
- [ ] Base command pattern established
- [ ] Testing infrastructure configured

### Phase 2: Ground Truth Service Extraction (Weeks 2-3)

#### 2.1 Extract Data Collection Service
```typescript
// src/features/ground-truth/services/data-collector.service.ts
export class DataCollector {
    constructor(
        private browserManager: BrowserManager,
        private robotsAnalyzer: RobotsAnalyzer
    ) {}
    
    async collect(url: string): Promise<DetectionDataPoint> {
        // Bot-resistant approach
        const robotsData = await this.robotsAnalyzer.analyze(url);
        const page = await this.browserManager.createPage({
            bypassBot: robotsData.bypassAvailable
        });
        
        return {
            url,
            html: await page.content(),
            scripts: await this.extractScripts(page),
            stylesheets: await this.extractStylesheets(page),
            headers: await this.extractHeaders(page),
            metadata: await this.extractMetadata(page),
            robotsData
        };
    }
}
```

#### 2.2 Extract Signal Processing Service
```typescript
// src/features/ground-truth/services/signal-processor.service.ts
export class SignalProcessor {
    constructor(
        private scriptAnalyzer: ScriptAnalyzer,
        private htmlAnalyzer: HTMLAnalyzer,
        private metaAnalyzer: MetaAnalyzer,
        private headerAnalyzer: HeaderAnalyzer,
        private stylesheetAnalyzer: StylesheetAnalyzer
    ) {}
    
    async process(data: DetectionDataPoint): Promise<SignalAnalysis> {
        const [scripts, html, meta, headers, stylesheets] = await Promise.all([
            this.scriptAnalyzer.analyze(data.scripts),
            this.htmlAnalyzer.analyze(data.html),
            this.metaAnalyzer.analyze(data.metadata),
            this.headerAnalyzer.analyze(data.headers),
            this.stylesheetAnalyzer.analyze(data.stylesheets)
        ]);
        
        return {
            scripts, html, meta, headers, stylesheets,
            confidence: this.calculateConfidence(scripts, html, meta, headers, stylesheets)
        };
    }
}
```

#### 2.3 Extract Interactive UI Service
```typescript
// src/features/ground-truth/services/interactive-ui.service.ts
export class InteractiveUIService {
    async verify(signals: SignalAnalysis, options: AnalysisOptions): Promise<VerifiedResult> {
        this.displayAnalysis(signals);
        
        if (options.interactive) {
            const verification = await this.promptVerification(signals);
            return {
                ...signals,
                verified: verification.confirmed,
                correctedCMS: verification.correctedCMS,
                notes: verification.notes
            };
        }
        
        return {
            ...signals,
            verified: true,
            correctedCMS: signals.detectedCMS
        };
    }
}
```

#### 2.4 Extract Repository Service
```typescript
// src/features/ground-truth/services/ground-truth-repository.service.ts
export class GroundTruthRepository {
    constructor(private fileSystemAdapter: FileSystemAdapter) {}
    
    async save(result: VerifiedResult): Promise<void> {
        const entry = this.createGroundTruthEntry(result);
        const path = this.getEntryPath(entry.url);
        await this.fileSystemAdapter.writeFile(path, JSON.stringify(entry, null, 2));
    }
    
    async load(url: string): Promise<GroundTruthEntry | null> {
        const path = this.getEntryPath(url);
        if (await this.fileSystemAdapter.exists(path)) {
            const content = await this.fileSystemAdapter.readFile(path);
            return JSON.parse(content);
        }
        return null;
    }
}
```

**Deliverables:**
- [ ] DataCollector service extracted and tested
- [ ] SignalProcessor service extracted and tested
- [ ] InteractiveUIService extracted and tested
- [ ] GroundTruthRepository service extracted and tested
- [ ] Individual signal analyzers extracted
- [ ] Unit tests for all services (>90% coverage)

### Phase 3: Main Analyzer Integration (Week 4)

#### 3.1 Create Ground Truth Analyzer
```typescript
// src/features/ground-truth/services/ground-truth-analyzer.service.ts
export class GroundTruthAnalyzer {
    constructor(
        private dataCollector: DataCollector,
        private signalProcessor: SignalProcessor,
        private uiService: InteractiveUIService,
        private repository: GroundTruthRepository
    ) {}
    
    async analyze(url: string, options: AnalysisOptions): Promise<GroundTruthResult> {
        // Simple sequential processing
        const data = await this.dataCollector.collect(url);
        const signals = await this.signalProcessor.process(data);
        const verified = await this.uiService.verify(signals, options);
        
        if (verified.save) {
            await this.repository.save(verified);
        }
        
        return verified;
    }
}
```

#### 3.2 Update Ground Truth Command
```typescript
// src/features/ground-truth/commands/ground-truth.command.ts
export class GroundTruthCommand extends BaseCommand {
    async execute(args: Arguments): Promise<void> {
        try {
            const analyzer = this.container.get<GroundTruthAnalyzer>('GroundTruthAnalyzer');
            const result = await analyzer.analyze(args.url, {
                interactive: args.interactive,
                save: args.save,
                collectData: args.collectData
            });
            this.formatOutput(result, args.format);
        } catch (error) {
            this.handleError(error);
        }
    }
}
```

#### 3.3 Service Registration
```typescript
// src/container/service-registry.ts
export function configureGroundTruthServices(container: ServiceContainer): void {
    // Infrastructure
    container.register('BrowserManager', () => new BrowserManager());
    container.register('FileSystemAdapter', () => new NodeFileSystemAdapter());
    
    // Analyzers
    container.register('ScriptAnalyzer', () => new ScriptAnalyzer());
    container.register('HTMLAnalyzer', () => new HTMLAnalyzer());
    container.register('MetaAnalyzer', () => new MetaAnalyzer());
    container.register('HeaderAnalyzer', () => new HeaderAnalyzer());
    container.register('StylesheetAnalyzer', () => new StylesheetAnalyzer());
    
    // Services
    container.register('RobotsAnalyzer', () => 
        new RobotsAnalyzer(container.get('BrowserManager'))
    );
    
    container.register('DataCollector', () => 
        new DataCollector(
            container.get('BrowserManager'),
            container.get('RobotsAnalyzer')
        )
    );
    
    container.register('SignalProcessor', () => 
        new SignalProcessor(
            container.get('ScriptAnalyzer'),
            container.get('HTMLAnalyzer'),
            container.get('MetaAnalyzer'),
            container.get('HeaderAnalyzer'),
            container.get('StylesheetAnalyzer')
        )
    );
    
    container.register('InteractiveUIService', () => 
        new InteractiveUIService(container.get('Logger'))
    );
    
    container.register('GroundTruthRepository', () => 
        new GroundTruthRepository(container.get('FileSystemAdapter'))
    );
    
    container.register('GroundTruthAnalyzer', () => 
        new GroundTruthAnalyzer(
            container.get('DataCollector'),
            container.get('SignalProcessor'),
            container.get('InteractiveUIService'),
            container.get('GroundTruthRepository')
        )
    );
}
```

**Deliverables:**
- [ ] GroundTruthAnalyzer service created and tested
- [ ] GroundTruthCommand updated to use new services
- [ ] Service registration configured
- [ ] Integration tests validating complete functionality
- [ ] Performance validation (no regression)

### Phase 4: Other Feature Migration (Week 5)

#### 4.1 CMS Detection Feature
```typescript
// src/features/cms-detection/services/cms-detector.service.ts
export class CMSDetector {
    constructor(
        private strategies: DetectionStrategy[],
        private robotsAnalyzer: RobotsAnalyzer
    ) {}
    
    async detect(url: string, options: DetectionOptions): Promise<DetectionResult> {
        const robotsData = await this.robotsAnalyzer.analyze(url);
        
        for (const strategy of this.strategies) {
            const result = await strategy.detect(url, robotsData);
            if (result.confidence > options.threshold) {
                return result;
            }
        }
        
        return {
            url,
            cms: 'Unknown',
            confidence: 0,
            signals: []
        };
    }
}
```

#### 4.2 Analysis Feature
```typescript
// src/features/analysis/services/data-analyzer.service.ts
export class DataAnalyzer {
    constructor(private repository: DataRepository) {}
    
    async analyzeData(criteria: AnalysisCriteria): Promise<AnalysisResult> {
        const data = await this.repository.query(criteria);
        
        return {
            totalSites: data.length,
            cmsCounts: this.calculateCMSCounts(data),
            confidenceDistribution: this.calculateConfidenceDistribution(data),
            patterns: this.extractPatterns(data)
        };
    }
}
```

#### 4.3 Screenshot Feature
```typescript
// src/features/screenshot/services/screenshot.service.ts
export class ScreenshotService {
    constructor(private browserManager: BrowserManager) {}
    
    async capture(url: string, options: ScreenshotOptions): Promise<void> {
        const page = await this.browserManager.createPage();
        await page.goto(url);
        await page.screenshot({
            path: options.path,
            width: options.width,
            height: options.height
        });
    }
    
    async batchCapture(urls: string[], options: BatchOptions): Promise<void> {
        for (const url of urls) {
            await this.capture(url, {
                path: this.generatePath(url, options),
                width: options.width,
                height: options.height
            });
        }
    }
}
```

#### 4.4 AI Evaluation Feature
```typescript
// src/features/ai-evaluation/services/branding-evaluator.service.ts
export class BrandingEvaluator {
    constructor(private aiProvider: AIProvider) {}
    
    async evaluate(screenshot: string, guidelines: BrandingGuidelines): Promise<EvaluationResult> {
        const prompt = this.createEvaluationPrompt(guidelines);
        const response = await this.aiProvider.analyzeImage(screenshot, prompt);
        
        return {
            overallScore: response.score,
            violations: response.violations,
            recommendations: response.recommendations
        };
    }
}
```

**Deliverables:**
- [ ] CMS Detection feature migrated
- [ ] Analysis feature migrated  
- [ ] Screenshot feature migrated
- [ ] AI Evaluation feature migrated
- [ ] All commands updated to use new services
- [ ] Feature-level integration tests

### Phase 5: Testing & Validation (Week 6)

#### 5.1 Comprehensive Testing
```typescript
// Integration test example
describe('Ground Truth Integration', () => {
    let analyzer: GroundTruthAnalyzer;
    let tempDir: string;
    
    beforeEach(async () => {
        tempDir = await createTempDir();
        const container = configureTestServices(tempDir);
        analyzer = container.get('GroundTruthAnalyzer');
    });
    
    it('should complete WordPress analysis', async () => {
        const result = await analyzer.analyze('https://wordpress.com', {
            interactive: false,
            save: true
        });
        
        expect(result.verified).toBe(true);
        expect(result.detectedCMS).toBe('WordPress');
        expect(result.confidence).toBeGreaterThan(0.8);
    });
});
```

#### 5.2 Performance Testing
```typescript
// Performance test example
describe('Performance Tests', () => {
    it('should process batch detection within time limit', async () => {
        const urls = loadTestUrls(100);
        const startTime = Date.now();
        
        const results = await Promise.all(
            urls.map(url => detector.detect(url, { threshold: 0.7 }))
        );
        
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(60000); // 1 minute max
        expect(results.length).toBe(100);
    });
});
```

#### 5.3 Migration Validation
- Compare outputs before and after migration
- Validate all CLI commands work identically
- Check performance metrics
- Verify no functionality regression

**Deliverables:**
- [ ] Complete unit test suite (>90% coverage)
- [ ] Integration tests for all features
- [ ] Performance benchmarks
- [ ] Migration validation report
- [ ] Documentation updates

### Phase 6: Cleanup & Documentation (Week 7)

#### 6.1 Remove Legacy Code
```bash
# Archive old implementation
mkdir -p archive/old-implementation
mv src/commands/ground-truth.ts archive/old-implementation/
mv src/commands/detect_cms.ts archive/old-implementation/
mv src/commands/analyze.ts archive/old-implementation/
```

#### 6.2 Update Documentation
- Update README with new architecture
- Create service documentation
- Update CLI usage examples
- Create migration guide

#### 6.3 Final Testing
- Complete end-to-end testing
- User acceptance testing
- Performance validation
- Security review

**Deliverables:**
- [ ] Legacy code removed
- [ ] Complete documentation
- [ ] Final testing report
- [ ] Deployment guide

## Testing Strategy

### Unit Tests
- **Location**: Co-located with services in `__tests__/` directories
- **Scope**: Individual service methods
- **Coverage**: >90% for all services
- **Mocking**: Mock all external dependencies

### Integration Tests
- **Location**: Feature-level in `__tests__/` directories
- **Scope**: Complete feature functionality
- **Coverage**: All major user flows
- **Environment**: Use temp directories and test databases

### E2E Tests
- **Location**: `/tests/e2e/`
- **Scope**: CLI commands end-to-end
- **Coverage**: All CLI command combinations
- **Environment**: Real external dependencies

## Risk Management

### Technical Risks

#### Risk: Service Boundary Issues
- **Mitigation**: Clear interface definitions and service contracts
- **Detection**: Integration tests catch boundary violations
- **Response**: Refactor service interfaces if needed

#### Risk: Performance Regression
- **Mitigation**: Benchmark before/after migration
- **Detection**: Performance tests in CI/CD
- **Response**: Optimize service implementations

#### Risk: Data Migration Issues
- **Mitigation**: Maintain data format compatibility
- **Detection**: Data validation tests
- **Response**: Data migration scripts if needed

### Process Risks

#### Risk: Timeline Delays
- **Mitigation**: Weekly checkpoints and deliverable tracking
- **Detection**: Milestone review meetings
- **Response**: Adjust scope or add resources

#### Risk: Testing Gaps
- **Mitigation**: Test coverage requirements (>90%)
- **Detection**: Coverage reporting in CI/CD
- **Response**: Add tests before proceeding

## Success Metrics

### Code Quality
- **File Size**: No file >600 lines (target: max 400)
- **Complexity**: Cyclomatic complexity <10 per method
- **Test Coverage**: >90% for all services
- **Type Safety**: 100% TypeScript coverage

### Performance
- **Startup Time**: <2 seconds (maintain current)
- **Memory Usage**: <500MB for batch operations
- **Processing Speed**: No more than 10% regression

### Maintainability
- **Bug Fix Time**: <4 hours average
- **New Feature Time**: <8 hours average
- **Code Review Time**: <2 hours average

## Resource Requirements

### Team
- **1 Senior Developer**: Architecture and complex services
- **1 Mid-Level Developer**: Service extraction and testing
- **1 Junior Developer**: Testing and documentation

### Time
- **7 weeks total**: 6 weeks implementation + 1 week buffer
- **Part-time commitment**: 50% of team capacity
- **Milestone reviews**: Weekly progress checks

### Infrastructure
- **Development Environment**: Local development setup
- **Testing Environment**: Isolated test environment
- **CI/CD Pipeline**: Automated testing and deployment

## Conclusion

This simplified refactoring plan provides a clear path to decompose the monolithic ground-truth.ts file into focused, testable services while maintaining all existing functionality. The approach prioritizes simplicity and maintainability over complex abstractions, ensuring the refactored code is easier to understand, test, and extend.

The 7-week timeline is realistic and includes adequate testing and validation phases to ensure no regression in functionality or performance. The feature-oriented organization will make the codebase more maintainable and enable faster development of new features in the future.