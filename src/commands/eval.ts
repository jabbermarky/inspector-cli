import { program } from 'commander';
import { myParseDecimal } from '../utils/utils.js';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('eval');

program
    .command("eval")
    .description("evaluate an assistant against screenshots from a json file")
    .option('-o, --outfile <outfile>', 'Save the output to a file')
    .option('-t, --temperature <temperature>', 'Temperature to use', myParseDecimal)
    .option('-p, --top_p <top_p>', 'Top P to use')
    .argument('<assistant>', 'Specify the assistant to use')
    .argument('<infilename>', 'JSON file to use')
    .action(async (assistant: string, infilename: string, _options) => {
        logger.info('Starting evaluation', { assistant, infilename, options: _options });
        // TODO: Implement evaluation logic
        console.log(`calling assistant ${assistant} with screenshots from ${infilename}:`);
        logger.warn('Evaluation command not yet implemented');
    });
