# Strategy Mock Migration Guide

This guide provides step-by-step instructions for migrating from individual strategy mocks to the centralized strategy mock utilities.

## Migration Overview

**Before**: 12 test files using 3 different strategy mocking patterns
**After**: Centralized strategy mock utilities with type safety and consistency

## Quick Reference

### Import Statement
```typescript
// Replace individual strategy mock imports with:
import { 
    createMockStrategy, 
    createStrategyPageMock, 
    createFailingStrategy,
    expectValidDetectionResult 
} from '@test-utils/mocks/strategies';
```

## Migration Patterns

### Pattern 1: Custom Mock Strategy Class → createMockStrategy()

**Before (base.test.ts, hybrid/detector.test.ts):**
```typescript
class MockDetectionStrategy implements DetectionStrategy {
    constructor(
        private name: string,
        private confidence: number,
        private shouldFail: boolean = false
    ) {}

    getName(): string { return this.name; }
    getTimeout(): number { return 5000; }
    
    async detect(page: DetectionPage, url: string): Promise<PartialDetectionResult> {
        if (this.shouldFail) {
            throw new Error(`${this.name} strategy failed`);
        }
        return {
            confidence: this.confidence,
            method: this.name,
            executionTime: 100
        };
    }
}

const mockStrategy = new MockDetectionStrategy('test-strategy', 0.9);
```

**After:**
```typescript
import { createMockStrategy } from '@test-utils/mocks/strategies';

const mockStrategy = createMockStrategy({
    name: 'test-strategy',
    confidence: 0.9
});
```

### Pattern 2: Real Strategy Testing → createStrategyPageMock()

**Before (meta-tag-strategy.test.ts):**
```typescript
const strategy = new MetaTagStrategy();
const mockPage = {
    evaluate: jest.fn().mockResolvedValue([
        { name: 'generator', content: 'WordPress 6.3' }
    ])
} as any;
```

**After:**
```typescript
import { createStrategyPageMock } from '@test-utils/mocks/strategies';

const strategy = new MetaTagStrategy();
const mockPage = createStrategyPageMock('meta-tag', {
    metaTags: [{ name: 'generator', content: 'WordPress 6.3' }]
});
```

### Pattern 3: Page Mock with Strategy Behavior → Specific Page Factories

**Before (wordpress.test.ts):**
```typescript
const mockPage = createMockPage({
    httpHeaders: { 'x-generator': 'WordPress' },
    evaluateImplementation: (fn: Function) => {
        // Custom evaluation logic
    }
});
```

**After:**
```typescript
import { createStrategyPageMock } from '@test-utils/mocks/strategies';

const mockPage = createStrategyPageMock('http-headers', {
    httpHeaders: { 'x-generator': 'WordPress' }
});
```

## Strategy-Specific Migration Examples

### MetaTagStrategy Tests

**Before:**
```typescript
const mockPage = {
    evaluate: jest.fn().mockImplementation((fn: Function) => {
        const fnStr = fn.toString();
        if (fnStr.includes('meta')) {
            return Promise.resolve([
                { name: 'generator', content: 'WordPress 6.3' }
            ]);
        }
        return Promise.resolve([]);
    })
} as any;
```

**After:**
```typescript
const mockPage = createStrategyPageMock('meta-tag', {
    metaTags: [{ name: 'generator', content: 'WordPress 6.3' }]
});
```

### HttpHeaderStrategy Tests

**Before:**
```typescript
const mockPage = {
    _browserManagerContext: {
        lastNavigation: {
            headers: { 'x-generator': 'WordPress' }
        }
    }
} as any;
```

**After:**
```typescript
const mockPage = createStrategyPageMock('http-headers', {
    httpHeaders: { 'x-generator': 'WordPress' }
});
```

### RobotsTxtStrategy Tests

**Before:**
```typescript
const mockPage = {
    _robotsTxtData: {
        accessible: true,
        content: 'User-agent: *\nDisallow: /wp-admin/',
        patterns: {
            disallowedPaths: ['/wp-admin/'],
            sitemapUrls: []
        }
    }
} as any;
```

**After:**
```typescript
const mockPage = createStrategyPageMock('robots-txt', {
    robotsTxtData: {
        accessible: true,
        content: 'User-agent: *\nDisallow: /wp-admin/',
        patterns: {
            disallowedPaths: ['/wp-admin/'],
            sitemapUrls: []
        }
    }
});
```

## Error Testing Migration

**Before:**
```typescript
const failingStrategy = new MockDetectionStrategy('failing-strategy', 0.7, true);
```

**After:**
```typescript
const failingStrategy = createFailingStrategy('timeout');
// or
const failingStrategy = createMockStrategy({
    name: 'failing-strategy',
    shouldFail: true,
    errorMessage: 'Custom error message'
});
```

## Result Validation Migration

