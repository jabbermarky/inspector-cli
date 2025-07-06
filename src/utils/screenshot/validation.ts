import { createModuleLogger } from '../logger.js';
import { ScreenshotOptions, ScreenshotValidationError } from './types.js';

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
     * Validate URL format and protocol
     */
    private static validateUrl(url: string): void {
        if (!url || typeof url !== 'string') {
            throw new ScreenshotValidationError(
                'URL is required and must be a string',
                { field: 'url', value: url }
            );
        }

        if (url.trim().length === 0) {
            throw new ScreenshotValidationError(
                'URL cannot be empty',
                { field: 'url', value: url }
            );
        }

        let urlToParse = url;
        // If protocol is missing, add https:// for parsing
        if (!/^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//.test(url)) {
            urlToParse = `https://${url}`;
        }

        try {
            const urlObj = new URL(urlToParse);

            // Only allow http and https protocols, and require explicit protocol if present
            if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
                throw new ScreenshotValidationError(
                    `Invalid URL protocol: ${urlObj.protocol}. Only http and https are supported`,
                    { field: 'url', value: url }
                );
            }

            // If the original URL had a protocol, it must be http or https
            if (/^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//.test(url) &&
                urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
                throw new ScreenshotValidationError(
                    `Invalid URL protocol: ${urlObj.protocol}. Only http and https are supported`,
                    { field: 'url', value: url }
                );
            }

        } catch (error) {
            if (error instanceof ScreenshotValidationError) {
                throw error;
            }

            throw new ScreenshotValidationError(
                `Invalid URL format: ${url}`,
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
     * Normalize URL by adding protocol if missing
     */
    static normalizeUrl(url: string): string {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return `https://${url}`;
        }
        return url;
    }
}