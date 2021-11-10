import getStdin from 'get-stdin';

import { verbosely } from '../debug';

import { cli } from './bootstrap';
import { command } from './command';
import { initialize } from './init';

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

	const files = cli.input;
	if (files.length) {
		await command(files, cli.flags).catch(err => {
			throw err;
			// process.exit(1);
		});
		process.exit(0);
	}

	if (usePipe()) {
		getStdin()
			.then(async stdin => {
				if (stdin) {
					await command([{ sourceCode: stdin }], cli.flags).catch(err => {
						process.stderr.write(err + '\n');
						process.exit(1);
					});
					process.exit(0);
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