**Before:**
```typescript
expect(result).toBeDefined();
expect(result.confidence).toBeGreaterThan(0);
expect(result.method).toBe('expected-method');
```

**After:**
```typescript
import { expectValidDetectionResult } from '@test-utils/mocks/strategies';

expectValidDetectionResult(result);
expect(result.method).toBe('expected-method');
```

## Complete Example Migration

### Before: base.test.ts
```typescript
class MockDetectionStrategy implements DetectionStrategy {
    // ... implementation
}

describe('BaseDetector', () => {
    it('should aggregate strategy results', async () => {
        const strategy1 = new MockDetectionStrategy('strategy-1', 0.9);
        const strategy2 = new MockDetectionStrategy('strategy-2', 0.8);
        const mockPage = {
            url: jest.fn().mockReturnValue('https://example.com')
        } as any;
        
        const detector = new BaseDetector([strategy1, strategy2]);
        const result = await detector.detect(mockPage, 'https://example.com');
        
        expect(result.confidence).toBeGreaterThan(0);
    });
});
```

### After: base.test.ts
```typescript
import { 
    createMockStrategy, 
    expectValidDetectionResult 
} from '@test-utils/mocks/strategies';
import { createMockPage } from '@test-utils/factories/page-factory';

describe('BaseDetector', () => {
    it('should aggregate strategy results', async () => {
        const strategy1 = createMockStrategy({ name: 'strategy-1', confidence: 0.9 });
        const strategy2 = createMockStrategy({ name: 'strategy-2', confidence: 0.8 });
        const mockPage = createMockPage();
        
        const detector = new BaseDetector([strategy1, strategy2]);
        const result = await detector.detect(mockPage, 'https://example.com');
        
        expectValidDetectionResult(result);
    });
});
```

## File-by-File Migration Checklist

### High Priority Files
- [ ] `src/utils/cms/__tests__/detectors/base.test.ts`
- [ ] `src/utils/cms/__tests__/hybrid/detector.test.ts`
- [ ] `src/utils/cms/__tests__/analysis/collector.test.ts`
- [ ] `src/utils/cms/__tests__/timeout-retry.test.ts`

### Medium Priority Files
- [ ] `src/utils/cms/__tests__/strategies/meta-tag-strategy.test.ts`
- [ ] `src/utils/cms/__tests__/strategies/http-headers.test.ts`
- [ ] `src/utils/cms/__tests__/strategies/robots-txt.test.ts`
- [ ] `src/utils/cms/__tests__/strategies/api-endpoint.test.ts`
- [ ] `src/utils/cms/__tests__/strategies/html-content.test.ts`

### Low Priority Files
- [ ] `src/utils/cms/__tests__/detectors/wordpress.test.ts`
- [ ] `src/utils/cms/__tests__/detectors/drupal.test.ts`
- [ ] `src/utils/cms/__tests__/detectors/joomla.test.ts`

## Testing Migration

After each file migration:

1. **Run the specific test file**:
   ```bash
   npm test path/to/test/file.test.ts
   ```

2. **Check for TypeScript errors**:
   ```bash
   npm run build
   ```

3. **Run full test suite** (after all migrations):
   ```bash
   npm test
   ```

## Common Migration Issues

### Issue 1: Type Errors with Page Mocks
**Problem**: `Property '_robotsTxtData' does not exist on type 'DetectionPage'`
**Solution**: Use `any` type for strategy-specific page mocks:
```typescript
const mockPage = createStrategyPageMock('robots-txt', data) as any;
```

### Issue 2: Missing Strategy-Specific Data
**Problem**: Strategy tests failing due to missing page data
**Solution**: Ensure correct strategy type and data structure:
```typescript
// For MetaTagStrategy
createStrategyPageMock('meta-tag', { metaTags: [...] })

// For HttpHeaderStrategy  
createStrategyPageMock('http-headers', { httpHeaders: {...} })

// For RobotsTxtStrategy
createStrategyPageMock('robots-txt', { robotsTxtData: {...} })
```

### Issue 3: Test Timeouts
**Problem**: Tests hanging due to mock timing issues
**Solution**: Use immediate mock resolutions:
```typescript
const mockStrategy = createMockStrategy({
    executionTime: 0 // Immediate resolution
});
```

## Benefits After Migration

1. **Type Safety**: Full TypeScript support with proper interfaces
2. **Consistency**: Standardized mocking patterns across all tests
3. **Maintainability**: Single source of truth for strategy mocks
4. **Error Testing**: Built-in error simulation capabilities
5. **Strategy-Specific**: Proper page mock requirements for each strategy
6. **Validation**: Automated result validation helpers

## Support

If you encounter issues during migration:
1. Check the strategy mock consolidation report
2. Review existing migrated test files as examples
3. Ensure proper import statements
4. Verify strategy-specific page mock data structures