import type { AnyMLRule } from '@markuplint/ml-core';
import type { Config } from '@markuplint/ml-config';

export type APIOptions = {
	config?: Config;
	configFile?: string;
	autoLoad?: boolean;
	locale?: string;
	fix?: boolean;
	extMatch?: boolean;
	rules?: AnyMLRule[];
	importPresetRules?: boolean;
};
