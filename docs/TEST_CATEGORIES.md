# Test Categories

As of July 25, 2025, the test suite has been reorganized into categories to improve performance and developer experience.

## Test Categories

### 1. Unit Tests (Default)
- **Command**: `npm test`
- **Description**: Fast unit tests that mock all I/O operations
- **Timeout**: 30 seconds per test
- **Excludes**: `*.performance.test.ts` and `*.integration.test.ts` files

### 2. Integration Tests  
- **Command**: `npm run test:unit-integration`
- **Description**: Tests that use real modules but mock external services
- **Timeout**: 30 seconds per test
- **Includes**: Only `*.integration.test.ts` files

### 3. Performance Tests
- **Command**: `npm run test:performance`
- **Description**: Long-running tests that measure performance with real data
- **Timeout**: 10 minutes per test
- **Includes**: Only `*.performance.test.ts` files

### 4. All Tests
- **Command**: `npm run test:all`
- **Description**: Runs all test categories including performance tests
- **Use Case**: CI/CD pipelines or pre-release validation

## Test File Naming Convention

- `*.test.ts` - Standard unit tests (run by default)
- `*.integration.test.ts` - Integration tests (excluded by default)
- `*.performance.test.ts` - Performance tests (excluded by default)
- `*.functional.test.ts` - Functional tests (run by default)

## Performance Optimization Results

Before reorganization:
- Test suite runtime: 4.5+ minutes
- Included performance tests with 10-minute timeouts
- Loaded 4000+ production data files in many tests

After reorganization:
- Default test suite (`npm test`): ~30 seconds
- Performance tests isolated to run on-demand
- Clear separation of concerns

## Developer Workflow

For daily development:
```bash
npm test           # Run fast unit tests
npm run test:watch # Run tests in watch mode
```

Before committing:
```bash
npm test                    # Ensure unit tests pass
npm run test:unit-integration  # Ensure integration tests pass
```

For CI/CD or release validation:
```bash
npm run test:all   # Run complete test suite
```

## Migration Guide

If you have existing tests that are slow:

1. If the test loads real data files, rename it to `*.integration.test.ts`
2. If the test measures performance, rename it to `*.performance.test.ts`
3. If the test has timeouts > 1 minute, it should be a performance test

## Configuration Details

The test categorization is implemented in:
- `vitest.config.ts` - Uses `TEST_MODE` environment variable
- `package.json` - Defines npm scripts for each category

The configuration automatically excludes performance and integration tests unless explicitly requested.