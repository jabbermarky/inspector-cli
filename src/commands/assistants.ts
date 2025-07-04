import { program } from 'commander';
import { getOpenAIAssistants } from '../genai.js';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('assistants');

program
    .command("assistants")
    .description("Get a list of available assistants")
    .action(async (_options) => {
        const response = await getOpenAIAssistants();
        if (response.list) {
            for (const assistant of response.list) {
                // CLI output is appropriate for user interaction
                console.log(`${assistant.id} - ${assistant.name}`);
            }
            logger.info('Listed OpenAI assistants', { count: response.list.length });
        }
        else if (response.error) {
            logger.error('Failed to fetch OpenAI assistants', {}, response.error);
            console.error('getOpenAIAssistants error: ', response.error);
            process.exit(1);
        }
    }
    );
