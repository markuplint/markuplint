import type { PluginConfig } from '@markuplint/ml-config';
import type { Plugin, PluginCreator } from '@markuplint/ml-core';

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
	const config = getPluginConfig(pluginPath);
	const cached = cache.get(config.name);
	if (cached) {
		return cached;
	}
	const pluginCreator: PluginCreator<any> = (await import(config.name)).default;
	if (!pluginCreator) {
		throw new Error(`The plugin (${config.name}) is empty`);
	}
	const plugin: Plugin = {
		name: pluginCreator.name,
		...pluginCreator.create(config.settings),
	};
	cache.set(plugin.name, plugin);
	if (!plugin.name) {
		plugin.name = config.name
			.toLowerCase()
			.replace(/^(?:markuplint-rule-|@markuplint\/rule-)/i, '')
			.replace(/\s+|\/|\\|\./g, '-');
		// eslint-disable-next-line no-console
		console.info(`The plugin name became "${plugin.name}"`);
	}
	return plugin;
}

function getPluginConfig(pluginPath: string | PluginConfig): PluginConfig {
	if (typeof pluginPath === 'string') {
		return { name: pluginPath, settings: {} };
	}
	return pluginPath;
}
