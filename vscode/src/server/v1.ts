import type { SendDiagnostics } from './document-events.js';
import type { Config } from '../types.js';
import type { Diagnostic } from 'vscode-languageserver/node.js';
import type { TextDocument } from 'vscode-languageserver-textdocument';

import { DiagnosticSeverity } from 'vscode-languageserver/node.js';

import { getFilePath } from '../utils/get-file-path.js';

export async function onDidChangeContent(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	document: TextDocument,
	markuplint: any,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	config: Config,
	sendDiagnostics: SendDiagnostics,
) {
	const diagnostics: Diagnostic[] = [];

	const file = getFilePath(document.uri, document.languageId);

	const html = document.getText();

	const totalResults = await markuplint.exec({
		sourceCodes: html,
		names: file.basename,
		workspace: file.dirname,
		// Add option since markuplint v1.7.0 @see https://github.com/markuplint/markuplint/pull/167
		extMatch: true,
		defaultConfig: config.defaultConfig,
	});

	const result = totalResults[0];
	if (!result) {
		return;
	}

	/**
	 * The process for until version 1.6.x.
	 * @see https://github.com/markuplint/markuplint/pull/167
	 *
	 * @deprecated
	 */
	if (result.parser === '@markuplint/html-parser' && !/\.html?/i.test(file.basename)) {
		console.log(`Skipped: "${document.uri}"`);
		return;
	}

	console.log(
		[
			`Linting: "${document.uri}"`,
			`\tLangId: ${document.languageId}`,
			`\tConfig: [${result.configSet.files.map((file: string) => `\n\t\t${file}`)}\n\t]`,
			`\tParser: ${result.parser}`,
			`\tResult: ${result.results.length} reports.`,
		].join('\n'),
	);

	for (const report of result.results) {
		diagnostics.push({
			severity: report.severity === 'error' ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
			range: {
				start: {
					line: Math.max(report.line - 1, 0),
					character: Math.max(report.col - 1, 0),
				},
				end: {
					line: Math.max(report.line - 1, 0),
					character: Math.max(report.col + report.raw.length - 1, 0),
				},
			},
			message: `${report.message} (${report.ruleId})`,
			source: 'markuplint',
		});
	}

	sendDiagnostics({
		uri: document.uri,
		diagnostics,
	});
}
