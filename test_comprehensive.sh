#!/bin/bash

# Comprehensive Test Script for Inspector CLI Critical Fixes
# Optimized version with shorter timeouts and more reliable tests

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $1"; ((PASSED_TESTS++)); }
log_error() { echo -e "${RED}[FAIL]${NC} $1"; ((FAILED_TESTS++)); }

run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
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
    rm -f test_*.csv *.png test_image.png 2>/dev/null || true
}

echo -e "${BLUE}Inspector CLI Comprehensive Test Suite${NC}"
echo -e "${BLUE}=====================================${NC}\n"

# Build project
log_info "Building project..."
npm run build || { log_error "Failed to build project"; exit 1; }

# Test 1: API Key Security
echo -e "\n${BLUE}=== Testing API Key Security ===${NC}"

# Backup and hide .env file
if [ -f .env ]; then
    mv .env .env.temp.test
fi
unset OPENAI_API_KEY

# Test missing API key
if timeout 5s node dist/index.js assistants 2>&1 | grep -q "OpenAI API key is not set"; then
    log_success "Missing API key detection"
    ((PASSED_TESTS++))
else
    log_error "Missing API key detection"
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))

# Test invalid API key
export OPENAI_API_KEY="invalid-key"
if timeout 5s node dist/index.js assistants 2>&1 | grep -q "Error\|error\|AuthenticationError"; then
    log_success "Invalid API key handling"
    ((PASSED_TESTS++))
else
    log_error "Invalid API key handling"
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))

# Restore .env
if [ -f .env.temp.test ]; then
    mv .env.temp.test .env
fi

# Test 2: Path Validation
echo -e "\n${BLUE}=== Testing Path Validation ===${NC}"

run_test "Directory traversal prevention" "node dist/index.js screenshot https://httpbin.org/html '../../../etc/passwd'" "failure"
run_test "Unsafe characters blocking" "node dist/index.js screenshot https://httpbin.org/html 'test;rm -rf /'" "failure"
run_test "Valid path acceptance" "timeout 20s node dist/index.js screenshot https://httpbin.org/html valid_test" "success"

# Test 3: CSV Processing (Race Condition Fix)
echo -e "\n${BLUE}=== Testing CSV Processing ===${NC}"

# Create simple test CSV
cat > test_simple.csv << EOF
url,path
https://httpbin.org/html,csv_test1
https://httpbin.org/status/200,csv_test2
EOF

run_test "CSV sequential processing" "timeout 30s node dist/index.js csv test_simple.csv" "success"
run_test "Nonexistent CSV handling" "node dist/index.js csv nonexistent.csv" "failure"

# Test 4: Error Handling
echo -e "\n${BLUE}=== Testing Error Handling ===${NC}"

run_test "Invalid URL handling" "node dist/index.js screenshot 'not-a-url' error_test" "failure"
run_test "Valid screenshot creation" "timeout 20s node dist/index.js screenshot https://httpbin.org/html error_handling_test" "success"

# Test 5: Resource Cleanup
echo -e "\n${BLUE}=== Testing Resource Cleanup ===${NC}"

log_info "Checking for resource leaks..."
BEFORE=$(ps aux | grep -c "chrome\|puppeteer" 2>/dev/null || echo "0")
timeout 20s node dist/index.js screenshot https://httpbin.org/html cleanup_test >/dev/null 2>&1 || true
sleep 2
AFTER=$(ps aux | grep -c "chrome\|puppeteer" 2>/dev/null || echo "0")

if [ "$AFTER" -le "$BEFORE" ]; then
    log_success "No resource leaks detected"
    ((PASSED_TESTS++))
else
    log_error "Potential resource leak (Before: $BEFORE, After: $AFTER)"
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))

# Cleanup
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