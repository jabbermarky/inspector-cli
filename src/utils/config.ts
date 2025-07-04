import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createModuleLogger, updateLoggerConfig, LogLevel } from './logger.js';

const logger = createModuleLogger('config');

export interface InspectorConfig {
  // OpenAI Configuration
  openai: {
    apiKey: string;
    model: string;
    temperature: number;
    topP: number;
    maxTokens: number;
  };
  
  // Puppeteer Configuration
  puppeteer: {
    headless: boolean;
    timeout: number;
    viewport: {
      width: number;
      height: number;
    };
    userAgent: string;
    blockAds: boolean;
    blockImages: boolean;
    maxConcurrency: number;
  };
  
  // Application Configuration
  app: {
    environment: 'development' | 'production' | 'test';
    screenshotDir: string;
    logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'SILENT';
    logFile?: string;
    logFormat: 'text' | 'json';
  };
  
  // API Configuration
  api: {
    retryAttempts: number;
    retryDelay: number;
    requestTimeout: number;
    enableCaching: boolean;
    cacheDir?: string;
  };
}

export class ConfigValidator {
  private static validateOpenAIConfig(config: any, strict: boolean = false): void {
    // Only require API key in strict mode (when actually using OpenAI features)
    if (strict && !config.openai?.apiKey) {
      throw new Error('OPENAI_API_KEY is required for AI-powered commands. Please set it in your environment or .env file.');
    }
    
    // Validate API key format only if it's provided and not empty
    if (config.openai?.apiKey && config.openai.apiKey.length > 0) {
      if (typeof config.openai.apiKey !== 'string') {
        throw new Error('OPENAI_API_KEY must be a string');
      }
      
      if (!config.openai.apiKey.startsWith('sk-')) {
        throw new Error('OPENAI_API_KEY must start with "sk-"');
      }
    }
    
    // Always validate other OpenAI config parameters
    if (config.openai.temperature < 0 || config.openai.temperature > 2) {
      throw new Error('OpenAI temperature must be between 0 and 2');
    }
    
    if (config.openai.topP < 0 || config.openai.topP > 1) {
      throw new Error('OpenAI topP must be between 0 and 1');
    }
    
    if (config.openai.maxTokens < 1 || config.openai.maxTokens > 128000) {
      throw new Error('OpenAI maxTokens must be between 1 and 128000');
    }
  }
  
  private static validatePuppeteerConfig(config: any): void {
    if (config.puppeteer.timeout < 1000) {
      throw new Error('Puppeteer timeout must be at least 1000ms');
    }
    
    if (config.puppeteer.viewport.width < 320 || config.puppeteer.viewport.width > 3840) {
      throw new Error('Puppeteer viewport width must be between 320 and 3840');
    }
    
    if (config.puppeteer.viewport.height < 240 || config.puppeteer.viewport.height > 2160) {
      throw new Error('Puppeteer viewport height must be between 240 and 2160');
    }
    
    if (config.puppeteer.maxConcurrency < 1 || config.puppeteer.maxConcurrency > 10) {
      throw new Error('Puppeteer maxConcurrency must be between 1 and 10');
    }
  }
  
  private static validateAppConfig(config: any): void {
    const validEnvironments = ['development', 'production', 'test'];
    if (!validEnvironments.includes(config.app.environment)) {
      throw new Error(`App environment must be one of: ${validEnvironments.join(', ')}`);
    }
    
    const validLogLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'SILENT'];
    if (!validLogLevels.includes(config.app.logLevel)) {
      throw new Error(`App logLevel must be one of: ${validLogLevels.join(', ')}`);
    }
    
    const validLogFormats = ['text', 'json'];
    if (!validLogFormats.includes(config.app.logFormat)) {
      throw new Error(`App logFormat must be one of: ${validLogFormats.join(', ')}`);
    }
    
