import type { MLResultInfo } from 'markuplint';
import type { Diagnostic } from 'vscode-languageserver/node.js';

import { DiagnosticSeverity } from 'vscode-languageserver/node.js';

import { NAME, WEBSITE_URL_RULE_PAGE } from '../const.js';

export function convertDiagnostics(result: MLResultInfo | null) {
	const diagnostics: (Diagnostic & { line: number; col: number })[] = [];

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
			line: violation.line,
			col: violation.col,
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
			source: NAME,
			code: violation.ruleId,
			codeDescription: {
				href: `${WEBSITE_URL_RULE_PAGE}${violation.ruleId}`,
			},
		});
	}

	return diagnostics;
}
