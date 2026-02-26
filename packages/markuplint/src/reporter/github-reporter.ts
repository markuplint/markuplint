import type { MLResultInfo } from '../types.js';
import type { Severity } from '@markuplint/ml-config';

import { messageToString } from '@markuplint/cli-utils';

/**
 * Formats lint results as GitHub Actions workflow commands.
 *
 * Each violation is emitted as a `::error`, `::warning`, or `::notice` command
 * that GitHub Actions interprets as an inline annotation on the affected file and line.
 *
 * @param results - The lint result information for a single file.
 * @returns An array of GitHub Actions workflow command strings.
 */
export function githubReporter(results: MLResultInfo) {
	const out: string[] = [];

	for (const violation of results.violations) {
		const command = severityToCommand(violation.severity);
		const meg = messageToString(violation.message, violation.specConformance, violation.reason);
		out.push(
			`::${command} file=${results.filePath},line=${violation.line},col=${violation.col}::${meg} (${violation.name ?? violation.ruleId})`,
		);
	}

	return out;
}

function severityToCommand(severity: Severity) {
	switch (severity) {
		case 'info': {
			return 'notice';
		}
		case 'error':
		case 'warning': {
			return severity;
		}
	}
}
