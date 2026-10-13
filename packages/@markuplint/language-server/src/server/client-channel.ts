import type { Log, LogType, Status } from '../types.js';
import type { Connection } from 'vscode-languageserver/node.js';

import { isFatalError } from 'markuplint/suppressions';
import { LogMessageNotification, MessageType, ShowMessageNotification } from 'vscode-languageserver/node.js';

import { errorToPopup, logToDiagnosticsChannel, logToPrimaryChannel, status, warningToPopup } from '../lsp.js';

/**
 * How the server talks to its client apart from diagnostics.
 */
export type ClientChannel = {
	/**
	 * Selects the protocol. Called once, from the `initialize` request.
	 *
	 * @param extendedProtocol - `true` when the client understands the `markuplint/*` messages
	 */
	configure(extendedProtocol: boolean): void;
	/** Primary log: the extension's output channel, otherwise `window/logMessage` */
	readonly log: Log;
	/** Diagnostics log: the extension's second output channel, otherwise `window/logMessage` */
	readonly diagnosticsLog: Log;
	/** An error the user should see: the extension's popup, otherwise `window/showMessage` */
	readonly errorLog: Log;
	/** A warning the user should see: the extension's popup, otherwise `window/showMessage` */
	warningPopup(message: string): void;
	/** Tells the client which markuplint lints the documents. Only the extension has a status bar for it. */
	reportStatus(current: Status): void;
};

const MESSAGE_TYPES: Record<Exclude<LogType, 'clear' | 'trace'>, MessageType> = {
	error: MessageType.Error,
	warn: MessageType.Warning,
	info: MessageType.Info,
	debug: MessageType.Log,
};

/**
 * Creates the channel between the server and its client.
 *
 * The `markuplint/*` messages are custom: a client that has not registered them rejects the
 * `markuplint/ready` request with `MethodNotFound`, and it has no output channel or popup to
 * show the notifications in. Only the VS Code extension, which handles all of them, opts in.
 * Every other client gets `window/logMessage` and `window/showMessage`, which the LSP requires
 * a client to support. `window/showMessage` is the notification, never the
 * `window/showMessageRequest` that `connection.window.showErrorMessage` sends and a client must
 * answer.
 *
 * @param connection - The connection to the client; only what it sends is used
 * @returns The channel, which uses the standard messages until `configure(true)` is called
 */
export function createClientChannel(connection: Pick<Connection, 'sendNotification' | 'sendRequest'>): ClientChannel {
	let extended = false;

	// `trace` is one line per engine phase for every document, which is what the extension's
	// output channel is for. A client that does not opt in has no such channel to put it in.
	function standardLog(message: string, type: LogType | undefined) {
		if (type === 'clear' || type === 'trace') {
			return;
		}
		void connection.sendNotification(LogMessageNotification.type, {
			type: MESSAGE_TYPES[type ?? 'debug'],
			message,
		});
	}

	function standardShow(message: string, type: MessageType) {
		void connection.sendNotification(ShowMessageNotification.type, { type, message });
	}

	const log: Log = (message, type) => {
		if (extended) {
			void connection.sendNotification(logToPrimaryChannel, [message, type]);
		} else {
			standardLog(message, type);
		}
	};

	return {
		configure(extendedProtocol) {
			extended = extendedProtocol;
		},
		log,
		diagnosticsLog(message, type) {
			if (extended) {
				void connection.sendNotification(logToDiagnosticsChannel, [message, type]);
			} else {
				standardLog(message, type ?? 'info');
			}
		},
		errorLog(message) {
			if (extended) {
				void connection.sendNotification(errorToPopup, message);
			} else {
				standardShow(message, MessageType.Error);
			}
		},
		warningPopup(message) {
			if (extended) {
				void connection.sendNotification(warningToPopup, message);
			} else {
				standardShow(message, MessageType.Warning);
			}
		},
		reportStatus(current) {
			if (!extended) {
				return;
			}
			connection.sendRequest(status, current).catch((error: unknown) => {
				if (isFatalError(error)) {
					throw error;
				}
				log(`The client rejected the status: ${error}`, 'warn');
			});
		},
	};
}
