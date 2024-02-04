import type { MLFile } from './ml-file/index.js';
import type { ConfigSet } from './types.js';
import type { Config } from '@markuplint/ml-config';
import type { Nullable } from '@markuplint/shared';

import path from 'node:path';

import { mergeConfig } from '@markuplint/ml-config';
import { ConfigParserError } from '@markuplint/parser-utils';
import { InvalidSelectorError, createSelector } from '@markuplint/selector';
import { nonNullableFilter, toNoEmptyStringArrayFromStringOrArray } from '@markuplint/shared';

import { ConfigLoadError } from './config-load-error.js';
import { load as loadConfig, search } from './cosmiconfig.js';
import { log } from './debug.js';
import { generalImport } from './general-import.js';
import { getPreset } from './get-preset.js';
import { isPluginModuleName } from './is-plugin-module-name.js';
import { isPresetModuleName } from './is-preset-module-name.js';
import { moduleExists } from './module-exists.js';
import { relPathToNameOrAbsPath } from './path-to-abs-or-name.js';
import { cacheClear, resolvePlugins } from './resolve-plugins.js';
import { fileExists, uuid } from './utils.js';

const cpLog = log.extend('config-provider');

const KEY_SEPARATOR = '__ML_CONFIG_MERGE__';

export class ConfigProvider {
	#cache = new Map<string, ConfigSet>();
	#held = new Set<string>();
	#recursiveLoadKeyAndDepth = new Map<string, number>();
	#store = new Map<string, Config | ConfigLoadError>();

	async recursiveLoad(
		key: string,
		cache: boolean,
		referrer: string,
		depth = 1,
	): Promise<{ stack: Set<string>; errs: Error[] }> {
		const stack = new Set<string>();
		const errs: Error[] = [];

		const ancestorDepth = this.#recursiveLoadKeyAndDepth.get(key);
		if (ancestorDepth != null && ancestorDepth < depth) {
			return {
				stack,
				errs: [new CircularReferenceError(`Circular reference detected: ${key}`)],
			};
		}

		this.#recursiveLoadKeyAndDepth.set(key, depth);

		let config = this.#store.get(key);

		if (!config) {
			config = await this._load(key, cache, referrer);
		}

		if (!config) {
			return { stack, errs: [] };
		}

		if (config instanceof ConfigLoadError) {
			stack.add(config.filePath);
			return {
				stack,
				errs: [config],
			};
		}

		const depKeys = config.extends === null ? null : toNoEmptyStringArrayFromStringOrArray(config.extends);
		if (depKeys) {
			for (const depKey of depKeys) {
				const keys = await this.recursiveLoad(depKey, cache, key, depth + 1);
				for (const key of keys.stack) {
					stack.add(key);
				}
				errs.push(...keys.errs);
			}
		}

		stack.add(key);
		return { stack, errs };
	}

