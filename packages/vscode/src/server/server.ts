import type { LangConfigs } from '../types';
import type { InitializeResult, PublishDiagnosticsParams } from 'vscode-languageserver/node';

import { satisfies } from 'semver';
import {
	createConnection,
	IPCMessageReader,
	IPCMessageWriter,
	TextDocuments,
	TextDocumentSyncKind,
	MarkupKind,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { configs, error, info, ready } from '../types';
import Deferred from '../utils/deferred';

import { getModule } from './get-module';
import * as v1 from './v1';
import * as v2 from './v2';
import * as v3 from './v3';

export function bootServer() {
	const { markuplint, version, isLocalModule } = getModule();
	console.log(`Found version: ${version} (isLocalModule: ${isLocalModule})`);

	const connection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));
	const documents = new TextDocuments(TextDocument);
	documents.listen(connection);

	connection.onInitialize((): InitializeResult => {
		return {
			capabilities: {
				textDocumentSync: TextDocumentSyncKind.Incremental,
				hoverProvider: true,
			},
		};
	});

	const initialized = new Deferred<{
		langConfigs: LangConfigs;
		initUI: () => void;
	}>();

	connection.onInitialized(async () => {
		const langConfigs = await new Promise<LangConfigs>(resolve => {
			connection.onRequest(configs, langConfigs => {
				resolve(langConfigs);
			});
		});

		initialized.resolve({
			langConfigs,
			initUI() {
				void connection.sendRequest(ready, { version });

				if (!isLocalModule) {
					const locale = process.env.VSCODE_NLS_CONFIG
						? JSON.parse(process.env.VSCODE_NLS_CONFIG).locale
						: '';
					let msg: string;
					switch (locale) {
						case 'ja': {
							msg = `ワークスペースのnode_modulesにmarkuplintが発見できなかったためVS Code拡張にインストールされているバージョン(v${version})を利用します。`;
							break;
						}
						default: {
							msg = `Since markuplint could not be found in the node_modules of the workspace, this use the version (v${version}) installed in VS Code Extension.`;
						}
					}
					void connection.sendNotification(info, `<markuplint> ${msg}`);
				}
			},
		});
	});

	function sendDiagnostics(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		params: PublishDiagnosticsParams,
	) {
		void connection.sendDiagnostics(params);
	}

	function notFoundParserError(languageId: string) {
		return (e: unknown) => {
			if (e instanceof Error) {
				const { groups } = /Cannot find module.+(?<parser>@markuplint\/[a-z]+-parser)/.exec(e.message) || {};
				const parser = groups?.parser;
				void connection.sendNotification(
					error,
					`Parser not found. You probably need to install ${parser} because it detected languageId: ${languageId}.`,
				);
				return;
			}
			throw e;
		};
	}

	documents.onDidOpen(async e => {
		const { langConfigs, initUI } = await initialized;
		const languageId = e.document.languageId;
		const config = langConfigs[languageId] ?? null;

		if (!config?.enable) {
			console.log(`markuplint is disabled (languageId: ${languageId})`);
			return;
		}

		console.log(`markuplint is enabled (languageId: ${languageId})`);
		initUI();

		if (satisfies(version, '1.x')) {
			return;
		}

		if (satisfies(version, '2.x')) {
			void v2.onDidOpen(e, markuplint.MLEngine, config, sendDiagnostics, notFoundParserError(languageId));
			return;
		}

		void v3.onDidOpen(e, markuplint.MLEngine, config, sendDiagnostics, notFoundParserError(languageId));
	});

	documents.onDidChangeContent(async e => {
		const { langConfigs } = await initialized;
		const languageId = e.document.languageId;
		const config = langConfigs[languageId] ?? null;

		if (!config?.enable) {
			return;
		}

		if (satisfies(version, '1.x')) {
			void v1.onDidChangeContent(e, markuplint, config, sendDiagnostics);
			return;
		}

		if (satisfies(version, '2.x')) {
			v2.onDidChangeContent(e, notFoundParserError(languageId));
			return;
		}

		v3.onDidChangeContent(e, notFoundParserError(languageId));
	});

	connection.onHover(async params => {
		const { langConfigs } = await initialized;
		const showAccessibility = langConfigs['html']?.showAccessibility ?? true;

		if (showAccessibility === false) {
			return;
		}

		const ariaVersion = typeof showAccessibility === 'boolean' ? '1.2' : showAccessibility.ariaVersion;

		const node = v3.getNodeWithAccessibilityProps(params.textDocument, params.position, ariaVersion);

		if (!node) {
			return;
		}

		const heading = `\`<${node.nodeName}>\` **Computed Accessibility Properties**:\n`;

		const props = node.exposed
			? `${Object.entries(node.aria)
					.map(([key, value]) => `- ${key}: ${value}`)
					.join('\n')}`
			: '\n**No exposed to accessibility tree** (hidden element)';

		return {
			contents: {
				kind: MarkupKind.Markdown,
				value: heading + props,
			},
		};
	});

	connection.listen();
}
