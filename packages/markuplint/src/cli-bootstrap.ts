import meow from 'meow';

export const help = `
Usage
	$ markuplint <HTML file paths (glob format)>
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

export const cli = meow(help, {
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
