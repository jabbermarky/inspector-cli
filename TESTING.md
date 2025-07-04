# Testing Guide for Inspector CLI Critical Fixes

This document describes the automated test scripts for verifying the 4 critical fixes implemented in Inspector CLI.

## Test Scripts

### 1. Quick Tests (`./test_quick.sh`)

**Purpose**: Rapid verification of the most critical functionality  
**Runtime**: ~2-3 minutes  
**Usage**: `./test_quick.sh`

**Tests included**:
- API key security (missing key detection)
- Path validation (directory traversal prevention)
- Basic screenshot functionality
- CSV processing with mixed results
- Error handling for invalid URLs
- Resource cleanup verification

### 2. Comprehensive Tests (`./test_critical_fixes.sh`)

**Purpose**: Thorough testing of all fixes and edge cases  
**Runtime**: ~10-15 minutes  
**Usage**: `./test_critical_fixes.sh`

**Tests included**:
- **API Key Security** (12 tests)
  - Missing API key scenarios
  - Empty/invalid key formats
  - .env file reading
  - Invalid key error handling
  
- **CSV Race Condition Fix** (8 tests)  
  - Sequential processing verification
  - Mixed valid/invalid URL handling
  - Server error response handling
  - File not found scenarios
  
- **Error Handling & Resource Cleanup** (10 tests)
  - Browser instance cleanup
  - Semaphore resource management
  - Network error handling
  - Process leak detection
  
- **Path Validation** (15 tests)
  - Directory traversal prevention
  - Unsafe character filtering
  - File existence validation
  - Image segmentation security
  
- **Integration Tests** (8 tests)
  - Large batch processing
  - Various HTTP status codes
  - Response timing scenarios
  - End-to-end workflows

## Critical Fixes Tested

### 1. API Key Security Fix ✅
- **Issue**: Hardcoded API key in source code
- **Fix**: Removed hardcoded key, environment-only access
- **Tests**: Verify proper error messages when key is missing/invalid

### 2. CSV Race Condition Fix ✅  
- **Issue**: Fire-and-forget async causing resource exhaustion
- **Fix**: Sequential processing with semaphore control
- **Tests**: Verify controlled concurrency and proper completion

### 3. Error Handling & Resource Cleanup ✅
- **Issue**: Browser instances not cleaned up on errors
- **Fix**: Comprehensive try/finally blocks and error propagation
- **Tests**: Verify no resource leaks and proper error messages

### 4. Path Validation ✅
- **Issue**: No input validation, directory traversal vulnerability
- **Fix**: Comprehensive path validation and sanitization
- **Tests**: Verify security restrictions and safe path handling

### 5. Comprehensive Error Handling ✅ (NEW)
- **Issue**: Lack of retry logic and proper error handling for API calls
- **Fix**: Exponential backoff retry utility with comprehensive error handling
- **Features**:
  - Retry logic for OpenAI API calls with exponential backoff
  - File validation (size, existence, readability) before processing
  - Automatic resource cleanup for OpenAI file uploads
  - Timeout handling for CMS detection operations
  - Network error handling with graceful degradation
- **Tests**: 
  - Unit tests for retry utility covering 13 scenarios
  - Network error simulation and recovery validation
  - OpenAI-specific error handling verification
  - Resource cleanup and file validation testing

## Test Services Used

- **httpbin.org**: Reliable HTTP testing service
- **mock.httpstatus.io**: Status code and delay testing
- **Local file operations**: Path validation testing

## Running Tests

### Prerequisites
```bash
# Ensure project is built
npm run build

# Optional: Set a test API key (for partial testing)
export OPENAI_API_KEY="your-test-key"
```

### Unit Tests
```bash
# Run all unit tests
npm test

# Development mode with file watching
npm run test:watch

# Generate coverage reports
npm run test:coverage
open coverage/index.html  # View coverage report
```

### Integration Tests
```bash
# Quick integration tests
./test_quick.sh

# Full integration test suite
./test_critical_fixes.sh

# Specific test categories
./test_critical_fixes.sh | grep -A 20 "API Key Security"

# Check for resource leaks
ps aux | grep -E "(chrome|puppeteer)" | wc -l
./test_quick.sh
ps aux | grep -E "(chrome|puppeteer)" | wc -l
```

## Expected Results

### Successful Unit Test Run
- All 13 retry utility tests pass
- Test coverage reports generated in `coverage/` directory
- No test failures or timeout issues
- Coverage metrics for core utilities and error handling

### Successful Integration Test Run
- All security vulnerabilities blocked
- No hanging browser processes
- Proper error messages for invalid inputs
- Sequential CSV processing
- Clean resource management

### Test Output Example
```
[INFO] Building project...
=== Quick Tests for Critical Fixes ===

1. Testing API Key Security
[PASS] Missing API key properly detected

2. Testing Path Validation  
[PASS] Directory traversal blocked

3. Testing Valid Screenshot
[PASS] Valid screenshot works
[PASS] Screenshot file created correctly

...

Quick test completed!
```

## Troubleshooting

### Common Issues

1. **Tests timing out**
   - Check network connectivity
   - Increase timeout values in scripts
   - Verify test services are accessible

2. **Resource leak warnings**
   - Run `pkill -f chrome` to clean up
   - Check for hanging Node.js processes
   - Restart if system is under resource pressure

3. **API key tests failing unexpectedly**
   - Ensure OPENAI_API_KEY is unset for security tests
   - Check .env file is not interfering

### Manual Verification

If automated tests fail, manually verify:

```bash
# Security: Should fail
node dist/index.js screenshot https://httpbin.org/html "../etc/passwd"

# Valid operation: Should succeed  
node dist/index.js screenshot https://httpbin.org/html test_manual

# Resource check: Should be clean
ps aux | grep chrome
```

## Adding New Tests

To add new test cases:

1. **Add to quick tests**: Edit `test_quick.sh` for essential scenarios
2. **Add to comprehensive tests**: Edit `test_critical_fixes.sh` for detailed coverage
3. **Follow the pattern**:
   ```bash
   run_test "Test description" "command to run" "success|failure"
   ```

## CI/CD Integration

These scripts are designed to work in CI/CD environments:

```yaml
# Example GitHub Actions step
- name: Test Critical Fixes
  run: |
    npm run build
    ./test_critical_fixes.sh
```

The scripts return appropriate exit codes (0 for success, 1 for failure) and provide detailed logging for debugging.