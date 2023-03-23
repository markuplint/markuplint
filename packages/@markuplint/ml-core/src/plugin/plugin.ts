import type { PluginCreator, CreatePluginSettings } from './types';

export function createPlugin<S extends CreatePluginSettings>(fn: Readonly<PluginCreator<S>>) {
	return fn;
}
