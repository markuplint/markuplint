import type { MLResultInfo } from 'markuplint';
import type { Diagnostic } from 'vscode-languageserver/node';

import { DiagnosticSeverity } from 'vscode-languageserver/node';

export function convertDiagnostics(result: MLResultInfo | null) {
	const diagnostics: Diagnostic[] = [];

	if (!result) {
		return diagnostics;
	}

	for (const violation of result.violations) {
		diagnostics.push({
			severity:
				violation.severity === 'error'
					? DiagnosticSeverity.Error
					: violation.severity === 'warning'
					? DiagnosticSeverity.Warning
					: DiagnosticSeverity.Information,
			range: {
				start: {
					line: Math.max(violation.line - 1, 0),
					character: Math.max(violation.col - 1, 0),
				},
				end: {
					line: Math.max(violation.line - 1, 0),
					character: Math.max(violation.col + violation.raw.length - 1, 0),
				},
			},
			message: violation.message + (violation.reason ? ' - ' + violation.reason : ''),
			source: 'markuplint',
			code: violation.ruleId,
			codeDescription: {
				href: `https://markuplint.dev/rules/${violation.ruleId}`,
			},
		});
	}

	return diagnostics;
}
