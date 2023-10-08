import type { LangConfigs, Log } from '../types';
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

import { NO_INSTALL_WARNING } from '../const';
import { t, getLocale } from '../i18n';
import { configs, errorToPopup, logToDiagnosticsChannel, logToPrimaryChannel, status } from '../lsp';
import Deferred from '../utils/deferred';

import { getModule } from './get-module';
import * as v1 from './v1';
import * as v2 from './v2';
import * as v3 from './v3';
import * as v4 from './v4';

export async function bootServer() {
	const connection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));

	const log: Log = (message, type = 'debug') => {
		void connection.sendNotification(logToPrimaryChannel, [message, type]);
	};

	const diagnosticsLog: Log = (message, type = 'info') => {
		void connection.sendNotification(logToDiagnosticsChannel, [message, type]);
	};

	const mod = await getModule(log);

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

	let isLocalModule = false;
	let version: string;
	if (mod.type === 'v4') {
		version = mod.version;
	} else {
		// const { modPath, markuplint } = mod;
		version = mod.version;
		isLocalModule = true;
	}

	connection.onInitialized(async () => {
		const locale = getLocale();

		// log(`Search Markuplint on: ${modPath}`, 'debug');
		log(`Found version: ${version} (isLocalModule: ${isLocalModule})`, 'info');
		log(`Locale: ${locale}`, 'info');

		const langConfigs = await new Promise<LangConfigs>(resolve => {
			connection.onRequest(configs, langConfigs => {
				resolve(langConfigs);
			});
		});

		initialized.resolve({
			langConfigs,
			initUI() {
				const message = isLocalModule ? null : t(NO_INSTALL_WARNING, version) + t('. ');
				void connection.sendRequest(status, { version, isLocalModule, message });

				if (message) {
					void connection.sendNotification(logToPrimaryChannel, [message, 'warn']);
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
					errorToPopup,
					`Parser not found. You probably need to install ${parser} because it detected languageId: ${languageId}.`,
				);
				return;
			}
			throw e;
		};
	}

	documents.onDidOpen(async e => {
		const locale = getLocale();
		const { langConfigs, initUI } = await initialized;
		const languageId = e.document.languageId;
		const config = langConfigs[languageId] ?? null;

		if (!config?.enable) {
			void connection.sendNotification(logToPrimaryChannel, [
				`Disabled for languageId:${languageId} according to VS Code settings.`,
				'warn',
			]);
			return;
		}

		void connection.sendNotification(logToPrimaryChannel, [
			`Enabled for languageId:${languageId} according to VS Code settings.`,
		]);

		initUI();

		if (mod.type === 'v4') {
			void v4.onDidOpen(
				e,
				mod.fromCode,
				config,
				locale,
				log,
				diagnosticsLog,
				sendDiagnostics,
				notFoundParserError(languageId),
			);
		} else {
			if (satisfies(version, '1.x')) {
				return;
			}

			if (satisfies(version, '2.x')) {
				void v2.onDidOpen(
					e,
					mod.markuplint.MLEngine,
					config,
					locale,
					sendDiagnostics,
					notFoundParserError(languageId),
				);
				return;
			}

			void v3.onDidOpen(
				e,
				mod.markuplint.MLEngine,
				config,
				locale,
				log,
				diagnosticsLog,
				sendDiagnostics,
				notFoundParserError(languageId),
			);
		}
	});

	documents.onDidChangeContent(async e => {
		const { langConfigs } = await initialized;
		const languageId = e.document.languageId;
		const config = langConfigs[languageId] ?? null;

		if (!config?.enable) {
			return;
		}

		if (mod.type === 'v4') {
			v4.onDidChangeContent(e, log, notFoundParserError(languageId));
		} else {
			if (satisfies(version, '1.x')) {
				void v1.onDidChangeContent(e, mod.markuplint, config, sendDiagnostics);
				return;
			}

			if (satisfies(version, '2.x')) {
				v2.onDidChangeContent(e, notFoundParserError(languageId));
				return;
			}

			v3.onDidChangeContent(e, log, notFoundParserError(languageId));
		}
	});

	connection.onHover(async params => {
		const { langConfigs } = await initialized;
		const showAccessibility = langConfigs['html']?.showAccessibility ?? true;

		if (showAccessibility === false) {
			return;
		}

		const ariaVersion =
			typeof showAccessibility === 'boolean' ? mod.ariaRecommendedVersion : showAccessibility.ariaVersion;

		if (mod.type === 'v4') {
			const aria = await v4.getNodeWithAccessibilityProps(params.textDocument, params.position, ariaVersion);
			if (!aria) {
				return;
			}

			const heading = `\`<${aria.nodeName}>\` **${t('Computed Accessibility Properties')}**:\n`;

			const props = aria.exposed
				? `${Object.entries(aria.labels)
						.map(([key, value]) => `- ${key}: ${value}`)
						.join('\n')}`
				: `\n**${t('No exposed to accessibility tree')}** (${t('hidden element')})`;

			return {
				contents: {
					kind: MarkupKind.Markdown,
					value: heading + props,
				},
			};
		} else {
			const node = v3.getNodeWithAccessibilityProps(params.textDocument, params.position, ariaVersion);

			if (!node) {
				return;
			}

			const heading = `\`<${node.nodeName}>\` **${t('Computed Accessibility Properties')}**:\n`;

			const props = node.exposed
				? `${Object.entries(node.aria)
						.map(([key, value]) => `- ${key}: ${value}`)
						.join('\n')}`
				: `\n**${t('No exposed to accessibility tree')}** (${t('hidden element')})`;

			return {
				contents: {
					kind: MarkupKind.Markdown,
					value: heading + props,
				},
			};
		}
	});

	connection.listen();
}
