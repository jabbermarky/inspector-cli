#!/usr/bin/env node
import dotenv from 'dotenv';

// Load environment variables from .env file BEFORE any other imports
dotenv.config();

import process from 'process';
import figlet from 'figlet';

process.removeAllListeners('warning');
// Banner output is appropriate for CLI applications
console.log(figlet.textSync('Inspector CLI'));

import { program } from "commander";

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
import './commands/analyze.js';
import './commands/analyze-blocking.js';
import './commands/generate.js';

program.parse(process.argv);
program.showHelpAfterError();

if (!process.argv.slice(2).length) {
    program.outputHelp();
}


