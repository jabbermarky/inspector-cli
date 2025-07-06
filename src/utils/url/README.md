# URL Validation Module

This module provides comprehensive URL validation and normalization functionality used across the Inspector CLI application. It was extracted from duplicate validation logic in the screenshot and CMS detection modules to follow DRY principles and ensure consistent URL handling.

## Architecture

The URL validation module follows a modular service-based architecture:

```
src/utils/url/
├── index.ts           # Main exports and convenience functions
├── types.ts           # TypeScript interfaces and error classes
├── validator.ts       # Core URL validation logic
├── normalizer.ts      # URL normalization utilities
├── __tests__/         # Comprehensive test suite
│   ├── types.test.ts
│   ├── validator.test.ts
│   ├── normalizer.test.ts
│   └── index.test.ts
└── README.md         # This documentation
```

## Key Features

- **Protocol Validation**: Supports HTTP/HTTPS with configurable defaults
- **Security Validation**: Blocks dangerous patterns, private IPs, and malicious URLs
- **Context-Aware**: Different validation rules for development vs production
- **URL Normalization**: Automatic protocol addition and domain normalization
- **Comprehensive Error Handling**: Typed error classes with detailed context
- **High Performance**: Optimized for both single URLs and batch processing

## Default Protocol Change

**Important**: This module uses **HTTP as the default protocol** (changed from HTTPS) to improve compatibility with:
- Development environments and local servers
- Internal company websites
- Testing environments without SSL certificates
- IoT devices and embedded systems

URLs are normalized as follows:
- `example.com` → `http://example.com`
- `https://example.com` → `https://example.com` (preserved)
- `http://example.com` → `http://example.com` (preserved)

## Usage

### Basic URL Validation

```typescript
import { validateUrl, normalizeUrl, validateAndNormalizeUrl } from '../utils/url/index.js';

// Simple validation
try {
    validateUrl('example.com');
    console.log('URL is valid');
} catch (error) {
    console.error('Invalid URL:', error.message);
}

// Normalize URL
const normalized = normalizeUrl('example.com');
console.log(normalized); // "http://example.com"

// Validate and normalize in one step
const result = validateAndNormalizeUrl('example.com');
console.log(result); // "http://example.com"
```

### Advanced Usage with Context

```typescript
import { UrlValidator, UrlNormalizer } from '../utils/url/index.js';

// Development context (permissive)
const devOptions = {
    context: {
        environment: 'development',
        allowLocalhost: true,
        allowPrivateIPs: true,
        allowCustomPorts: true,
        defaultProtocol: 'http'
    }
};

UrlValidator.validate('localhost:3000', devOptions); // ✅ Passes

// Production context (strict)
const prodOptions = {
    context: {
        environment: 'production',
        allowLocalhost: false,
        allowPrivateIPs: false,
        allowCustomPorts: false,
        strictMode: true
    }
};

UrlValidator.validate('localhost:3000', prodOptions); // ❌ Throws UrlSecurityError
```

### Using the Normalizer

```typescript
import { UrlNormalizer } from '../utils/url/index.js';

// Basic normalization
UrlNormalizer.normalizeUrl('example.com');          // "http://example.com"
UrlNormalizer.normalizeUrl('https://example.com');  // "https://example.com"

// Custom default protocol
const context = { defaultProtocol: 'https' };
UrlNormalizer.normalizeUrl('example.com', context); // "https://example.com"

// Utility functions
UrlNormalizer.upgradeToHttps('http://example.com'); // "https://example.com"
UrlNormalizer.cleanUrl('http://example.com#section'); // "http://example.com/"
UrlNormalizer.normalizeDomain('http://EXAMPLE.COM'); // "http://example.com/"
```

## API Reference

### Main Functions

#### `validateUrl(url: string, options?: UrlValidationOptions): void`

Validates a URL according to the specified options and context.

**Parameters:**
- `url: string` - The URL to validate
- `options?: UrlValidationOptions` - Validation configuration

