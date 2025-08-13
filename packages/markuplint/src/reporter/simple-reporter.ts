import type { CLIOptions } from '../cli/bootstrap.js';
import type { MLResultInfo } from '../types.js';

import { name, font, pad, getWidth, messageToString, xterm } from '@markuplint/cli-utils';

const commandName = name.toLowerCase();
const loggerError = font.red;
const loggerWarning = xterm(208);

export function simpleReporter(results: MLResultInfo, options: CLIOptions) {
	const sizes = {
		line: 0,
		col: 0,
		meg: 0,
	};

	for (const violation of results.violations) {
		sizes.line = Math.max(sizes.line, violation.line.toString(10).length);
		sizes.col = Math.max(sizes.col, violation.col.toString(10).length);
		const meg = messageToString(violation.message, violation.reason);
		sizes.meg = Math.max(sizes.meg, getWidth(meg));
	}

	const out: string[] = [];

	if (results.violations.length > 0) {
		out.push(`<${commandName}> ${font.underline(results.filePath)}: ${loggerError('✗')}`);
		for (const violation of results.violations) {
			const s = violation.severity === 'error' ? loggerError('✖') : loggerWarning('⚠️');
			const meg = messageToString(violation.message, violation.reason);
			out.push(
				`  ${font.cyan(
					`${pad(violation.line, sizes.line, true)}:${pad(violation.col, sizes.col)}`,
				)} ${s}  ${pad(meg, sizes.meg)} ${xterm(8)(violation.ruleId)} `,
			);
		}
	} else if (!options.problemOnly) {
		const icon = results.status === 'skipped' ? font.yellow('⚠') : font.green('✓');
		out.push(`<${commandName}> ${font.underline(results.filePath)}: ${icon}`);
	}

	return out;
}
