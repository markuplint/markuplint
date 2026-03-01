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
import { jsxScanner } from './jsx/index.js';
import { out } from './out.js';
import { templateScanner } from './template/index.js';

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

	const jsxFiles = files.filter(filePath => /\.[jt]sx?$/.test(filePath));
	const templateFiles = files.filter(filePath => /\.(?:vue|svelte|astro)$/.test(filePath));

	const ignoreComponentNames = commands.flags.ignore?.split(',').map(s => s.trim());

	const [jsxPretenders, templatePretenders] = await Promise.all([
		jsxFiles.length > 0 ? jsxScanner(jsxFiles, { ignoreComponentNames }) : Promise.resolve([]),
		templateFiles.length > 0 ? templateScanner(templateFiles, { ignoreComponentNames }) : Promise.resolve([]),
	]);

	const pretenders = [...jsxPretenders, ...templatePretenders].toSorted((a, b) => {
		const nameA = a.selector.toLowerCase();
		const nameB = b.selector.toLowerCase();
		if (nameA < nameB) return -1;
		if (nameA > nameB) return 1;
		return 0;
	});

	const outFilePath = path.resolve(process.cwd(), commands.flags.out);

	await out(outFilePath, pretenders);
}

await main();
