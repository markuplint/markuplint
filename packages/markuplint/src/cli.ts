import { cli } from './cli-bootstrap';
import { command } from './command';
import getStdin from 'get-stdin';

if (cli.flags.v) {
	cli.showVersion();
	process.exit(0);
}

if (cli.flags.h) {
	cli.showHelp(0);
	process.exit(0);
}

if (cli.input.length) {
	command({
		files: cli.input,
		...cli.flags,
	});
}

getStdin().then(stdin => {
	const html = stdin;
	if (!html) {
		return;
	}
	command({
		codes: html,
		...cli.flags,
	});
});
