import { markuplint, p, w } from './utils';
import { CLIOptions } from '../cli/bootstrap';
import { MLResultInfo } from '../types';
import c from 'cli-color';

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
		sizes.meg = Math.max(sizes.meg, w(violation.message));
	}

	const out: string[] = [];

	if (results.violations.length) {
		out.push(`<${markuplint}> ${c.underline(results.filePath)}: ${loggerError('✗')}`);
		for (const violation of results.violations) {
			const s = violation.severity === 'error' ? loggerError('✖') : loggerWarning('⚠️');
			out.push(
				`  ${c.cyan(`${p(violation.line, sizes.line, true)}:${p(violation.col, sizes.col)}`)} ${s}  ${p(
					violation.message,
					sizes.meg,
				)} ${c.xterm(8)(violation.ruleId)} `,
			);
		}
	} else if (!options.problemOnly) {
		out.push(`<${markuplint}> ${c.underline(results.filePath)}: ${c.green('✓')}`);
	}

	return out;
}
