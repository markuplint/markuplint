import type { SendDiagnostics } from './document-events.js';
import type { InitializationOptions, Log } from '../types.js';
import type { CodeAction, CodeActionParams, InitializeResult } from 'vscode-languageserver/node.js';

import {
	CodeActionKind,
	createConnection,
	TextDocuments,
	TextDocumentSyncKind,
	ProposedFeatures,
} from 'vscode-languageserver/node.js';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { errorToPopup, logToDiagnosticsChannel, logToPrimaryChannel, status, warningToPopup } from '../lsp.js';

import { SOURCE_FIX_ALL_MARKUPLINT } from './code-actions.js';
import { verbosely } from './debug.js';
import { createEventHandlers } from './document-events.js';
import { createModuleResolver } from './get-module.js';
import { createModuleNotices } from './module-notices.js';
import { configureGitPath } from './suppression-support.js';

const DEBUG = false;

/**
 * Bootstrap the LSP language server.
 *
 * Creates the LSP connection, sets up logging handlers, registers document event handlers,
 * and starts listening. The markuplint module is resolved lazily per working directory as
 * documents open; the bundled-fallback notice is logged once per directory and the import
 * assertion popup is shown once per session (see `createModuleNotices`).
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

	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	let codeActionHandler: (params: CodeActionParams) => CodeAction[] = () => [];

	connection.onCodeAction(params => codeActionHandler(params));

	connection.onInitialize((params): InitializeResult => {
		log('onInitialize');

		const locale = params.locale ?? 'en';
		const initOptions: InitializationOptions = params.initializationOptions;
		const { langConfigs, workingDirectories, workspaceFolders, gitPath } = initOptions;

		configureGitPath(gitPath);

		connection.onInitialized(() => {
			log('onInitialized');

			if (DEBUG) {
				verbosely();
			}

			log(`Locale: ${locale}`, 'info');

			if (workingDirectories) {
				log(`Working directories: ${JSON.stringify(workingDirectories)}`, 'info');
			}

			const notices = createModuleNotices({
				log,
				popup: message => void connection.sendNotification(warningToPopup, message),
				sendStatus: current => void connection.sendRequest(status, current),
			});

			const resolveModule = createModuleResolver({ log, onFirstResolve: notices.onFirstResolve });

			const { onDidOpen, onDidChangeContent, onHover, onCodeAction } = createEventHandlers({
				resolveModule,
				locale,
				langConfigs,
				workingDirectories,
				workspaceFolders: workspaceFolders ?? [],
				log,
				diagnosticsLog,
				errorLog,
				sendDiagnostics,
				reportStatus: notices.reportStatus,
			});

			documents.onDidOpen(e => onDidOpen(e.document));
			// eslint-disable-next-line unicorn/no-array-for-each
			documents.all().forEach(onDidOpen);

			documents.onDidChangeContent(e => onDidChangeContent(e.document));

			connection.onHover(onHover);
			codeActionHandler = onCodeAction;
		});

		return {
			capabilities: {
				textDocumentSync: TextDocumentSyncKind.Incremental,
				hoverProvider: true,
				codeActionProvider: {
					codeActionKinds: [CodeActionKind.QuickFix, SOURCE_FIX_ALL_MARKUPLINT],
				},
			},
		};
	});

	connection.listen();
}
