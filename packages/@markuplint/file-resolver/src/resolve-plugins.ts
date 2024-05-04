import type { PluginConfig } from '@markuplint/ml-config';
import type { Plugin, PluginCreator } from '@markuplint/ml-core';

import { log } from './debug.js';
import { generalImport } from './general-import.js';

const pLog = log.extend('resolve-plugins');

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
		pLog('Return from cache: %s', config.name);
		return cached;
	}

	const pluginCreator = await generalImport<PluginCreator<any>>(config.name);

	let name = config.name;
	let plugin: Plugin | null = null;

	if (typeof pluginCreator?.create === 'function' || pluginCreator?.name) {
		plugin = {
			name: pluginCreator.name,
			...pluginCreator.create(config.settings),
		};
		name = plugin.name ?? name;
	} else if (pluginCreator) {
		pLog('Invalid plugin: %s', config.name);
	}

	name = name
		.toLowerCase()
		.replace(/^(?:markuplint-rule-|@markuplint\/rule-)/i, '')
		.replaceAll(/\s+|[./\\]/g, '-');

	const result = {
		...plugin,
		name,
	};

	cache.set(name, result);
	return result;
}

function getPluginConfig(pluginPath: string | PluginConfig): PluginConfig {
	if (typeof pluginPath === 'string') {
		return { name: pluginPath, settings: {} };
	}
	return pluginPath;
}
