import fs from 'fs';
import path from 'path';
import {
    validateFilePath,
    validateImageExtension,
    validateImageFile,
    analyzeFilePath,
    loadCSVFromFile,
    readFileSecurely,
    fileExists,
    getFileStats,
    SUPPORTED_IMAGE_EXTENSIONS
} from '../operations';

// Mock the config module
jest.mock('../../config.js', () => ({
    getConfig: () => ({
        app: {
            screenshotDir: '/tmp/test-screenshots'
        }
    })
}));

// Mock the logger module
jest.mock('../../logger.js', () => ({
    createModuleLogger: () => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    })
}));

describe('File Operations', () => {
    // Create test files before tests
    const testDir = '/tmp/test-file-ops';
    const validImageFile = path.join(testDir, 'test.png');
    const invalidFile = path.join(testDir, 'test.txt');
    const csvFile = path.join(testDir, 'test.csv');

    beforeAll(() => {
        // Create test directory
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        
        // Create test files
        fs.writeFileSync(validImageFile, 'fake png content');
        fs.writeFileSync(invalidFile, 'text content');
        fs.writeFileSync(csvFile, 'url,name\nhttps://example.com,test\nhttps://test.com,test2');
    });

    afterAll(() => {
        // Clean up test files
        try {
            if (fs.existsSync(testDir)) {
                fs.rmSync(testDir, { recursive: true, force: true });
            }
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    describe('validateFilePath', () => {
        it('should accept valid file paths', () => {
            expect(() => validateFilePath('test.png')).not.toThrow();
            expect(() => validateFilePath('folder/test.jpg')).not.toThrow();
            expect(() => validateFilePath('deep/folder/test-file_123.png')).not.toThrow();
        });

        it('should reject empty or invalid input', () => {
            expect(() => validateFilePath('')).toThrow('Invalid file path: path must be a non-empty string');
            expect(() => validateFilePath(null as any)).toThrow('Invalid file path: path must be a non-empty string');
            expect(() => validateFilePath(undefined as any)).toThrow('Invalid file path: path must be a non-empty string');
            expect(() => validateFilePath(123 as any)).toThrow('Invalid file path: path must be a non-empty string');
        });

        it('should prevent directory traversal attacks', () => {
            expect(() => validateFilePath('../test.png')).toThrow('Invalid file path: path cannot contain ".." or "~"');
            expect(() => validateFilePath('../../etc/passwd')).toThrow('Invalid file path: path cannot contain ".." or "~"');
            expect(() => validateFilePath('~/test.png')).toThrow('Invalid file path: path cannot contain ".." or "~"');
            expect(() => validateFilePath('folder/../test.png')).toThrow('Invalid file path: path cannot contain ".." or "~"');
        });

        it('should reject unsafe characters', () => {
            expect(() => validateFilePath('test$.png')).toThrow('Invalid file path: path contains unsafe characters');
            expect(() => validateFilePath('test@file.png')).toThrow('Invalid file path: path contains unsafe characters');
            expect(() => validateFilePath('test file.png')).toThrow('Invalid file path: path contains unsafe characters');
            expect(() => validateFilePath('test;file.png')).toThrow('Invalid file path: path contains unsafe characters');
            expect(() => validateFilePath('test&file.png')).toThrow('Invalid file path: path contains unsafe characters');
        });

        it('should accept safe characters only', () => {
            expect(() => validateFilePath('test123.png')).not.toThrow();
            expect(() => validateFilePath('test_file-name.jpg')).not.toThrow();
            expect(() => validateFilePath('folder/subfolder/test.png')).not.toThrow();
            expect(() => validateFilePath('test.file.name.png')).not.toThrow();
        });
    });

    describe('validateImageExtension', () => {
        it('should accept supported image formats', () => {
            SUPPORTED_IMAGE_EXTENSIONS.forEach(ext => {
                expect(() => validateImageExtension(`test${ext}`)).not.toThrow();
                expect(() => validateImageExtension(`test${ext.toUpperCase()}`)).not.toThrow();
            });
        });

        it('should reject unsupported formats', () => {
            expect(() => validateImageExtension('test.txt')).toThrow('Unsupported image format: .txt');
            expect(() => validateImageExtension('test.pdf')).toThrow('Unsupported image format: .pdf');
            expect(() => validateImageExtension('test.doc')).toThrow('Unsupported image format: .doc');
            expect(() => validateImageExtension('test.js')).toThrow('Unsupported image format: .js');
        });

        it('should handle files without extensions', () => {
            expect(() => validateImageExtension('test')).toThrow('Unsupported image format: ');
        });
    });

    describe('validateImageFile', () => {
        it('should validate existing image files', () => {
            expect(() => validateImageFile(validImageFile)).not.toThrow();
        });

        it('should reject non-existent files', () => {
            expect(() => validateImageFile('/tmp/nonexistent.png')).toThrow('File does not exist');
        });

        it('should reject files with invalid paths', () => {
            expect(() => validateImageFile('../test.png')).toThrow('Invalid file path: path cannot contain ".." or "~"');
        });

        it('should reject unsupported file extensions', () => {
            expect(() => validateImageFile(invalidFile)).toThrow('Unsupported image format: .txt');
        });

        it('should reject directories', () => {
            // Create a directory that looks like an image file
            const dirWithImageName = path.join(testDir, 'fake.png');
            if (!fs.existsSync(dirWithImageName)) {
                fs.mkdirSync(dirWithImageName);
            }
            expect(() => validateImageFile(dirWithImageName)).toThrow('Path is not a file');
        });
    });

    describe('analyzeFilePath', () => {
        it('should construct paths with width suffixes', () => {
            const result = analyzeFilePath('test.png', 1024);
            expect(result).toMatch(/test_w1024\.png$/);
        });

        it('should handle paths with directories', () => {
            const result = analyzeFilePath('folder/test.png', 768);
            expect(result).toBe('folder/test_w768.png');
        });

        it('should add default extension if missing', () => {
            const result = analyzeFilePath('test', 1024);
            expect(result).toMatch(/test_w1024\.png$/);
        });

        it('should use screenshot directory for bare filenames', () => {
            const result = analyzeFilePath('test.png', 1024);
            expect(result).toBe('/tmp/test-screenshots/test_w1024.png');
        });

        it('should validate input parameters', () => {
            expect(() => analyzeFilePath('', 1024)).toThrow('Invalid file path: path must be a non-empty string');
            expect(() => analyzeFilePath('test.png', 0)).toThrow('Invalid width: width must be a positive number');
            expect(() => analyzeFilePath('test.png', -1)).toThrow('Invalid width: width must be a positive number');
            expect(() => analyzeFilePath('test.png', undefined as any)).toThrow('Invalid width: width must be a positive number');
        });

        it('should prevent directory traversal in constructed paths', () => {
            expect(() => analyzeFilePath('../test.png', 1024)).toThrow('Invalid file path: path cannot contain ".." or "~"');
        });
    });

    describe('loadCSVFromFile', () => {
        it('should load valid CSV files', () => {
            const content = loadCSVFromFile(csvFile);
            expect(content).toContain('url,name');
            expect(content).toContain('https://example.com,test');
        });

        it('should reject invalid file paths', () => {
            expect(() => loadCSVFromFile('../test.csv')).toThrow('Invalid file path: path cannot contain ".." or "~"');
        });

        it('should handle non-existent files', () => {
            expect(() => loadCSVFromFile('/tmp/nonexistent.csv')).toThrow('Failed to read CSV file');
        });

        it('should validate file path security', () => {
            expect(() => loadCSVFromFile('test$.csv')).toThrow('Invalid file path: path contains unsafe characters');
        });
    });

    describe('readFileSecurely', () => {
        it('should read existing files', () => {
            const content = readFileSecurely(csvFile);
            expect(content).toContain('url,name');
        });

        it('should validate file paths', () => {
            expect(() => readFileSecurely('../test.txt')).toThrow('Invalid file path: path cannot contain ".." or "~"');
        });

        it('should handle non-existent files', () => {
            expect(() => readFileSecurely('/tmp/nonexistent.txt')).toThrow('File does not exist');
        });
    });

    describe('fileExists', () => {
        it('should return true for existing files', () => {
            expect(fileExists(validImageFile)).toBe(true);
            expect(fileExists(csvFile)).toBe(true);
        });

        it('should return false for non-existent files', () => {
            expect(fileExists('/tmp/nonexistent.txt')).toBe(false);
        });

        it('should return false for invalid paths', () => {
            expect(fileExists('../test.txt')).toBe(false);
            expect(fileExists('test$.txt')).toBe(false);
        });

        it('should handle various input types safely', () => {
            expect(fileExists('')).toBe(false);
            expect(fileExists('~/test.txt')).toBe(false);
        });
    });

    describe('getFileStats', () => {
        it('should return stats for existing files', () => {
            const stats = getFileStats(validImageFile);
            expect(stats).toBeDefined();
            expect(stats.isFile()).toBe(true);
            expect(stats.size).toBeGreaterThan(0);
        });

        it('should validate file paths', () => {
            expect(() => getFileStats('../test.txt')).toThrow('Invalid file path: path cannot contain ".." or "~"');
        });

        it('should handle non-existent files', () => {
            expect(() => getFileStats('/tmp/nonexistent.txt')).toThrow('File does not exist');
        });
    });

    describe('SUPPORTED_IMAGE_EXTENSIONS', () => {
        it('should include common image formats', () => {
            expect(SUPPORTED_IMAGE_EXTENSIONS).toContain('.png');
            expect(SUPPORTED_IMAGE_EXTENSIONS).toContain('.jpg');
            expect(SUPPORTED_IMAGE_EXTENSIONS).toContain('.jpeg');
            expect(SUPPORTED_IMAGE_EXTENSIONS).toContain('.gif');
            expect(SUPPORTED_IMAGE_EXTENSIONS).toContain('.webp');
        });

        it('should be an array with at least 5 formats', () => {
            expect(Array.isArray(SUPPORTED_IMAGE_EXTENSIONS)).toBe(true);
            expect(SUPPORTED_IMAGE_EXTENSIONS.length).toBeGreaterThanOrEqual(5);
        });
    });
});