	async resolve(targetFile: Readonly<MLFile>, names: readonly Nullable<string>[], cache = true): Promise<ConfigSet> {
		if (!cache) {
			this.#store.clear();
			this.#cache.clear();
			cacheClear();
		}

		const keys = names.filter(nonNullableFilter);
		const key = keys.join(KEY_SEPARATOR);
		const currentConfig = this.#cache.get(key);
		if (currentConfig) {
			return currentConfig;
		}
		let configSet = await this._mergeConfigs(keys, cache, targetFile.path);

		const filePath = [...configSet.files].reverse()[0];
		if (!filePath) {
			throw new ConfigParserError('Config file not found', {
				filePath: targetFile.path,
			});
		}
		const errors = this._validateConfig(configSet.config, filePath);
		configSet.errs.push(...errors);

		const plugins = await resolvePlugins(configSet.config.plugins);

		if (this.#held.size > 0) {
			const extendHelds = [...this.#held.values()];
			for (const held of extendHelds) {
				const [, prefix, namespace, name] = held.match(/^([a-z]+:)([^/]+)(?:\/(.+))?$/) ?? [];

				switch (prefix) {
					case 'plugin:': {
						const plugin = plugins.find(plugin => plugin.name === namespace);
						const config = plugin?.configs?.[name ?? ''];
						if (config) {
							this.set(config, held);
						}
						break;
					}
				}
			}

			configSet = await this._mergeConfigs([...keys, ...extendHelds], cache, targetFile.path);

			this.#held.clear();
		}

		// Resolves `overrides`
		if (configSet.config.overrides) {
			const overrides = configSet.config.overrides;
			const globs = Object.keys(overrides);
			for (const glob of globs) {
				const isMatched = targetFile.matches(glob);
				const config = overrides[glob];
				if (isMatched && config) {
					// Note: Original config disappears
					configSet.config = config;
				}
			}
		}

		const result = {
			...configSet,
			plugins,
		};

		this.#cache.set(key, result);
		return result;
	}

	async search(targetFile: Readonly<MLFile>) {
		const isExists = await targetFile.dirExists();

		cpLog('search: %s', targetFile.path);
		cpLog('isExists: %s', isExists);

		if (!isExists) {
			return null;
		}

		const res = await search<Config>(targetFile.path, false);

		cpLog('searched config: %O', res);

		if (!res) {
			return null;
		}
		const { filePath, config } = res;
		const pathResolvedConfig = await this._pathResolve(config, filePath);
		this.#store.set(filePath, pathResolvedConfig);

		cpLog('Store key: %s', filePath);
		return filePath;
	}

	set(config: Config, key?: string) {
		key = key ?? uuid();
		this.#store.set(key, config);
		return key;
	}

	private async _load(filePath: string, cache: boolean, referrer: string) {
		const entity = this.#store.get(filePath);
		if (entity) {
			return entity;
		}

		if (isPresetModuleName(filePath)) {
			const [, name] = filePath.match(/^markuplint:(.+)$/i) ?? [];
			const config = await getPreset(name ?? filePath);
			const pathResolvedConfig = await this._pathResolve(config, filePath);

			this.#store.set(filePath, pathResolvedConfig);
			return pathResolvedConfig;
		}

		if (isPluginModuleName(filePath)) {
			this.#held.add(filePath);
			return;
		}

		if (!(await moduleExists(filePath)) && !path.isAbsolute(filePath)) {
			throw new TypeError(`${filePath} is not an absolute path`);
		}

		const config = await load(filePath, cache, referrer);

		if (config instanceof ConfigLoadError) {
			return config;
		}

		const pathResolvedConfig = await this._pathResolve(config, filePath);

		this.#store.set(filePath, pathResolvedConfig);
		return pathResolvedConfig;
	}

	private async _mergeConfigs(keys: readonly string[], cache: boolean, referrer: string) {
		const resolvedKeys = new Set<string>();
		const errs: Error[] = [];
		for (const key of keys) {
			this.#recursiveLoadKeyAndDepth.clear();
			const keySet = await this.recursiveLoad(key, cache, referrer);
			for (const k of keySet.stack) {
				resolvedKeys.add(k);
			}
			errs.push(...keySet.errs);
		}
		const configs = [...resolvedKeys].map(name => this.#store.get(name)).filter(nonNullableFilter);
		let resultConfig: Config = {};
		for (const config of configs) {
			if (config instanceof ConfigLoadError) {
				errs.push(config);
				continue;
			}

			resultConfig = mergeConfig(resultConfig, config);
		}
		return {
			config: resultConfig,
			files: resolvedKeys,
			errs,
		};
	}

	private async _pathResolve(config: Config, filePath: string): Promise<Config> {
		const dir = path.dirname(filePath);
		return {
			...config,
			extends: await relPathToNameOrAbsPath(dir, config.extends),
			plugins: await relPathToNameOrAbsPath(dir, config.plugins, ['name']),
			parser: await relPathToNameOrAbsPath(dir, config.parser),
			specs: await relPathToNameOrAbsPath(dir, config.specs),
			excludeFiles: await relPathToNameOrAbsPath(dir, config.excludeFiles),
			overrides: await relPathToNameOrAbsPath(dir, config.overrides, undefined, true),
		};
	}

	private _validateConfig(config: Config, filePath: string) {
		const errors: ConfigParserError[] = [];
		if (config.nodeRules)
			for (const rule of config.nodeRules) {
				if (rule.selector) {
					try {
						createSelector(rule.selector);
					} catch (error: unknown) {
						if (error instanceof InvalidSelectorError) {
							errors.push(
								new ConfigParserError(error.message, {
									filePath,
									raw: rule.selector,
								}),
							);
						}
					}
				}
			}
		return errors;
	}
}

async function load(filePath: string, cache: boolean, referrer: string): Promise<Config | ConfigLoadError> {
	if (!fileExists(filePath) && (await moduleExists(filePath))) {
		const config =
			(await generalImport<Config>(filePath)) ?? new ConfigLoadError('Module is not found', filePath, referrer);
		return config;
	}
	const res = await loadConfig<Config>(filePath, !cache, referrer).catch((error: unknown) => {
		if (error instanceof ConfigLoadError) {
			return error;
		}
		throw error;
	});

	if (res instanceof ConfigLoadError) {
		return res;
	}

	return res.config;
}

class CircularReferenceError extends ReferenceError {
	name = 'CircularReferenceError';
}
