import type { AnyRuleSeed } from '../ml-rule';
import type { Config } from '@markuplint/ml-config';

export type Plugin = {
	name: string;
	rules?: Record<string, AnyRuleSeed>;
	configs?: Record<string, Config>;
};

export type PluginCreator<S extends CreatePluginSettings> = {
	readonly name: string;
	create(setting: S): Omit<Plugin, 'name'>;
};

export type CreatePluginSettings = Record<string, unknown>;
