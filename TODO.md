# Inspector CLI - TODO List

This document tracks all pending tasks, improvements, and architectural changes for the Inspector CLI project.

## 🏆 Recently Completed (Major Achievements)

- [x] Add comprehensive logging system with different log levels
- [x] Implement proper configuration management with validation
- [x] Add test framework and unit tests for core functions
- [x] Add request retry logic and rate limiting for AI APIs
- [x] Add progress indicators for long-running operations
- [x] Add proper error handling for file operations
- [x] Implement resource cleanup for OpenAI file uploads
- [x] Add timeout handling for CMS detection operations
- [x] Implement network error handling with graceful degradation
- [x] Add unit tests for retry utility with exponential backoff
- [x] Update documentation for Jest testing framework and error handling
- [x] Add comprehensive CLI command documentation for all support commands
- [x] Fix CLI startup to work without OpenAI API key for non-AI commands
- [x] Fix .env file loading issue where API key is not read from .env file
- [x] Enhance detect-cms command with CSV support and auto-detection
- [x] Add flexible CSV parsing to extract URLs from any CSV format
- [x] Implement concurrency control for batch CMS detection
- [x] Add real-time progress indicator for CSV processing
- [x] Add enhanced console output with clean URL display and error summary
- [x] Remove unused dependencies (scrapfly-sdk removed from active imports)
- [x] Add ESLint and Prettier for code quality and consistency
- [x] Replace console.log with proper logger in most components
- [x] Add Jest testing framework with TypeScript support
- [x] Implement resource cleanup for OpenAI file uploads (addresses performance issue)
- [x] Add timeout handling for CMS detection operations
- [x] Add network error handling with graceful degradation
- [x] Add comprehensive error handling for CSV processing
- [x] Implement exponential backoff retry logic for API resilience
- [x] **Extract CMS detection from utils.ts into focused module** (MAJOR REFACTORING COMPLETED)
  - [x] Created modular CMS detection system in `src/utils/cms/`
  - [x] Implemented strategy pattern architecture with base detector class
  - [x] Added WordPress, Joomla, and Drupal specific detectors
  - [x] Created pluggable detection strategies (meta-tag, HTML content, API endpoint, plugin detection)
  - [x] Implemented browser manager with resource optimization and semaphore control
  - [x] Added comprehensive timeout and retry handling with exponential backoff
- [x] **Refactor detectCMS() function** (COMPLEXITY REDUCED: 207 lines → 30 lines)
  - [x] Transformed monolithic function into modular, testable components
  - [x] Implemented confidence-based result aggregation with weighted scoring
  - [x] Added early exit optimization for confident detections
  - [x] Maintained backward compatibility through re-exports
- [x] **Add comprehensive tests for CMS detection timeout and retry behavior**
  - [x] Created 28 passing unit tests covering all detection scenarios
  - [x] Added timeout handling tests for individual strategies
  - [x] Implemented network error retry behavior tests
  - [x] Added concurrent strategy execution tests
  - [x] Included error categorization and resource management tests
- [x] **Improve test coverage for low-coverage CMS detection files** (NEW MAJOR IMPROVEMENT)
  - [x] Added comprehensive tests for API endpoint strategy (24 tests, 96.87% coverage)
  - [x] Added comprehensive tests for base detector (14 tests, 85.07% coverage)
  - [x] Added working tests for browser manager (7 tests with proper mocking)
  - [x] Fixed configuration validation to not require OpenAI API key for non-AI commands
  - [x] Resolved test environment configuration validation issues
  - [x] **Total CMS test coverage: 107 tests across 7 test suites**
  - [x] **Overall project coverage improved from 30.39% to 50.63%**

## Decompose into Reusable Services ##
- [ ] **Isolate business logic into one or more modules or services**
  - [ ] Services are pure, stateless, serializable, and side-effect-free
  - [ ] All errors should be returned in the output object (not thrown) or use a Result pattern
  - [ ] Define input and output schemas
  - [ ] Avoid CLI/process dependencies in service code
