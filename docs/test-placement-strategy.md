# Test Placement Strategy for Feature-Oriented Structure

## Test Types and Their Placement

### 1. Unit Tests - Co-located with Source
**Location**: Within each feature's `__tests__/` directories
**Scope**: Single class/function in isolation
**Mocking**: Mock all dependencies

```
features/
├── cms-detection/
│   ├── services/
│   │   ├── detector.service.ts
│   │   └── __tests__/
│   │       └── detector.service.test.ts        # Unit tests
│   ├── workflows/
│   │   ├── single-url.workflow.ts
│   │   └── __tests__/
│   │       └── single-url.workflow.test.ts     # Unit tests
```

### 2. Functional Tests - Feature Level
**Location**: Within each feature's `__tests__/` directories
**Scope**: Complete feature functionality with real implementations
**Mocking**: Selective mocking (external services only)

```
features/
├── cms-detection/
│   └── __tests__/
│       ├── detector.service.test.ts            # Unit
│       ├── single-url.workflow.test.ts         # Unit
│       ├── cms-detection.functional.test.ts    # Functional - tests entire feature
│       └── ground-truth.functional.test.ts     # Functional - complex workflows
```

### 3. Integration Tests - Multiple Placement Options

#### Option A: Cross-Feature Integration Tests at Root Level
**Location**: `/tests/integration/` at project root
**Scope**: Multiple features working together
**Use Case**: End-to-end workflows that span features

```
tests/
├── integration/
│   ├── cms-analysis-pipeline.integration.test.ts    # CMS detection → Analysis
│   ├── screenshot-to-ai.integration.test.ts         # Screenshot → AI evaluation
│   └── batch-processing.integration.test.ts         # CSV → Detection → Storage
```

#### Option B: Feature-Specific Integration Tests
**Location**: Within feature if integration is feature-specific
**Scope**: Feature + external dependencies (filesystem, network)
**Use Case**: Testing real browser interactions, file operations

```
features/
├── cms-detection/
│   └── __tests__/
│       ├── cms-detection.integration.test.ts    # Tests with real browser
│       └── data-storage.integration.test.ts     # Tests with real filesystem
```

## Complete Structure Example

```
inspector-cli/
├── src/
│   ├── features/
│   │   ├── cms-detection/
│   │   │   ├── commands/
│   │   │   │   ├── detect.command.ts
│   │   │   │   └── __tests__/
│   │   │   │       └── detect.command.test.ts           # Unit
│   │   │   ├── workflows/
│   │   │   │   ├── single-url.workflow.ts
│   │   │   │   └── __tests__/
│   │   │   │       ├── single-url.workflow.test.ts      # Unit
│   │   │   │       └── single-url.workflow.functional.test.ts  # Functional
│   │   │   ├── services/
│   │   │   │   ├── detector.service.ts
│   │   │   │   └── __tests__/
│   │   │   │       ├── detector.service.test.ts         # Unit
│   │   │   │       └── detector.service.integration.test.ts  # Integration w/ browser
│   │   │   └── __tests__/
│   │   │       └── cms-detection.functional.test.ts     # Feature-level functional
│   │   │
│   │   ├── ground-truth/
│   │   │   ├── workflows/
│   │   │   │   ├── analysis.workflow.ts
│   │   │   │   └── __tests__/
│   │   │   │       ├── analysis.workflow.test.ts        # Unit
│   │   │   │       └── analysis.workflow.functional.test.ts  # Functional
│   │   │   ├── services/
│   │   │   │   ├── signal-analyzer.service.ts
│   │   │   │   └── __tests__/
│   │   │   │       ├── signal-analyzer.service.test.ts  # Unit
│   │   │   │       └── signal-analyzer.service.integration.test.ts  # Integration
│   │   │   └── __tests__/
│   │   │       ├── ground-truth.functional.test.ts      # Feature-level functional
│   │   │       └── ground-truth.integration.test.ts     # Database integration
│   │   │
│   │   └── ai-evaluation/
│   │       ├── services/
│   │       │   ├── ai-provider.service.ts
│   │       │   └── __tests__/
│   │       │       ├── ai-provider.service.test.ts      # Unit
│   │       │       └── ai-provider.service.integration.test.ts  # OpenAI API
│   │       └── __tests__/
│   │           └── branding-eval.functional.test.ts     # Feature-level functional
│   │
│   ├── core/
│   │   ├── workflow-engine/
│   │   │   ├── engine.ts
│   │   │   └── __tests__/
│   │   │       ├── engine.test.ts                       # Unit
│   │   │       └── engine.functional.test.ts            # Functional
│   │   └── cli/
│   │       └── __tests__/
│   │           └── cli.functional.test.ts               # CLI parsing tests
│   │
│   └── shared/
│       ├── browser/
│       │   ├── browser-manager.ts
│       │   └── __tests__/
│       │       ├── browser-manager.test.ts              # Unit
│       │       └── browser-manager.integration.test.ts  # Real browser tests
│       └── storage/
│           ├── filesystem-adapter.ts
│           └── __tests__/
│               ├── filesystem-adapter.test.ts           # Unit
│               └── filesystem-adapter.integration.test.ts  # Real filesystem
│
├── tests/                                               # Cross-feature tests
│   ├── integration/
│   │   ├── cms-to-analysis-pipeline.test.ts            # Detection → Analysis
│   │   ├── screenshot-to-ai-pipeline.test.ts           # Screenshot → AI
│   │   ├── batch-processing-pipeline.test.ts           # CSV → Detection → Report
│   │   └── ground-truth-full-workflow.test.ts          # Complex multi-feature
│   ├── e2e/
│   │   ├── cli-commands.test.ts                        # Test actual CLI commands
│   │   └── complete-workflows.test.ts                  # End-to-end scenarios
│   └── performance/
│       ├── batch-processing.perf.test.ts
│       └── memory-usage.perf.test.ts
│
└── package.json
```

