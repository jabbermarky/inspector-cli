#!/bin/bash

# Quick Test Script for Inspector CLI Critical Fixes
# A simplified version for rapid testing of the most important scenarios

# Note: We don't use 'set -e' because we need to handle expected test failures

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $1"; }
log_error() { echo -e "${RED}[FAIL]${NC} $1"; }

# Build project
log_info "Building project..."
npm run build

echo -e "\n${BLUE}=== Quick Tests for Critical Fixes ===${NC}"

# Test 1: API Key Security (Missing key)
echo -e "\n${YELLOW}1. Testing API Key Security${NC}"
# Temporarily hide .env file to test missing API key
if [ -f .env ]; then
    mv .env .env.temp
fi
unset OPENAI_API_KEY
if timeout 5s node dist/index.js assistants 2>&1 | grep -q "OpenAI API key is not set"; then
    log_success "Missing API key properly detected"
else
    log_error "Missing API key test failed"
fi
# Restore .env file
if [ -f .env.temp ]; then
    mv .env.temp .env
fi

# Test 2: Path Validation (Directory traversal)
echo -e "\n${YELLOW}2. Testing Path Validation${NC}"
if node dist/index.js screenshot https://httpbin.org/html "../../../etc/passwd" 2>&1 | grep -q "cannot contain"; then
    log_success "Directory traversal blocked"
else
    log_error "Directory traversal test failed"
fi

# Test 3: Valid Screenshot
echo -e "\n${YELLOW}3. Testing Valid Screenshot${NC}"
if timeout 30s node dist/index.js screenshot https://httpbin.org/html quick_test 2>/dev/null; then
    log_success "Valid screenshot works"
    if [ -f "scrapes/quick_test_w768.png" ]; then
        log_success "Screenshot file created correctly"
    else
        log_error "Screenshot file not found"
    fi
else
    log_error "Valid screenshot failed"
fi

# Test 4: CSV Processing
echo -e "\n${YELLOW}4. Testing CSV Processing${NC}"
cat > quick_test.csv << EOF
url,path
https://httpbin.org/html,csv_test1
https://mock.httpstatus.io/404,csv_test2
EOF

if timeout 30s node dist/index.js csv quick_test.csv 2>/dev/null; then
    log_success "CSV processing works"
    if [ -f "scrapes/csv_test1_w768.png" ]; then
        log_success "CSV screenshot files created"
    else
        log_error "CSV screenshot files not found"
    fi
else
    log_error "CSV processing failed"
fi

# Test 5: Error Handling (Invalid URL)
echo -e "\n${YELLOW}5. Testing Error Handling${NC}"
if node dist/index.js screenshot "not-a-url" error_test 2>&1 | grep -q "Invalid URL\|Error"; then
    log_success "Invalid URL properly handled"
else
    log_error "Invalid URL handling failed"
fi

# Test 6: Resource Cleanup Check
echo -e "\n${YELLOW}6. Testing Resource Cleanup${NC}"
BEFORE=$(ps aux | grep -c "chrome\|puppeteer" 2>/dev/null || echo "0")
timeout 20s node dist/index.js screenshot https://httpbin.org/html cleanup_test >/dev/null 2>&1 || true
sleep 2
AFTER=$(ps aux | grep -c "chrome\|puppeteer" 2>/dev/null || echo "0")

if [ "$AFTER" -le "$BEFORE" ]; then
    log_success "No resource leaks detected"
else
    log_error "Potential resource leak (Before: $BEFORE, After: $AFTER)"
fi

# Cleanup test files (but not test scripts)
rm -f quick_test.csv test_*.csv *.png 2>/dev/null || true

echo -e "\n${BLUE}Quick test completed!${NC}"
echo -e "Run ${YELLOW}./test_critical_fixes.sh${NC} for comprehensive testing."