import type { Config } from '../types';
import type { Diagnostic, TextDocumentChangeEvent, PublishDiagnosticsParams } from 'vscode-languageserver/node';
import type { TextDocument } from 'vscode-languageserver-textdocument';

import { DiagnosticSeverity } from 'vscode-languageserver/node';

import { getFilePath } from '../utils/get-file-path';

export async function onDidChangeContent(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	change: TextDocumentChangeEvent<TextDocument>,
	markuplint: any,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	config: Config,
	sendDiagnostics: (
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		params: PublishDiagnosticsParams,
	) => void,
) {
	const diagnostics: Diagnostic[] = [];

	const file = getFilePath(change.document.uri, change.document.languageId);

	const html = change.document.getText();

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
		console.log(`Skipped: "${change.document.uri}"`);
		return;
	}

	console.log(
		[
			`Linting: "${change.document.uri}"`,
			`\tLangId: ${change.document.languageId}`,
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
		uri: change.document.uri,
		diagnostics,
	});
}
