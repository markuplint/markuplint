import type { CLIOptions } from './bootstrap.js';
import type { MLResultInfo } from '../types.js';

import stripAnsi from 'strip-ansi';

import { simpleReporter, standardReporter, githubReporter } from '../reporter/index.js';

/**
 * Writes lint results to stdout or stderr using the reporter selected by `--format`.
 *
 * Violations are written to stderr (and set `process.exitCode` to 1),
 * while clean results are written to stdout. When `--no-color` is set,
 * ANSI escape codes are stripped before output. JSON format is handled
 * separately by the caller, so this function returns early for JSON.
 *
 * @param results - The lint result information for a single file.
 * @param options - CLI options that control the output format and color.
 */
export function output(results: MLResultInfo, options: CLIOptions) {
	const format = options.format ?? 'Standard';
	let out: string[];
	switch (format.toLowerCase()) {
		case 'json': {
			return;
		}
		case 'simple': {
			out = simpleReporter(results, options);
			break;
		}
		case 'github': {
			out = githubReporter(results);
			break;
		}
		default: {
			out = standardReporter(results, options);
		}
	}

	if (out.length === 0) {
		return;
	}

	let msg = `${out.join('\n')}\n`;
	msg = options.color ? msg : stripAnsi(msg);

	// If it has errors, Write to `stderr` and failure and exit.
	if (results.violations.length > 0) {
		process.stderr.write(msg);
		process.exitCode = 1;
		return;
	}
	process.stdout.write(msg);
}
