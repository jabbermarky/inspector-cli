import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        // Global test configuration
        globals: true,
        environment: 'node',
        silent: 'passed-only',

        // Test file patterns
        include: ['**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/cypress/**',
            '**/.{idea,git,cache,output,temp}/**',
        ],

        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'coverage/**',
                'dist/**',
                'packages/*/test{,s}/**',
                '**/*.d.ts',
                'cypress/**',
                'test{,s}/**',
                'test{,-*}.{js,cjs,mjs,ts,tsx,jsx}',
                '**/*{.,-}test.{js,cjs,mjs,ts,tsx,jsx}',
                '**/*{.,-}spec.{js,cjs,mjs,ts,tsx,jsx}',
                '**/__tests__/**',
                '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress}.config.*',
                '**/.{eslint,mocha,prettier}rc.{js,cjs,yml}',
            ],
        },

        // Timeout settings
        testTimeout: 30000,
        hookTimeout: 10000,

        // Reporter configuration
        reporters: ['verbose'],

        // Setup files
        setupFiles: [],

        // Mock settings
        clearMocks: true,
        restoreMocks: true,
    },

    // Path resolution (for @test-utils alias)
    resolve: {
        alias: {
            '@test-utils': resolve(__dirname, './src/test-utils'),
            '@': resolve(__dirname, './src'),
        },
    },

    // Define global variables for TypeScript
    define: {
        'import.meta.vitest': undefined,
    },
});
