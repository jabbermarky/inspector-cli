/**
 * DataStorage Functional Tests
 * 
 * This file now imports the new non-flaky DataStorage tests
 * that use FileSystemAdapter abstraction instead of direct fs mocking
 * 
 * Updated: 2025-07-11
 * Approach: FileSystemAdapter abstraction with configurable error injection
 * Status: Non-flaky implementation complete
 */

// Import the comprehensive unit tests
import './storage.test.js';

// Import the integration tests
import './storage.integration.test.js';

// This file now serves as a test aggregator for the DataStorage functionality
// The actual tests are in the analysis folder using the new approach