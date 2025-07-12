# Test Troubleshooting Workflow

*Reference this workflow whenever tests fail to avoid random debugging and ensure systematic problem resolution.*

## Problem-Solving Log Template

**Always maintain a log with this structure:**

```
Problem: [Brief description of failing test(s)]

Approach X: [What you tried]
- Result: [What happened]
- Evidence: [Console output, error messages, test results]
- Hypothesis for failure: [Why you think it failed]
- Time spent: [Track to avoid endless rabbit holes]

Analysis: [After multiple approaches, analyze patterns]
Root Cause: [Final determination]
Solution: [What actually fixed it]
```

## Phase 1: Foundation Verification (5-10 minutes)

### Step 1.1: Mock Verification Checklist
Before debugging complex logic, verify ALL mocks work:

```typescript
// Create simple verification tests
it('debug: verify mock functions are called', () => {
    // Test each mock individually
    expect(vi.isMockFunction(mockFunction)).toBe(true);
    
    // Call mock and verify it returns expected value
    const result = mockFunction(testInput);
    expect(result).toBeDefined();
    expect(mockFunction).toHaveBeenCalledWith(testInput);
});
```

**Critical checks:**
- [ ] Are mocks actually being called? (use console.log in mock implementation)
- [ ] Do mocks return the expected data types? (object, string, number, undefined)
- [ ] Are async mocks properly returning promises?

### Step 1.2: Unit Component Testing
Test the smallest possible unit in isolation:

```typescript
// Test individual functions/strategies before testing integrations
it('debug: test individual component', async () => {
    const component = new ComponentUnderTest();
    const result = await component.method(mockDependencies);
    
    console.log('Component result:', result);
    expect(result).toBeDefined();
    expect(result).toHaveProperty('expectedProperty');
});
```

### Step 1.3: Integration Point Mapping
Document all integration points between mocked and real code:
- Where does real code call mocked dependencies?
- What data flows between components?
- Which components wrap others (like withRetry wrapper)?

## Phase 2: Systematic Hypothesis Testing (15-20 minutes)

### Step 2.1: Bottom-Up Debugging Pyramid

```
Individual Functions/Mocks (withRetry, logger, etc.)
    ↓
Individual Components (single strategies)
    ↓
Component Collections (Promise.allSettled of strategies)
    ↓
Full Integration (complete detector)
```

**Rule**: Never move up the pyramid until the current level is proven working.

### Step 2.2: Contradiction Seeking
Actively look for evidence that contradicts your current hypothesis:

```typescript
// If you think "all strategies fail", test this assumption:
it('debug: test individual strategies work', async () => {
    for (const strategy of strategies) {
        const result = await strategy.detect(mockPage, url);
        console.log(`${strategy.getName()}:`, result ? 'WORKS' : 'FAILS');
        expect(result).toBeDefined(); // This should pass if strategies work
    }
});
```

**Key questions:**
- If the integration fails, do the individual components work?
- If individual components work, what's different about the integration?
- What assumptions am I making that could be wrong?

### Step 2.3: One Variable Testing
Change only ONE thing between test iterations:

```typescript
// Version 1: Test with real functions
const result1 = await realFunction(input);

// Version 2: Test with mocked functions (change only the function)
const result2 = await mockFunction(input);

// Compare results to isolate the variable causing issues
```

### Step 2.4: Pattern Elimination
For each failed approach, document:
- What specifically was changed
- What error/behavior resulted
- Why this eliminates certain root causes

## Phase 3: Pattern Application (5-10 minutes)

### Step 3.1: Solution Generalization
Once a fix works for one test:

```typescript
// Test the pattern on similar components
it('verify solution pattern works elsewhere', async () => {
    // Apply same mock pattern to similar test
    // Verify it produces same successful result
});
```

### Step 3.2: Root Cause Documentation
Update problem-solving log with:
- **Root Cause**: The actual technical issue (e.g., "withRetry mock not returning function result")
- **Solution Pattern**: The fix that can be reused (e.g., "use `return await fn()` in async mocks")
- **Detection Method**: How to identify this issue in the future (e.g., "individual components work but integration fails")

