/**
 * @module cli/main
 *
 * The CLI run itself. `index.ts` is the entry point and owns the process boundary
 * (the exit code and why `process.exit()` is not used); this module is separate so a spec
 * can call `main()` without starting the process.
 */

import { text } from 'node:stream/consumers';

import { isFatalError } from '@markuplint/shared';

import { verbosely } from '../debug.js';

import { cli } from './bootstrap.js';
import { command } from './command.js';
import { initialize } from './init/index.js';
import { search } from './search/index.js';

/** The operand that means standard input. */
const STDIN_OPERAND = '-';

/**
 * The flags of v5 that no longer exist, by the key that meow gives an unknown flag, and as they are
 * written. meow lets an unknown flag through, so left alone `--no-import-preset-rules` would lint
 * with every preset rule, with exit code 0, as if the flag had not been given.
 *
 * Dropped in v7 with the other reports of what the plugin mechanism left (`removedPluginError()` of
 * `@markuplint/file-resolver`).
 */
const REMOVED_FLAGS = [
	['importPresetRules', '--[no-]import-preset-rules'],
	['createRule', '--create-rule'],
] as const;

/**
 * Runs the CLI and resolves to its exit code.
 *
 * Every branch returns a number: a branch that forgets to leaves `undefined`,
 * and the `process.exitCode` that `output.ts` set (1) would leak out.
 */
export async function main(): Promise<number> {
	// Same condition as meow's automatic handling: the flag has to be the only argument.
	const isSoleArgument = cli.input.length === 0 && process.argv.length === 3;
	if (cli.flags.v || (isSoleArgument && cli.flags.version === true)) {
		return showVersion();
	}

	if (cli.flags.h || (isSoleArgument && cli.flags.help === true)) {
		return showHelp(0);
	}

	for (const [key, flag] of REMOVED_FLAGS) {
		if (key in cli.flags) {
			process.stderr.write(
				`${flag} was removed in v6 (https://markuplint.dev/docs/migration/v5-to-v6/plugins#cli).\n`,
			);
			return 1;
		}
	}

	if (cli.flags.verbose) {
		verbosely();
	}

	if (cli.flags.init) {
		try {
			await initialize();
		} catch (error) {
			if (isFatalError(error)) {
				throw error;
			}
			process.stderr.write(error + '\n');
			return 1;
		}
		return 0;
	}

	const files = cli.input;

	if (files.includes(STDIN_OPERAND)) {
		const fileFlags = givenFileFlags();
		if (files.length > 1 || fileFlags.length > 0) {
			const conflicts = files.length > 1 ? ['file paths', ...fileFlags] : fileFlags;
			process.stderr.write(
				`The \`${STDIN_OPERAND}\` operand (standard input) cannot be combined with ${conflicts.join(', ')}.\n`,
			);
			return 1;
		}
		const stdin = await readStdin();
		if (stdin === null) {
			return 1;
		}
		// An empty input is an empty source, as `markuplint empty.html` is.
		return lintStdin(stdin);
	}

	if (files.length > 0) {
		if (cli.flags.search) {
			try {
				await search(files, cli.flags, cli.flags.search);
			} catch (error) {
				if (isFatalError(error)) {
					throw error;
				}
				process.stderr.write(error + '\n');
				return 1;
			}
			return 0;
		}

		return lint(files, cli.flags);
	}

	if (usePipe()) {
		const fileFlags = givenFileFlags();
		if (fileFlags.length > 0) {
			process.stderr.write(`Standard input cannot be combined with ${fileFlags.join(', ')}.\n`);
			return 1;
		}
		const stdin = await readStdin();
		if (stdin === null) {
			return 1;
		}
		if (!stdin) {
			// result is empty
			return showHelp(1);
		}
		return lintStdin(stdin);
	}

	// No arguments
	return showHelp(1);
}

/**
 * The options that act on a file that are given, by their names: `--fix` writes the fixed source
 * to it (with nothing to write to, it created a file named `<AnonymousFile>`, #4560), `--search`
 * and the suppressions options report or record by file. The standard input has none, so both
 * ways of reading it (the `-` operand and the no-operand pipe) reject them, and name them in the
 * message, from this one list: an option that acts on a file is added here, and nowhere else.
 * `--fix-dry-run` is not one: it writes nothing and prints the diff.
 */
function givenFileFlags(): string[] {
	const { search, fix, suppress, suppressRule, pruneSuppressions } = cli.flags;
	// Each is given by the condition of the code that consumes it, not by one shared test:
	// `--search` is a search when it is not empty (the file branch below tests it so), and
	// `--suppress-rule` turns the suppressions mode on when it is set at all (`command.ts`).
	const given: readonly (readonly [name: string, isGiven: boolean])[] = [
		['--search', Boolean(search)],
		['--fix', Boolean(fix)],
		['--suppress', Boolean(suppress)],
		['--suppress-rule', suppressRule != null],
		['--prune-suppressions', Boolean(pruneSuppressions)],
	];
	return given.filter(([, isGiven]) => isGiven).map(([name]) => name);
}

function usePipe() {
	return !process.stdin.isTTY && process.stdout.isTTY;
}

/**
 * Reports a read failure on stderr and returns `null` instead of throwing,
 * so the caller can return the exit code.
 */
async function readStdin(): Promise<string | null> {
	try {
		return await text(process.stdin);
	} catch (error) {
		if (isFatalError(error)) {
			throw error;
		}
		process.stderr.write(error + '\n');
		return null;
	}
}

function lintStdin(sourceCode: string): Promise<number> {
	return lint([{ sourceCode }], { ...cli.flags, ignoreExt: true });
}

/**
 * Runs `command()` and resolves to its exit code. A failure that is not fatal is reported on
 * stderr with exit code 1, whatever the input is (file paths or the standard input).
 */
async function lint(...args: Parameters<typeof command>): Promise<number> {
	try {
		return (await command(...args)) ? 1 : 0;
	} catch (error) {
		if (isFatalError(error)) {
			throw error;
		}
		process.stderr.write(error + '\n');
		return 1;
	}
}

/** Prints what meow's `showVersion()` printed (`console.log` of the version). */
function showVersion(): number {
	process.stdout.write(cli.pkg.version + '\n');
	return 0;
}

/** Prints what meow's `showHelp()` printed (`console.log` of the help, which ends with a newline). */
function showHelp(exitCode: number): number {
	process.stdout.write(cli.help + '\n');
	return exitCode;
}
