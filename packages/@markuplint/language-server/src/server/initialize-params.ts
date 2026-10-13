import type { InitializationOptions } from '../types.js';
import type { WorkspaceFolder } from 'vscode-languageserver/node.js';

import { fileURLToPath } from 'node:url';

/**
 * The part of the LSP `initialize` request the server reads.
 */
export type InitializeInput = {
	readonly locale?: string | null;
	readonly rootUri?: string | null;
	readonly workspaceFolders?: readonly WorkspaceFolder[] | null;
	readonly initializationOptions?: unknown;
};

/**
 * What the server derives from the `initialize` request.
 */
export type Initialization = {
	readonly locale: string;
	readonly options: InitializationOptions;
	/** Absolute paths of the workspace folders */
	readonly workspaceFolders: readonly string[];
};

/**
 * Reads the `initialize` request of any LSP client.
 *
 * Only the VS Code extension sends `initializationOptions`, so a missing or `null` value is the
 * normal case rather than an error. Workspace folders come from the options when the client gave
 * them, otherwise from the LSP-standard `workspaceFolders`, and last from the deprecated
 * `rootUri` that older clients still send.
 *
 * @param params - The `initialize` request
 * @returns The locale, the options, and the workspace folders as absolute paths
 */
export function resolveInitialization(params: InitializeInput): Initialization {
	// The shape is the client's promise; nothing here validates it, as with any LSP initialization option.
	const options = (
		isRecord(params.initializationOptions) ? params.initializationOptions : {}
	) as InitializationOptions;

	return {
		locale: params.locale ?? 'en',
		options,
		workspaceFolders: options.workspaceFolders ?? workspaceFoldersFromProtocol(params),
	};
}

function workspaceFoldersFromProtocol(params: InitializeInput): readonly string[] {
	const uris = params.workspaceFolders ? params.workspaceFolders.map(folder => folder.uri) : [params.rootUri];
	return uris.filter((uri): uri is string => !!uri?.startsWith('file:')).map(uri => fileURLToPath(uri));
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
