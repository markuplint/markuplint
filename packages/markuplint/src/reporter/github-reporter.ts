import type { MLResultInfo } from '../types.js';
import type { Severity } from '@markuplint/ml-config';

import { messageToString } from '../util.js';

export function githubReporter(results: MLResultInfo) {
	const out: string[] = [];

	for (const violation of results.violations) {
		const command = severityToCommand(violation.severity);
		const meg = messageToString(violation.message, violation.reason);
		out.push(
			`::${command} file=${results.filePath},line=${violation.line},col=${violation.col}::${meg} (${violation.ruleId})`,
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