**Throws:**
- `UrlFormatError` - Invalid URL format
- `UrlProtocolError` - Invalid or unsupported protocol
- `UrlDomainError` - Invalid domain or hostname
- `UrlSecurityError` - Security policy violation

#### `normalizeUrl(url: string, context?: Partial<UrlValidationContext>): string`

Normalizes a URL by adding the default protocol if missing.

**Parameters:**
- `url: string` - The URL to normalize
- `context?: Partial<UrlValidationContext>` - Normalization context

**Returns:** Normalized URL string

#### `validateAndNormalizeUrl(url: string, options?: UrlValidationOptions): string`

Validates and normalizes a URL in one operation.

**Parameters:**
- `url: string` - The URL to process
- `options?: UrlValidationOptions` - Validation and normalization options

**Returns:** Validated and normalized URL string

### Configuration Options

#### `UrlValidationOptions`

```typescript
interface UrlValidationOptions {
    maxLength?: number;           // Maximum URL length (default: 2048)
    allowedProtocols?: string[];  // Allowed protocols (default: ['http:', 'https:'])
    blockedDomains?: string[];    // Additional blocked domains
    blockedPorts?: number[];      // Additional blocked ports
    context?: Partial<UrlValidationContext>;
}
```

#### `UrlValidationContext`

```typescript
interface UrlValidationContext {
    environment: 'development' | 'production' | 'test';
    allowLocalhost: boolean;      // Allow localhost domains
    allowPrivateIPs: boolean;     // Allow private IP addresses
    allowCustomPorts: boolean;    // Allow non-standard ports
    strictMode: boolean;          // Enable strict validation
    defaultProtocol: 'http' | 'https';  // Default protocol for normalization
}
```

### Error Classes

#### `UrlValidationError`

Base class for all URL validation errors.

```typescript
class UrlValidationError extends Error {
    type: UrlValidationErrorType;
    url?: string;
    context?: Record<string, any>;
    cause?: Error;
}
```

#### `UrlProtocolError`

Thrown when the URL protocol is invalid or not allowed.

#### `UrlDomainError`

Thrown when the domain is invalid or violates length constraints.

#### `UrlSecurityError`

Thrown when the URL violates security policies.

#### `UrlFormatError`

Thrown when the URL format is invalid or cannot be parsed.

## Security Features

### Blocked Patterns

The validator automatically blocks dangerous patterns:

- **Path Traversal**: `../`, `..\\`, encoded variations
- **Script Injection**: `<script>`, `javascript:`, `vbscript:`
- **Data URLs**: `data:` protocol for XSS prevention
- **Protocol Violations**: Non-HTTP/HTTPS protocols

### Network Security

- **Private IP Blocking**: 10.x.x.x, 192.168.x.x, 172.16-31.x.x
- **Localhost Filtering**: 127.x.x.x, localhost, ::1
- **Port Restrictions**: Blocks SSH (22), SMTP (25), etc.
- **Custom Port Control**: Configurable per environment

### SSRF Protection

- Blocks internal network access in production
- Prevents cloud metadata endpoint access
- Validates domain length and format
- Character encoding validation

## Validation Rules

### URL Format Rules

- **Maximum Length**: 2048 characters (IE compatibility)
- **Domain Length**: 253 characters maximum
- **Label Length**: 63 characters per domain label
- **Protocol Requirement**: HTTP/HTTPS only
- **Character Encoding**: Valid UTF-8 encoding

### Context-Based Rules

#### Development Environment
```typescript
{
    allowLocalhost: true,      // ✅ localhost, 127.0.0.1
    allowPrivateIPs: true,     // ✅ 192.168.x.x, 10.x.x.x
    allowCustomPorts: true,    // ✅ :3000, :8080
    strictMode: false          // 🔄 Permissive validation
}
```

#### Production Environment
```typescript
{
    allowLocalhost: false,     // ❌ Block localhost
    allowPrivateIPs: false,    // ❌ Block private IPs
    allowCustomPorts: false,   // ❌ Block custom ports
    strictMode: true          // 🔒 Strict validation
}
```

## Integration Examples

### Screenshot Module Integration

