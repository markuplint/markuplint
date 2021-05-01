import { cli } from './cli-bootstrap';
import { command } from './command';
import getStdin from 'get-stdin';
import { initialize } from './initialize';

(async () => {
	if (cli.flags.v) {
		cli.showVersion(); // And exit successfully.
	}

	if (cli.flags.h) {
		cli.showHelp(0); // And exit successfully.
	}

	if (cli.flags.init) {
		await initialize().catch(err => {
			process.stderr.write(err + '\n');
			process.exit(1);
		});
		return;
	}

	const stdin = await getStdin();
	if (stdin) {
		await command({
			codes: stdin,
			...cli.flags,
		}).catch(err => {
			process.stderr.write(err + '\n');
			process.exit(1);
		});
		process.exit(0);
	}

	const files = cli.input;
	if (files.length) {
		await command({
			files,
			...cli.flags,
		}).catch(err => {
			process.stderr.write(err + '\n');
			process.exit(1);
		});
		process.exit(0);
	}

	cli.showHelp(1); // And fail.
	process.exit(1);
})();
