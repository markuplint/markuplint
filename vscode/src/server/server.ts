import type { SendDiagnostics } from './document-events.js';
import type { LangConfigs, Log } from '../types.js';
import type { InitializeResult } from 'vscode-languageserver/node.js';

import { createConnection, TextDocuments, TextDocumentSyncKind, ProposedFeatures } from 'vscode-languageserver/node.js';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { NO_INSTALL_WARNING } from '../const.js';
import { t } from '../i18n.js';
import { errorToPopup, logToDiagnosticsChannel, logToPrimaryChannel, status } from '../lsp.js';

import { verbosely } from './debug.js';
import { createEventHandlers } from './document-events.js';
import { getModule } from './get-module.js';

const DEBUG = false;

export function bootServer() {
	const connection = createConnection(ProposedFeatures.all);

	const log: Log = (message, type = 'debug') => {
		void connection.sendNotification(logToPrimaryChannel, [message, type]);
	};

	const diagnosticsLog: Log = (message, type = 'info') => {
		void connection.sendNotification(logToDiagnosticsChannel, [message, type]);
	};

	const errorLog: Log = message => {
		void connection.sendNotification(errorToPopup, message);
	};

	const sendDiagnostics: SendDiagnostics = params => {
		void connection.sendDiagnostics(params);
	};

	const documents = new TextDocuments(TextDocument);

	documents.listen(connection);

	connection.onInitialize((params): InitializeResult => {
		log('onInitialize');

		const locale = params.locale ?? 'en';
		const langConfigs: LangConfigs = params.initializationOptions.langConfigs;

		connection.onInitialized(async () => {
			log('onInitialized');

			if (DEBUG) {
				verbosely();
			}

			const mod = await getModule(log);

			log(`Found version: ${mod.version} (isLocalModule: ${mod.isLocalModule})`, 'info');
			log(`Locale: ${locale}`, 'info');

			const { onDidOpen, onDidChangeContent, onHover } = createEventHandlers({
				mod,
				locale,
				langConfigs,
				log,
				diagnosticsLog,
				errorLog,
				sendDiagnostics,
				initUI() {
					const message = mod.isLocalModule ? null : t(NO_INSTALL_WARNING, mod.version) + t('. ');
					void connection.sendRequest(status, {
						version: mod.version,
						isLocalModule: mod.isLocalModule,
						message,
					});

					if (message) {
						void connection.sendNotification(logToPrimaryChannel, [message, 'warn']);
					}
				},
			});

			documents.onDidOpen(e => onDidOpen(e.document));
			// eslint-disable-next-line unicorn/no-array-for-each
			documents.all().forEach(onDidOpen);

			documents.onDidChangeContent(e => onDidChangeContent(e.document));

			connection.onHover(onHover);
		});

		return {
			capabilities: {
				textDocumentSync: TextDocumentSyncKind.Incremental,
				hoverProvider: true,
			},
		};
	});

	connection.listen();
}