    if (typeof config.app.screenshotDir !== 'string' || config.app.screenshotDir.length === 0) {
      throw new Error('App screenshotDir must be a non-empty string');
    }
  }
  
  private static validateAPIConfig(config: any): void {
    if (config.api.retryAttempts < 0 || config.api.retryAttempts > 10) {
      throw new Error('API retryAttempts must be between 0 and 10');
    }
    
    if (config.api.retryDelay < 100 || config.api.retryDelay > 30000) {
      throw new Error('API retryDelay must be between 100 and 30000ms');
    }
    
    if (config.api.requestTimeout < 1000 || config.api.requestTimeout > 300000) {
      throw new Error('API requestTimeout must be between 1000 and 300000ms');
    }
  }
  
  public static validate(config: any, strictOpenAI: boolean = false): void {
    logger.debug('Validating configuration', { strictOpenAI });
    
    this.validateOpenAIConfig(config, strictOpenAI);
    this.validatePuppeteerConfig(config);
    this.validateAppConfig(config);
    this.validateAPIConfig(config);
    
    logger.debug('Configuration validation completed');
  }
  
  public static validateForOpenAI(config: any): void {
    logger.debug('Validating configuration for OpenAI usage');
    this.validateOpenAIConfig(config, true);
  }
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: InspectorConfig;
  
  private constructor() {
    this.config = this.loadConfiguration();
  }
  
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }
  
  public getConfig(): InspectorConfig {
    return this.config;
  }
  
  public reloadConfig(): void {
    logger.info('Reloading configuration');
    this.config = this.loadConfiguration();
  }
  
  private loadConfiguration(): InspectorConfig {
    logger.debug('Loading configuration');
    
    // Load environment variables
    const envConfig = this.loadEnvironmentConfig();
    
    // Load config file if it exists
    const fileConfig = this.loadConfigFile();
    
    // Merge configurations (env takes precedence)
    const mergedConfig = this.mergeConfigurations(fileConfig, envConfig);
    
    // Validate the final configuration
    ConfigValidator.validate(mergedConfig);
    
    // Update logger configuration based on loaded config
    updateLoggerConfig({
      level: LogLevel[mergedConfig.app.logLevel],
      file: mergedConfig.app.logFile,
      format: mergedConfig.app.logFormat
    });
    
    logger.info('Configuration loaded successfully', {
      environment: mergedConfig.app.environment,
      logLevel: mergedConfig.app.logLevel,
      model: mergedConfig.openai.model
    });
    
    return mergedConfig;
  }
  
  private loadEnvironmentConfig(): Partial<InspectorConfig> {
    const env = process.env;
    
    return {
      openai: {
        apiKey: env.OPENAI_API_KEY || '',
        model: env.OPENAI_MODEL || 'gpt-4o',
        temperature: parseFloat(env.OPENAI_TEMPERATURE || '0.7'),
        topP: parseFloat(env.OPENAI_TOP_P || '1.0'),
        maxTokens: parseInt(env.OPENAI_MAX_TOKENS || '4096', 10)
      },
      puppeteer: {
        headless: env.PUPPETEER_HEADLESS !== 'false',
        timeout: parseInt(env.PUPPETEER_TIMEOUT || '30000', 10),
        viewport: {
          width: parseInt(env.PUPPETEER_WIDTH || '1024', 10),
          height: parseInt(env.PUPPETEER_HEIGHT || '768', 10)
        },
        userAgent: env.PUPPETEER_USER_AGENT || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        blockAds: env.PUPPETEER_BLOCK_ADS !== 'false',
        blockImages: env.PUPPETEER_BLOCK_IMAGES === 'true',
        maxConcurrency: parseInt(env.PUPPETEER_MAX_CONCURRENCY || '2', 10)
      },
      app: {
        environment: (env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
        screenshotDir: env.SCREENSHOT_DIR || './scrapes',
        logLevel: (env.LOG_LEVEL as 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'SILENT') || 
                  (env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG'),
        logFile: env.INSPECTOR_LOG_FILE,
        logFormat: (env.LOG_FORMAT as 'text' | 'json') || 'text'
      },
      api: {
        retryAttempts: parseInt(env.API_RETRY_ATTEMPTS || '3', 10),
        retryDelay: parseInt(env.API_RETRY_DELAY || '1000', 10),
        requestTimeout: parseInt(env.API_REQUEST_TIMEOUT || '60000', 10),
        enableCaching: env.API_ENABLE_CACHING === 'true',
        cacheDir: env.API_CACHE_DIR
      }
    };
  }
  
  private loadConfigFile(): Partial<InspectorConfig> {
    const configPaths = [
      './inspector.config.json',
      './config/inspector.json',
      join(process.cwd(), 'inspector.config.json')
    ];
    
    for (const configPath of configPaths) {
      if (existsSync(configPath)) {
        try {
          logger.debug('Loading config file', { path: configPath });
          const fileContent = readFileSync(configPath, 'utf8');
          const config = JSON.parse(fileContent);
          logger.debug('Config file loaded successfully', { path: configPath });
          return config;
        } catch (error) {
          logger.warn('Failed to load config file', { path: configPath }, error as Error);
        }
      }
    }
    
    logger.debug('No config file found, using defaults');
    return {};
  }
  
  private mergeConfigurations(fileConfig: Partial<InspectorConfig>, envConfig: Partial<InspectorConfig>): InspectorConfig {
    const defaults: InspectorConfig = {
      openai: {
        apiKey: '',
        model: 'gpt-4o',
        temperature: 0.7,
        topP: 1.0,
        maxTokens: 4096
      },
      puppeteer: {
        headless: true,
        timeout: 30000,
        viewport: {
          width: 1024,
          height: 768
        },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        blockAds: true,
        blockImages: false,
        maxConcurrency: 2
      },
      app: {
        environment: 'development',
        screenshotDir: './scrapes',
        logLevel: 'DEBUG',
        logFormat: 'text'
      },
      api: {
        retryAttempts: 3,
        retryDelay: 1000,
        requestTimeout: 60000,
        enableCaching: false
      }
    };
    
    // Deep merge configurations: defaults < file < environment
    return {
      openai: {
        ...defaults.openai,
        ...fileConfig.openai,
        ...envConfig.openai
      },
      puppeteer: {
        ...defaults.puppeteer,
        ...fileConfig.puppeteer,
        ...envConfig.puppeteer,
        viewport: {
          ...defaults.puppeteer.viewport,
          ...fileConfig.puppeteer?.viewport,
          ...envConfig.puppeteer?.viewport
        }
      },
      app: {
        ...defaults.app,
        ...fileConfig.app,
        ...envConfig.app
      },
      api: {
        ...defaults.api,
        ...fileConfig.api,
        ...envConfig.api
      }
    };
  }
}

// Convenience function for getting configuration
export function getConfig(): InspectorConfig {
  return ConfigManager.getInstance().getConfig();
}

// Convenience function for reloading configuration
export function reloadConfig(): void {
  ConfigManager.getInstance().reloadConfig();
}