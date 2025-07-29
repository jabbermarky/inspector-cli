import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        include: [
            'src/frequency/__tests__/**/*.test.ts',
            // Exclude V2 tests
            '!src/frequency/__tests__/*v2*.test.ts',
            '!src/frequency/__tests__/*V2*.test.ts',
            '!src/frequency/__tests__/reporter-v2-*.test.ts',
        ],
        exclude: [
            'node_modules',
            'dist',
            'coverage',
            'src/**/*.integration.test.ts',
        ],
        coverage: {
            reporter: ['text', 'html'],
            exclude: [
                'coverage/**',
                'dist/**',
                '**/*.test.ts',
                '**/__tests__/**',
                '**/node_modules/**',
                'src/test-utils/**',
            ],
        },
    },
});