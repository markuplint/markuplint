import type { LocaleSet } from '@markuplint/i18n';
import type { PlainData, RuleConfigValue, Violation } from '@markuplint/ml-config';
import type { Ruleset } from '@markuplint/ml-core';
import type { editor } from 'monaco-editor';

import * as HTMLParser from '@markuplint/html-parser';
import spec from '@markuplint/html-spec';
import { MLRule, MLCore } from '@markuplint/ml-core';
import { getEndCol, getEndLine } from '@markuplint/parser-utils';
import rules from '@markuplint/rules';

export const createLinter = async (ruleset: Ruleset) => {
	const language = navigator.language ?? '';
	const langCode = language.split(/_|-/)[0];
	// @ts-ignore TODO: Solve types
	const localSet: LocaleSet =
		langCode === 'ja'
			? await import('@markuplint/i18n/locales/ja.json')
			: await import('@markuplint/i18n/locales/en.json');
	const linter = new MLCore({
		parser: HTMLParser,
		sourceCode: '',
		ruleset,
		// @ts-ignore
		rules: Object.entries(rules).map(([name, seed]) => new MLRule<RuleConfigValue, PlainData>({ name, ...seed })),
		locale: localSet,
		schemas: [spec],
		parserOptions: {},
		pretenders: [],
		filename: 'playground.html',
	});
	return linter;
};

export const diagnose = (reports: readonly Violation[]) => {
	const diagnostics: editor.IMarkerData[] = [];
	for (const report of reports) {
		diagnostics.push({
			severity: report.severity === 'warning' ? 4 : 8,
			startLineNumber: report.line,
			startColumn: report.col,
			endLineNumber: getEndLine(report.raw, report.line),
			endColumn: getEndCol(report.raw, report.col),
			message: `${report.message} (${report.ruleId}) <markuplint>`,
		});
	}

	return diagnostics;
};
