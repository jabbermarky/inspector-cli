import { getConfig } from '../config.js';
import { createModuleLogger } from '../logger.js';

const logger = createModuleLogger('browser-semaphore');

/**
 * Semaphore for controlling concurrent browser operations
 */
export class Semaphore {
    private tasks: (() => void)[] = [];
    private counter = 0;
    private readonly max: number;

    constructor(max: number) {
        this.max = max;
        logger.debug('Semaphore created', { maxConcurrency: max });
    }

    /**
     * Acquire a semaphore slot
     */
    async acquire(): Promise<void> {
        if (this.counter < this.max) {
            this.counter++;
            logger.debug('Semaphore acquired', { 
                current: this.counter, 
                max: this.max 
            });
            return;
        }

        logger.debug('Semaphore full, queuing request', { 
            current: this.counter, 
            max: this.max,
            queueSize: this.tasks.length 
        });
        
        return new Promise<void>(resolve => this.tasks.push(resolve));
    }

    /**
     * Release a semaphore slot
     */
    release(): void {
        if (this.tasks.length > 0) {
            const next = this.tasks.shift();
            if (next) {
                logger.debug('Semaphore released and given to queued request', { 
                    current: this.counter, 
                    max: this.max,
                    queueSize: this.tasks.length 
                });
                next();
            }
        } else if (this.counter > 0) {
            this.counter--;
            logger.debug('Semaphore released', { 
                current: this.counter, 
                max: this.max 
            });
        }
    }

    /**
     * Get current semaphore state
     */
    getState(): { current: number; max: number; queueSize: number } {
        return {
            current: this.counter,
            max: this.max,
            queueSize: this.tasks.length
        };
    }
}

/**
 * Create a semaphore with the configured maximum concurrency
 */
export function createSemaphore(maxConcurrency?: number): Semaphore {
    const max = maxConcurrency ?? getConfig().puppeteer.maxConcurrency;
    return new Semaphore(max);
}