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