## Test Running Strategy

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.test.ts'],
      // Fast tests, lots of mocking
    },
    {
      displayName: 'functional',
      testMatch: ['<rootDir>/src/**/*.functional.test.ts'],
      // Slower tests, less mocking
      testTimeout: 30000,
    },
    {
      displayName: 'integration',
      testMatch: [
        '<rootDir>/src/**/*.integration.test.ts',
        '<rootDir>/tests/integration/**/*.test.ts'
      ],
      // Real external dependencies
      testTimeout: 60000,
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.ts'],
      // Full system tests
      testTimeout: 120000,
    }
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
    "test:all": "jest",
    "test:watch": "jest --selectProjects unit --watch",
    "test:feature": "jest --testPathPattern=features/cms-detection"
  }
}
```

## Test Scope Guidelines

### Unit Tests (`.test.ts`)
- **Scope**: Single class/function
- **Location**: Next to source file
- **Mocking**: Mock everything
- **Speed**: < 100ms per test
- **Example**: `detector.service.test.ts`

### Functional Tests (`.functional.test.ts`)
- **Scope**: Complete feature workflow
- **Location**: Within feature
- **Mocking**: Only external services (APIs, filesystem)
- **Speed**: 1-5 seconds per test
- **Example**: `cms-detection.functional.test.ts`

### Integration Tests (`.integration.test.ts`)
- **Scope**: Feature + real external dependencies
- **Location**: Within feature OR `/tests/integration/`
- **Mocking**: Minimal - test real integrations
- **Speed**: 5-30 seconds per test
- **Example**: `browser-manager.integration.test.ts`

### E2E Tests (`/tests/e2e/`)
- **Scope**: Complete system from CLI to output
- **Location**: Project root
- **Mocking**: None - test production-like scenarios
- **Speed**: 30+ seconds per test
- **Example**: `cli-commands.test.ts`

## Migration from Current Structure

### Current Tests
```
src/commands/__tests__/
├── detect_cms.test.ts
├── detect_cms.functional.test.ts
└── ground-truth.functional.test.ts
```

### New Structure
```
src/features/cms-detection/__tests__/
├── detect.command.test.ts                    # Unit
├── cms-detection.functional.test.ts          # Functional
└── cms-detection.integration.test.ts         # Integration

src/features/ground-truth/__tests__/
├── ground-truth.functional.test.ts           # Functional
└── ground-truth.integration.test.ts          # Integration

tests/integration/
└── cms-analysis-pipeline.test.ts             # Cross-feature integration
```

## Benefits of This Approach

1. **Discoverability**: Tests are near the code they test
2. **Feature Focus**: Each feature owns its test strategy
3. **Appropriate Scope**: Each test type has clear boundaries
4. **Flexible Execution**: Run tests by type or feature
5. **Clear Separation**: Cross-feature tests are obviously separate

## Special Considerations

### Ground Truth Tests
Given the complexity of ground-truth (2,108 lines → multiple services), it needs comprehensive testing:

```
features/ground-truth/__tests__/
├── data-collector.service.test.ts           # Unit
├── signal-analyzer.service.test.ts          # Unit
├── interactive-ui.service.test.ts           # Unit
├── analysis.workflow.test.ts                # Unit
├── analysis.workflow.functional.test.ts     # Functional
├── ground-truth.integration.test.ts         # Database integration
└── ground-truth.functional.test.ts          # Complete feature test
```

### Shared Component Tests
Tests for `shared/` and `core/` components stay with their modules since they're reusable infrastructure.

## Conclusion

The feature-oriented structure maintains test clarity by:
- Keeping unit and functional tests with their features
- Placing cross-feature integration tests at the project root
- Using clear naming conventions for test scope
- Enabling flexible test execution strategies

This approach ensures tests are discoverable, maintainable, and match the feature-oriented architecture.