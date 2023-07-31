import type { RuleSeed } from '../ml-rule/index.js';
import type { Config } from '@markuplint/ml-config';

export type Plugin = {
	readonly name: string;
	readonly rules?: Readonly<Record<string, Readonly<RuleSeed<any, any>>>>;
	readonly configs?: Readonly<Record<string, Config>>;
};

export type PluginCreator<S extends CreatePluginSettings> = {
	readonly name: string;
	create(setting: S): Omit<Plugin, 'name'>;
};

export type CreatePluginSettings = Readonly<Record<string, unknown>>;
