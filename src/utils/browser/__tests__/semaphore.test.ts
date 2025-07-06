import { jest } from '@jest/globals';
import { Semaphore, createSemaphore } from '../semaphore.js';

// Mock dependencies
jest.mock('../../config.js', () => ({
    getConfig: jest.fn(() => ({
        puppeteer: {
            maxConcurrency: 2
        }
    }))
}));

jest.mock('../../logger.js', () => ({
    createModuleLogger: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }))
}));

describe('Semaphore', () => {
    describe('Constructor', () => {
        it('should create semaphore with specified max concurrency', () => {
            const semaphore = new Semaphore(3);
            const state = semaphore.getState();
            
            expect(state.max).toBe(3);
            expect(state.current).toBe(0);
            expect(state.queueSize).toBe(0);
        });

        it('should create semaphore with default max concurrency', () => {
            const semaphore = new Semaphore(2);
            const state = semaphore.getState();
            
            expect(state.max).toBe(2);
            expect(state.current).toBe(0);
            expect(state.queueSize).toBe(0);
        });
    });

    describe('Acquire and Release', () => {
        let semaphore: Semaphore;

        beforeEach(() => {
            semaphore = new Semaphore(2);
        });

        it('should acquire slots when available', async () => {
            await semaphore.acquire();
            expect(semaphore.getState().current).toBe(1);
            
            await semaphore.acquire();
            expect(semaphore.getState().current).toBe(2);
        });

        it('should queue requests when semaphore is full', async () => {
            // Fill the semaphore
            await semaphore.acquire();
            await semaphore.acquire();
            expect(semaphore.getState().current).toBe(2);
            
            // This should queue
            const acquirePromise = semaphore.acquire();
            expect(semaphore.getState().queueSize).toBe(1);
            
            // Release one slot
            semaphore.release();
            expect(semaphore.getState().current).toBe(2); // Still 2 because queued request took the slot
            expect(semaphore.getState().queueSize).toBe(0);
            
            // Wait for the queued request to complete
            await acquirePromise;
        });

        it('should release slots correctly', async () => {
            await semaphore.acquire();
            await semaphore.acquire();
            expect(semaphore.getState().current).toBe(2);
            
            semaphore.release();
            expect(semaphore.getState().current).toBe(1);
            
            semaphore.release();
            expect(semaphore.getState().current).toBe(0);
        });

        it('should handle multiple queued requests', async () => {
            // Fill the semaphore
            await semaphore.acquire();
            await semaphore.acquire();
            
            // Queue multiple requests
            const promises = [
                semaphore.acquire(),
                semaphore.acquire(),
                semaphore.acquire()
            ];
            
            expect(semaphore.getState().queueSize).toBe(3);
            
            // Release slots one by one
            semaphore.release();
            expect(semaphore.getState().queueSize).toBe(2);
            
            semaphore.release();
            expect(semaphore.getState().queueSize).toBe(1);
            
            semaphore.release();
            expect(semaphore.getState().queueSize).toBe(0);
            
            // Wait for all queued requests to complete
            await Promise.all(promises);
        });

        it('should handle concurrent acquire and release operations', async () => {
            // Fill the semaphore
            await semaphore.acquire();
            await semaphore.acquire();
            
            // Start multiple acquire operations
            const acquirePromises = Promise.all([
                semaphore.acquire(),
                semaphore.acquire()
            ]);
            
            // Wait a bit to ensure requests are queued
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(semaphore.getState().queueSize).toBe(2);
            
            // Release slots
            semaphore.release();
            semaphore.release();
            
            // Wait for all acquire operations to complete
            await acquirePromises;
            
            // All slots should be acquired again
            expect(semaphore.getState().current).toBe(2);
            expect(semaphore.getState().queueSize).toBe(0);
        });
    });

    describe('State Management', () => {
        let semaphore: Semaphore;

        beforeEach(() => {
            semaphore = new Semaphore(3);
        });

        it('should accurately track current state', async () => {
            let state = semaphore.getState();
            expect(state).toEqual({ current: 0, max: 3, queueSize: 0 });
            
            await semaphore.acquire();
            state = semaphore.getState();
            expect(state).toEqual({ current: 1, max: 3, queueSize: 0 });
            
            await semaphore.acquire();
            await semaphore.acquire();
            state = semaphore.getState();
            expect(state).toEqual({ current: 3, max: 3, queueSize: 0 });
            
            // Queue a request
            semaphore.acquire();
            state = semaphore.getState();
            expect(state).toEqual({ current: 3, max: 3, queueSize: 1 });
        });

        it('should maintain consistency during operations', async () => {
            // Fill semaphore and queue requests
            await semaphore.acquire();
            await semaphore.acquire();
            await semaphore.acquire();
            
            const queuedPromise = semaphore.acquire();
            expect(semaphore.getState().queueSize).toBe(1);
            
            // Release and check state
            semaphore.release();
            expect(semaphore.getState().current).toBe(3); // Queued request takes the slot
            expect(semaphore.getState().queueSize).toBe(0);
            
            await queuedPromise;
        });
    });

    describe('Error Handling', () => {
        it('should handle edge cases gracefully', () => {
            const semaphore = new Semaphore(1);
            
            // Release without acquiring should not cause negative counts
            semaphore.release();
            expect(semaphore.getState().current).toBe(0);
            
            // Multiple releases should not cause issues
            semaphore.release();
            semaphore.release();
            expect(semaphore.getState().current).toBe(0);
        });

        it('should handle zero max concurrency', () => {
            const semaphore = new Semaphore(0);
            expect(semaphore.getState().max).toBe(0);
            
            // Any acquire should queue
            semaphore.acquire();
            expect(semaphore.getState().queueSize).toBe(1);
        });
    });
});

describe('createSemaphore', () => {
    it('should create semaphore with default max concurrency from config', () => {
        const semaphore = createSemaphore();
        expect(semaphore.getState().max).toBe(2); // From mocked config
    });

    it('should create semaphore with specified max concurrency', () => {
        const semaphore = createSemaphore(5);
        expect(semaphore.getState().max).toBe(5);
    });

    it('should override config when max concurrency is provided', () => {
        const semaphore = createSemaphore(10);
        expect(semaphore.getState().max).toBe(10);
    });
});