import type { Config as MLConfig } from '@markuplint/ml-config';
import type { ARIAVersion } from '@markuplint/ml-spec';

import type { WorkingDirectoryEntry } from './utils/resolve-working-directory.js';

/**
 * Per-language configuration sent by clients that manage settings themselves (the VS Code extension).
 */
export type Config = {
	enable: boolean;
	debug: boolean;
	/**
	 * Applied only when no config file is found. Left out, markuplint falls back to
	 * `markuplint:recommended`, exactly as the CLI does.
	 */
	defaultConfig?: MLConfig;
	hover: {
		accessibility: {
			enable: boolean;
			ariaVersion?: ARIAVersion;
		};
	};
};

/**
 * Status information sent from the language server to the client for the status bar.
 */
export type Status = {
	readonly version: string;
	readonly isLocalModule: boolean;
	readonly message: string | null;
};

/**
 * A map of language IDs to their markuplint configuration.
 */
export type LangConfigs = Record<string, Config>;

/**
 * The severities a diagnostic can be reported with.
 */
export type ReportedSeverity = 'error' | 'warning' | 'info' | 'hint';

/**
 * Maps the severity markuplint assigns to a violation onto the severity reported to the client.
 * Severities missing from the map are reported unchanged.
 */
export type SeverityMap = Partial<Record<'error' | 'warning' | 'info', ReportedSeverity>>;

/**
 * Options a client may pass in `initializationOptions`. Every field is optional so that
 * clients which know nothing about markuplint (Claude Code, OpenCode, Neovim) can start the
 * server without configuring it.
 */
export type InitializationOptions = {
	/**
	 * Per-language configuration. When present, only languages listed here with `enable: true`
	 * are linted. When absent, every document the client opens is linted.
	 */
	readonly langConfigs?: LangConfigs;
	/** User-configured working directories for monorepo support */
	readonly workingDirectories?: readonly WorkingDirectoryEntry[];
	/**
	 * Absolute paths of the workspace folders. Falls back to the LSP-standard
	 * `workspaceFolders` and `rootUri` of the `initialize` request.
	 */
	readonly workspaceFolders?: readonly string[];
	/**
	 * Path to the git binary. Falls back to `'git'` (PATH lookup) when unset.
	 */
	readonly gitPath?: string;
	/**
	 * Opts in to the `markuplint/*` custom requests and notifications (status bar, output
	 * channels, popups). Clients that do not set it receive `window/logMessage` and
	 * `window/showMessage` instead, which every LSP client understands.
	 */
	readonly extendedProtocol?: boolean;
	/**
	 * Re-reports diagnostics with another severity, for clients that surface only some
	 * severities to their user (OpenCode hands only errors to the model).
	 */
	readonly severityMap?: SeverityMap;
};

/**
 * A logging function that writes to an output channel.
 */
export type Log = (...args: LogArg) => void;

/**
 * Log severity levels for the output channels.
 */
export type LogType = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'clear';

/**
 * Arguments for a log call: a message string and an optional log type.
 */
export type LogArg = readonly [message: string, type?: LogType];