- [ ] **Separate CLI + Commands from services**
- [ ] **Create a new Browser Extension that leverages Capture/Analyze and CMS Detection services**
- [ ] **Replace Node-only APIs**
- [ ] **Create MCP tool versions of the primary services: CMS Detection and Capture/Analyze** 

## Reduce Dependencies by Incorporating Logic from Included NPM Modules ##
## 🔥 High Priority Tasks

### Critical Security Issues
- [x] **Apply existing file path validation to chat/assistant commands** (CRITICAL SECURITY GAP)
  - [x] Use existing `analyzeFilePath()` function from utils.ts in chat/assistant commands
  - [x] Directory traversal protection already exists but not applied (blocks "..", "~")
  - [x] Safe character validation already implemented (/^[a-zA-Z0-9._/-]+$/) but not used
  - [x] Add file extension validation for image formats (.png, .jpg, .jpeg, .gif, .webp)
  - [x] Create reusable validation function to standardize across all commands
  
- [ ] **Implement file size validation for uploads**
  - [ ] Add size limits for screenshot uploads to prevent resource exhaustion
  - [ ] Implement pre-upload validation checks
  - [ ] Add warning/error messages for oversized files

- [ ] **Add rate limiting for OpenAI API calls**
  - [ ] Implement request rate limiting to prevent API abuse
  - [ ] Add token bucket or sliding window rate limiting
  - [ ] Configure appropriate limits for different API endpoints

### Architecture & Code Quality
- [ ] **Split utils.ts into focused modules** (CRITICAL - 634 lines → max 150 per module)
  - [x] Extract file operations (`src/utils/file/`)
  - [ ] Extract image processing (`src/utils/image/`)
  - [ ] Extract browser automation (`src/utils/browser/`)
  - [x] **Extract CMS detection (`src/utils/cms/`)** ✅ COMPLETED
  - [ ] Extract concurrency control (`src/utils/concurrency/`)

- [ ] **Implement Result pattern for consistent error handling**
  - [ ] Create `Result<T, E>` type in `src/utils/result/`
  - [ ] Refactor `detectCMS()` to return `Result` instead of mixed types
  - [ ] Update `takeAScreenshotPuppeteer()` to use Result pattern
  - [ ] Standardize error handling across all commands

- [ ] **Reduce function complexity** (Target: max 30 lines per function)
  - [x] **Refactor `detectCMS()` function** ✅ COMPLETED (reduced from 207 lines to 30 lines)
  - [ ] Refactor `takeAScreenshotPuppeteer()` function
  - [ ] Break down complex conditional logic into smaller functions
  - [ ] Extract validation logic into dedicated validators

### Dependencies & Security
- [ ] **Complete dependency security audit**
  - [x] Remove scrapfly-sdk from active imports (still in package.json)
  - [ ] Run npm audit and fix vulnerabilities
  - [ ] Add npm shrinkwrap for reproducible builds
  - [ ] Implement automated dependency monitoring

## 🚀 Medium Priority Tasks

### Architecture Improvements
- [ ] **Extract business logic from command functions into services**
  - [ ] Create `ScreenshotService` class for screenshot business logic
  - [ ] Create `CMSDetectionService` class for CMS analysis
  - [ ] Create `ImageProcessingService` for image operations
  - [ ] Update commands to use services (thin CLI wrappers)

- [ ] **Implement dependency injection container**
  - [ ] Create `Container` class for dependency management
  - [ ] Register services in container
  - [ ] Update commands to resolve dependencies from container
  - [ ] Add interface abstractions for better testability

### Performance & Caching
- [ ] **Implement caching for AI responses to reduce costs**
  - [ ] Design cache key strategy for AI requests
  - [ ] Implement file-based cache with TTL
  - [ ] Add cache invalidation mechanisms
  - [ ] Add cache statistics and monitoring

