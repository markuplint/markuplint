// tslint:disable:no-magic-numbers

import * as c from 'cli-color';

import {
	VerifiedResult,
} from '../rule';

export async function standardReporter (targetPath: string, results: VerifiedResult[], rawSource: string) {
	const out: string[] = [];
	const loggerError = c.red;
	const loggerWarning = c.xterm(208);

	if (results.length) {
		const lines = rawSource.split(/\r?\n/g);
		for (const result of results) {
			const prev = lines[result.line - 2] || '';
			const line = lines[result.line - 1] || '';
			const next = lines[result.line - 0] || '';
			const before = line.substring(0, result.col);
			const after = line.substring(result.col + result.raw.length);
			const logger = result.level === 'error' ? loggerError : loggerWarning;

			out.push(
`${logger(`markuplint ${result.level}: ${result.message} [${targetPath}:${result.line}:${result.col}]`)}
	${c.cyan(result.line - 1).padStart(5)}: ${space(prev)}
	${c.cyan(result.line).padStart(5)}: ${space(before)}${c.bgRed(result.raw)}${space(after)}
	${c.cyan(result.line + 1).padStart(5)}: ${space(next)}
`,
			);
		}
	} else {
		out.push(`${c.green('markuplint passed')} [${targetPath}]`);
	}

	process.stdout.write(`${out.join('\n')}\n`);
}

export async function simpleReporter (targetPath: string, results: VerifiedResult[], rawSource: string) {
	const out: string[] = [];
	if (results.length) {
		out.push(`❌ : ${targetPath} [markuplint]`);
		for (const result of results) {
			out.push(`\t${targetPath}:${result.line}:${result.col} ${result.message} [markuplint]`);
		}
	} else {
		out.push(`✅ : ${targetPath} [markuplint]`);
	}
	process.stdout.write(`${out.join('\n')}\n`);
}

function space (str: string) {
	return str.replace(/\s+/g, ($0) => {
		return c.xterm(8)($0);
	}).replace(/ /g, ($0) =>
		`•`,
	).replace(/\t/g, ($0) =>
		`→   `,
	);
}
