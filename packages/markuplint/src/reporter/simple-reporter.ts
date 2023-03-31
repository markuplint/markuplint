import type { CLIOptions } from '../cli/bootstrap';
import type { MLResultInfo } from '../types';

import c from 'cli-color';

import { markuplint, messageToString, p, w } from '../util';

const loggerError = c.red;
const loggerWarning = c.xterm(208);

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
		sizes.meg = Math.max(sizes.meg, w(meg));
	}

	const out: string[] = [];

	if (results.violations.length > 0) {
		out.push(`<${markuplint}> ${c.underline(results.filePath)}: ${loggerError('✗')}`);
		for (const violation of results.violations) {
			const s = violation.severity === 'error' ? loggerError('✖') : loggerWarning('⚠️');
			const meg = messageToString(violation.message, violation.reason);
			out.push(
				`  ${c.cyan(`${p(violation.line, sizes.line, true)}:${p(violation.col, sizes.col)}`)} ${s}  ${p(
					meg,
					sizes.meg,
				)} ${c.xterm(8)(violation.ruleId)} `,
			);
		}
	} else if (!options.problemOnly) {
		out.push(`<${markuplint}> ${c.underline(results.filePath)}: ${c.green('✓')}`);
	}

	return out;
}
