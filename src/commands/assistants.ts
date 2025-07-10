import { program } from 'commander';
import { getOpenAIAssistants } from '../genai.js';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('assistants');

/**
 * List available OpenAI assistants
 */
export async function listAssistants(): Promise<void> {
    try {
        logger.info('Fetching OpenAI assistants list');
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
    } catch (error) {
        logger.error('Unexpected error fetching assistants', { error: (error as Error).message });
        console.error('Error fetching assistants:', (error as Error).message);
        process.exit(1);
    }
}

program
    .command("assistants")
    .description("Get a list of available assistants")
    .action(async (_options) => {
        await listAssistants();
    });
