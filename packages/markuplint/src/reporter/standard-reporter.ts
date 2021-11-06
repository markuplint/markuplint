import { invisibleSpace, markuplint, messageToString, p, space, w } from './utils';
import { CLIOptions } from '../cli/bootstrap';
import { MLResultInfo } from '../types';
import c from 'cli-color';

const loggerError = c.red;
const loggerWarning = c.xterm(208);

export function standardReporter(results: MLResultInfo, options: CLIOptions) {
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

	if (results.violations.length) {
		const lines = results.sourceCode.split(/\r?\n/g);
		for (const violation of results.violations) {
			const prev = lines[violation.line - 2] || '';
			const line = lines[violation.line - 1] || '';
			const next = lines[violation.line - 0] || '';
			const before = line.substring(0, violation.col - 1);
			const after = line.substring(violation.col - 1 + violation.raw.length);
			const logger = violation.severity === 'error' ? loggerError : loggerWarning;
			const meg = messageToString(violation.message, violation.reason);

			out.push(
				`<${markuplint}> ${logger(
					`${violation.severity}: ${meg} (${violation.ruleId}) ${c.underline(
						`${results.filePath}:${violation.line}:${violation.col}`,
					)}`,
				)}`,
			);
			if (violation.line - 1 > 0) {
				out.push(`  ${c.cyan(p(violation.line - 1, sizes.col, true))}: ${space(prev)}`);
			}
			out.push(
				`  ${c.cyan(p(violation.line, sizes.col, true))}: ${space(before)}${c.bgRed(violation.raw)}${space(
					after,
				)}`,
			);
			if (!options.color) {
				out.push(
					`         ${invisibleSpace(before)}${'^'.repeat(violation.raw.length)}${invisibleSpace(after)}`,
				);
			}
			out.push(`  ${c.cyan(p(violation.line + 1, sizes.col, true))}: ${space(next)}`);
		}
	} else if (!options.problemOnly) {
		out.push(`<${markuplint}> ${c.green('passed')} ${c.underline(results.filePath)}`);
	}

	return out;
}
