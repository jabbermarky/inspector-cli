#!/usr/bin/env node
import process from 'process';
import figlet from 'figlet';


process.removeAllListeners('warning');
console.log(figlet.textSync('Inspector CLI'));

import { program } from "commander";
// import {
//     ScrapflyClient
// } from 'scrapfly-sdk';


//export const client = new ScrapflyClient({ key: "scp-live-6bd7f34dcc694950955a9ce85e4a823b" });

program
    .version("1.0.0")
    .summary("Inspector CLI")
    .description("Various tools to analyze websites");

import './commands/screenshot.js';
import './commands/csv.js';
import './commands/footer.js';
import './commands/chat.js';
import './commands/assistants.js';
import './commands/assistant.js';
import './commands/eval.js';
import './commands/detect_cms.js';

program.parse(process.argv);
program.showHelpAfterError();

if (!process.argv.slice(2).length) {
    program.outputHelp();
}


