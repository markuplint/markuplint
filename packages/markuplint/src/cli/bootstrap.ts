import meow from 'meow';

export const help = `
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

	--init                        Initialize settings interactively.
	--create-rule                 Add the scaffold of a custom rule.

	--help,         -h            Show help.
	--version,      -v            Show version.

Examples
	$ markuplint verifyee.html --ruleset path/to/.markuplintrc
	$ cat verifyee.html | markuplint
`;

export const cli = meow(help, {
	flags: {
		config: {
			type: 'string',
			alias: 'c',
		},
		fix: {
			type: 'boolean',
			default: false,
		},
		format: {
			type: 'string',
			alias: 'f',
		},
		searchConfig: {
			type: 'boolean',
			default: true,
		},
		ignoreExt: {
			type: 'boolean',
			default: false,
		},
		importPresetRules: {
			type: 'boolean',
			default: true,
		},
		locale: {
			type: 'string',
		},
		color: {
			type: 'boolean',
			default: true,
		},
		problemOnly: {
			type: 'boolean',
			alias: 'p',
			default: false,
		},
		verbose: {
			type: 'boolean',
			default: false,
		},
		init: {
			type: 'boolean',
			default: false,
		},
		createRule: {
			type: 'boolean',
			default: false,
		},
	},
});

export type CLIOptions = typeof cli.flags;
