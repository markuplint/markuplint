// tslint:disable:no-magic-numbers
import path from 'path';
import url from 'url';

import c from 'cli-color';

const eaw: { characterLength: (char: string) => number } = require('eastasianwidth'); // tslint:disable-line
const stripAnsi: (input: string) => string = require('strip-ansi'); // tslint:disable-line

import { VerifiedResult } from '../rule';

export interface ReporterConfig {
	color: boolean;
	problemOnly: boolean;
	noStdOut: boolean;
}

export type Optional<C> = { [P in keyof C]?: C[P] };

const defaultConfig: ReporterConfig = {
	color: true,
	problemOnly: false,
	noStdOut: false,
};

const loggerError = c.red;
const loggerWarning = c.xterm(208);
const markuplint = `markup${c.xterm(39)('lint')}`;

export async function standardReporter(
	targetPath: string,
	results: VerifiedResult[],
	rawSource: string,
	options: Optional<ReporterConfig>,
) {
	const config: ReporterConfig = Object.assign({}, defaultConfig, options);
	if (!url.parse(targetPath).host) {
		targetPath = path.resolve(targetPath);
	}

	const sizes = {
		line: 0,
		col: 0,
		meg: 0,
	};

	for (const result of results) {
		sizes.line = Math.max(sizes.line, result.line.toString(10).length);
		sizes.col = Math.max(sizes.col, result.col.toString(10).length);
		sizes.meg = Math.max(sizes.meg, w(result.message));
	}

	const out: string[] = [];

	if (results.length) {
		const lines = rawSource.split(/\r?\n/g);
		for (const result of results) {
			const prev = lines[result.line - 2] || '';
			const line = lines[result.line - 1] || '';
			const next = lines[result.line - 0] || '';
			const before = line.substring(0, result.col - 1);
			const after = line.substring(result.col - 1 + result.raw.length);
			const logger =
				result.severity === 'error' ? loggerError : loggerWarning;

			out.push(
				`<${markuplint}> ${logger(
					`${result.severity}: ${result.message} (${
						result.ruleId
					}) ${c.underline(
						`${targetPath}:${result.line}:${result.col}`,
					)}`,
				)}`,
			);
			if (result.line - 1 > 0) {
				out.push(
					`  ${c.cyan(p(result.line - 1, sizes.col, true))}: ${space(
						prev,
					)}`,
				);
			}
			out.push(
				`  ${c.cyan(p(result.line, sizes.col, true))}: ${space(
					before,
				)}${c.bgRed(result.raw)}${space(after)}`,
			);
			if (!config.color) {
				out.push(
					`         ${invisibleSpace(before)}${'^'.repeat(
						result.raw.length,
					)}${invisibleSpace(after)}`,
				);
			}
			out.push(
				`  ${c.cyan(p(result.line + 1, sizes.col, true))}: ${space(
					next,
				)}`,
			);
		}
	} else if (!config.problemOnly) {
		out.push(
			`<${markuplint}> ${c.green('passed')} ${c.underline(targetPath)}`,
		);
	}

	if (!config.noStdOut && out.length) {
		const outs = `${out.join('\n')}\n`;
		process.stdout.write(config.color ? outs : stripAnsi(outs));
	}

	return config.color ? out : out.map(stripAnsi);
}

export async function simpleReporter(
	targetPath: string,
	results: VerifiedResult[],
	rawSource: string,
	options: Optional<ReporterConfig>,
) {
	const config: ReporterConfig = Object.assign({}, defaultConfig, options);
	if (!url.parse(targetPath).host) {
		targetPath = path.resolve(targetPath);
	}

	const sizes = {
		line: 0,
		col: 0,
		meg: 0,
	};

	for (const result of results) {
		sizes.line = Math.max(sizes.line, result.line.toString(10).length);
		sizes.col = Math.max(sizes.col, result.col.toString(10).length);
		sizes.meg = Math.max(sizes.meg, w(result.message));
	}

	const out: string[] = [];

	if (results.length) {
		out.push(`<${markuplint}> ${c.underline(targetPath)}: ${c.red('✗')}`);
		for (const result of results) {
			const s = result.severity === 'error' ? '❌' : '⚠️';
			out.push(
				`  ${c.cyan(
					`${p(result.line, sizes.line, true)}:${p(
						result.col,
						sizes.col,
					)}`,
				)} ${s}  ${p(result.message, sizes.meg)} ${c.xterm(8)(
					result.ruleId,
				)} `,
			);
		}
	} else if (!config.problemOnly) {
		out.push(`<${markuplint}> ${c.underline(targetPath)}: ${c.green('✓')}`);
	}

	if (!config.noStdOut && out.length) {
		const outs = `${out.join('\n')}\n`;
		process.stdout.write(config.color ? outs : stripAnsi(outs));
	}

	return config.color ? out : out.map(stripAnsi);
}

function p(s: number | string, pad: number, start = false) {
	const l = w(`${s}`.trim());
	const d = pad - l;
	const _ = ' '.repeat(d < 0 ? 0 : d);
	return start ? `${_}${s}` : `${s}${_}`;
}

function w(s: string): number {
	return s.replace(/./g, _ => '0'.repeat(eaw.characterLength(_))).length;
}

function space(str: string) {
	return str
		.replace(/\s+/g, $0 => {
			return c.xterm(8)($0);
		})
		.replace(/ /g, $0 => `•`)
		.replace(/\t/g, $0 => `→   `);
}

function invisibleSpace(str: string) {
	return str.replace(/\t/g, $0 => `    `).replace(/./g, $0 => ` `);
}
