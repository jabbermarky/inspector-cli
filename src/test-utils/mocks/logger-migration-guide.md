# Logger Mock Migration Guide

This guide shows how to migrate test files from individual logger mocks to the centralized logger mock utility.

## Benefits of Migration

1. **Consistency**: All tests use the same logger mock implementation
2. **Complete Interface**: Includes all ModuleLogger methods (debug, info, warn, error, apiCall, apiResponse, performance)
3. **Type Safety**: Proper TypeScript types for better IDE support
4. **Helper Functions**: Built-in assertion helpers and reset utilities

## Migration Steps

### 1. Remove Old Logger Mock

**Before:**
```typescript
jest.mock('../../utils/logger.js', () => ({
    createModuleLogger: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }))
}));
```

**After:**
```typescript
import { jest } from '@jest/globals';

// Mock logger BEFORE any other imports
jest.mock('../../utils/logger.js', () => ({
    createModuleLogger: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        apiCall: jest.fn(),
        apiResponse: jest.fn(),
        performance: jest.fn()
    }))
}));
```

### 2. Update Logger References

**Before:**
```typescript
import { createModuleLogger } from '../../utils/logger.js';
const logger = createModuleLogger('test');
```

**After:**
```typescript
import { getLoggerMock } from '@test-utils/mocks/logger';
const logger = getLoggerMock();
```

### 3. Reset Mocks in beforeEach

**Before:**
```typescript
beforeEach(() => {
    jest.clearAllMocks();
});
```

**After:**
```typescript
import { resetLoggerMocks } from '@test-utils/mocks/logger';

beforeEach(() => {
    resetLoggerMocks();
    // Other reset logic...
});
```

### 4. Use Helper Assertions

**New capability:**
```typescript
import { expectNoLoggerErrors, expectLoggerCalls } from '@test-utils/mocks/logger';

test('should log appropriately', () => {
    // Your test logic...
    
    // Verify no errors were logged
    expectNoLoggerErrors(logger);
    
    // Verify specific log levels were called
    expectLoggerCalls(logger, {
        info: 2,    // info was called twice
        debug: 1,   // debug was called once
        error: 0    // error was not called
    });
});
```

## Complete Example Migration

### Original Test File

```typescript
import { jest } from '@jest/globals';
import { MyClass } from '../my-class.js';

jest.mock('../../utils/logger.js', () => ({
    createModuleLogger: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }))
}));

describe('MyClass', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    
    test('should log info message', () => {
        const instance = new MyClass();
        instance.doSomething();
        
        // No easy way to verify logger calls
    });
});
```

### Migrated Test File

```typescript
import { jest } from '@jest/globals';
import { MyClass } from '../my-class.js';
import { 
    setupLoggerMock, 
    resetLoggerMocks, 
    getLoggerMock,
    expectNoLoggerErrors 
} from '@test-utils/mocks/logger';

// Setup logger mock once at the top
setupLoggerMock();

describe('MyClass', () => {
    const logger = getLoggerMock();
    
    beforeEach(() => {
        resetLoggerMocks();
    });
    
    test('should log info message', () => {
        const instance = new MyClass();
        instance.doSomething();
        
        // Now we can easily verify logger behavior
        expect(logger.info).toHaveBeenCalledWith('Something happened');
        expectNoLoggerErrors(logger);
    });
});
```

## Files to Migrate

The following test files currently have individual logger mocks that should be migrated:

1. `src/commands/__tests__/detect_cms.test.ts`
2. `src/utils/__tests__/config.test.ts`
3. `src/utils/__tests__/retry.test.ts`
4. `src/utils/browser/__tests__/index.test.ts`
5. `src/utils/browser/__tests__/manager.test.ts`
6. `src/utils/browser/__tests__/semaphore.test.ts`
7. `src/utils/cms/__tests__/analysis/collector.test.ts`
8. `src/utils/cms/__tests__/detectors/base.test.ts`
9. `src/utils/cms/__tests__/detectors/drupal.test.ts`
10. `src/utils/cms/__tests__/detectors/joomla.test.ts`
11. `src/utils/cms/__tests__/detectors/wordpress.test.ts`
12. `src/utils/cms/__tests__/hybrid/detector.test.ts`
13. `src/utils/cms/__tests__/strategies/api-endpoint.test.ts`
14. `src/utils/cms/__tests__/strategies/http-headers.test.ts`
15. `src/utils/cms/__tests__/strategies/robots-txt.test.ts`
16. `src/utils/cms/__tests__/timeout-retry.test.ts`
17. `src/utils/screenshot/__tests__/service.test.ts`
18. `src/utils/screenshot/__tests__/validation.test.ts`
19. `src/utils/file/__tests__/operations.test.ts`
20. `src/utils/url/__tests__/index.test.ts`
21. `src/utils/url/__tests__/validator.test.ts`

## Notes

- The logger mock is automatically created when `setupLoggerMock()` is called
- All logger method calls are automatically mocked with `jest.fn()`
- The mock includes all methods from ModuleLogger: debug, info, warn, error, apiCall, apiResponse, performance
- Use `@test-utils` import alias for cleaner imports (configured in tsconfig.json)