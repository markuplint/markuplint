import { invisibleSpace, markuplint, p, space, w } from './utils';
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

	for (const result of results.results) {
		sizes.line = Math.max(sizes.line, result.line.toString(10).length);
		sizes.col = Math.max(sizes.col, result.col.toString(10).length);
		sizes.meg = Math.max(sizes.meg, w(result.message));
	}

	const out: string[] = [];

	if (results.results.length) {
		const lines = results.sourceCode.split(/\r?\n/g);
		for (const result of results.results) {
			const prev = lines[result.line - 2] || '';
			const line = lines[result.line - 1] || '';
			const next = lines[result.line - 0] || '';
			const before = line.substring(0, result.col - 1);
			const after = line.substring(result.col - 1 + result.raw.length);
			const logger = result.severity === 'error' ? loggerError : loggerWarning;

			out.push(
				`<${markuplint}> ${logger(
					`${result.severity}: ${result.message} (${result.ruleId}) ${c.underline(
						`${results.filePath}:${result.line}:${result.col}`,
					)}`,
				)}`,
			);
			if (result.line - 1 > 0) {
				out.push(`  ${c.cyan(p(result.line - 1, sizes.col, true))}: ${space(prev)}`);
			}
			out.push(
				`  ${c.cyan(p(result.line, sizes.col, true))}: ${space(before)}${c.bgRed(result.raw)}${space(after)}`,
			);
			if (!options.color) {
				out.push(`         ${invisibleSpace(before)}${'^'.repeat(result.raw.length)}${invisibleSpace(after)}`);
			}
			out.push(`  ${c.cyan(p(result.line + 1, sizes.col, true))}: ${space(next)}`);
		}
	} else if (!options.problemOnly) {
		if (options.verbose) {
			out.push(`<${markuplint}> ${c.green('passed')}🎉`);
			out.push(`  Filepath: ${results.filePath}`);
			out.push(`  Parser: ${results.parser}`);
			out.push('  Config: [');
			out.push(`    ${results.configSet.files.join('\n    ')}`);
			out.push('  ]');
			// out.push(JSON.stringify(data, null, 2));
		} else {
			out.push(`<${markuplint}> ${c.green('passed')} ${c.underline(results.filePath)}`);
		}
	}

	return out;
}
