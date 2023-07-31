import type { PluginCreator, CreatePluginSettings } from './types.js';

export function createPlugin<S extends CreatePluginSettings>(fn: Readonly<PluginCreator<S>>) {
	return fn;
}
