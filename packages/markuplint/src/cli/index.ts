import getStdin from 'get-stdin';

import { verbosely } from '../debug';

import { cli } from './bootstrap';
import { command } from './command';
import { createRule } from './create-rule';
import { initialize } from './init';
import search from './search';

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
		await initialize().catch(err => {
			process.stderr.write(err + '\n');
			process.exit(1);
		});
		return;
	}

	if (cli.flags.createRule) {
		await createRule().catch(err => {
			process.stderr.write(err + '\n');
			process.exit(1);
		});
		return;
	}

	const files = cli.input;
	if (files.length > 0) {
		if (cli.flags.search) {
			await search(files, cli.flags, cli.flags.search).catch(err => {
				process.stderr.write(err + '\n');
				process.exit(1);
			});
			return;
		}

		const hasError = await command(files, cli.flags).catch(err => {
			throw err;
			// process.exit(1);
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
					}).catch(err => {
						process.stderr.write(err + '\n');
						process.exit(1);
					});
					process.exit(hasError ? 1 : 0);
				}
				// result is empty
				cli.showHelp(1);
			})
			.catch(reason => {
				// eslint-disable-next-line no-console
				console.warn(reason);
				process.exit(1);
			});
	} else {
		cli.showHelp(1);
	}
})();

function usePipe() {
	return !process.stdin.isTTY && process.stdout.isTTY;
}
