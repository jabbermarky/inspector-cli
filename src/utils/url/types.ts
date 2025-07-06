/**
 * URL validation types and error classes
 */

export enum UrlValidationErrorType {
    INVALID_FORMAT = 'invalid_format',
    INVALID_PROTOCOL = 'invalid_protocol', 
    INVALID_DOMAIN = 'invalid_domain',
    SECURITY_VIOLATION = 'security_violation',
    LENGTH_EXCEEDED = 'length_exceeded',
    ENCODING_ERROR = 'encoding_error',
    BLOCKED_RESOURCE = 'blocked_resource'
}

export interface UrlValidationContext {
    environment: 'development' | 'production' | 'test';
    allowLocalhost: boolean;
    allowPrivateIPs: boolean;
    allowCustomPorts: boolean;
    strictMode: boolean;
    defaultProtocol: 'http' | 'https';
}

export interface UrlValidationOptions {
    maxLength?: number;
    allowedProtocols?: string[];
    blockedDomains?: string[];
    blockedPorts?: number[];
    context?: Partial<UrlValidationContext>;
}

/**
 * Base URL validation error
 */
export class UrlValidationError extends Error {
    public readonly type: UrlValidationErrorType;
    public readonly url?: string;
    public readonly context?: Record<string, any>;
    public readonly cause?: Error;

    constructor(
        message: string,
        type: UrlValidationErrorType,
        options?: {
            url?: string;
            context?: Record<string, any>;
            cause?: Error;
        }
    ) {
        super(message);
        this.name = 'UrlValidationError';
        this.type = type;
        this.url = options?.url;
        this.context = options?.context;
        this.cause = options?.cause;
    }
}

/**
 * URL protocol validation error
 */
export class UrlProtocolError extends UrlValidationError {
    constructor(message: string, options?: { url?: string; protocol?: string; cause?: Error }) {
        super(message, UrlValidationErrorType.INVALID_PROTOCOL, {
            url: options?.url,
            context: { protocol: options?.protocol },
            cause: options?.cause
        });
        this.name = 'UrlProtocolError';
    }
}

/**
 * URL domain validation error
 */
export class UrlDomainError extends UrlValidationError {
    constructor(message: string, options?: { url?: string; domain?: string; cause?: Error }) {
        super(message, UrlValidationErrorType.INVALID_DOMAIN, {
            url: options?.url,
            context: { domain: options?.domain },
            cause: options?.cause
        });
        this.name = 'UrlDomainError';
    }
}

/**
 * URL security validation error
 */
export class UrlSecurityError extends UrlValidationError {
    constructor(message: string, options?: { url?: string; violation?: string; cause?: Error }) {
        super(message, UrlValidationErrorType.SECURITY_VIOLATION, {
            url: options?.url,
            context: { violation: options?.violation },
            cause: options?.cause
        });
        this.name = 'UrlSecurityError';
    }
}

/**
 * URL format validation error
 */
export class UrlFormatError extends UrlValidationError {
    constructor(message: string, options?: { url?: string; cause?: Error }) {
        super(message, UrlValidationErrorType.INVALID_FORMAT, {
            url: options?.url,
            cause: options?.cause
        });
        this.name = 'UrlFormatError';
    }
}