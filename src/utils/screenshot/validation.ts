import { createModuleLogger } from '../logger.js';
import { ScreenshotOptions, ScreenshotValidationError } from './types.js';
import { 
    validateUrl as validateUrlShared, 
    normalizeUrl as normalizeUrlShared,
    UrlValidationError 
} from '../url/index.js';

const logger = createModuleLogger('screenshot-validation');

/**
 * Comprehensive validation for screenshot options
 */
export class ScreenshotValidator {
    /**
     * Validate all screenshot options
     * @param options Screenshot options to validate
     * @throws ScreenshotValidationError if validation fails
     */
    static validate(options: ScreenshotOptions): void {
        logger.debug('Validating screenshot options', { 
            url: options.url, 
            path: options.path, 
            width: options.width 
        });
        
        this.validateUrl(options.url);
        this.validatePath(options.path);
        this.validateWidth(options.width);
        
        if (options.timeout !== undefined) {
            this.validateTimeout(options.timeout);
        }
        
        logger.debug('Screenshot options validation passed');
    }
    
    /**
     * Validate URL format and protocol using shared URL validation
     */
    private static validateUrl(url: string): void {
        try {
            // Use shared URL validation with development-friendly context
            const context = {
                environment: 'development' as const,
                allowLocalhost: true,
                allowPrivateIPs: true,
                allowCustomPorts: true,
                defaultProtocol: 'http' as const // Use HTTP default as per revised plan
            };
            
            validateUrlShared(url, { context });
        } catch (error) {
            // Convert shared URL validation errors to screenshot validation errors
            if (error instanceof UrlValidationError) {
                throw new ScreenshotValidationError(
                    error.message,
                    { field: 'url', value: url, cause: error }
                );
            }
            
            // Handle any other errors
            throw new ScreenshotValidationError(
                `URL validation failed: ${(error as Error).message}`,
                { field: 'url', value: url, cause: error as Error }
            );
        }
    }
    
    /**
     * Validate output file path
     */
    private static validatePath(path: string): void {
        if (!path || typeof path !== 'string') {
            throw new ScreenshotValidationError(
                'Path is required and must be a string',
                { field: 'path', value: path }
            );
        }
        
        if (path.trim().length === 0) {
            throw new ScreenshotValidationError(
                'Path cannot be empty',
                { field: 'path', value: path }
            );
        }
        
        // Basic path security validation
        if (path.includes('..')) {
            throw new ScreenshotValidationError(
                'Path cannot contain ".." for security reasons',
                { field: 'path', value: path }
            );
        }
        
        // Validate file extension for screenshots
        const validExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
        const hasValidExtension = validExtensions.some(ext => 
            path.toLowerCase().endsWith(ext)
        );
        
        if (!hasValidExtension) {
            throw new ScreenshotValidationError(
                `Path must end with a valid image extension: ${validExtensions.join(', ')}`,
                { field: 'path', value: path }
            );
        }
    }
    
    /**
     * Validate viewport width
     */
    private static validateWidth(width: number): void {
        if (width === undefined || width === null) {
            throw new ScreenshotValidationError(
                'Width is required',
                { field: 'width', value: width }
            );
        }
        
        if (typeof width !== 'number' || isNaN(width)) {
            throw new ScreenshotValidationError(
                'Width must be a valid number',
                { field: 'width', value: width }
            );
        }
        
        if (width <= 0) {
            throw new ScreenshotValidationError(
                'Width must be greater than 0',
                { field: 'width', value: width }
            );
        }
        
        if (width < 320) {
            throw new ScreenshotValidationError(
                'Width must be at least 320 pixels',
                { field: 'width', value: width }
            );
        }
        
        if (width > 3840) {
            throw new ScreenshotValidationError(
                'Width cannot exceed 3840 pixels',
                { field: 'width', value: width }
            );
        }
        
        if (!Number.isInteger(width)) {
            throw new ScreenshotValidationError(
                'Width must be an integer',
                { field: 'width', value: width }
            );
        }
    }
    
    /**
     * Validate timeout value
     */
    private static validateTimeout(timeout: number): void {
        if (typeof timeout !== 'number' || isNaN(timeout)) {
            throw new ScreenshotValidationError(
                'Timeout must be a valid number',
                { field: 'timeout', value: timeout }
            );
        }
        
        if (timeout <= 0) {
            throw new ScreenshotValidationError(
                'Timeout must be greater than 0',
                { field: 'timeout', value: timeout }
            );
        }
        
        if (timeout < 1000) {
            throw new ScreenshotValidationError(
                'Timeout must be at least 1000ms (1 second)',
                { field: 'timeout', value: timeout }
            );
        }
        
        if (timeout > 300000) {
            throw new ScreenshotValidationError(
                'Timeout cannot exceed 300000ms (5 minutes)',
                { field: 'timeout', value: timeout }
            );
        }
    }
    
    /**
     * Normalize URL by adding protocol if missing (uses shared URL normalization)
     */
    static normalizeUrl(url: string): string {
        const context = {
            defaultProtocol: 'http' as const // Use HTTP default as per revised plan
        };
        
        return normalizeUrlShared(url, context);
    }
}