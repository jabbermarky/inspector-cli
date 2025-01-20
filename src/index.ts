#!/usr/bin/env node
import process from 'process';
import figlet from 'figlet';
import fs from 'fs';


process.removeAllListeners('warning');
console.log(figlet.textSync('Inspector CLI'));

import { program } from "commander";
import {
    ScrapflyClient
} from 'scrapfly-sdk';

import { analyzeFilePath, loadCSVFromFile, myParseInt, parseCSV, segmentImageHeaderFooter, takeAScreenshotPuppeteer, validJSON } from './utils.js';
import { callAssistant, callChat, getOpenAIAssistants } from './genai.js';
import { validateBrandiJsonSchema } from './brandi_json_schema.js';

export const client = new ScrapflyClient({ key: "scp-live-6bd7f34dcc694950955a9ce85e4a823b" });

program
    .version("1.0.0")
    .summary("Inspector CLI")
    .description("Take a screen shot of a website");

program
    .command("screenshot")
    .description("Take a screenshot of url and save it to path")
    .argument('<url>', 'URL to take a screenshot of')
    .argument('<path>', 'Path to save the screenshot')
    .option('-w, --width <width>', 'Specify the width of the screenshot', myParseInt)
    .action((url, path, options) => {
        let width = options.width || 768;
        path = analyzeFilePath(path, width);
        console.log(`Taking a screenshot of ${url} with width ${width} and saving it to ${path}`);
        //takeAScreenshotScrapFly(url, path);

        takeAScreenshotPuppeteer(url, path, width);
    });

program
    .command("csv")
    .description("Take a screenshot of url and save it to path where URL and PATH are loaded from a CSV file")
    .argument('<csv_file>', 'csv file to read the urls and paths from')
    .action(async (csv_file, _options) => {
        const csvData = loadCSVFromFile(csv_file);
        const lines = parseCSV(csvData);
        lines.shift();  // skip the header
        for (const line of lines) {
            const url = line[0];
            const original_path = line[1];

            (async () => {
                await callScreenshot(url, original_path, 768);
                await callScreenshot(url, original_path, 1024);
                await callScreenshot(url, original_path, 1536);
            })();
        }
    });

program
    .command("footer")
    .alias("header")
    .description("Create image segments from the header and footer of an image")
    .argument('<filename>', 'Image file to process')
    .option('-h, --header <headerSize>', 'Size of the header segment', myParseInt, 1024)
    .option('-f, --footer <footerSize>', 'Size of the footer segment', myParseInt, 1024)
    .action(async (filename, _options) => {
        const header = _options.header;
        const footer = _options.footer;
        console.log(`Creating Header/Footer from image file ${filename}: header size ${header}, footer size ${footer}`);
        await segmentImageHeaderFooter(filename, { header, footer });
    });

program
    .command("chat")
    .description("Call the OpenAI chat API")
    .option('-m, --model <model>', 'Model to use', 'chatgpt-4o-latest')
    .argument('<screenshot...>', 'Screenshot file(s) to use')
    .action(async (screenshots: string[], _options) => {
        const params = {
            model: _options.model,
            screenshot: screenshots,
        }
        let response = await callChat(params);
        if (response.content) {
            console.log(response.content);
        }
    }
    );

program
    .command("assistants")
    .description("Get a list of available assistants")
    .action(async (_options) => {
        let response = await getOpenAIAssistants();
        if (response.list) {
            console.log
            for (const assistant of response.list) {
                console.log(`${assistant.id} - ${assistant.name}`);
            }
        }
        else if (response.error) {
            console.error('getOpenAIAssistants error: ', response.error);
        }
    }
    );

program
    .command("assistant")
    .description("Call the OpenAI assistant API")
    .option('-a, --assistant <assistant>', 'Specify the assistant to use')
    .option('-m, --model <model>', 'Model to use')
    .option('-o, --outfile <outfile>', 'Save the output to a file')
    .argument('<screenshot...>', 'Screenshot file(s) to use')
    .action(async (screenshots: string[], _options) => {
        console.log('call assistant', screenshots);
        console.log('model', _options.model);
        console.log('assistant', _options.assistant);
        const params = {
            model: _options.model,
            screenshot: screenshots,
            assistant: _options.assistant,
        }
        let response = await callAssistant(params);
        if (response.data && Array.isArray(response.data)) {
            //      for (const message of messages.data.reverse()) {
            //        console.log(`${message.role} > `, message.content[0]);
            //      }
            for (const message of response.data) {
                if (message.role === "assistant") {
                    const content = message.content[0];
                    if (content.type === "text") {
                        let valueString = content.text.value;
                        if (validJSON(valueString) && validateBrandiJsonSchema(valueString)) {
                            let value = JSON.parse(valueString);
                            let output: {
                                model: string
                                temperature?: string | number;
                                top_p?: string | number;
                                assistant?: string;
                                screenshots: string[];
                                tokens?: string | number;
                                value: any;
                            } = {
                                model: response.run && response.run.model ? response.run.model : '?',
                                temperature: response.run && response.run.temperature ? response.run.temperature.toString() : '?',
                                top_p: response.run && response.run.top_p ? response.run.top_p : '?',
                                assistant: response.run && response.run.assistant_id ? response.run.assistant_id : '?',
                                screenshots: screenshots,
                                tokens: response.run && response.run.usage ? response.run.usage.total_tokens.toString() : '?',
                                value,
                            };
                            
                            console.log(`site name: ${value.name}`);
                            console.log(`page type: ${value.page_type} - ${value.page_type_reason}`);
                            let methods = value.payment_methods.map((method: any) => {
                                return `${method.type} ${method.size} ${method.format}`;
                            }
                            );
                            console.log(`payment methods: ${methods.join(", ")}`);
                            console.log(`tokens used: ${response.run && response.run.usage ? response.run.usage.total_tokens : '?'}`);
                            console.log(`temperature: ${response.run && response.run.temperature ? response.run.temperature : '?'}`);
                            console.log(`model: ${response.run && response.run.model ? response.run.model : '?'}`);
                            console.log(`assistant: ${response.run && response.run.assistant_id ? response.run.assistant_id : '?'}`);
                            console.log(`top_p: ${response.run && response.run.top_p ? response.run.top_p : '?'}`);
                            if (_options.outfile) {
                                fs.writeFileSync(_options.outfile, JSON.stringify(output, null, 2));
                                console.log(`Output written to ${_options.outfile}`);
                            }
                        }
                        break;
                    }
                }
            }
        } else if (response.error) {
            console.error('callAssistant error: ', response.error);
        }
    }
    );

program.parse(process.argv);
program.showHelpAfterError();

if (!process.argv.slice(2).length) {
    program.outputHelp();
}

async function callScreenshot(url: string, original_path: string, width: number) {
    const path = analyzeFilePath(original_path, width);
    let callResult = await takeAScreenshotPuppeteer(url, path, width);
}

