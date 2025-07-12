# Workflow Testing Strategies: Inline vs. Separate Steps

## The Testing Challenge

When steps are defined inline within workflows, we need strategies to test both individual step logic and workflow orchestration without creating tightly coupled tests.

## Option 1: Inline Steps with Extracted Functions

```typescript
// src/features/cms-detection/workflows/single-url.workflow.ts

export class SingleUrlDetectionWorkflow extends Workflow {
  name = 'cms-detection-single';
  
  constructor(
    private detector: DetectorService,
    private robotsAnalyzer: RobotsAnalyzerService
  ) {
    super();
  }
  
  // Extract step logic to testable methods
  protected async validateUrl(url: string): Promise<string> {
    if (!isValidUrl(url)) {
      throw new Error('Invalid URL');
    }
    return url;
  }
  
  protected async analyzeRobots(url: string): Promise<RobotsData> {
    return await this.robotsAnalyzer.analyze(url);
  }
  
  protected async detectCMS(url: string, robotsData: RobotsData): Promise<DetectionResult> {
    return await this.detector.detect(url, robotsData);
  }
  
  // Steps reference the methods
  steps = [
    new Step('validate-url', async (ctx: Context) => {
      const { url } = ctx.input;
      return await this.validateUrl(url);
    }),
    
    new Step('analyze-robots', async (ctx: Context) => {
      const robotsData = await this.analyzeRobots(ctx.data.url);
      ctx.setData('robotsData', robotsData);
      return robotsData;
    }),
    
    new Step('detect-cms', async (ctx: Context) => {
      const result = await this.detectCMS(ctx.data.url, ctx.data.robotsData);
      return result;
    })
  ];
}

// Testing becomes straightforward
describe('SingleUrlDetectionWorkflow', () => {
  describe('step methods', () => {
    it('should validate URLs correctly', async () => {
      const workflow = new SingleUrlDetectionWorkflow(mockDetector, mockAnalyzer);
      await expect(workflow.validateUrl('invalid')).rejects.toThrow();
      await expect(workflow.validateUrl('https://example.com')).resolves.toBe('https://example.com');
    });
    
    it('should analyze robots.txt', async () => {
      const mockAnalyzer = { analyze: jest.fn().mockResolvedValue({ allowed: true }) };
      const workflow = new SingleUrlDetectionWorkflow(mockDetector, mockAnalyzer);
      const result = await workflow.analyzeRobots('https://example.com');
      expect(result.allowed).toBe(true);
    });
  });
  
  describe('workflow execution', () => {
    it('should execute all steps in order', async () => {
      // Test the full workflow
    });
  });
});
```

## Option 2: Hybrid Approach - Reusable Step Classes for Complex Logic

```typescript
// src/features/cms-detection/steps/robots-analysis.step.ts
export class RobotsAnalysisStep extends Step {
  constructor(private robotsAnalyzer: RobotsAnalyzerService) {
    super('analyze-robots');
  }
  
  async execute(ctx: Context): Promise<RobotsData> {
    const robotsData = await this.robotsAnalyzer.analyze(ctx.data.url);
    ctx.setData('robotsData', robotsData);
    return robotsData;
  }
}

// src/features/cms-detection/workflows/single-url.workflow.ts
export class SingleUrlDetectionWorkflow extends Workflow {
  steps = [
    // Simple inline step
    new Step('validate-url', async (ctx: Context) => {
      const { url } = ctx.input;
      if (!isValidUrl(url)) throw new Error('Invalid URL');
      return url;
    }),
    
    // Complex reusable step
    new RobotsAnalysisStep(this.robotsAnalyzer),
    
    // Another inline step
    new Step('detect-cms', async (ctx: Context) => {
      return await this.detector.detect(ctx.data.url, ctx.data.robotsData);
    })
  ];
}
```

## Option 3: Step Factory Pattern

```typescript
// src/features/cms-detection/workflows/single-url.workflow.ts
export class SingleUrlDetectionWorkflow extends Workflow {
  // Step factories for testing
  static createValidationStep() {
    return new Step('validate-url', async (ctx: Context) => {
      const { url } = ctx.input;
      if (!isValidUrl(url)) throw new Error('Invalid URL');
      return url;
    });
  }
  
  static createRobotsAnalysisStep(analyzer: RobotsAnalyzerService) {
    return new Step('analyze-robots', async (ctx: Context) => {
      const robotsData = await analyzer.analyze(ctx.data.url);
      ctx.setData('robotsData', robotsData);
      return robotsData;
    });
  }
  
  steps = [
    SingleUrlDetectionWorkflow.createValidationStep(),
    SingleUrlDetectionWorkflow.createRobotsAnalysisStep(this.robotsAnalyzer),
    // ... more steps
  ];
}

// Easy to test individual steps
describe('SingleUrlDetectionWorkflow Steps', () => {
  it('should validate URLs', async () => {
    const step = SingleUrlDetectionWorkflow.createValidationStep();
    const ctx = createMockContext({ input: { url: 'invalid' } });
    await expect(step.execute(ctx)).rejects.toThrow();
  });
});
```

