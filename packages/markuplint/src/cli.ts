import { cli } from './cli-bootstrap';
import { command } from './command';
import getStdin from 'get-stdin';

if (cli.flags.v) {
	cli.showVersion(); // And exit successfully.
}

if (cli.flags.h) {
	cli.showHelp(0); // And exit successfully.
}

if (cli.input.length) {
	command({
		files: cli.input,
		...cli.flags,
	}).catch(err => {
		process.stderr.write(err + '\n');
		process.exit(1);
	});
} else {
	cli.showHelp(1); // And fail.
}

getStdin().then(stdin => {
	const html = stdin;
	if (!html) {
		return;
	}
	command({
		codes: html,
		...cli.flags,
	}).catch(err => {
		process.stderr.write(err + '\n');
		process.exit(1);
	});
});
