import { program } from 'commander';
import fs from 'fs';
import { validateBrandiJsonSchema } from '../brandi_json_schema.js';
import { callAssistant } from '../genai.js';
import { myParseDecimal, validJSON } from '../utils/utils.js';
import { createModuleLogger } from '../utils/logger.js';
import { validateImageFile } from '../utils/file/index.js';

const logger = createModuleLogger('assistant');

program
    .command("assistant")
    .description("Call the OpenAI assistant API")
    .option('-a, --assistant <assistant>', 'Specify the assistant to use')
    .option('-m, --model <model>', 'Model to use')
    .option('-t, --temperature <temperature>', 'Temperature to use', myParseDecimal)
    .option('-p, --top_p <top_p>', 'Top P to use')
    .option('-o, --outfile <outfile>', 'Save the output to a file')
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
        
        logger.info('Starting assistant API call', { screenshots: screenshots.length, options: _options });
        // if (_options.model) console.log('model', _options.model);
        // if (_options.assistant) console.log('assistant', _options.assistant);
        // if (_options.temperature) console.log('temperature', _options.temperature);
        // if (_options.top_p) console.log('top_p', _options.top_p);
        const params = {
            model: _options.model,
            screenshot: screenshots,
            assistant: _options.assistant,
            temperature: _options.temperature,
            top_p: _options.top_p,
        };
        const response = await callAssistant(params);
        if (response.data && Array.isArray(response.data)) {
            //      for (const message of messages.data.reverse()) {
            //        console.log(`${message.role} > `, message.content[0]);
            //      }
            for (const message of response.data) {
                if (message.role === "assistant") {
                    const content = message.content[0];
                    if (content.type === "text") {
                        const valueString = content.text.value;
                        if (validJSON(valueString) && validateBrandiJsonSchema(valueString)) {
                            const value = JSON.parse(valueString);
                            const output: {
                                model: string;
                                temperature?: number;
                                top_p?: string | number;
                                assistant?: string;
                                screenshots: string[];
                                tokens?: string | number;
                                value: any;
                            } = {
                                model: response.run && response.run.model ? response.run.model : '?',
                                temperature: response.run && response.run.temperature ? Number(response.run.temperature) : 0.0,
                                top_p: response.run && response.run.top_p ? response.run.top_p : '?',
                                assistant: response.run && response.run.assistant_id ? response.run.assistant_id : '?',
                                screenshots: screenshots,
                                tokens: response.run && response.run.usage ? response.run.usage.total_tokens.toString() : '?',
                                value,
                            };

                            // CLI output for user interaction
                            console.log(`site name: ${value.name}`);
                            console.log(`page type: ${value.page_type} - ${value.page_type_reason}`);
                            const methods = value.payment_methods.map((method: any) => {
                                return `${method.type} ${method.size} ${method.format}`;
                            }
                            );
                            console.log(`payment methods: ${methods.join(", ")}`);
                            console.log(`tokens used: ${response.run && response.run.usage ? response.run.usage.total_tokens : '?'}`);
                            console.log(`temperature: ${response.run && response.run.temperature ? response.run.temperature : '?'}`);
                            console.log(`model: ${response.run && response.run.model ? response.run.model : '?'}`);
                            console.log(`assistant: ${response.run && response.run.assistant_id ? response.run.assistant_id : '?'}`);
                            console.log(`top_p: ${response.run && response.run.top_p ? response.run.top_p : '?'}`);
                            
                            // Structured logging for monitoring
                            logger.info('Assistant analysis completed', {
                                siteName: value.name,
                                pageType: value.page_type,
                                paymentMethods: value.payment_methods.length,
                                tokensUsed: response.run?.usage?.total_tokens,
                                model: response.run?.model,
                                assistant: response.run?.assistant_id
                            });
                            
                            if (_options.outfile) {
                                fs.writeFileSync(_options.outfile, JSON.stringify(output, null, 2));
                                console.log(`Output written to ${_options.outfile}`);
                                logger.info('Output file written', { outfile: _options.outfile });
                            }
                        }
                        break;
                    }
                }
            }
        } else if (response.error) {
            logger.error('Assistant API call failed', { error: response.error });
            console.error('callAssistant error: ', response.error);
            process.exit(1);
        }
    }
    );
