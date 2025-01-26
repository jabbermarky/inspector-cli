import { program } from 'commander';
import { getOpenAIAssistants } from '../genai.js';

program
    .command("assistants")
    .description("Get a list of available assistants")
    .action(async (_options) => {
        let response = await getOpenAIAssistants();
        if (response.list) {
            console.log;
            for (const assistant of response.list) {
                console.log(`${assistant.id} - ${assistant.name}`);
            }
        }
        else if (response.error) {
            console.error('getOpenAIAssistants error: ', response.error);
        }
    }
    );
