import type { Config as MLConfig } from '@markuplint/ml-config';
import type { ARIAVersion } from '@markuplint/ml-spec';

export type Config = {
	enable: boolean;
	debug: boolean;
	defaultConfig: MLConfig;
	showAccessibility:
		| boolean
		| {
				ariaVersion: ARIAVersion;
		  };
};

export type LangConfigs = Record<string, Config>;

export type Log = (message: string) => void;