## Common Anti-Patterns to Avoid

### ❌ Don't Do This:
1. **Random Approach Switching**: Trying completely different approaches without understanding why previous ones failed
2. **Complex First**: Starting with full integration tests instead of unit tests
3. **Assumption-Based Debugging**: Assuming complex root causes without testing simple ones
4. **Mock Neglect**: Not verifying mocks work before testing business logic
5. **Pattern Ignore**: Not applying proven patterns to similar problems

### ✅ Do This Instead:
1. **Systematic Progression**: Each approach should build on learnings from the previous
2. **Simple First**: Start with the most basic unit and work up
3. **Evidence-Based**: Test assumptions and seek contradictory evidence
4. **Mock Verification**: Always verify mocks work as expected first
5. **Pattern Reuse**: Apply proven solutions to similar problems

## Emergency Debugging Checklist

When completely stuck, run through this checklist:

1. **[ ] Are my mocks actually being called?** (Add console.log to verify)
2. **[ ] Do individual components work in isolation?** (Test each separately)
3. **[ ] Is the issue in integration or individual components?** (Compare isolated vs integrated results)
4. **[ ] Am I testing the right thing?** (Read the actual implementation being tested)
5. **[ ] Have I tried the simplest possible solution?** (Often it's a one-line fix)

## Template for Next Problem

```typescript
describe('Debug: [Problem Description]', () => {
    it('1. verify mocks work', () => {
        // Test each mock individually
    });
    
    it('2. test individual components', async () => {
        // Test smallest unit in isolation
    });
    
    it('3. test integration points', async () => {
        // Test where components connect
    });
    
    it('4. test full integration', async () => {
        // Test complete flow
    });
});
```

## Success Criteria

A troubleshooting session is successful when:
- [ ] Root cause is identified and documented
- [ ] Solution pattern is established and reusable
- [ ] Problem-solving log shows systematic progression (no repeated approaches)
- [ ] Fix can be confidently applied to similar problems
- [ ] Time spent is proportional to problem complexity (don't spend hours on simple issues)

## Proven Solution Patterns

### Pattern 1: withRetry Mock Issue
**Problem**: Tests fail with "Cannot read properties of undefined (reading 'confidence')"
**Root Cause**: withRetry mock not returning function result
**Solution**:
```typescript
vi.mock('../../../retry.js', () => ({
    withRetry: async (fn: any) => {
        return await fn(); // CRITICAL: must return the result
    }
}));
```

### Pattern 2: Strategy Mock Verification
**Problem**: Individual strategies work but detector fails
**Detection**: Test strategies in isolation vs through detector
**Solution**: Check integration layer (wrappers, Promise.allSettled, etc.)

### Pattern 3: Async Mock Return Values
**Problem**: Async mocks returning undefined
**Solution**: Always use `return await` not just `await` in mock implementations

### Pattern 4: Functional Test Over-Mocking
**Problem**: Functional tests failing with module export errors despite mocks being correct
**Root Cause**: Functional tests are over-mocking business logic modules, causing validation failures
**Detection**: Error messages like "No 'createValidationContext' export is defined on mock" for internal modules
**Solution**: Functional Test Minimal Mocking Pattern
```typescript
// ❌ WRONG: Mock business logic modules in functional tests
vi.mock('../../url/index.js', () => ({ ... }));

// ✅ RIGHT: Only mock external dependencies
vi.mock('../../../browser/index.js', () => ({ ... })); // External dependency
vi.mock('../../../logger.js', () => ({ ... }));        // External dependency
// NO URL module mock - use real business logic

describe('Functional: Component', () => {
    beforeEach(() => {
        vi.clearAllMocks(); // Only clear mocks, NO vi.resetModules()
    });
    // ... rest of test
});
```

**Key Principle**: 
- **Unit Tests**: Mock everything except the unit under test
- **Functional Tests**: Only mock external dependencies (browser, network, filesystem), use real business logic

---

**Remember**: Most test failures have simple root causes. Complex symptoms usually indicate issues in foundational components (mocks, basic functions) rather than business logic.