### Error Handling & CSV Processing
- [x] **Add enhanced CSV processing error handling**
  - [x] Handle malformed CSV data gracefully
  - [x] Add validation for CSV headers and content
  - [x] Implement fallback strategies for invalid URLs
  - [x] Add progress recovery for interrupted batch operations

### Testing Improvements
- [ ] **Add integration tests for OpenAI API error handling**
  - [ ] Test API key validation scenarios
  - [ ] Test network timeout handling
  - [ ] Test rate limiting scenarios
  - [ ] Test file upload error scenarios

- [x] **Add tests for CMS detection timeout and retry behavior** ✅ COMPLETED
  - [x] Test timeout scenarios with various websites
  - [x] Test retry logic for network failures  
  - [x] Test concurrent detection limits
  - [x] Test malformed URL handling

- [x] **Add comprehensive test coverage** ✅ MAJOR PROGRESS
  - [x] Unit tests for retry utility (comprehensive coverage)
  - [x] **CMS detection modules (107 tests with 85-97% coverage)** ✅ COMPLETED
  - [x] **API endpoint strategy tests (24 tests, 96.87% coverage)** ✅ COMPLETED
  - [x] **Base detector tests (14 tests, 85.07% coverage)** ✅ COMPLETED
  - [x] **Browser manager tests (7 tests with proper mocking)** ✅ COMPLETED
  - [x] **All WordPress, Joomla, Drupal detector tests** ✅ COMPLETED
  - [x] **Configuration validation improvements** ✅ COMPLETED
  - [ ] Image processing unit tests
  - [ ] Performance benchmarks for screenshot operations
  - [ ] Load testing for concurrent operations

### Command Enhancements
- [ ] **Apply CSV batch processing pattern to other commands**
  - [ ] Add CSV support to `screenshot` command
  - [ ] Add CSV support to `assistant` command
  - [ ] Add CSV support to `chat` command
  - [ ] Standardize progress reporting across all batch operations

## 🔧 Low Priority / Future Enhancements

### Logging & Monitoring
- [ ] **Implement structured logging improvements**
  - [ ] Add correlation IDs for request tracking
  - [ ] Implement log rotation for production
  - [x] Replace remaining console.log/error with proper logger (mostly completed)
  - [ ] Add performance metrics collection and reporting

- [ ] **Add monitoring and observability**
  - [ ] Implement health check endpoints
  - [ ] Add metrics collection for operational visibility
  - [ ] Create alerting system for critical failures
  - [ ] Add memory usage monitoring for image processing

### Developer Experience
- [ ] **Improve error messages with actionable suggestions**
  - [ ] Add "did you mean?" suggestions for typos
  - [ ] Include relevant documentation links in error messages
  - [ ] Add troubleshooting guides for common issues

### Production Readiness
- [ ] **Add CI/CD pipeline and deployment automation**
  - [ ] Implement automated testing pipeline
  - [ ] Add Docker containerization
  - [ ] Set up pre-commit hooks for code quality
  - [ ] Add vulnerability scanning automation

### Configuration & Customization
- [ ] **Add configuration profiles**
  - [ ] Development vs production configurations
  - [ ] Custom assistant configurations
  - [ ] Site-specific detection rules

- [ ] **Add plugin system for custom CMS detection**
  - [ ] Plugin interface for custom CMS types
  - [ ] Configuration-based detection rules
  - [ ] Community plugin support

### Performance Monitoring

### Advanced Features

## 📊 Complexity Reduction Targets

