# Testing Principles: "Only Mock What You Own"

## The Principle

**Only mock modules and dependencies that your team owns and controls.**

### ❌ DON'T Mock:
- Third-party libraries (`puppeteer`, `axios`, `lodash`)
- Node.js built-in modules (`fs`, `path`, `crypto`)
- Browser APIs (`fetch`, `localStorage`, `navigator`)
- External services/APIs

### ✅ DO Mock:
- Your own modules and utilities
- Your own service classes
- Your own adapters/wrappers

## Why This Matters

### Problems with Mocking External Code:

1. **Assumes Implementation Knowledge**: You're guessing how the external library works
2. **Brittle Tests**: Tests break when the external library updates
3. **False Confidence**: Tests pass but real integration fails
4. **Maintenance Burden**: Must update mocks when libraries change

### Example - WRONG Approach:

```typescript
// ❌ BAD: Mocking puppeteer directly
jest.mock('puppeteer', () => ({
  launch: jest.fn(() => ({
    newPage: jest.fn(() => ({
      goto: jest.fn(),
      evaluate: jest.fn()
    }))
  }))
}));
```

**Problems:**
- Assumes puppeteer's API structure
- Will break if puppeteer changes
- Doesn't test real browser interactions

### Example - CORRECT Approach:

```typescript
// ✅ GOOD: Create your own browser adapter
export class BrowserAdapter {
  async createPage(url: string): Promise<Page> {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);
    return page;
  }
}

// ✅ GOOD: Mock your own adapter
jest.mock('../browser-adapter.js', () => ({
  BrowserAdapter: jest.fn().mockImplementation(() => ({
    createPage: jest.fn()
  }))
}));
```

## Better Testing Strategies

### 1. Dependency Injection

```typescript
// Instead of:
class DataCollector {
  async collect(url: string) {
    const browser = await puppeteer.launch(); // Hard dependency
  }
}

// Do this:
class DataCollector {
  constructor(private browserManager: BrowserManager) {}
  
  async collect(url: string) {
    const page = await this.browserManager.createPage(url); // Injected dependency
  }
}
```

### 2. Adapter Pattern

```typescript
// Create adapters for external dependencies
export class FileSystemAdapter {
  async readFile(path: string): Promise<string> {
    return fs.readFile(path, 'utf8');
  }
  
  async writeFile(path: string, content: string): Promise<void> {
    return fs.writeFile(path, content);
  }
}

// Mock your adapter, not fs
jest.mock('../file-system-adapter.js');
```

### 3. Integration Tests

For external dependencies, use integration tests:

```typescript
// integration-tests/browser.test.ts
describe('Browser Integration', () => {
  it('should actually launch browser and navigate', async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://example.com');
    
    const title = await page.title();
    expect(title).toBeTruthy();
    
    await browser.close();
  });
});
```

## Our Current Implementation

### What We Mock (Correctly):

```typescript
// ✅ Our own URL utilities
jest.mock('../../../url/index.js', () => ({
  validateAndNormalizeUrl: jest.fn(),
  createValidationContext: jest.fn()
}));

// ✅ Our own logger
jest.mock('../../../logger.js', () => ({
  createModuleLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn()
  }))
}));
```

### What We Don't Mock (Correctly):

We don't mock `puppeteer` directly. Instead:
- We inject `BrowserManager` (our adapter)
- We mock our `BrowserManager` class
- Integration tests verify real browser behavior

## Guidelines for This Project

1. **Mock your own modules freely** - they're under your control
2. **Create adapters for external dependencies** - then mock the adapters
3. **Use factory functions** from `@test-utils` for consistent mocking
4. **Write integration tests** for external library interactions
5. **Test boundaries, not implementations** - focus on inputs/outputs

## Exception: When You Can Mock External Code

**Limited cases where mocking external code is acceptable:**

1. **Global browser APIs in browser tests** (with care)
2. **Node.js built-ins for error simulation** (fs errors, network errors)
3. **Time/date functions** for deterministic testing

**Even then, prefer abstractions:**

```typescript
// Better: Create a time service
export class TimeService {
  now(): Date {
    return new Date();
  }
}

// Mock the service, not Date directly
jest.mock('../time-service.js');
```

This approach makes tests more maintainable, reliable, and valuable.