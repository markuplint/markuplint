import type { MLResultInfo } from '../types.mjs';
import type { CLIOptions } from './bootstrap.mjs';

import stripAnsi from 'strip-ansi';

import { simpleReporter, standardReporter } from '../reporter/index.mjs';

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
		default: {
			out = standardReporter(results, options);
		}
	}

	if (!out.length) {
		return;
	}

	let msg = `${out.join('\n')}\n`;
	msg = options.color ? msg : stripAnsi(msg);

	// If it has errors, Write to `stderr` and failure and exit.
	if (results.violations.length) {
		process.stderr.write(msg);
		process.exitCode = 1;
		return;
	}
	process.stdout.write(msg);
}