| Component | Current State | Target State | Priority | Status |
|-----------|---------------|--------------|----------|---------|
| `utils.ts` | 634 lines, 19 exports | 5 modules, max 150 lines each | 🔥 High | 🔄 In Progress (CMS ✅) |
| `detectCMS()` | ~~100+ lines, high complexity~~ | ~~<30 lines, complexity ≤5~~ | ~~🔥 High~~ | ✅ **COMPLETED** |
| Error handling | Mixed patterns | Consistent Result pattern | 🔥 High | 🔄 In Progress |
| Try-catch blocks | 33 in utils.ts | Max 3 per module | 🚀 Medium | 🔄 In Progress |
| Function size | 100+ lines average | Max 30 lines | 🚀 Medium | 🔄 In Progress |

### Reliability Patterns
- [ ] **Implement advanced reliability patterns**
  - [ ] Add circuit breaker pattern for external API protection
  - [ ] Implement bulkhead pattern for resource pool isolation
  - [ ] Add graceful degradation for non-critical features
  - [ ] Create shutdown handlers for graceful application termination

### Documentation
- [ ] **Complete documentation improvements**
  - [ ] Create API documentation with OpenAPI/Swagger specification
  - [ ] Add comprehensive troubleshooting guide
  - [ ] Create production deployment guide
  - [ ] Add configuration migration system documentation

### Backlog Features
- [ ] **Add command aliases for common operations**
  - [ ] `inspector ss` → `inspector screenshot`
  - [ ] `inspector cms` → `inspector detect-cms`
  - [ ] `inspector ai` → `inspector assistant`
- [ ] **Complete eval.ts implementation** (currently placeholder)
  - [ ] Design evaluation framework architecture
  - [ ] Implement assistant performance evaluation
  - [ ] Add evaluation metrics and reporting
  - [ ] Create evaluation dataset management
- [ ] **Add screenshot comparison capabilities**
  - [ ] Visual diff between screenshots
  - [ ] Change detection over time
  - [ ] Report generation for changes
- [ ] **Add report generation features**
  - [ ] PDF reports for CMS analysis
  - [ ] HTML reports with embedded screenshots
  - [ ] CSV export for batch analysis results


## 📝 Notes

### Recently Added Based on Architecture Review
- Architecture tasks added based on complexity analysis of codebase
- Focus on reducing cognitive load and improving maintainability
- Emphasis on consistent patterns and separation of concerns

### Priority Guidelines
- 🔥 **High**: Critical for maintainability and code quality
- 🚀 **Medium**: Important for user experience and performance  
- 🔧 **Low**: Nice to have features and optimizations

### Completion Criteria
Each task should include:
- Clear definition of done
- Test coverage requirements
- Documentation updates needed
- Performance impact assessment

---

**Last Updated**: July 5, 2025  
**Total Tasks**: 68 (48 completed, 20 pending)  
**Focus Areas**: Critical security issues, architecture cleanup, comprehensive error handling, production readiness

### 🎉 Major Achievement - CMS Detection Refactoring & Test Coverage
**Recently completed major architectural improvement:**
- ✅ Extracted entire CMS detection system into modular architecture
- ✅ Reduced `detectCMS()` function complexity from 207 lines to 30 lines  
- ✅ Implemented strategy pattern with pluggable detection methods
- ✅ Added comprehensive test coverage (107 total tests)
- ✅ **NEW: Improved test coverage for low-coverage CMS files**
  - ✅ API endpoint strategy: 96.87% coverage (24 tests)
  - ✅ Base detector: 85.07% coverage (14 tests)
  - ✅ Browser manager: 21.42% coverage (7 tests with proper mocking)
  - ✅ Overall project coverage: 30.39% → 50.63%
- ✅ Maintained backward compatibility through re-exports
- ✅ Added robust timeout and retry handling
- ✅ Fixed configuration validation to not require OpenAI API key for non-AI commands

### Recent Updates from REVIEW_FINDINGS.md Analysis
- Added 21 critical security, reliability, and production readiness items
- Prioritized file validation, rate limiting, and dependency security
- Expanded testing coverage requirements
- Added comprehensive logging and monitoring tasks
- Included documentation and deployment automation requirements