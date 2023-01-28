import path from 'node:path';

import meow from 'meow';

import { getFileList } from './input';
import { jsxScanner } from './jsx';
import { out } from './out';

const commands = meow({
	flags: {
		out: {
			type: 'string',
			isRequired: true,
			alias: 'O',
		},
		ignore: {
			type: 'string',
		},
	},
});

if (!commands.input.length) {
	commands.showHelp(1);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main().then(() => {
	process.exit(0);
});

async function main() {
	const files = await getFileList(commands.input);

	const jsxFiles = files.filter(filePath => /\.[jt]sx?$/.test(filePath));

	const pretenders = await jsxScanner(jsxFiles, {
		ignoreComponentNames: commands.flags.ignore?.split(',').map(s => s.trim()),
	});

	const outFilePath = path.resolve(process.cwd(), commands.flags.out);

	await out(outFilePath, pretenders);
}
