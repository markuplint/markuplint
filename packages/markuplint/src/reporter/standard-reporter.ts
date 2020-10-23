import { invisibleSpace, markuplint, p, space, w } from './utils';
import { ReportingData } from './types';
import c from 'cli-color';
import stripAnsi from 'strip-ansi';

const loggerError = c.red;
const loggerWarning = c.xterm(208);

export async function standardReporter(data: ReportingData) {
	const sizes = {
		line: 0,
		col: 0,
		meg: 0,
	};

	for (const result of data.results) {
		sizes.line = Math.max(sizes.line, result.line.toString(10).length);
		sizes.col = Math.max(sizes.col, result.col.toString(10).length);
		sizes.meg = Math.max(sizes.meg, w(result.message));
	}

	const out: string[] = [];

	if (data.results.length) {
		const lines = data.sourceCode.split(/\r?\n/g);
		for (const result of data.results) {
			const prev = lines[result.line - 2] || '';
			const line = lines[result.line - 1] || '';
			const next = lines[result.line - 0] || '';
			const before = line.substring(0, result.col - 1);
			const after = line.substring(result.col - 1 + result.raw.length);
			const logger = result.severity === 'error' ? loggerError : loggerWarning;

			out.push(
				`<${markuplint}> ${logger(
					`${result.severity}: ${result.message} (${result.ruleId}) ${c.underline(
						`${data.filePath}:${result.line}:${result.col}`,
					)}`,
				)}`,
			);
			if (result.line - 1 > 0) {
				out.push(`  ${c.cyan(p(result.line - 1, sizes.col, true))}: ${space(prev)}`);
			}
			out.push(
				`  ${c.cyan(p(result.line, sizes.col, true))}: ${space(before)}${c.bgRed(result.raw)}${space(after)}`,
			);
			if (!data.color) {
				out.push(`         ${invisibleSpace(before)}${'^'.repeat(result.raw.length)}${invisibleSpace(after)}`);
			}
			out.push(`  ${c.cyan(p(result.line + 1, sizes.col, true))}: ${space(next)}`);
		}
	} else if (!data.problemOnly) {
		if (data.verbose) {
			out.push(`<${markuplint}> ${c.green('passed')}🎉`);
			out.push(`  Filepath: ${data.filePath}`);
			out.push(`  Parser: ${data.parser}`);
			out.push('  Config: [');
			out.push(`    ${data.configSet.files.join('\n    ')}`);
			out.push('  ]');
			// out.push(JSON.stringify(data, null, 2));
		} else {
			out.push(`<${markuplint}> ${c.green('passed')} ${c.underline(data.filePath)}`);
		}
	}

	if (!data.noStdOut && out.length) {
		const outs = `${out.join('\n')}\n`;
		process.stdout.write(data.color ? outs : stripAnsi(outs));
	}

	return data.color ? out : out.map(stripAnsi);
}
