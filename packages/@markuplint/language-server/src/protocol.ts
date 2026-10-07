/**
 * What a client that opts in to `extendedProtocol` shares with the server: the identifiers, the
 * custom `markuplint/*` messages, and the types of what they carry. The VS Code extension
 * imports this to handle the messages; the server imports the same definitions to send them.
 *
 * @module
 */

export { ID, NAME } from './const.js';
export * from './lsp.js';
export type {
	Config,
	InitializationOptions,
	LangConfigs,
	Log,
	LogArg,
	LogType,
	ReportedSeverity,
	SeverityMap,
	Status,
} from './types.js';
