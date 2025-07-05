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

## 🔥 High Priority Tasks

### Architecture & Code Quality
- [ ] **Split utils.ts into focused modules** (CRITICAL - 634 lines → max 150 per module)
  - [ ] Extract file operations (`src/utils/file/`)
  - [ ] Extract image processing (`src/utils/image/`)
  - [ ] Extract browser automation (`src/utils/browser/`)
  - [ ] Extract CMS detection (`src/utils/cms/`)
  - [ ] Extract concurrency control (`src/utils/concurrency/`)

- [ ] **Implement Result pattern for consistent error handling**
  - [ ] Create `Result<T, E>` type in `src/utils/result/`
  - [ ] Refactor `detectCMS()` to return `Result` instead of mixed types
  - [ ] Update `takeAScreenshotPuppeteer()` to use Result pattern
  - [ ] Standardize error handling across all commands

- [ ] **Reduce function complexity** (Target: max 30 lines per function)
  - [ ] Refactor `detectCMS()` function (currently 100+ lines)
  - [ ] Refactor `takeAScreenshotPuppeteer()` function
  - [ ] Break down complex conditional logic into smaller functions
  - [ ] Extract validation logic into dedicated validators

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

### Testing Improvements
- [ ] **Add integration tests for OpenAI API error handling**
  - [ ] Test API key validation scenarios
  - [ ] Test network timeout handling
  - [ ] Test rate limiting scenarios
  - [ ] Test file upload error scenarios

- [ ] **Add tests for CMS detection timeout and retry behavior**
  - [ ] Test timeout scenarios with various websites
  - [ ] Test retry logic for network failures
  - [ ] Test concurrent detection limits
  - [ ] Test malformed URL handling

### Command Enhancements
- [ ] **Apply CSV batch processing pattern to other commands**
  - [ ] Add CSV support to `screenshot` command
  - [ ] Add CSV support to `assistant` command
  - [ ] Add CSV support to `chat` command
  - [ ] Standardize progress reporting across all batch operations

## 🔧 Low Priority / Future Enhancements

### Developer Experience
- [ ] **Add command aliases for common operations**
  - [ ] `inspector ss` → `inspector screenshot`
  - [ ] `inspector cms` → `inspector detect-cms`
  - [ ] `inspector ai` → `inspector assistant`

- [ ] **Improve error messages with actionable suggestions**
  - [ ] Add "did you mean?" suggestions for typos
  - [ ] Include relevant documentation links in error messages
  - [ ] Add troubleshooting guides for common issues

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
- [ ] **Add performance metrics collection**
  - [ ] Track command execution times
  - [ ] Monitor API call latencies
  - [ ] Track resource usage (memory, CPU)
  - [ ] Export metrics for monitoring systems

### Advanced Features
- [ ] **Add screenshot comparison capabilities**
  - [ ] Visual diff between screenshots
  - [ ] Change detection over time
  - [ ] Report generation for changes

- [ ] **Add report generation features**
  - [ ] PDF reports for CMS analysis
  - [ ] HTML reports with embedded screenshots
  - [ ] CSV export for batch analysis results

## 📊 Complexity Reduction Targets

| Component | Current State | Target State | Priority |
|-----------|---------------|--------------|----------|
| `utils.ts` | 634 lines, 19 exports | 5 modules, max 150 lines each | 🔥 High |
| `detectCMS()` | 100+ lines, high complexity | <30 lines, complexity ≤5 | 🔥 High |
| Error handling | Mixed patterns | Consistent Result pattern | 🔥 High |
| Try-catch blocks | 33 in utils.ts | Max 3 per module | 🚀 Medium |
| Function size | 100+ lines average | Max 30 lines | 🚀 Medium |

### Backlog Features
- [ ] **Complete eval.ts implementation** (currently placeholder)
  - [ ] Design evaluation framework architecture
  - [ ] Implement assistant performance evaluation
  - [ ] Add evaluation metrics and reporting
  - [ ] Create evaluation dataset management


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
**Total Tasks**: 47 (19 completed, 28 pending)  
**Focus Areas**: Architecture cleanup, error handling standardization, feature completion