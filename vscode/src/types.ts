import type { Config as MLConfig } from '@markuplint/ml-config';
import type { ARIAVersion } from '@markuplint/ml-spec';

import type { WorkingDirectoryEntry } from './utils/resolve-working-directory.js';

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

export type Status = {
	readonly version: string;
	readonly isLocalModule: boolean;
	readonly message: string | null;
};

export type LangConfigs = Record<string, Config>;

export type InitializationOptions = {
	readonly langConfigs: LangConfigs;
	readonly workingDirectories?: readonly WorkingDirectoryEntry[];
	readonly workspaceFolders?: readonly string[];
};

export type Log = (...args: LogArg) => void;

export type LogType = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'clear';

export type LogArg = readonly [message: string, type?: LogType];
