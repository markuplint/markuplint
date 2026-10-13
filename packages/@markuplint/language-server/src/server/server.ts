import type { SendDiagnostics } from './document-events.js';
import type { Log } from '../types.js';
import type { CodeAction, CodeActionParams, Connection, InitializeResult } from 'vscode-languageserver/node.js';

import { CodeActionKind, TextDocuments, TextDocumentSyncKind } from 'vscode-languageserver/node.js';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { setLocale } from '../i18n.js';

import { createClientChannel } from './client-channel.js';
import { SOURCE_FIX_ALL_MARKUPLINT } from './code-actions.js';
import { applySeverityMap } from './convert-diagnostics.js';
import { verbosely } from './debug.js';
import { createEventHandlers } from './document-events.js';
import { createModuleResolver } from './get-module.js';
import { resolveInitialization } from './initialize-params.js';
import { createModuleNotices } from './module-notices.js';
import { configureGitPath } from './suppression-support.js';

const DEBUG = false;

/**
 * Bootstrap the LSP language server on a connection and start listening.
 *
 * Any LSP client can use the server, so nothing the client sends beyond the LSP itself is
 * required: `initializationOptions` is optional (see {@link InitializationOptions}), and the
 * `markuplint/*` custom messages are sent only to a client that opts in with `extendedProtocol`
 * (see {@link createClientChannel}). Only the VS Code extension relies on both.
 *
 * The markuplint module is resolved lazily per working directory as documents open; the
 * bundled-fallback notice is logged once per directory and the import assertion popup is shown
 * once per session (see `createModuleNotices`).
 *
 * Diagnostics must not write to stdout: over `--stdio` it carries the protocol, and a client
 * such as Claude Code disconnects the server on any other output. Logs go through the channel,
 * and `debug` writes to stderr.
 *
 * @param connection - The connection to the client, from `createConnection`
 */
export function bootServer(connection: Connection) {
	const channel = createClientChannel(connection);

	const documents = new TextDocuments(TextDocument);

	documents.listen(connection);

	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	let codeActionHandler: (params: CodeActionParams) => CodeAction[] = () => [];

	connection.onCodeAction(params => codeActionHandler(params));

	connection.onInitialize((params): InitializeResult => {
		const { locale, options, workspaceFolders } = resolveInitialization(params);

		channel.configure(options.extendedProtocol === true);
		setLocale(locale);

		const log: Log = channel.log;

		log('onInitialize');

		const { langConfigs, workingDirectories, gitPath, severityMap } = options;

		configureGitPath(gitPath);

		const sendDiagnostics: SendDiagnostics = ({ diagnostics, ...rest }) => {
			void connection.sendDiagnostics({ ...rest, diagnostics: applySeverityMap(diagnostics, severityMap) });
		};

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
				popup: channel.warningPopup,
				sendStatus: channel.reportStatus,
			});

			const resolveModule = createModuleResolver({ log, onFirstResolve: notices.onFirstResolve });

			const { onDidOpen, onDidChangeContent, onDidClose, onHover, onCodeAction } = createEventHandlers({
				resolveModule,
				locale,
				langConfigs,
				workingDirectories,
				workspaceFolders,
				log,
				diagnosticsLog: channel.diagnosticsLog,
				errorLog: channel.errorLog,
				sendDiagnostics,
				reportStatus: notices.reportStatus,
			});

			documents.onDidOpen(e => onDidOpen(e.document));
			// eslint-disable-next-line unicorn/no-array-for-each
			documents.all().forEach(onDidOpen);

			documents.onDidChangeContent(e => onDidChangeContent(e.document));

			documents.onDidClose(e => onDidClose(e.document));

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
