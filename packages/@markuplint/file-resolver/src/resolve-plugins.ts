import type { PluginConfig } from '@markuplint/ml-config';
import type { Plugin, PluginCreator } from '@markuplint/ml-core';

const cache = new Map<string, Plugin>();

export async function resolvePlugins(pluginPaths?: readonly (string | PluginConfig)[]) {
	if (!pluginPaths) {
		return [];
	}

	const plugins = await Promise.all(pluginPaths.map(p => importPlugin(p)));
	// Clone
	return [...plugins];
}

export function cacheClear() {
	cache.clear();
}

async function importPlugin(pluginPath: string | PluginConfig): Promise<Plugin> {
	const config = getPluginConfig(pluginPath);
	const cached = cache.get(config.name);
	if (cached) {
		return cached;
	}
	const pluginCreator = await failSafeImport<PluginCreator<any>>(config.name);
	if (!pluginCreator) {
		return {
			name: config.name,
		};
	}
	const plugin: Plugin = {
		name: pluginCreator.name,
		...pluginCreator.create(config.settings),
	};
	cache.set(plugin.name, plugin);

	let name = plugin.name;

	if (!name) {
		name = config.name
			.toLowerCase()
			.replace(/^(?:markuplint-rule-|@markuplint\/rule-)/i, '')
			.replace(/\s+|\/|\\|\./g, '-');
		// eslint-disable-next-line no-console
		console.info(`The plugin name became "${name}"`);
	}
	return {
		...plugin,
		name,
	};
}

function getPluginConfig(pluginPath: string | PluginConfig): PluginConfig {
	if (typeof pluginPath === 'string') {
		return { name: pluginPath, settings: {} };
	}
	return pluginPath;
}

async function failSafeImport<T>(name: string) {
	const res = await import(name).catch(error => error);
	if ('code' in res && res === 'MODULE_NOT_FOUND') {
		return null;
	}
	return res.default as T;
}
