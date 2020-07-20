import * as HTMLParser from '@markuplint/html-parser';
import { I18n, LocaleSet } from '@markuplint/i18n';
import { decode, encode } from './utils';
import { getEndCol, getEndLine } from '@markuplint/ml-ast';
import { MLCore } from '@markuplint/ml-core';
import type { editor } from 'monaco-editor';
import rules from '@markuplint/rules';
import spec from '@markuplint/html-spec';

type LocaleSets = Record<string, LocaleSet>;

const lint = async (newCode: string, localeSets: LocaleSets) => {
	const language = navigator.language || '';
	const langCode = language.split(/_|-/)[0];
	const localSet = localeSets[langCode] || null;
	const i18n = await I18n.create(localSet);
	const reqConf = await fetch('./resources/markuplintrc.json');
	const ruleset = await reqConf.json();
	ruleset.childNodeRules = [];
	const linter = new MLCore(HTMLParser, newCode, ruleset, rules, i18n, [spec]);
	const reports = await linter.verify();
	const diagnotics = [];
	for (const report of reports) {
		diagnotics.push({
			severity: report.severity === 'warning' ? 4 : 8,
			startLineNumber: report.line,
			startColumn: report.col,
			endLineNumber: getEndLine(report.raw, report.line),
			endColumn: getEndCol(report.raw, report.col),
			owner: 'markuplint',
			message: `${report.message} (${report.ruleId}) <markuplint>`,
		});
	}
	return diagnotics;
};

export const init = async () => {
	const req = await fetch('./resources/sample.html');
	const sample = await req.text();

	const localeSets: LocaleSets = {};
	// @ts-ignore
	localeSets.en = await import('@markuplint/i18n/locales/en.json');
	// @ts-ignore
	localeSets.ja = await import('@markuplint/i18n/locales/ja.json');

	let code = sample;
	if (location.hash) {
		code = decode(location.hash.slice(1));
	}

	return { code, localeSets };
};

export const diagnose = async (model: editor.ITextModel, localeSets: LocaleSets) => {
	const code = model.getValue();
	const diagnotics = await lint(code, localeSets);
	const encoded = encode(code);
	location.hash = encoded;
	return diagnotics;
};
