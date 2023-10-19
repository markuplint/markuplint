import getStdin from 'get-stdin';

import { verbosely } from '../debug.js';

import { cli } from './bootstrap.js';
import { command } from './command.js';
import { createRule } from './create-rule/index.js';
import { initialize } from './init/index.js';
import search from './search/index.js';

/* eslint-disable unicorn/no-process-exit */

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
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
		return;
	}

	if (cli.flags.createRule) {
		await createRule().catch(error => {
			process.stderr.write(error + '\n');
			process.exit(1);
		});
		return;
	}

	const files = cli.input;
	if (files.length > 0) {
		if (cli.flags.search) {
			await search(files, cli.flags, cli.flags.search).catch(error => {
				process.stderr.write(error + '\n');
				process.exit(1);
			});
			return;
		}

		const hasError = await command(files, cli.flags).catch(error => {
			throw error;
		});
		process.exit(hasError ? 1 : 0);
	}

	if (usePipe()) {
		getStdin()
			.then(async stdin => {
				if (stdin) {
					const hasError = await command([{ sourceCode: stdin }], {
						...cli.flags,
						ignoreExt: true,
					}).catch(error => {
						process.stderr.write(error + '\n');
						process.exit(1);
					});
					process.exit(hasError ? 1 : 0);
				}
				// result is empty
				cli.showHelp(1);
			})
			.catch(error => {
				// eslint-disable-next-line no-console
				console.warn(error);
				process.exit(1);
			});
	} else {
		cli.showHelp(1);
	}
})();

/* eslint-enable unicorn/no-process-exit */

function usePipe() {
	return !process.stdin.isTTY && process.stdout.isTTY;
}
