import { text } from 'node:stream/consumers';

import { verbosely } from '../debug.js';

import { cli } from './bootstrap.js';
import { command } from './command.js';
import { initialize } from './init/index.js';
import { search } from './search/index.js';

/* eslint-disable unicorn/no-process-exit */

if (cli.flags.v) {
	cli.showVersion(); // And exit successfully.
}

if (cli.flags.h) {
	cli.showHelp(0); // And exit successfully.
}

if (cli.flags.verbose) {
	verbosely();
}

if (cli.flags.init) {
	await initialize().catch(error => {
		process.stderr.write(error + '\n');
		process.exit(1);
	});
	process.exit(0);
}

if (cli.flags.createRule) {
	process.stderr.write("Use to run 'npx @markuplint/create-rule' instead of 'markuplint --create-rule'.\n");
	process.exit(1);
}

const files = cli.input;
if (files.length > 0) {
	if (cli.flags.search) {
		await search(files, cli.flags, cli.flags.search).catch(error => {
			process.stderr.write(error + '\n');
			process.exit(1);
		});
		process.exit(0);
	}

	const hasError = await command(files, cli.flags).catch(error => {
		throw error;
	});
	process.exit(hasError ? 1 : 0);
}

if (usePipe()) {
	const stdin = await text(process.stdin).catch(error => {
		// eslint-disable-next-line no-console
		console.warn(error);
		process.exit(1);
	});
	if (!stdin) {
		// result is empty
		cli.showHelp(1);
	}

	const hasError = await command([{ sourceCode: stdin }], {
		...cli.flags,
		ignoreExt: true,
	}).catch(error => {
		process.stderr.write(error + '\n');
		process.exit(1);
	});
	process.exit(hasError ? 1 : 0);
}

// No arguments
cli.showHelp(1);

/* eslint-enable unicorn/no-process-exit */

function usePipe() {
	return !process.stdin.isTTY && process.stdout.isTTY;
}
