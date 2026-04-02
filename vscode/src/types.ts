import type { Config as MLConfig } from '@markuplint/ml-config';
import type { ARIAVersion } from '@markuplint/ml-spec';

import type { WorkingDirectoryEntry } from './utils/resolve-working-directory.js';

/**
 * Per-language configuration for the markuplint VS Code extension.
 */
export type Config = {
	enable: boolean;
	debug: boolean;
	defaultConfig: MLConfig;
	hover: {
		accessibility: {
			enable: boolean;
			ariaVersion: ARIAVersion;
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
 * A map of VS Code language IDs to their markuplint configuration.
 */
export type LangConfigs = Record<string, Config>;

/**
 * Options passed from the VS Code client to the language server during initialization.
 */
export type InitializationOptions = {
	/** Per-language configuration for markuplint */
	readonly langConfigs: LangConfigs;
	/** User-configured working directories for monorepo support */
	readonly workingDirectories?: readonly WorkingDirectoryEntry[];
	/** Absolute paths of VS Code workspace folders */
	readonly workspaceFolders?: readonly string[];
	/**
	 * Path to the git binary, resolved from VS Code's `git.path` setting.
	 * Falls back to `'git'` (PATH lookup) when unset.
	 */
	readonly gitPath?: string;
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
