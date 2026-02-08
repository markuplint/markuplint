import type { PluginCreator, CreatePluginSettings } from './types.js';

/**
 * Factory function for creating a type-safe plugin creator.
 * Returns the creator object as-is; primarily used for type inference.
 *
 * @template S - The settings type accepted by the plugin
 * @param fn - The plugin creator definition
 * @returns The same creator object, now fully typed
 */
export function createPlugin<S extends CreatePluginSettings>(fn: Readonly<PluginCreator<S>>) {
	return fn;
}
