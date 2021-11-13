import type { PluginConfig } from '@markuplint/ml-config';
import type { Plugin } from '@markuplint/ml-core';

const cache = new Map<string, Plugin>();

export async function resolvePlugins(pluginPaths?: (string | PluginConfig)[]) {
	if (!pluginPaths) {
		return [];
	}

	const plugins = await Promise.all(pluginPaths.map(p => importPlugin(p)));
	// Clone
	return plugins.slice();
}

async function importPlugin(pluginPath: string | PluginConfig) {
	const path = getPath(pluginPath);
	const cached = cache.get(path);
	if (cached) {
		return cached;
	}
	const plugin: Plugin = (await import(path)).default;
	if (!plugin) {
		throw new Error(`The plugin (${path}) is empty`);
	}
	cache.set(path, plugin);
	if (!plugin.name) {
		plugin.name = path
			.toLowerCase()
			.replace(/^(?:markuplint-rule-|@markuplint\/rule-)/i, '')
			.replace(/\s+|\/|\\/g, '-');
		// eslint-disable-next-line no-console
		console.info(`The plugin name became "${plugin.name}"`);
	}
	return plugin;
}

function getPath(pluginPath: string | PluginConfig) {
	if (typeof pluginPath === 'string') {
		return pluginPath;
	}
	return pluginPath.name;
}
