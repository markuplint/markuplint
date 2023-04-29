import type { ReadonlyDeep } from 'type-fest';

import meow from 'meow';

export const help = `
Usage
	$ markuplint <HTML file paths (glob format)>
	$ <stdout> | markuplint

Options
	--config,                -c FILE_PATH  A configuration file path.
	--fix,                                 Fix HTML.
	--format,                -f FORMAT     Output format. Support "JSON", "Simple", "GitHub" and "Standard". Default: "Standard".
	--no-search-config                     No search a configure file automatically.
	--ignore-ext                           Evaluate files that are received even though the type of extension.
	--no-import-preset-rules               No import preset rules.
	--locale                               Locale of the message of violation. Default is an OS setting.
	--no-color,                            Output no color.
	--problem-only,          -p            Output only problems, without passeds.
	--verbose                              Output with detailed information.

	--init                                 Initialize settings interactively.
	--create-rule                          Add the scaffold of a custom rule.
	--search                               Search lines of codes that include the target element by selectors.

	--help,                  -h            Show help.
	--version,               -v            Show version.

Examples
	$ markuplint verifyee.html --config path/to/.markuplintrc
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
		search: {
			type: 'string',
		},
	},
});

export type CLIOptions = ReadonlyDeep<typeof cli.flags>;
