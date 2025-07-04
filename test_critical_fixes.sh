#!/bin/bash

# Test Script for Inspector CLI Critical Fixes
# Tests the 4 major fixes: API key security, race conditions, error handling, and path validation

# Note: We don't use 'set -e' because we need to handle expected test failures

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Utility functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_TESTS++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_TESTS++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"  # "success" or "failure"
    
    ((TOTAL_TESTS++))
    log_info "Running test: $test_name"
    
    if [ "$expected_result" = "success" ]; then
        if eval "$test_command" >/dev/null 2>&1; then
            log_success "$test_name"
        else
            log_error "$test_name - Expected success but got failure"
        fi
    else
        if eval "$test_command" >/dev/null 2>&1; then
            log_error "$test_name - Expected failure but got success"
        else
            log_success "$test_name"
        fi
    fi
}

cleanup_test_files() {
    log_info "Cleaning up test files..."
    rm -f test_*.csv *.png test_image.png 2>/dev/null || true
    rm -rf test_scrapes 2>/dev/null || true
}

# Setup
setup_tests() {
    log_info "Setting up test environment..."
    
    # Backup original .env if it exists
    if [ -f .env ]; then
        cp .env .env.backup
    fi
    
    # Create test directories
    mkdir -p scrapes test_scrapes
    
    # Build the project
    log_info "Building project..."
    npm run build || {
        log_error "Failed to build project"
        exit 1
    }
}

# Test 1: API Key Security
test_api_key_security() {
    echo -e "\n${BLUE}=== Testing API Key Security ===${NC}"
    
    # Backup current environment and .env file
    ORIGINAL_KEY="${OPENAI_API_KEY:-}"
    if [ -f .env ]; then
        cp .env .env.backup.test
        mv .env .env.temp.test
    fi
    
    # Test 1.1: Missing API key
    unset OPENAI_API_KEY
    run_test "Missing API key" "timeout 10s node dist/index.js assistants" "failure"
    
    # Test 1.2: Empty API key
    export OPENAI_API_KEY=""
    run_test "Empty API key" "timeout 10s node dist/index.js assistants" "failure"
    
    # Test 1.3: Invalid API key format
    export OPENAI_API_KEY="invalid-key"
    if timeout 10s node dist/index.js assistants 2>&1 | grep -q "Error\|error\|AuthenticationError"; then
        log_success "Invalid API key format"
        ((PASSED_TESTS++))
    else
        log_error "Invalid API key format - Expected error but got success"
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))
    
    # Test 1.4: API key from .env file
    echo "OPENAI_API_KEY=test-key-from-env" > .env
    unset OPENAI_API_KEY
    if timeout 5s node dist/index.js assistants 2>&1 | grep -q "Error\|error\|AuthenticationError"; then
        log_success "API key from .env file"
        ((PASSED_TESTS++))
    else
        log_error "API key from .env file - Expected error but got success"
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))
    
    # Restore original key
    if [ -n "$ORIGINAL_KEY" ]; then
        export OPENAI_API_KEY="$ORIGINAL_KEY"
    else
        unset OPENAI_API_KEY
    fi
    
    # Restore .env
    if [ -f .env.temp.test ]; then
        mv .env.temp.test .env
    elif [ -f .env.backup.test ]; then
        mv .env.backup.test .env
    fi
}

# Test 2: CSV Race Condition Fix
test_csv_race_condition() {
    echo -e "\n${BLUE}=== Testing CSV Race Condition Fix ===${NC}"
    
    # Test 2.1: Valid CSV with multiple URLs
    cat > test_valid.csv << EOF
url,path
https://httpbin.org/delay/1,delay1
https://httpbin.org/delay/1,delay2
https://httpbin.org/delay/1,delay3
EOF
    
    run_test "Valid CSV processing" "timeout 30s node dist/index.js csv test_valid.csv" "success"
    
    # Test 2.2: Mixed valid/invalid URLs
    cat > test_mixed.csv << EOF
url,path
https://google.com,good1
not-a-url,bad1
https://github.com,good2
EOF
    
    run_test "Mixed valid/invalid URLs" "timeout 30s node dist/index.js csv test_mixed.csv" "success"
    
    # Test 2.3: Server error responses
    cat > test_errors.csv << EOF
url,path
https://mock.httpstatus.io/500,error500
https://mock.httpstatus.io/404,error404
https://google.com,good
EOF
    
    run_test "Server error responses" "timeout 30s node dist/index.js csv test_errors.csv" "success"
    
    # Test 2.4: Nonexistent CSV file
    run_test "Nonexistent CSV file" "node dist/index.js csv nonexistent.csv" "failure"
}

