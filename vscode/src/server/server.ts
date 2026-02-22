import type { SendDiagnostics } from './document-events.js';
import type { InitializationOptions, Log } from '../types.js';
import type { InitializeResult } from 'vscode-languageserver/node.js';

import { createConnection, TextDocuments, TextDocumentSyncKind, ProposedFeatures } from 'vscode-languageserver/node.js';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { IMPORT_ASSERTION_COMPAT_WARNING, NO_INSTALL_WARNING } from '../const.js';
import { t } from '../i18n.js';
import { errorToPopup, logToDiagnosticsChannel, logToPrimaryChannel, status, warningToPopup } from '../lsp.js';

import { verbosely } from './debug.js';
import { createEventHandlers } from './document-events.js';
import { getModule } from './get-module.js';

const DEBUG = false;

/**
 * Bootstrap the LSP language server.
 *
 * Creates the LSP connection, sets up logging handlers, resolves the markuplint module,
 * registers document event handlers, and starts listening. If the local markuplint module
 * is unavailable or incompatible, displays appropriate warnings to the user.
 */
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
		const initOptions: InitializationOptions = params.initializationOptions;
		const { langConfigs, workingDirectories, workspaceFolders } = initOptions;

		connection.onInitialized(async () => {
			log('onInitialized');

			if (DEBUG) {
				verbosely();
			}

			const mod = await getModule(log);

			log(`Found version: ${mod.version} (isLocalModule: ${mod.isLocalModule})`, 'info');
			log(`Locale: ${locale}`, 'info');

			if (workingDirectories) {
				log(`Working directories: ${JSON.stringify(workingDirectories)}`, 'info');
			}

			const { onDidOpen, onDidChangeContent, onHover } = createEventHandlers({
				mod,
				locale,
				langConfigs,
				workingDirectories,
				workspaceFolders: workspaceFolders ?? [],
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

					if (mod.fallbackReason === 'import-assertion-compat') {
						const compatMessage = t(IMPORT_ASSERTION_COMPAT_WARNING, mod.version);
						void connection.sendNotification(warningToPopup, compatMessage);
						void connection.sendNotification(logToPrimaryChannel, [compatMessage, 'warn']);
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
