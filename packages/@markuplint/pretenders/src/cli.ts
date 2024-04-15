import path from 'node:path';

import meow from 'meow';

import { getFileList } from './input.js';
import { jsxScanner } from './jsx/index.js';
import { out } from './out.js';

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

	const pretenders = await jsxScanner(jsxFiles, {
		ignoreComponentNames: commands.flags.ignore?.split(',').map(s => s.trim()),
	});

	const outFilePath = path.resolve(process.cwd(), commands.flags.out);

	await out(outFilePath, pretenders);
}

await main();
