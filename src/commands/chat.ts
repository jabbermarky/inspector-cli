import { program } from 'commander';
import { callChat } from '../genai.js';
import { createModuleLogger } from '../utils/logger.js';
import { validateImageFile } from '../utils/file/index.js';

const logger = createModuleLogger('chat');

program
    .command("chat")
    .description("Call the OpenAI chat API")
    .option('-m, --model <model>', 'Model to use', 'chatgpt-4o-latest')
    .argument('<screenshot...>', 'Screenshot file(s) to use')
    .action(async (screenshots: string[], _options) => {
        try {
            // Validate all screenshot files before processing
            logger.debug('Validating screenshot files', { count: screenshots.length });
            for (const screenshot of screenshots) {
                validateImageFile(screenshot);
            }
            logger.info('File validation passed for all screenshots');
        } catch (error) {
            logger.error('File validation failed', { error: (error as Error).message });
            console.error('Error:', (error as Error).message);
            process.exit(1);
        }
        
        const params = {
            model: _options.model,
            screenshot: screenshots,
        };
        logger.info('Starting chat API call', { model: params.model, screenshots: screenshots.length });
        const response = await callChat(params);
        if (response.content) {
            // CLI output is appropriate for user interaction
            console.log(response.content);
            logger.info('Chat API call completed successfully');
        } else if (response.error) {
            logger.error('Chat API call failed', { error: response.error });
            console.error('Chat error:', response.error);
            process.exit(1);
        }
    }
    );
