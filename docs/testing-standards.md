# Testing Standards and Guidelines

## Skipped Tests Documentation

### Required Format for Skipped Tests

When skipping tests or test suites, ALWAYS include:

1. **Reason for skipping**
2. **Date skipped**
3. **Who skipped it**
4. **Expected resolution timeline**
5. **Ticket/issue reference**

### Format Template

```typescript
/**
 * SKIPPED TEST DOCUMENTATION
 * Reason: [Brief reason - e.g., "Flaky due to file system timing issues"]
 * Date: [YYYY-MM-DD]
 * Skipped by: [Name/GitHub username]
 * Timeline: [Expected resolution - e.g., "Sprint 23", "Q1 2024", "After refactor"]
 * Related: [Issue #123, PR #456, etc.]
 * Notes: [Additional context if needed]
 */
describe.skip('TestSuiteName', () => {
    // Test content...
});
```

### Examples

#### Good Example - Temporary Skip
```typescript
/**
 * SKIPPED TEST DOCUMENTATION
 * Reason: File system operations causing CI failures on Windows
 * Date: 2024-07-10
 * Skipped by: marklummus
 * Timeline: Fix targeted for Sprint 24 (July 2024)
 * Related: Issue #1234 - "Storage tests fail intermittently on Windows CI"
 * Notes: Tests pass locally on macOS/Linux but fail ~30% of time on Windows runners
 */
describe.skip('DataStorage Functional Tests', () => {
    // Test implementation...
});
```

#### Good Example - Architectural Skip
```typescript
/**
 * SKIPPED TEST DOCUMENTATION
 * Reason: Waiting for BrowserManager refactor to complete
 * Date: 2024-07-08
 * Skipped by: teamlead
 * Timeline: Q3 2024 after architecture redesign
 * Related: Epic #567 - "Browser Management Redesign"
 * Notes: Current implementation uses deprecated browser context API
 */
describe.skip('Legacy Browser Integration Tests', () => {
    // Test implementation...
});
```

### Enforcement

1. **Linting Rule**: Add ESLint rule to detect undocumented skips
2. **PR Reviews**: Require explanation in PR description for any new skips
3. **Weekly Review**: Review all skipped tests in team standup
4. **Automated Tracking**: Generate reports of skipped tests with documentation

## Prohibited Patterns

❌ **NEVER DO THIS:**
```typescript
describe.skip('SomeTests', () => {
    // No explanation anywhere
});

// Or just commenting out
// describe('SomeTests', () => {
```

✅ **ALWAYS DO THIS:**
```typescript
/**
 * SKIPPED TEST DOCUMENTATION
 * [Full documentation as above]
 */
describe.skip('SomeTests', () => {
```