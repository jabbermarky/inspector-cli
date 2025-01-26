import { program } from 'commander';
import { callChat } from '../genai.js';

program
    .command("chat")
    .description("Call the OpenAI chat API")
    .option('-m, --model <model>', 'Model to use', 'chatgpt-4o-latest')
    .argument('<screenshot...>', 'Screenshot file(s) to use')
    .action(async (screenshots: string[], _options) => {
        const params = {
            model: _options.model,
            screenshot: screenshots,
        };
        let response = await callChat(params);
        if (response.content) {
            console.log(response.content);
        }
    }
    );
