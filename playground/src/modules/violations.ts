import type { MLResultInfo } from 'markuplint';
import type { editor } from 'monaco-editor';

import { getEndCol, getEndLine } from '@markuplint/parser-utils/location';

export type Violations = MLResultInfo['violations'];
export type Violation = Violations[number];
type MarkerData = Readonly<editor.IMarkerData>;

export const convertToMarkerData = (violations: Violations) => {
	const SEVERITY_MAP = {
		info: 2,
		warning: 4,
		error: 8,
	} as const satisfies Record<Violation['severity'], MarkerData['severity']>;

	const reports: MarkerData[] = violations.map(violation => ({
		severity: SEVERITY_MAP[violation.severity],
		startLineNumber: violation.line,
		startColumn: violation.col,
		endLineNumber: getEndLine(violation.raw, violation.line),
		endColumn: getEndCol(violation.raw, violation.col),
		message: `${violation.message} (${violation.ruleId})`,
	}));

	return reports;
};
