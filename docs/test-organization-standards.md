# Test Organization Standards

## Overview

This document defines the standard test organization patterns for the Inspector CLI codebase. These standards ensure consistency, maintainability, and clarity across all test files.

## Recommended Structure: Centralized `__tests__` Pattern

The codebase follows a **centralized test directory pattern** where all tests are organized in `__tests__` directories at the appropriate level of the module hierarchy.

### Directory Structure

```
src/
├── module/
│   ├── index.ts
│   ├── submodule1.ts
│   ├── submodule2.ts
│   └── __tests__/
│       ├── index.test.ts
│       ├── submodule1.test.ts
│       └── submodule2.test.ts
├── complex-module/
│   ├── feature1/
│   │   ├── handler.ts
│   │   └── processor.ts
│   ├── feature2/
│   │   └── analyzer.ts
│   └── __tests__/
│       ├── feature1/
│       │   ├── handler.test.ts
│       │   └── processor.test.ts
│       └── feature2/
│           └── analyzer.test.ts
```

## Key Principles

### 1. Centralized Test Location
- **Rule**: All tests MUST be placed in `__tests__` directories
- **Rationale**: Clear separation between source and test code
- **Example**: Tests for `src/utils/url/normalizer.ts` go in `src/utils/url/__tests__/normalizer.test.ts`

### 2. Mirror Source Structure
- **Rule**: Within `__tests__`, mirror the source directory structure
- **Rationale**: Easy to locate tests for any source file
- **Example**: 
  ```
  src/utils/cms/
  ├── detectors/
  │   └── wordpress.ts
  └── __tests__/
      └── detectors/
          └── wordpress.test.ts
  ```

### 3. Test File Naming Conventions
- **Unit Tests**: `<module-name>.test.ts`
- **Functional Tests**: `<module-name>.functional.test.ts`
- **Integration Tests**: `<module-name>.integration.test.ts`
- **Bug-Specific Tests**: `<feature>-<bug-description>.test.ts`

### 4. Test Type Definitions

#### Unit Tests (`.test.ts`)
- Test individual functions, classes, or modules in isolation
- Mock all external dependencies
- Fast execution (< 100ms per test)
- Example: `url-normalizer.test.ts`

#### Functional Tests (`.functional.test.ts`)
- Test complete features with real implementations
- May use selective mocking (e.g., network calls)
- Test through public APIs
- Example: `cms-detection.functional.test.ts`

#### Integration Tests (`.integration.test.ts`)
- Test interaction between multiple systems
- Use real external resources (filesystem, database)
- Slower execution acceptable
- Example: `data-storage.integration.test.ts`

### 5. Special Cases

#### Test Utilities
- Shared test utilities go in `/src/test-utils/`
- Test utilities have their own `__tests__` directory
- Import using `@test-utils` alias

#### E2E Tests
- End-to-end tests may go in `/e2e/` at project root
- Follow similar naming conventions
- May have different execution requirements

## Migration Guidelines

When refactoring to the new architecture:

### Current Structure (Maintain)
```
src/
├── commands/
│   ├── detect_cms.ts
│   └── __tests__/
│       └── detect_cms.test.ts
```

### Future Structure (Post-Refactoring)
```
src/
├── cli/
│   └── commands/
│       ├── cms/
│       │   ├── detect.ts
│       │   └── __tests__/
│       │       └── detect.test.ts
├── domains/
│   └── cms/
│       ├── services/
│       │   ├── detection.service.ts
│       │   └── __tests__/
│       │       └── detection.service.test.ts
├── workflows/
│   ├── definitions/
│   │   ├── cms-detection.ts
│   │   └── __tests__/
│   │       └── cms-detection.test.ts
│   └── steps/
│       ├── cms/
│       │   ├── robots-txt-analysis.step.ts
│       │   └── __tests__/
│       │       └── robots-txt-analysis.step.test.ts
```

## Benefits of This Approach

1. **Consistency**: Single pattern across entire codebase
2. **Discoverability**: Predictable test locations
3. **Build Simplicity**: Easy to exclude tests from production builds
4. **Clean Source**: Source directories contain only production code
5. **Scalability**: Pattern works for small and large modules

## Anti-Patterns to Avoid

### ❌ Co-located Tests
```
// AVOID
src/
├── module.ts
└── module.test.ts  // Tests mixed with source
```

### ❌ Inconsistent Naming
```
// AVOID
module.spec.ts      // Using .spec instead of .test
moduleTests.ts      // Non-standard naming
test_module.ts      // Underscore naming
```

### ❌ Flat Test Structure
```
// AVOID
__tests__/
├── feature1-handler.test.ts
├── feature1-processor.test.ts
└── feature2-analyzer.test.ts  // No subdirectory organization
```

### ❌ Root-Level Test Directory
```
// AVOID
/tests/             // Separate from source
├── unit/
├── integration/
└── e2e/
```

## Implementation Checklist

When creating new tests:

- [ ] Create `__tests__` directory at the appropriate module level
- [ ] Mirror the source structure within `__tests__`
- [ ] Use correct naming convention (`.test.ts`, `.functional.test.ts`, etc.)
- [ ] Place test file in the correct subdirectory
- [ ] Import test utilities from `@test-utils` if needed
- [ ] Follow the established mock patterns for the test type

## Conclusion

The centralized `__tests__` pattern provides a consistent, scalable approach to test organization. This pattern has proven effective in the current codebase and should be maintained throughout the refactoring process, adapting the structure to match the new architectural layers while preserving the core organizational principles.