import { command } from './command';
import getStdin from 'get-stdin';
import meow from 'meow';

const help = `
Usage
	$ markuplint <HTML file pathes (glob format)>
	$ <stdout> | markuplint

Options
	--config-file,  -c FILE_PATH  Ruleset file path.
	--fix,                        Fix HTML.
	--format,       -f FORMAT     Output format. Support "JSON", "Simple" and "Standard". Default: "Standard".
	--no-color,                   Output no color.
	--problem-only, -p            Output only problems, without passeds.
	--verbose                     Output with detailed information.

	--help,         -h            Show help.
	--version,      -v            Show version.

Examples
	$ markuplint verifyee.html --ruleset path/to/.markuplintrc
	$ cat verifyee.html | markuplint
`;

const cli = meow(help, {
	flags: {
		configFile: {
			type: 'string',
			alias: 'c',
		},
		fix: {
			type: 'boolean',
		},
		format: {
			type: 'string',
			alias: 'f',
		},
		color: {
			type: 'boolean',
			default: true,
		},
		problemOnly: {
			type: 'boolean',
			alias: 'p',
		},
		verbose: {
			type: 'boolean',
		},
	},
});

if (cli.flags.v) {
	cli.showVersion();
}

if (cli.flags.h) {
	cli.showHelp();
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
