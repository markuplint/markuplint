import type { CLIOptions } from './bootstrap.js';
import type { MLResultInfo } from '../types.js';

import { font, xterm } from '@markuplint/cli-utils';
import stripAnsi from 'strip-ansi';

import { simpleReporter, standardReporter, githubReporter } from '../reporter/index.js';

const loggerError = font.red;
const loggerWarning = xterm(208);

export interface SummaryInfo {
	readonly checkedFileCount: number;
	readonly failedFileCount: number;
	readonly skippedFileCount: number;
	readonly errorCount: number;
	readonly warningCount: number;
	readonly noticeCount: number;
}

export function output(results: MLResultInfo, options: CLIOptions) {
	const format = options.format ?? 'Standard';
	let out: string[];
	switch (format.toLowerCase()) {
		case 'json': {
			return;
		}
		case 'simple': {
			out = simpleReporter(results, options);
			break;
		}
		case 'github': {
			out = githubReporter(results);
			break;
		}
		default: {
			out = standardReporter(results, options);
		}
	}

	if (out.length === 0) {
		return;
	}

	let msg = `${out.join('\n')}\n`;
	msg = options.color ? msg : stripAnsi(msg);

	// If it has errors, Write to `stderr` and failure and exit.
	if (results.violations.length > 0) {
		process.stderr.write(msg);
		process.exitCode = 1;
		return;
	}
	process.stdout.write(msg);
}

export function outputSummary(summary: SummaryInfo, options: CLIOptions) {
	const format = options.format?.toLowerCase() ?? 'standard';
	if (format === 'json' || format === 'github') {
		return;
	}
	if (summary.checkedFileCount === 0 && summary.skippedFileCount === 0) {
		return;
	}

	const problemCount = summary.errorCount + summary.warningCount + summary.noticeCount;
	if (options.problemOnly && problemCount === 0) {
		return;
	}

	const out = createSummaryLines(summary);
	if (out.length === 0) {
		return;
	}

	let msg = `\n${out.join('\n')}\n`;
	msg = options.color ? msg : stripAnsi(msg);

	if (problemCount > 0) {
		process.stderr.write(msg);
		return;
	}
	process.stdout.write(msg);
}

function createSummaryLines(summary: SummaryInfo) {
	const out: string[] = [];
	const problemCount = summary.errorCount + summary.warningCount + summary.noticeCount;
	const passedFileCount = summary.checkedFileCount - summary.failedFileCount;

	if (problemCount === 0) {
		out.push(`${font.green('✔')} ${pluralize(summary.checkedFileCount, 'file')} checked, 0 problems`);
	} else {
		const problemDetail = [
			`${summary.errorCount} error${summary.errorCount === 1 ? '' : 's'}`,
			`${summary.warningCount} warning${summary.warningCount === 1 ? '' : 's'}`,
			summary.noticeCount > 0 ? `${summary.noticeCount} notice${summary.noticeCount === 1 ? '' : 's'}` : null,
		]
			.filter(Boolean)
			.join(', ');
		const logger = summary.errorCount > 0 ? loggerError : loggerWarning;

		out.push(
			`${logger('✖')} ${problemCount} problem${problemCount === 1 ? '' : 's'} (${problemDetail}) in ${pluralize(summary.checkedFileCount, 'file')}`,
			`${pluralize(summary.checkedFileCount, 'file')} checked: ${passedFileCount} passed, ${summary.failedFileCount} failed`,
		);
	}

	if (summary.skippedFileCount > 0) {
		out.push(
			`${font.yellow('⚠')} ${pluralize(summary.skippedFileCount, 'file')} skipped because --max-count was reached`,
		);
	}

	return out;
}

function pluralize(count: number, noun: string) {
	return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
