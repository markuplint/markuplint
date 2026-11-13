import type { ReadonlyDeep } from 'type-fest';

import meow from 'meow';

export const help = `
Usage
	$ markuplint <HTML file paths (glob format)>
	$ <stdout> | markuplint                Read the source from the standard input when the output is a terminal. Not with --search, --fix or the suppressions options.
	$ <stdout> | markuplint -              Read the source from the standard input. Not with file paths, --search, --fix or the suppressions options.

Options
	--config,                -c FILE_PATH  A configuration file path.
	--fix,                                 Fix HTML.
	--fix-dry-run                          Show what --fix would change without writing files.
	--format,                -f FORMAT     Output format. Support "JSON", "Simple", "GitHub" and "Standard". Default: "Standard".
	--no-search-config                     No search a configure file automatically.
	--ignore-ext                           Evaluate files that are received even though the type of extension.
	--locale                               Locale of the message of violation. Default is an OS setting.
	--no-color,                            Output no color.
	--problem-only,          -p            Output only problems, without passeds.
	--no-allow-warnings                    Return status code 1 even if there are warnings.
	--allow-empty-input                    Return status code 1 even if there are no input files.
	--show-config                          Output computed configuration of the target file. Supports "details" and empty. Default: empty.
	--verbose                              Output with detailed information.
	--include-node-modules                 Include files in node_modules directory. Default: false.
	--severity-parse-error                 Severity for the built-in parse-error channel. Supports "error", "warning", and "off". Unset by default: fatal ParserErrors emit at "error" and non-fatal parse5 and framework parser events are off (opt-in per code via config).
	--severity-deprecation                 Severity for the built-in rule-deprecation channel (deprecated rule names). Supports "error", "warning", and "off". Default: "warning".
	--max-count                            Limit the number of violations shown, not the exit code. Default: 0 (no limit).
	--max-warnings                         Number of warnings to trigger nonzero exit code. Default: -1 (no limit).
	--no-progressive-output                Wait until every file is processed before outputting results. Default: false (output progressively).

	--experimental-rust-core                [Experimental] Use the Rust linting engine for built-in rules.

	--suppress                             [Experimental] Generate/update suppressions file for all current errors.
	--suppress-rule RULE_ID                [Experimental] Suppress only the specified rule.
	--prune-suppressions                   [Experimental] Remove stale entries from the suppressions file.
	--suppressions-location PATH           [Experimental] Custom path for the suppressions file. Default: "markuplint-suppressions.json".

	--init                                 Initialize settings interactively.
	--search                               Search lines of codes that include the target element by selectors.

	--help,                  -h            Show help.
	--version,               -v            Show version.

Examples
	$ markuplint verifyee.html --config path/to/.markuplintrc
	$ cat verifyee.html | markuplint
	$ cat verifyee.html | markuplint - --format JSON | jq
`;

export const cli = meow(help, {
	importMeta: import.meta,
	// `index.ts` prints them: meow ends the process with `process.exit()`, which drops a pending write.
	autoHelp: false,
	autoVersion: false,
	flags: {
		config: {
			type: 'string',
			shortFlag: 'c',
		},
		fix: {
			type: 'boolean',
			default: false,
		},
		fixDryRun: {
			type: 'boolean',
			default: false,
		},
		format: {
			type: 'string',
			shortFlag: 'f',
		},
		searchConfig: {
			type: 'boolean',
			default: true,
		},
		ignoreExt: {
			type: 'boolean',
			default: false,
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
			shortFlag: 'p',
			default: false,
		},
		allowWarnings: {
			type: 'boolean',
			default: true,
		},
		allowEmptyInput: {
			type: 'boolean',
			default: true,
		},
		showConfig: {
			type: 'string',
		},
		verbose: {
			type: 'boolean',
			default: false,
		},
		init: {
			type: 'boolean',
			default: false,
		},
		search: {
			type: 'string',
		},
		includeNodeModules: {
			type: 'boolean',
			default: false,
		},
		severityParseError: {
			type: 'string',
		},
		severityDeprecation: {
			type: 'string',
		},
		maxCount: {
			type: 'number',
			default: 0,
		},
		maxWarnings: {
			type: 'number',
			default: -1,
		},
		progressiveOutput: {
			type: 'boolean',
			default: true,
		},
		experimentalRustCore: {
			type: 'boolean',
			default: false,
		},
		suppress: {
			type: 'boolean',
			default: false,
		},
		suppressRule: {
			type: 'string',
		},
		pruneSuppressions: {
			type: 'boolean',
			default: false,
		},
		suppressionsLocation: {
			type: 'string',
		},
	},
});

export type CLIOptions = ReadonlyDeep<typeof cli.flags>;
