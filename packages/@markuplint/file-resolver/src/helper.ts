import { Config, ConfigSet } from './types';
import { LoaderSync, cosmiconfig, cosmiconfigSync } from 'cosmiconfig';
import { loadConfigFile, loadConfigFileSync } from './load-config-file';
import path from 'path';

const explorer = cosmiconfig('markuplint');
const explorerSync = cosmiconfigSync('markuplint');

type CosmiConfig = ReturnType<LoaderSync>;

export async function search<T = CosmiConfig>(dir: string, cacheClear: boolean) {
	if (!cacheClear) {
		explorer.clearCaches();
	}
	dir = path.dirname(dir);
	const result = await explorer.search(dir);
	if (!result || result.isEmpty) {
		return null;
	}
	return {
		filePath: result.filepath,
		config: result.config as T,
	};
}

export function searchSync<T = CosmiConfig>(dir: string, cacheClear: boolean) {
	if (!cacheClear) {
		explorer.clearCaches();
	}
	dir = path.dirname(dir);
	const result = explorerSync.search(dir);
	if (!result || result.isEmpty) {
		return null;
	}
	return {
		filePath: result.filepath,
		config: result.config as T,
	};
}

export async function load<T = CosmiConfig>(filePath: string, cacheClear: boolean) {
	if (!cacheClear) {
		explorer.clearCaches();
	}
	const result = await explorer.load(filePath);
	if (!result || result.isEmpty) {
		return null;
	}
	return {
		filePath: result.filepath,
		config: result.config as T,
	};
}

export function loadSync<T = CosmiConfig>(filePath: string, cacheClear: boolean) {
	if (!cacheClear) {
		explorer.clearCaches();
	}
	const result = explorerSync.load(filePath);
	if (!result || result.isEmpty) {
		return null;
	}
	return {
		filePath: result.filepath,
		config: result.config as T,
	};
}

export async function recursiveLoad(
	config: Config,
	filePath: string,
	files: Set<string>,
	cacheClear: boolean,
): Promise<ConfigSet> {
	const errs: Error[] = [];
	const baseDir = path.dirname(filePath);
	if (config.extends) {
		const extendFiles = Array.isArray(config.extends) ? config.extends : [config.extends];
		for (const _file of extendFiles) {
			if (/^\.+\//.test(_file)) {
				const file = path.resolve(path.join(baseDir, _file));
				if (files.has(file)) {
					continue;
				}
				const extendFileResult = await loadConfigFile(file, true, cacheClear);
				if (!extendFileResult) {
					continue;
				}
				files = new Set(files).add(file);
				config = margeConfig(extendFileResult.config, config);
			} else {
				try {
					const mod: Config = await import(_file);
					// @ts-ignore
					delete mod.default;
					files.add(_file);
					config = margeConfig(mod, config);
				} catch (err) {
					errs.push(err);
				}
			}
		}
	}
	delete config.extends;
	return {
		files,
		config,
		errs,
	};
}

export function recursiveLoadSync(
	config: Config,
	filePath: string,
	files: Set<string>,
	cacheClear: boolean,
): ConfigSet {
	const errs: Error[] = [];
	const baseDir = path.dirname(filePath);
	if (config.extends) {
		const extendFiles = Array.isArray(config.extends) ? config.extends : [config.extends];
		for (const _file of extendFiles) {
			if (/^\.+\//.test(_file)) {
				const file = path.resolve(path.join(baseDir, _file));
				if (files.has(file)) {
					continue;
				}
				const extendFileResult = loadConfigFileSync(file, true, cacheClear);
				if (!extendFileResult) {
					continue;
				}
				files = new Set(files).add(file);
				config = margeConfig(extendFileResult.config, config);
			} else {
				try {
					// eslint-disable-next-line @typescript-eslint/no-var-requires
					const mod: Config = require(_file);
					// @ts-ignore
					delete mod.default;
					files.add(_file);
					config = margeConfig(mod, config);
				} catch (err) {
					errs.push(err);
				}
			}
		}
	}
	delete config.extends;
	return {
		files,
		config,
		errs,
	};
}

function margeConfig(a: Config, b: Config): Config {
	return {
		...a,
		...b,
		rules: {
			...a.rules,
			...b.rules,
		},
		nodeRules: [...(a.nodeRules || []), ...(b.nodeRules || [])],
		childNodeRules: [...(a.childNodeRules || []), ...(b.childNodeRules || [])],
	};
}
