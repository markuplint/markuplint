/**
 * CLI entry point for the pretenders scanner.
 * Accepts file glob patterns as input arguments and writes discovered
 * pretender mappings to a JSON output file.
 *
 * Usage: pretenders [options] <glob patterns...>
 * Flags:
 *   -O, --out <path>   Output file path (required)
 *   --ignore <names>   Comma-separated list of component names to ignore
 */

import path from 'node:path';

import meow from 'meow';

import { getFileList } from './input.js';
import { out } from './out.js';
import { scan } from './scan.js';

const commands = meow({
	importMeta: import.meta,
	flags: {
		out: {
			type: 'string',
			isRequired: true,
			shortFlag: 'O',
		},
		ignore: {
			type: 'string',
		},
	},
});

if (commands.input.length === 0) {
	commands.showHelp(1);
}

async function main() {
	const files = await getFileList(commands.input);

	const pretenders = await scan(files, {
		ignoreComponentNames: commands.flags.ignore?.split(',').map(s => s.trim()),
	});

	const outFilePath = path.resolve(process.cwd(), commands.flags.out);

	await out(outFilePath, pretenders);
}

await main();
