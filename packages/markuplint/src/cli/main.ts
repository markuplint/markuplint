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

	if (cli.flags.createRule) {
		process.stderr.write("Use to run 'npx @markuplint/create-rule' instead of 'markuplint --create-rule'.\n");
		return 1;
	}

	const files = cli.input;

	if (files.includes(STDIN_OPERAND)) {
		if (files.length > 1 || cli.flags.search || cli.flags.fix) {
			// `--fix` writes the fixed source to the file, and the standard input has none.
			process.stderr.write(
				`The \`${STDIN_OPERAND}\` operand (standard input) cannot be combined with file paths, --search or --fix.\n`,
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
