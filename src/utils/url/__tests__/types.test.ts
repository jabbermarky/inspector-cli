import { 
    UrlValidationError,
    UrlProtocolError,
    UrlDomainError,
    UrlSecurityError,
    UrlFormatError,
    UrlValidationErrorType
} from '../types.js';
import { setupJestExtensions } from '@test-utils';

// Setup custom Jest matchers
setupJestExtensions();

describe('URL Validation Error Classes', () => {
    describe('UrlValidationError', () => {
        it('should create error with message and type', () => {
            const error = new UrlValidationError(
                'Test error',
                UrlValidationErrorType.INVALID_FORMAT
            );
            
            expect(error.message).toBe('Test error');
            expect(error.name).toBe('UrlValidationError');
            expect(error.type).toBe(UrlValidationErrorType.INVALID_FORMAT);
        });

        it('should create error with options', () => {
            const cause = new Error('Original error');
            const error = new UrlValidationError(
                'Test error',
                UrlValidationErrorType.SECURITY_VIOLATION,
                {
                    url: 'https://example.com',
                    context: { test: true },
                    cause
                }
            );
            
            expect(error.message).toBe('Test error');
            expect(error.type).toBe(UrlValidationErrorType.SECURITY_VIOLATION);
            expect(error.url).toBe('https://example.com');
            expect(error.context).toEqual({ test: true });
            expect(error.cause).toBe(cause);
        });
    });

    describe('UrlProtocolError', () => {
        it('should create protocol error', () => {
            const error = new UrlProtocolError('Invalid protocol', {
                url: 'ftp://example.com',
                protocol: 'ftp:'
            });
            
            expect(error.message).toBe('Invalid protocol');
            expect(error.name).toBe('UrlProtocolError');
            expect(error.type).toBe(UrlValidationErrorType.INVALID_PROTOCOL);
            expect(error.url).toBe('ftp://example.com');
            expect(error.context).toEqual({ protocol: 'ftp:' });
        });
    });

    describe('UrlDomainError', () => {
        it('should create domain error', () => {
            const error = new UrlDomainError('Invalid domain', {
                url: 'https://invalid-domain',
                domain: 'invalid-domain'
            });
            
            expect(error.message).toBe('Invalid domain');
            expect(error.name).toBe('UrlDomainError');
            expect(error.type).toBe(UrlValidationErrorType.INVALID_DOMAIN);
            expect(error.url).toBe('https://invalid-domain');
            expect(error.context).toEqual({ domain: 'invalid-domain' });
        });
    });

    describe('UrlSecurityError', () => {
        it('should create security error', () => {
            const error = new UrlSecurityError('Security violation', {
                url: 'https://localhost',
                violation: 'localhost'
            });
            
            expect(error.message).toBe('Security violation');
            expect(error.name).toBe('UrlSecurityError');
            expect(error.type).toBe(UrlValidationErrorType.SECURITY_VIOLATION);
            expect(error.url).toBe('https://localhost');
            expect(error.context).toEqual({ violation: 'localhost' });
        });
    });

    describe('UrlFormatError', () => {
        it('should create format error', () => {
            const cause = new Error('Parse error');
            const error = new UrlFormatError('Invalid format', {
                url: 'invalid-url',
                cause
            });
            
            expect(error.message).toBe('Invalid format');
            expect(error.name).toBe('UrlFormatError');
            expect(error.type).toBe(UrlValidationErrorType.INVALID_FORMAT);
            expect(error.url).toBe('invalid-url');
            expect(error.cause).toBe(cause);
        });
    });

    describe('Error inheritance', () => {
        it('should inherit from UrlValidationError', () => {
            const protocolError = new UrlProtocolError('Protocol error');
            const domainError = new UrlDomainError('Domain error');
            const securityError = new UrlSecurityError('Security error');
            const formatError = new UrlFormatError('Format error');
            
            expect(protocolError).toBeInstanceOf(UrlValidationError);
            expect(domainError).toBeInstanceOf(UrlValidationError);
            expect(securityError).toBeInstanceOf(UrlValidationError);
            expect(formatError).toBeInstanceOf(UrlValidationError);
        });

        it('should inherit from Error', () => {
            const error = new UrlValidationError('Test', UrlValidationErrorType.INVALID_FORMAT);
            
            expect(error).toBeInstanceOf(Error);
            expect(error.stack).toBeDefined();
        });
    });
});