## Option 4: Workflow Composition with Step Libraries

```typescript
// src/features/cms-detection/steps/index.ts
// Library of common steps that can be composed

export const createValidationStep = (validator: (url: string) => boolean) =>
  new Step('validate-url', async (ctx: Context) => {
    const { url } = ctx.input;
    if (!validator(url)) throw new Error('Invalid URL');
    return url;
  });

export const createServiceStep = <T>(
  name: string,
  serviceMethod: (ctx: Context) => Promise<T>,
  dataKey?: string
) => new Step(name, async (ctx: Context) => {
  const result = await serviceMethod(ctx);
  if (dataKey) ctx.setData(dataKey, result);
  return result;
});

// src/features/cms-detection/workflows/single-url.workflow.ts
import { createValidationStep, createServiceStep } from '../steps';

export class SingleUrlDetectionWorkflow extends Workflow {
  steps = [
    createValidationStep(isValidUrl),
    createServiceStep(
      'analyze-robots',
      (ctx) => this.robotsAnalyzer.analyze(ctx.data.url),
      'robotsData'
    ),
    createServiceStep(
      'detect-cms',
      (ctx) => this.detector.detect(ctx.data.url, ctx.data.robotsData)
    )
  ];
}
```

## Testing Strategies Comparison

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **Inline with Methods** | - Clear workflow definition<br>- Easy to test methods<br>- Good IDE support | - Workflow class can get large<br>- Methods might not be reusable | Most common cases |
| **Hybrid (Mix of Both)** | - Flexibility<br>- Reuse complex steps<br>- Simple steps stay inline | - Two patterns to learn<br>- Deciding when to extract | Balanced approach |
| **Step Factories** | - Very testable<br>- Steps are pure functions<br>- Good separation | - More boilerplate<br>- Static methods everywhere | Testing-focused teams |
| **Step Libraries** | - Maximum reusability<br>- Functional approach<br>- Easy composition | - Less discoverable<br>- Another abstraction layer | Large codebases |

## Recommended Approach

For Inspector CLI, I recommend the **Hybrid Approach**:

1. **Simple steps stay inline** - URL validation, data transformation, etc.
2. **Complex steps become classes** - RobotsAnalysis, SignalAnalysis, etc.
3. **Shared steps go in a library** - Common patterns like validation, caching

```typescript
// Example structure
features/
├── cms-detection/
│   ├── workflows/
│   │   └── single-url.workflow.ts      # Mix of inline and class steps
│   ├── steps/
│   │   ├── robots-analysis.step.ts    # Complex reusable step
│   │   ├── parallel-detection.step.ts  # Complex reusable step
│   │   └── __tests__/
│   └── shared-steps/
│       └── validation.steps.ts         # Common validation steps
```

## Testing Example with Hybrid Approach

```typescript
// Testing a workflow with mixed steps
describe('SingleUrlDetectionWorkflow', () => {
  let workflow: SingleUrlDetectionWorkflow;
  let mockDetector: jest.Mocked<DetectorService>;
  let mockAnalyzer: jest.Mocked<RobotsAnalyzerService>;
  
  beforeEach(() => {
    mockDetector = createMockDetector();
    mockAnalyzer = createMockAnalyzer();
    workflow = new SingleUrlDetectionWorkflow(mockDetector, mockAnalyzer);
  });
  
  describe('inline steps', () => {
    it('should validate URL in first step', async () => {
      const ctx = createMockContext({ input: { url: 'invalid' } });
      const validateStep = workflow.steps[0];
      await expect(validateStep.execute(ctx)).rejects.toThrow('Invalid URL');
    });
  });
  
  describe('complex steps', () => {
    it('should analyze robots.txt', async () => {
      // The RobotsAnalysisStep has its own test file
      // Here we just test it's wired correctly
      const robotsStep = workflow.steps[1] as RobotsAnalysisStep;
      expect(robotsStep.name).toBe('analyze-robots');
    });
  });
  
  describe('full workflow', () => {
    it('should complete detection workflow', async () => {
      const result = await workflow.execute({ url: 'https://example.com' });
      expect(result.success).toBe(true);
      expect(mockAnalyzer.analyze).toHaveBeenCalled();
      expect(mockDetector.detect).toHaveBeenCalled();
    });
  });
});
```

## Conclusion

Inline steps don't necessarily make testing harder if we:
1. Use the hybrid approach for flexibility
2. Extract complex logic to testable methods or separate step classes
3. Keep simple transformations inline
4. Test at multiple levels (unit, integration, workflow)

This gives us the best of both worlds: cohesive feature organization and comprehensive testability.