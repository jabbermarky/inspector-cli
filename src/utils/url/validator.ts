import { createModuleLogger } from '../logger.js';
import { 
    UrlValidationContext, 
    UrlValidationOptions,
    UrlValidationError,
    UrlProtocolError,
    UrlDomainError,
    UrlSecurityError,
    UrlFormatError 
} from './types.js';
import { UrlNormalizer } from './normalizer.js';

const logger = createModuleLogger('url-validator');

/**
 * Comprehensive URL validation
 */
export class UrlValidator {
    // Constants
    private static readonly ALLOWED_PROTOCOLS = ['http:', 'https:'];
    private static readonly MAX_URL_LENGTH = 2048;
    private static readonly MAX_DOMAIN_LENGTH = 253;
    private static readonly MAX_LABEL_LENGTH = 63;
    
    // Security patterns
    private static readonly BLOCKED_DOMAINS = [
        'localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'
    ];
    
    private static readonly BLOCKED_PORTS = [
        22, 23, 25, 110, 143, 993, 995 // SSH, Telnet, SMTP, POP3, IMAP, etc.
    ];
    
    private static readonly PRIVATE_IP_PATTERNS = [
        /^127\./,                    // 127.x.x.x
        /^10\./,                     // 10.x.x.x
        /^192\.168\./,               // 192.168.x.x
        /^172\.(1[6-9]|2\d|3[01])\./ // 172.16.x.x - 172.31.x.x
    ];
    
    private static readonly DANGEROUS_PATTERNS = [
        /\.\.\//g,                   // Path traversal
        /%2e%2e%2f/gi,              // Encoded path traversal
        /<script[^>]*>/gi,          // Script tags
        /javascript:/gi,            // JavaScript protocol
        /vbscript:/gi,              // VBScript protocol
        /data:/gi                   // Data URLs
    ];

    private static readonly DEFAULT_CONTEXT: UrlValidationContext = {
        environment: 'production',
        allowLocalhost: false,
        allowPrivateIPs: false,
        allowCustomPorts: false,
        strictMode: true,
        defaultProtocol: 'http'
    };

    /**
     * Validate URL with comprehensive checks
     * @param url URL to validate
     * @param options Validation options
     * @returns void (throws on validation failure)
     */
    static validate(url: string, options?: UrlValidationOptions): void {
        const context = { ...this.DEFAULT_CONTEXT, ...options?.context };
        
        logger.debug('Validating URL', { url, context });

        // Basic input validation
        this.validateInput(url);
        
        // Length validation
        this.validateLength(url, options?.maxLength);
        
        // Normalize URL for further validation
        const normalizedUrl = UrlNormalizer.normalizeUrl(url, context);
        
        // Security pattern validation on normalized URL
        this.validateSecurityPatterns(normalizedUrl);
        
        // Parse and validate URL structure
        const urlObj = this.parseUrl(normalizedUrl);
        
        // Protocol validation
        this.validateProtocol(urlObj.protocol, options?.allowedProtocols);
        
        // Domain validation
        this.validateDomain(urlObj.hostname, context);
        
        // Port validation
        this.validatePort(urlObj.port, urlObj.protocol, context);
        
        // Path validation
        this.validatePath(urlObj.pathname);
        
        logger.debug('URL validation passed', { url: normalizedUrl });
    }

    /**
     * Validate and normalize URL in one step
     * @param url URL to validate and normalize
     * @param options Validation options
     * @returns Normalized and validated URL
     */
    static validateAndNormalize(url: string, options?: UrlValidationOptions): string {
        this.validate(url, options);
        const context = { ...this.DEFAULT_CONTEXT, ...options?.context };
        return UrlNormalizer.normalizeUrl(url, context);
    }

    /**
     * Basic input validation
     */
    private static validateInput(url: string): void {
        if (!url || typeof url !== 'string') {
            throw new UrlFormatError('URL must be a non-empty string', { url });
        }

        if (url.trim().length === 0) {
            throw new UrlFormatError('URL cannot be empty', { url });
        }
    }

    /**
     * Validate URL length
     */
    private static validateLength(url: string, maxLength?: number): void {
        const limit = maxLength || this.MAX_URL_LENGTH;
        
        if (url.length > limit) {
            throw new UrlValidationError(
                `URL length exceeds maximum of ${limit} characters`,
                'length_exceeded' as any,
                { url, context: { length: url.length, limit } }
            );
        }
    }

    /**
     * Validate against security patterns
     */
    private static validateSecurityPatterns(url: string): void {
        for (const pattern of this.DANGEROUS_PATTERNS) {
            if (pattern.test(url)) {
                throw new UrlSecurityError(
                    'URL contains dangerous patterns',
                    { url, violation: pattern.toString() }
                );
            }
        }
    }

