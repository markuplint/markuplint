import type { MLResultInfo } from 'markuplint';
import type { editor } from 'monaco-editor';

import { getEndCol, getEndLine } from '@markuplint/parser-utils';

export type Violations = MLResultInfo['violations'];
type MarkerData = Readonly<editor.IMarkerData>;

export const convertToMarkerData = (violations: Violations) => {
	const SEVERITY_MAP = {
		info: 2,
		warning: 4,
		error: 8,
	};

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
