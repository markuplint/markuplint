import type { PluginCreator, CreatePluginSettings } from './types';

export function createPlugin<S extends CreatePluginSettings>(fn: PluginCreator<S>) {
	return fn;
}