# Test 3: Error Handling & Resource Cleanup
test_error_handling() {
    echo -e "\n${BLUE}=== Testing Error Handling & Resource Cleanup ===${NC}"
    
    # Test 3.1: Invalid URL
    run_test "Invalid URL screenshot" "node dist/index.js screenshot 'not-a-url' test_error" "failure"
    
    # Test 3.2: Valid URL screenshot
    run_test "Valid URL screenshot" "timeout 30s node dist/index.js screenshot https://httpbin.org/html simple_test" "success"
    
    # Test 3.3: Server error URL
    run_test "Server error URL" "timeout 30s node dist/index.js screenshot https://mock.httpstatus.io/500 error_test" "success"
    
    # Test 3.4: Slow response
    run_test "Slow response handling" "timeout 15s node dist/index.js screenshot https://mock.httpstatus.io/200?sleep=3000 slow_test" "success"
    
    # Test 3.5: Check for resource leaks
    log_info "Checking for resource leaks..."
    BEFORE_PROCESSES=$(ps aux | grep -c "chrome\|puppeteer" || echo "0")
    timeout 30s node dist/index.js screenshot https://httpbin.org/html cleanup_test >/dev/null 2>&1 || true
    sleep 2
    AFTER_PROCESSES=$(ps aux | grep -c "chrome\|puppeteer" || echo "0")
    
    if [ "$AFTER_PROCESSES" -le "$BEFORE_PROCESSES" ]; then
        log_success "No resource leaks detected"
        ((PASSED_TESTS++))
    else
        log_error "Potential resource leak detected"
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))
}

# Test 4: File Path Validation
test_path_validation() {
    echo -e "\n${BLUE}=== Testing File Path Validation ===${NC}"
    
    # Test 4.1: Valid paths
    run_test "Valid simple path" "timeout 30s node dist/index.js screenshot https://httpbin.org/html valid_name" "success"
    run_test "Valid nested path" "timeout 30s node dist/index.js screenshot https://httpbin.org/html scrapes/valid_nested" "success"
    
    # Test 4.2: Directory traversal attempts
    run_test "Directory traversal with .." "node dist/index.js screenshot https://httpbin.org/html '../../../etc/passwd'" "failure"
    run_test "Directory traversal with ~" "node dist/index.js screenshot https://httpbin.org/html '~/private/file'" "failure"
    
    # Test 4.3: Unsafe characters
    run_test "Unsafe characters semicolon" "node dist/index.js screenshot https://httpbin.org/html 'test;rm -rf /'" "failure"
    run_test "Unsafe characters pipe" "node dist/index.js screenshot https://httpbin.org/html 'test|command'" "failure"
    run_test "Unsafe characters script" "node dist/index.js screenshot https://httpbin.org/html 'test<script>'" "failure"
    
    # Test 4.4: Empty/invalid paths
    run_test "Empty path" "node dist/index.js screenshot https://httpbin.org/html ''" "failure"
    run_test "Space-only path" "node dist/index.js screenshot https://httpbin.org/html ' '" "failure"
    
    # Test 4.5: Footer command path validation (if we have a test image)
    # Create a small test image first
    if command -v convert >/dev/null 2>&1; then
        convert -size 100x100 xc:white test_image.png 2>/dev/null || true
        if [ -f test_image.png ]; then
            run_test "Footer valid image" "node dist/index.js footer test_image.png --header=50 --footer=50" "success"
            run_test "Footer directory traversal" "node dist/index.js footer '../../../etc/passwd' --header=50" "failure"
            run_test "Footer nonexistent file" "node dist/index.js footer nonexistent.png --header=50" "failure"
            run_test "Footer invalid dimensions" "node dist/index.js footer test_image.png --header=-50" "failure"
            run_test "Footer zero dimensions" "node dist/index.js footer test_image.png --header=0 --footer=0" "failure"
        fi
    else
        log_warning "ImageMagick not available, skipping footer image tests"
    fi
}

# Test 5: Integration & Stress Tests
test_integration() {
    echo -e "\n${BLUE}=== Testing Integration Scenarios ===${NC}"
    
    # Test 5.1: Large CSV processing
    cat > test_large.csv << EOF
url,path
https://httpbin.org/html,test1
https://mock.httpstatus.io/200,test2
https://mock.httpstatus.io/301,test3
https://mock.httpstatus.io/404,test4
https://httpbin.org/json,test5
EOF
    
    run_test "Large CSV processing" "timeout 60s node dist/index.js csv test_large.csv" "success"
    
    # Test 5.2: Various HTTP status codes
    cat > test_status_codes.csv << EOF
url,path
https://mock.httpstatus.io/200,success
https://mock.httpstatus.io/301,redirect
https://mock.httpstatus.io/404,not_found
https://mock.httpstatus.io/500,server_error
EOF
    
    run_test "Various HTTP status codes" "timeout 45s node dist/index.js csv test_status_codes.csv" "success"
    
    # Test 5.3: Response timing tests
    cat > test_timing.csv << EOF
url,path
https://mock.httpstatus.io/200?sleep=1000,delay_1s
https://mock.httpstatus.io/200?sleep=2000,delay_2s
EOF
    
    run_test "Response timing tests" "timeout 30s node dist/index.js csv test_timing.csv" "success"
}

# Main test execution
main() {
    echo -e "${BLUE}Inspector CLI Critical Fixes Test Suite${NC}"
    echo -e "${BLUE}========================================${NC}\n"
    
    setup_tests
    
    test_api_key_security
    test_csv_race_condition
    test_error_handling
    test_path_validation
    test_integration
    
    cleanup_test_files
    
    # Final report
    echo -e "\n${BLUE}=== Test Results ===${NC}"
    echo -e "Total tests: $TOTAL_TESTS"
    echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
    echo -e "${RED}Failed: $FAILED_TESTS${NC}"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All tests passed!${NC}"
        exit 0
    else
        echo -e "\n${RED}❌ Some tests failed.${NC}"
        exit 1
    fi
}

# Handle script interruption
trap 'cleanup_test_files; exit 1' INT TERM

# Run main function
main "$@"