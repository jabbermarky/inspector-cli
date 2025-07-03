import { program } from 'commander';
import fs from 'fs';
import { validateBrandiJsonSchema } from '../brandi_json_schema.js';
import { callAssistant } from '../genai.js';
import { myParseDecimal, validJSON } from '../utils/utils.js';

program
    .command("eval")
    .description("evaluate an assistant against screenshots from a json file")
    .option('-o, --outfile <outfile>', 'Save the output to a file')
    .option('-t, --temperature <temperature>', 'Temperature to use', myParseDecimal)
    .option('-p, --top_p <top_p>', 'Top P to use')
    .argument('<assistant>', 'Specify the assistant to use')
    .argument('<infilename>', 'JSON file to use')
    .action(async (assistant: string, infilename: string, _options) => {
        console.log(`calling assistant ${assistant} with screenshots from ${infilename}:`)
    });