```typescript
// In src/utils/screenshot/validation.ts
import { validateUrl, normalizeUrl, UrlValidationError } from '../url/index.js';

private static validateUrl(url: string): void {
    try {
        const context = {
            environment: 'development',
            allowLocalhost: true,
            allowPrivateIPs: true,
            allowCustomPorts: true,
            defaultProtocol: 'http'
        };
        
        validateUrl(url, { context });
    } catch (error) {
        if (error instanceof UrlValidationError) {
            throw new ScreenshotValidationError(
                error.message,
                { field: 'url', value: url, cause: error }
            );
        }
        throw error;
    }
}
```

### CMS Detection Integration

```typescript
// In src/utils/cms/index.ts
import { validateAndNormalizeUrl } from '../url/index.js';

const context = {
    environment: 'production',
    allowLocalhost: false,
    allowPrivateIPs: false,
    allowCustomPorts: false,
    defaultProtocol: 'http'
};

const normalizedUrl = validateAndNormalizeUrl(url, { context });
```

## Testing

The module includes comprehensive test coverage:

```bash
# Run all URL validation tests
npm test -- src/utils/url/

# Run specific test suites
npm test -- src/utils/url/__tests__/validator.test.ts
npm test -- src/utils/url/__tests__/normalizer.test.ts
npm test -- src/utils/url/__tests__/types.test.ts
```

### Test Coverage Areas

- **Validator Tests**: 40 tests covering all validation scenarios
- **Normalizer Tests**: 25 tests for URL normalization
- **Types Tests**: 12 tests for error class behavior
- **Integration Tests**: 12 tests for module integration

## Migration Guide

### From Screenshot Module

**Before (utils/screenshot/validation.ts):**
```typescript
// Old duplicate validation logic
private static validateUrl(url: string): void {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
    }
    const urlObj = new URL(url);
    // ... validation logic
}
```

**After (using shared module):**
```typescript
import { validateUrl, UrlValidationError } from '../url/index.js';

private static validateUrl(url: string): void {
    try {
        validateUrl(url, { context: { defaultProtocol: 'http' } });
    } catch (error) {
        // Convert to screenshot-specific error
    }
}
```

### From CMS Detection

**Before (utils/cms/index.ts):**
```typescript
function validateAndNormalizeUrl(url: string): string {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    const urlObj = new URL(url);
    return urlObj.href;
}
```

**After (using shared module):**
```typescript
import { validateAndNormalizeUrl } from '../url/index.js';

const normalizedUrl = validateAndNormalizeUrl(url, {
    context: { defaultProtocol: 'http' }
});
```

## Performance Considerations

- **URL Constructor Caching**: Efficient URL parsing
- **Pattern Matching**: Optimized regex patterns
- **Error Object Reuse**: Minimal object creation
- **Validation Short-Circuiting**: Early exit on failures

## Future Enhancements

- **Punycode Support**: International domain names
- **URL Similarity**: Fuzzy URL matching
- **Cache Integration**: URL validation result caching
- **Rate Limiting**: URL validation rate limiting
- **Custom Validators**: Pluggable validation strategies

## Related Modules

- **Screenshot Module**: Uses URL validation for web page screenshots
- **CMS Detection**: Uses URL validation for website analysis
- **Config Module**: Provides environment-specific validation settings
- **Logger Module**: Logs validation events and errors

## Contributing

When contributing to this module:

1. **Maintain Test Coverage**: Ensure 85%+ test coverage
2. **Security First**: All changes must maintain security standards
3. **Backward Compatibility**: Preserve existing public APIs
4. **Documentation**: Update this README for any API changes
5. **Performance**: Consider performance impact of validation changes

## Security Considerations

This module is security-critical as it validates all URLs in the application:

- **Input Sanitization**: All URL inputs are sanitized
- **SSRF Prevention**: Blocks internal network access
- **XSS Prevention**: Blocks dangerous URL patterns
- **Path Traversal Protection**: Validates URL paths
- **Protocol Enforcement**: Only allows safe protocols

Report security issues through the project's security channels.