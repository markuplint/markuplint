/* global monaco */

import * as HTMLParser from '@markuplint/html-parser';
import * as HTMLSpecs from '@markuplint/html-ls';
import { MLCore } from '@markuplint/ml-core';
import { Messenger } from '@markuplint/i18n';
import rules from '@markuplint/rules';
// import Markuplint from 'markuplint/lib/core';
// import createRuleset from 'markuplint/lib/ruleset/createRuleset.remote';
// import Messenger from 'markuplint/lib/locale/messenger';
// import getLine from 'markuplint/lib/dom/parser/get-line';
// import getCol from 'markuplint/lib/dom/parser/get-col';

// import rules from 'markuplint/lib/rules/all';

/**
 *
 * @param {string} html
 * @param {number} line
 */
function getEndLine(html, line) {
	return html.split(/\r?\n/).length - 1 + line;
}

/**
 *
 * @param {string} html
 * @param {number} col
 */
function getEndCol(html, col) {
	const lines = html.split(/\r?\n/);
	const lineCount = lines.length;
	const lastLine = lines.pop();
	return lineCount > 1 ? lastLine.length + 1 : col + html.length;
}

const encode = text => btoa(encodeURIComponent(text));
const decode = text => decodeURIComponent(atob(text));

window.markuplint = {
	// Markuplint,
	// createRuleset,
	// Messenger,
	// getLine,
	// getCol,
	// rules,
};

const require = window.require; // overwirte

require.config({ paths: { vs: 'monaco-editor/min/vs' } });

let diagnoseId;

const lint = async newCode => {
	const reqConf = await fetch('./resources/markuplintrc.json');
	const ruleset = await reqConf.json();
	const messenger = await Messenger.create(null);
	// console.log({ HTMLParser, newCode, HTMLSpecs, ruleset, rules, messenger });
	ruleset.childNodeRules = [];
	const linter = new MLCore(HTMLParser, newCode, HTMLSpecs, ruleset, rules, messenger);
	const reports = await linter.verify();
	const diagnotics = [];
	for (const report of reports) {
		diagnotics.push({
			severity: report.severity === 'warning' ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Error,
			startLineNumber: report.line,
			startColumn: report.col,
			endLineNumber: getEndLine(report.raw, report.line),
			endColumn: getEndCol(report.raw, report.col),
			message: `<markuplint> ${report.message} (${report.ruleId})`,
		});
	}
	// console.log(reports);
	return diagnotics;
};

const diagnose = async model => {
	const code = model.getValue();
	const diagnotics = await lint(code);
	monaco.editor.setModelMarkers(model, 'markuplint', diagnotics);
	const encoded = encode(code);
	location.hash = encoded;
};

require(['vs/editor/editor.main'], async () => {
	const req = await fetch('./resources/sample.html');
	const sample = await req.text();

	let code = sample;
	if (location.hash) {
		code = decode(location.hash.slice(1));
	}

	const editor = monaco.editor.create(document.getElementById('main'), {
		theme: 'vs-dark',
		value: code,
		language: 'html',
	});

	const onChange = () => {
		cancelAnimationFrame(diagnoseId);
		diagnoseId = requestAnimationFrame(() => {
			const model = editor.getModel();
			if (model) {
				diagnose(model);
			}
		});
	};

	onChange();
	editor.onDidBlurEditorText(onChange);
	editor.onDidBlurEditorWidget(onChange);
	editor.onKeyUp(onChange);
	editor.onDidPaste(onChange);
});
