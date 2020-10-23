import { markuplint, p, w } from './utils';
import { ReportingData } from './types';
import c from 'cli-color';
import stripAnsi from 'strip-ansi';

export async function simpleReporter(data: ReportingData) {
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
		out.push(`<${markuplint}> ${c.underline(data.filePath)}: ${c.red('✗')}`);
		for (const result of data.results) {
			const s = result.severity === 'error' ? '❌' : '⚠️';
			out.push(
				`  ${c.cyan(`${p(result.line, sizes.line, true)}:${p(result.col, sizes.col)}`)} ${s}  ${p(
					result.message,
					sizes.meg,
				)} ${c.xterm(8)(result.ruleId)} `,
			);
		}
	} else if (!data.problemOnly) {
		out.push(`<${markuplint}> ${c.underline(data.filePath)}: ${c.green('✓')}`);
	}

	if (!data.noStdOut && out.length) {
		const outs = `${out.join('\n')}\n`;
		process.stdout.write(data.color ? outs : stripAnsi(outs));
	}

	return data.color ? out : out.map(stripAnsi);
}
