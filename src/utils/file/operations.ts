import { getConfig } from '../config.js';
import fs from 'fs';
import path from 'path';
import { createModuleLogger } from '../logger.js';

const logger = createModuleLogger('file-operations');

/**
 * Supported image file extensions for validation
 */
export const SUPPORTED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff'];

/**
 * Validates if a file path is safe and secure
 * Prevents directory traversal attacks and validates safe characters
 */
export function validateFilePath(filePath: string): void {
    // Input validation
    if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path: path must be a non-empty string');
    }

    // Security: Prevent directory traversal attacks
    if (filePath.includes('..') || filePath.includes('~')) {
        throw new Error('Invalid file path: path cannot contain ".." or "~"');
    }

    // Security: Restrict to safe characters
    const safePathRegex = /^[a-zA-Z0-9._/-]+$/;
    if (!safePathRegex.test(filePath)) {
        throw new Error('Invalid file path: path contains unsafe characters');
    }
}

/**
 * Validates if a file extension is supported for image operations
 */
export function validateImageExtension(filePath: string): void {
    const ext = path.extname(filePath).toLowerCase();
    if (!SUPPORTED_IMAGE_EXTENSIONS.includes(ext)) {
        throw new Error(`Unsupported image format: ${ext}. Supported formats: ${SUPPORTED_IMAGE_EXTENSIONS.join(', ')}`);
    }
}

/**
 * Comprehensive file validation for image files used in commands
 * Validates path security, file existence, and image format
 */
export function validateImageFile(filePath: string): void {
    // Validate path security
    validateFilePath(filePath);
    
    // Validate file extension
    validateImageExtension(filePath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`);
    }
    
    // Check if it's actually a file (not a directory)
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
        throw new Error(`Path is not a file: ${filePath}`);
    }
    
    logger.debug(`File validation passed for: ${filePath}`);
}

/**
 * Analyzes and constructs safe file path for screenshot operations
 * Includes security validation and width suffix handling
 */
export function analyzeFilePath(filePath: string, width: number): string {
    // Input validation
    if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path: path must be a non-empty string');
    }
    
    if (width === undefined || width <= 0) {
        throw new Error('Invalid width: width must be a positive number');
    }

    // Security validation
    validateFilePath(filePath);

    const ext = path.extname(filePath) || '.png';
    const base = path.basename(filePath, ext) + '_w' + width + ext;
    const dir = path.dirname(filePath);
    
    // Check if the filepath has a directory
    if (!dir || dir === '.') {
        filePath = path.join(getConfig().app.screenshotDir, base);
    } else {
        // Security: Ensure the resolved path is within safe boundaries
        const resolvedPath = path.resolve(dir, base);
        const safePath = path.resolve(getConfig().app.screenshotDir);
        
        if (!resolvedPath.startsWith(safePath) && !resolvedPath.startsWith(path.resolve('.'))) {
            throw new Error('Invalid file path: path must be within current directory or screenshot folder');
        }
        
        filePath = path.join(dir, base);
    }

    return filePath;
}

/**
 * Loads CSV file content with error handling and logging
 */
export function loadCSVFromFile(filePath: string): string {
    // Validate file path security first (before try-catch to preserve error message)
    validateFilePath(filePath);
    
    try {
        logger.debug(`Loading CSV file: ${filePath}`);
        const data = fs.readFileSync(filePath, 'utf8');
        logger.info(`Successfully loaded CSV file: ${filePath}`, { size: data.length });
        return data;
    } catch (err) {
        logger.error(`Failed to read CSV file: ${filePath}`, { filePath }, err as Error);
        throw new Error(`Failed to read CSV file: ${filePath}`);
    }
}

/**
 * Safely reads file content with validation
 */
export function readFileSecurely(filePath: string): string {
    validateFilePath(filePath);
    
    if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`);
    }
    
    return fs.readFileSync(filePath, 'utf8');
}

/**
 * Checks if a file exists and is accessible
 */
export function fileExists(filePath: string): boolean {
    try {
        validateFilePath(filePath);
        return fs.existsSync(filePath);
    } catch {
        return false;
    }
}

/**
 * Gets file stats with validation
 */
export function getFileStats(filePath: string): fs.Stats {
    validateFilePath(filePath);
    
    if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`);
    }
    
    return fs.statSync(filePath);
}