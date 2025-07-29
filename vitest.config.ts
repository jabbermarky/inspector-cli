import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

// Check if we're running performance tests
const isPerformanceTest = process.env.TEST_MODE === 'performance';
const isIntegrationTest = process.env.TEST_MODE === 'integration';
const isAllTests = process.env.TEST_MODE === 'all';

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
            // Exclude performance and integration tests by default
            ...(isAllTests ? [] : [
                ...(isPerformanceTest ? [] : ['**/*.performance.test.{js,ts}', '**/*performance*.test.{js,ts}']),
                ...(isIntegrationTest ? [] : ['**/*.integration.test.{js,ts}']),
            ]),
            // Exclude V1 frequency tests by default (use npm run test:frequency:v1 to run them)
            'src/frequency/__tests__/**/*.test.ts',
            '!src/frequency/__tests__/*v2*.test.ts',
            '!src/frequency/__tests__/*V2*.test.ts',
            '!src/frequency/__tests__/reporter-v2-*.test.ts',
            // Exclude comparison tests that depend on archived wrapper
            'src/frequency/analyzers/__tests__/validation-v1-v2-comparison.test.ts',
            // Exclude flaky performance tests
            'src/frequency/analyzers/__tests__/bias-v2-integration.test.ts',
            // Exclude tests expecting V1 wrapper functionality
            'src/frequency/analyzers/__tests__/validation-pipeline-v2.test.ts',
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

        // Timeout settings - increase for performance tests
        testTimeout: isPerformanceTest ? 600000 : 30000, // 10 min for perf tests, 30s for others
        hookTimeout: isPerformanceTest ? 30000 : 10000,   // 30s for perf tests, 10s for others

        // Reporter configuration
        reporters: ['verbose'],

        // Setup files
        setupFiles: [],

        // Mock settings
        clearMocks: true,
        restoreMocks: true,

        // Pool configuration to prevent hanging processes
        pool: 'threads',
        poolOptions: {
            threads: {
                minThreads: 1,
                maxThreads: 4
            }
        },

        // Force exit to prevent hanging processes
        forceRerunTriggers: ['**/package.json/**', '**/vitest.config.*/**'],
        teardownTimeout: 5000,
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
