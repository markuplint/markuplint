import * as HTMLParser from '@markuplint/html-parser';
import { I18n, LocaleSet } from '@markuplint/i18n';
import { MLCore, Ruleset } from '@markuplint/ml-core';
import { getEndCol, getEndLine } from '@markuplint/parser-utils';
import type { editor } from 'monaco-editor';
import { encode } from './utils';
import rules from '@markuplint/rules';
import spec from '@markuplint/html-spec';

const lint = async (newCode: string, ruleset: Ruleset) => {
	const language = navigator.language || '';
	const langCode = language.split(/_|-/)[0];
	// @ts-ignore TODO: Solve types
	const localSet: LocaleSet =
		langCode === 'ja'
			? await import('@markuplint/i18n/locales/ja.json')
			: await import('@markuplint/i18n/locales/en.json');
	const i18n = I18n.create(localSet);
	const linter = new MLCore(HTMLParser, newCode, ruleset, rules, i18n, [spec]);
	const reports = await linter.verify();
	const diagnotics: editor.IMarkerData[] = [];
	for (const report of reports) {
		diagnotics.push({
			severity: report.severity === 'warning' ? 4 : 8,
			startLineNumber: report.line,
			startColumn: report.col,
			endLineNumber: getEndLine(report.raw, report.line),
			endColumn: getEndCol(report.raw, report.col),
			message: `${report.message} (${report.ruleId}) <markuplint>`,
		});
	}
	return diagnotics;
};

export const diagnose = async (code: string, ruleset: Ruleset) => {
	const diagnotics = await lint(code, ruleset);
	const encoded = encode(code);
	location.hash = encoded;
	return diagnotics;
};
