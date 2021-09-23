import { Config, mergeConfig } from '@markuplint/ml-config';
import { ConfigSet, Nullable } from './types';
import { load as loadConfig, search } from './cosmiconfig';
import { nonNullableFilter, uuid } from './utils';
import { MLFile } from './ml-file';
import path from 'path';

const KEY_SEPARATOR = '__ML_CONFIG_MERGE__';

class ConfigProvider {
	#store = new Map<string, Config>();
	#cache = new Map<string, ConfigSet>();

	set(config: Config) {
		const key = uuid();
		this.#store.set(key, config);
		return key;
	}

	async load(filePath: string) {
		const entity = this.#store.get(filePath);
		if (entity) {
			return entity;
		}

		if (!path.isAbsolute(filePath)) {
			throw new TypeError(`${filePath} is not an absolute path`);
		}

		const config = await load(filePath);
		if (!config) {
			return null;
		}

		const pathResolvedConfig = this.pathResolve(config, filePath);

		this.#store.set(filePath, pathResolvedConfig);
		return pathResolvedConfig;
	}

	async recursiveLoad(key: string) {
		const stack = new Set<string>();
		const config = this.#store.get(key);
		if (config) {
			const depKeys = config.extends ? (Array.isArray(config.extends) ? config.extends : [config.extends]) : null;
			if (depKeys) {
				for (const depKey of depKeys) {
					const keys = await this.recursiveLoad(depKey);
					for (const key of keys) {
						stack.add(key);
					}
				}
			}
		} else {
			await this.load(key);
		}
		stack.add(key);
		return stack;
	}

	pathResolve(config: Config, filePath: string): Config {
		const dir = path.dirname(filePath);
		return {
			...config,
			extends: pathResolve(dir, config.extends),
			parser: pathResolve(dir, config.parser),
			specs: pathResolve(dir, config.specs),
			importRules: pathResolve(dir, config.importRules),
			excludeFiles: pathResolve(dir, config.excludeFiles),
		};
	}

	async search(targetFile: MLFile) {
		if (!(await targetFile.dirExists())) {
			return null;
		}
		const res = await search<Config>(targetFile.path, false);
		if (!res) {
			return null;
		}
		const { filePath, config } = res;
		const pathResolvedConfig = this.pathResolve(config, filePath);
		this.#store.set(filePath, pathResolvedConfig);
		return filePath;
	}

	async resolve(names: Nullable<string>[], remerge = false): Promise<ConfigSet> {
		const keys = names.filter(nonNullableFilter);
		const key = keys.join(KEY_SEPARATOR);
		const currentConfig = this.#cache.get(key);
		if (!remerge && currentConfig) {
			return currentConfig;
		}
		const configSet = await this.mergeConfigs(keys);
		this.#cache.set(key, configSet);

		return configSet;
	}

	async mergeConfigs(keys: string[]) {
		const resolvedKeys = new Set<string>();
		for (const key of keys) {
			const keySet = await this.recursiveLoad(key);
			for (const k of keySet) {
				resolvedKeys.add(k);
			}
		}
		const configs = Array.from(resolvedKeys)
			.map(name => this.#store.get(name))
			.filter(nonNullableFilter);
		let resultConfig: Config = {};
		for (const config of configs) {
			resultConfig = mergeConfig(resultConfig, config);
		}
		return {
			config: resultConfig,
			files: resolvedKeys,
			errs: [],
		};
	}
}

async function load(filePath: string) {
	const res = await loadConfig<Config>(filePath, false);
	if (!res) {
		return null;
	}
	return res.config;
}

function pathResolve<T extends string | string[] | Record<string, string> | undefined>(dir: string, filePath?: T): T {
	if (filePath == null) {
		// @ts-ignore
		return undefined;
	}
	if (typeof filePath === 'string') {
		// @ts-ignore
		return resolve(dir, filePath);
	}
	if (Array.isArray(filePath)) {
		// @ts-ignore
		return filePath.map(fp => resolve(dir, fp));
	}
	const res: Record<string, string> = {};
	for (const [key, fp] of Object.entries(filePath)) {
		res[key] = resolve(dir, fp);
	}
	// @ts-ignore
	return res;
}

function resolve(dir: string, pathOrModName: string) {
	if (moduleExists(pathOrModName)) {
		return pathOrModName;
	}
	return path.resolve(dir, pathOrModName);
}

function moduleExists(name: string) {
	try {
		require.resolve(name);
	} catch (err) {
		if (
			// @ts-ignore
			'code' in err &&
			// @ts-ignore
			err.code === 'MODULE_NOT_FOUND'
		) {
			return false;
		}
		throw err;
	}

	return true;
}

export const configProvider = new ConfigProvider();
