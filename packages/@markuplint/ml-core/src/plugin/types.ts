import type { RuleSeed } from '../ml-rule/index.js';
import type { Config } from '@markuplint/ml-config';

/**
 * A resolved markuplint plugin containing named rules and/or shared configurations.
 */
export type Plugin = {
	/** The plugin name, used as a prefix for its rules (e.g. `"my-plugin/rule-name"`) */
	readonly name: string;
	/** Custom rules provided by this plugin */
	readonly rules?: Readonly<Record<string, Readonly<RuleSeed<any, any>>>>;
	/** Shared configurations that users can extend from */
	readonly configs?: Readonly<Record<string, Config>>;
};

/**
 * A factory interface for creating plugins with custom settings.
 *
 * @template S - The settings type accepted by the plugin creator
 */
export type PluginCreator<S extends CreatePluginSettings> = {
	/** The plugin name */
	readonly name: string;
	/**
	 * Creates the plugin's rules and configs from the given settings.
	 *
	 * @param setting - The user-provided settings for this plugin
	 * @returns The plugin's rules and configurations
	 */
	create(setting: S): Omit<Plugin, 'name'>;
};

/**
 * Base type for plugin settings. A readonly record of string keys to unknown values.
 */
export type CreatePluginSettings = Readonly<Record<string, unknown>>;
