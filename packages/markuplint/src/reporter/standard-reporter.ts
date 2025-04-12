import type { CLIOptions } from '../cli/bootstrap.js';
import type { MLResultInfo } from '../types.js';

import { messageToString, font, name, invisibleSpace, space, pad, getWidth, xterm } from '@markuplint/cli-utils';

const commandName = name.toLowerCase();
const loggerError = font.red;
const loggerWarning = xterm(208);

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
		sizes.meg = Math.max(sizes.meg, getWidth(meg));
	}

	const out: string[] = [];

	if (results.violations.length > 0) {
		const lines = results.sourceCode.split(/\r?\n/);
		for (const violation of results.violations) {
			const logger = violation.severity === 'error' ? loggerError : loggerWarning;
			const meg = messageToString(violation.message, violation.reason);
			const startLine = violation.line - 1;

			// Main message
			out.push(
				`<${commandName}> ${logger(
					`${violation.severity}: ${meg} (${violation.ruleId}) ${font.underline(
						`${results.filePath}:${violation.line}:${violation.col}`,
					)}`,
				)}`,
			);

			// Previous line
			if (startLine > 0) {
				const prev = lines[startLine - 1] ?? '';
				out.push(`  ${font.cyan(pad(startLine, sizes.col, true))}: ${space(prev)}`);
			}

			// Current line
			const rawLines = violation.raw.split(/\r?\n/);
			const line = lines[startLine] ?? '';
			for (const [i, rawLine] of rawLines.entries()) {
				const currentLine = lines[startLine + i] ?? '';
				const beforeChars =
					i === 0 ? line.slice(0, Math.max(0, violation.col - 1)) : (rawLine.match(/^\s+/)?.[0] ?? '');
				const codeChars = rawLine.trim();
				const afterChars = currentLine.slice(Math.max(0, beforeChars.length + codeChars.length));
				const lineNoChars = pad(violation.line + i, sizes.col, true);
				const lineNo = font.cyan(lineNoChars);
				const before = i === 0 ? space(beforeChars) : font.bgRed(space(beforeChars));
				const code = font.bgRed(codeChars);
				const after = space(afterChars);

				out.push(`  ${lineNo}: ${before}${code}${space(after)}`);
				if (!options.color) {
					out.push(
						`  ${invisibleSpace(lineNoChars + ': ' + beforeChars)}${'^'.repeat(
							codeChars.length,
						)}${invisibleSpace(afterChars)}`,
					);
				}
			}

			// Next line
			const next = lines[startLine + rawLines.length] ?? '';
			out.push(`  ${font.cyan(pad(startLine + rawLines.length + 1, sizes.col, true))}: ${space(next)}`);
		}
	} else if (!options.problemOnly) {
		out.push(`<${commandName}> ${font.green('passed')} ${font.underline(results.filePath)}`);
	}

	return out;
}
