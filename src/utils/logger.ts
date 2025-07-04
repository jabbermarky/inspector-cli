import { createWriteStream, WriteStream } from 'fs';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    SILENT = 4
}

export interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    module?: string;
    data?: any;
    error?: Error;
}

export interface LoggerConfig {
    level: LogLevel;
    console: boolean;
    file?: string;
    format: 'json' | 'text';
    includeTimestamp: boolean;
    includeModule: boolean;
}

class Logger {
    private config: LoggerConfig;
    private fileStream?: WriteStream;

    constructor(config: Partial<LoggerConfig> = {}) {
        this.config = {
            level: LogLevel.INFO,
            console: true,
            format: 'text',
            includeTimestamp: true,
            includeModule: true,
            ...config
        };

        // Initialize file logging if specified
        if (this.config.file) {
            try {
                this.fileStream = createWriteStream(this.config.file, { flags: 'a' });
            } catch (error) {
                console.error('Failed to initialize file logging:', error);
            }
        }
    }

    private shouldLog(level: LogLevel): boolean {
        return level >= this.config.level;
    }

    private formatMessage(entry: LogEntry): string {
        if (this.config.format === 'json') {
            return JSON.stringify(entry);
        }

        // Text format
        let message = '';
        
        if (this.config.includeTimestamp) {
            message += `[${entry.timestamp}] `;
        }
        
        message += `${entry.level.toUpperCase()}`;
        
        if (this.config.includeModule && entry.module) {
            message += ` [${entry.module}]`;
        }
        
        message += `: ${entry.message}`;
        
        if (entry.data) {
            message += ` | Data: ${JSON.stringify(entry.data)}`;
        }
        
        if (entry.error) {
            message += ` | Error: ${entry.error.message}`;
            if (entry.error.stack) {
                message += `\nStack: ${entry.error.stack}`;
            }
        }
        
        return message;
    }

    private getColorForLevel(level: string): string {
        switch (level.toLowerCase()) {
            case 'debug': return '\x1b[36m'; // Cyan
            case 'info': return '\x1b[32m';  // Green
            case 'warn': return '\x1b[33m';  // Yellow
            case 'error': return '\x1b[31m'; // Red
            default: return '\x1b[0m';       // Reset
        }
    }

    private log(level: LogLevel, levelName: string, message: string, module?: string, data?: any, error?: Error): void {
        if (!this.shouldLog(level)) {
            return;
        }

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level: levelName,
            message,
            module,
            data,
            error
        };

        const formattedMessage = this.formatMessage(entry);

        // Console output with colors
        if (this.config.console) {
            const color = this.getColorForLevel(levelName);
            const resetColor = '\x1b[0m';
            console.log(`${color}${formattedMessage}${resetColor}`);
        }

        // File output
        if (this.fileStream) {
            this.fileStream.write(formattedMessage + '\n');
        }
    }

    debug(message: string, module?: string, data?: any): void {
        this.log(LogLevel.DEBUG, 'debug', message, module, data);
    }

    info(message: string, module?: string, data?: any): void {
        this.log(LogLevel.INFO, 'info', message, module, data);
    }

    warn(message: string, module?: string, data?: any, error?: Error): void {
        this.log(LogLevel.WARN, 'warn', message, module, data, error);
    }

    error(message: string, module?: string, data?: any, error?: Error): void {
        this.log(LogLevel.ERROR, 'error', message, module, data, error);
    }

    // Convenience methods for specific scenarios
    apiCall(method: string, url: string, module?: string, data?: any): void {
        this.debug(`API ${method} call to ${url}`, module, data);
    }

    apiResponse(method: string, url: string, status: number, module?: string, data?: any): void {
        const level = status >= 400 ? LogLevel.WARN : LogLevel.DEBUG;
        const levelName = status >= 400 ? 'warn' : 'debug';
        this.log(level, levelName, `API ${method} ${url} responded with ${status}`, module, data);
    }

    performance(operation: string, duration: number, module?: string): void {
        this.info(`Performance: ${operation} took ${duration}ms`, module, { duration, operation });
    }

    screenshot(url: string, path: string, width: number, module?: string): void {
        this.info(`Screenshot captured: ${url} -> ${path}`, module, { url, path, width });
    }

    // Configuration methods
    setLevel(level: LogLevel): void {
        this.config.level = level;
    }

    setFormat(format: 'json' | 'text'): void {
        this.config.format = format;
    }

    enableConsole(enabled: boolean): void {
        this.config.console = enabled;
    }

    // Update configuration
    updateConfig(newConfig: Partial<LoggerConfig>): void {
        // Close existing file stream if changing file
        if (newConfig.file && newConfig.file !== this.config.file) {
            this.close();
        }
        
        // Update configuration
        this.config = { ...this.config, ...newConfig };
        
        // Initialize new file stream if needed
        if (this.config.file && !this.fileStream) {
            try {
                this.fileStream = createWriteStream(this.config.file, { flags: 'a' });
            } catch (error) {
                console.error('Failed to initialize file logging:', error);
            }
        }
    }

    // Cleanup
    close(): void {
        if (this.fileStream) {
            this.fileStream.end();
        }
    }
}

// Create default logger instance with basic config
const defaultConfig: LoggerConfig = {
    level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
    console: true,
    format: 'text',
    includeTimestamp: true,
    includeModule: true,
    file: process.env.INSPECTOR_LOG_FILE
};

export const logger = new Logger(defaultConfig);

// Function to update logger configuration after config is loaded
export function updateLoggerConfig(config: Partial<LoggerConfig>): void {
    logger.updateConfig(config);
}

// Create logger factory for modules
export function createModuleLogger(moduleName: string): ModuleLogger {
    return new ModuleLogger(moduleName, logger);
}

class ModuleLogger {
    constructor(private moduleName: string, private logger: Logger) {}

    debug(message: string, data?: any): void {
        this.logger.debug(message, this.moduleName, data);
    }

    info(message: string, data?: any): void {
        this.logger.info(message, this.moduleName, data);
    }

    warn(message: string, data?: any, error?: Error): void {
        this.logger.warn(message, this.moduleName, data, error);
    }

    error(message: string, data?: any, error?: Error): void {
        this.logger.error(message, this.moduleName, data, error);
    }

    apiCall(method: string, url: string, data?: any): void {
        this.logger.apiCall(method, url, this.moduleName, data);
    }

    apiResponse(method: string, url: string, status: number, data?: any): void {
        this.logger.apiResponse(method, url, status, this.moduleName, data);
    }

    performance(operation: string, duration: number): void {
        this.logger.performance(operation, duration, this.moduleName);
    }

    screenshot(url: string, path: string, width: number): void {
        this.logger.screenshot(url, path, width, this.moduleName);
    }
}

export default logger;