import { program } from 'commander';
import { getSupportedModels } from '../learn/model-providers.js';
import { createModuleLogger } from '../utils/logger.js';
import chalk from 'chalk';

const logger = createModuleLogger('models-command');

program
    .command('models')
    .description('Display a list of supported LLM models for the learn command')
    .option('--json', 'Output in JSON format')
    .option('--provider <provider>', 'Filter by provider (openai or gemini)')
    .action((options) => {
        try {
            logger.info('Displaying supported models', { options });
            
            const supportedModels = getSupportedModels();
            
            if (options.json) {
                // JSON output
                const output = options.provider 
                    ? { [options.provider]: supportedModels[options.provider as keyof typeof supportedModels] || [] }
                    : supportedModels;
                console.log(JSON.stringify(output, null, 2));
                return;
            }
            
            // Console output with formatting
            console.log('\n' + chalk.bold.cyan('Supported LLM Models for Learn Command'));
            console.log('=' .repeat(50));
            
            // Filter models based on provider option
            const providers = options.provider 
                ? [options.provider as keyof typeof supportedModels]
                : ['openai', 'gemini'] as const;
            
            for (const provider of providers) {
                if (!supportedModels[provider]) continue;
                
                const models = supportedModels[provider];
                const providerName = provider === 'openai' ? 'OpenAI' : 'Google Gemini';
                
                console.log('\n' + chalk.bold.yellow(`${providerName} Models:`));
                console.log('-'.repeat(30));
                
                // Group models by family for better organization
                if (provider === 'openai') {
                    // Group OpenAI models
                    const gpt4Models = models.filter(m => m.startsWith('gpt-4'));
                    const gpt35Models = models.filter(m => m.startsWith('gpt-3.5'));
                    
                    if (gpt4Models.length > 0) {
                        console.log(chalk.green('  GPT-4 Family:'));
                        gpt4Models.forEach(model => {
                            console.log(`    ${chalk.white(model)}`);
                        });
                    }
                    
                    if (gpt35Models.length > 0) {
                        console.log(chalk.green('  GPT-3.5 Family:'));
                        gpt35Models.forEach(model => {
                            console.log(`    ${chalk.white(model)}`);
                        });
                    }
                } else if (provider === 'gemini') {
                    // Group Gemini models
                    const gemini25Models = models.filter(m => m.includes('2.5'));
                    const gemini20Models = models.filter(m => m.includes('2.0'));
                    const gemini15Models = models.filter(m => m.includes('1.5'));
                    const geminiProModels = models.filter(m => m.includes('pro') && !m.includes('1.5') && !m.includes('2.'));
                    
                    if (gemini25Models.length > 0) {
                        console.log(chalk.green('  Gemini 2.5 Family:'));
                        gemini25Models.forEach(model => {
                            const isPreview = model.includes('preview');
                            const displayModel = isPreview ? `${model} ${chalk.yellow('(preview)')}` : model;
                            console.log(`    ${chalk.white(displayModel)}`);
                        });
                    }
                    
                    if (gemini20Models.length > 0) {
                        console.log(chalk.green('  Gemini 2.0 Family:'));
                        gemini20Models.forEach(model => {
                            console.log(`    ${chalk.white(model)}`);
                        });
                    }
                    
                    if (gemini15Models.length > 0) {
                        console.log(chalk.green('  Gemini 1.5 Family:'));
                        gemini15Models.forEach(model => {
                            console.log(`    ${chalk.white(model)}`);
                        });
                    }
                    
                    if (geminiProModels.length > 0) {
                        console.log(chalk.green('  Gemini Pro Family:'));
                        geminiProModels.forEach(model => {
                            console.log(`    ${chalk.white(model)}`);
                        });
                    }
                }
                
                console.log(`\n  ${chalk.dim(`Total ${providerName} models: ${models.length}`)}`);
            }
            
            console.log('\n' + chalk.bold.blue('Usage Examples:'));
            console.log(chalk.gray('  # Use OpenAI GPT-4 model'));
            console.log('  node dist/index.js learn <url> --model gpt-4o');
            console.log('');
            console.log(chalk.gray('  # Use Google Gemini model'));
            console.log('  node dist/index.js learn <url> --model gemini-2.5-flash');
            console.log('');
            console.log(chalk.gray('  # Use with meta-analysis'));
            console.log('  node dist/index.js learn --meta-analysis --model gemini-2.0-flash');
            console.log('');
            console.log(chalk.gray('  # Use Gemini 2.5 Flash-Lite (preview)'));
            console.log('  node dist/index.js learn <url> --model gemini-2.5-flash-lite-preview-06-17');
            console.log('');
            console.log(chalk.dim('Note: Model availability depends on API keys being configured.'));
            console.log(chalk.dim('      Preview models may have different capabilities or limitations.'));
            console.log('');
            
            logger.info('Models display completed successfully');
        } catch (error) {
            logger.error('Error displaying models', { error: (error as Error).message });
            console.error(chalk.red('Error displaying models:'), (error as Error).message);
            process.exit(1);
        }
    });