    /**
     * Parse URL with error handling
     */
    private static parseUrl(url: string): URL {
        try {
            return new URL(url);
        } catch (error) {
            throw new UrlFormatError(
                `Invalid URL format: ${url}`,
                { url, cause: error as Error }
            );
        }
    }

    /**
     * Validate protocol
     */
    private static validateProtocol(protocol: string, allowedProtocols?: string[]): void {
        const allowed = allowedProtocols || this.ALLOWED_PROTOCOLS;
        
        if (!allowed.includes(protocol)) {
            throw new UrlProtocolError(
                `Invalid protocol: ${protocol}. Allowed protocols: ${allowed.join(', ')}`,
                { protocol }
            );
        }
    }

    /**
     * Validate domain
     */
    private static validateDomain(hostname: string, context: UrlValidationContext): void {
        if (!hostname) {
            throw new UrlDomainError('Domain cannot be empty');
        }

        // Length validation
        if (hostname.length > this.MAX_DOMAIN_LENGTH) {
            throw new UrlDomainError(
                `Domain length exceeds maximum of ${this.MAX_DOMAIN_LENGTH} characters`,
                { domain: hostname }
            );
        }

        // Label length validation
        const labels = hostname.split('.');
        for (const label of labels) {
            if (label.length > this.MAX_LABEL_LENGTH) {
                throw new UrlDomainError(
                    `Domain label "${label}" exceeds maximum length of ${this.MAX_LABEL_LENGTH} characters`,
                    { domain: hostname }
                );
            }
        }

        // Blocked domains check (only if not explicitly allowed by context)
        if (this.BLOCKED_DOMAINS.includes(hostname.toLowerCase())) {
            // Check if it's localhost and localhost is allowed
            if (this.isLocalhost(hostname) && context.allowLocalhost) {
                // Allow localhost if context permits
            } else {
                throw new UrlSecurityError(
                    `Domain "${hostname}" is blocked`,
                    { url: hostname, violation: 'blocked_domain' }
                );
            }
        }

        // Security checks based on context
        if (!context.allowLocalhost && this.isLocalhost(hostname)) {
            throw new UrlSecurityError(
                'Localhost domains are not allowed',
                { url: hostname, violation: 'localhost' }
            );
        }

        // Only check private IPs if it's not already identified as localhost
        if (!context.allowPrivateIPs && !this.isLocalhost(hostname) && this.isPrivateIP(hostname)) {
            throw new UrlSecurityError(
                'Private IP addresses are not allowed',
                { url: hostname, violation: 'private_ip' }
            );
        }
    }

    /**
     * Validate port
     */
    private static validatePort(port: string, protocol: string, context: UrlValidationContext): void {
        if (!port) return; // Default ports are allowed

        const portNum = parseInt(port, 10);
        
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
            throw new UrlDomainError(
                `Invalid port number: ${port}`,
                { url: `port:${port}` }
            );
        }

        // Check blocked ports
        if (this.BLOCKED_PORTS.includes(portNum)) {
            throw new UrlSecurityError(
                `Port ${portNum} is blocked for security reasons`,
                { violation: 'blocked_port' }
            );
        }

        // Custom port validation based on context
        if (!context.allowCustomPorts && !this.isStandardPort(portNum, protocol)) {
            throw new UrlSecurityError(
                `Custom ports are not allowed: ${portNum}`,
                { violation: 'custom_port' }
            );
        }
    }

    /**
     * Validate URL path
     */
    private static validatePath(pathname: string): void {
        // Check for path traversal attempts
        if (pathname.includes('../') || pathname.includes('..\\')) {
            throw new UrlSecurityError(
                'Path traversal detected in URL path',
                { violation: 'path_traversal' }
            );
        }

        // Additional path security checks can be added here
    }

    /**
     * Check if hostname is localhost
     */
    private static isLocalhost(hostname: string): boolean {
        const lower = hostname.toLowerCase();
        return lower === 'localhost' || 
               lower === '127.0.0.1' || 
               lower === '0.0.0.0' ||
               lower === '::1' ||
               lower === '[::1]' ||
               /^127\./.test(lower); // Any 127.x.x.x address
    }

    /**
     * Check if hostname is a private IP
     */
    private static isPrivateIP(hostname: string): boolean {
        return this.PRIVATE_IP_PATTERNS.some(pattern => pattern.test(hostname));
    }

    /**
     * Check if port is standard for the protocol
     */
    private static isStandardPort(port: number, protocol: string): boolean {
        return (protocol === 'http:' && port === 80) ||
               (protocol === 'https:' && port === 443);
    }
}