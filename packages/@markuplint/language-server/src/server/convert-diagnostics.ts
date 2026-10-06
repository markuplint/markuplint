import type { MLResultInfo } from 'markuplint';
import type { ReportedSeverity, SeverityMap } from '../types.js';
import type { Diagnostic } from 'vscode-languageserver/node.js';

import { DiagnosticSeverity } from 'vscode-languageserver/node.js';

import { NAME, WEBSITE_URL_RULE_PAGE } from '../const.js';

const REPORTED: Record<ReportedSeverity, DiagnosticSeverity> = {
	error: DiagnosticSeverity.Error,
	warning: DiagnosticSeverity.Warning,
	info: DiagnosticSeverity.Information,
	hint: DiagnosticSeverity.Hint,
};

/**
 * Re-reports diagnostics with the severities a client asked for.
 *
 * Runs on the LSP severity rather than on the markuplint one, so one place covers the v2–v5
 * handlers. `convertDiagnostics` maps the two one to one, which makes the keys of the map
 * mean the same on both sides.
 *
 * @param diagnostics - The diagnostics to re-report
 * @param map - The client's `severityMap`; severities it does not list are kept
 * @returns New diagnostics. The input is not modified.
 */
export function applySeverityMap<T extends Diagnostic>(diagnostics: readonly T[], map: SeverityMap | undefined): T[] {
	if (!map) {
		return [...diagnostics];
	}
	return diagnostics.map(diagnostic => {
		const from =
			diagnostic.severity === DiagnosticSeverity.Error
				? 'error'
				: diagnostic.severity === DiagnosticSeverity.Warning
					? 'warning'
					: diagnostic.severity === DiagnosticSeverity.Information
						? 'info'
						: undefined;
		const to = from && map[from];
		return to ? { ...diagnostic, severity: REPORTED[to] } : diagnostic;
	});
}

/**
 * Converts markuplint violations into LSP diagnostics.
 *
 * Each diagnostic includes a `data.violationIndex` property that maps back
 * to the original violation for use in Code Action resolution.
 *
 * @param result - The markuplint lint result, or null if no result is available
 * @returns An array of LSP diagnostics augmented with line and col numbers
 */
export function convertDiagnostics(result: MLResultInfo | null) {
	const diagnostics: (Diagnostic & { line: number; col: number })[] = [];

	if (!result) {
		return diagnostics;
	}

	for (const [i, violation] of result.violations.entries()) {
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
			message:
				violation.message +
				(violation.specConformance ? ` [${violation.specConformance}]` : '') +
				(violation.reason ? ' / ' + violation.reason : '') +
				(violation.name ? ` (${violation.ruleId})` : ''),
			source: NAME,
			code: violation.name ?? violation.ruleId,
			codeDescription: {
				href: `${WEBSITE_URL_RULE_PAGE}${violation.ruleId}`,
			},
			data: { violationIndex: i },
		});
	}

	return diagnostics;
}
