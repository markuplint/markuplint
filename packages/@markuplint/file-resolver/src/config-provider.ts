import type { MLFile } from './ml-file/index.js';
import type { ConfigSet } from './types.js';
import type { Config } from '@markuplint/ml-config';
import type { Nullable } from '@markuplint/shared';

import { createRequire } from 'node:module';
import path from 'node:path';

import { mergeConfig } from '@markuplint/ml-config';
import { getPreset } from '@markuplint/ml-core';
import { ConfigParserError } from '@markuplint/parser-utils';
import { InvalidSelectorError, createSelector } from '@markuplint/selector';
import { nonNullableFilter, toNoEmptyStringArrayFromStringOrArray } from '@markuplint/shared';

import { load as loadConfig, search } from './cosmiconfig.js';
import { cacheClear, resolvePlugins } from './resolve-plugins.js';
import { fileExists, uuid } from './utils.js';

const require = createRequire(import.meta.url);

const KEY_SEPARATOR = '__ML_CONFIG_MERGE__';

export class ConfigProvider {
	#cache = new Map<string, ConfigSet>();
	#held = new Set<string>();
	#recursiveLoadKeyAndDepth = new Map<string, number>();
	#store = new Map<string, Config>();

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
		let configSet = await this._mergeConfigs(keys, cache);

		const filePath = Array.from(configSet.files).reverse()[0];
		if (!filePath) {
			throw new ConfigParserError('Config file not found', {
				filePath: targetFile.path,
			});
		}
		const errors = this._validateConfig(configSet.config, filePath);
		configSet.errs.push(...errors);

		const plugins = await resolvePlugins(configSet.config.plugins);

		if (this.#held.size > 0) {
			const extendHelds = Array.from(this.#held.values());
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

			configSet = await this._mergeConfigs([...keys, ...extendHelds], cache);

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
		if (!(await targetFile.dirExists())) {
			return null;
		}
		const res = await search<Config>(targetFile.path, false);
		if (!res) {
			return null;
		}
		const { filePath, config } = res;
		const pathResolvedConfig = await this._pathResolve(config, filePath);
		this.#store.set(filePath, pathResolvedConfig);
		return filePath;
	}

	set(config: Config, key?: string) {
		key = key ?? uuid();
		this.#store.set(key, config);
		return key;
	}

	private async _load(filePath: string, cache: boolean) {
		const entity = this.#store.get(filePath);
		if (entity) {
			return entity;
		}

		if (isPreset(filePath)) {
			const [, name] = filePath.match(/^markuplint:(.+)$/i) ?? [];
			const config = await getPreset(name ?? filePath);
			const pathResolvedConfig = await this._pathResolve(config, filePath);

			this.#store.set(filePath, pathResolvedConfig);
			return pathResolvedConfig;
		}

		if (isPlugin(filePath)) {
			this.#held.add(filePath);
			return null;
		}

		if (!(await moduleExists(filePath)) && !path.isAbsolute(filePath)) {
			throw new TypeError(`${filePath} is not an absolute path`);
		}

		const config = await load(filePath, cache);
		if (!config) {
			return null;
		}

		const pathResolvedConfig = await this._pathResolve(config, filePath);

		this.#store.set(filePath, pathResolvedConfig);
		return pathResolvedConfig;
	}

	private async _mergeConfigs(keys: readonly string[], cache: boolean) {
		const resolvedKeys = new Set<string>();
		const errs: Error[] = [];
		for (const key of keys) {
			this.#recursiveLoadKeyAndDepth.clear();
			const keySet = await this._recursiveLoad(key, cache);
			for (const k of keySet.stack) {
				resolvedKeys.add(k);
			}
			if (keySet.errs) {
				errs.push(...keySet.errs);
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
			errs,
		};
	}

	private async _pathResolve(config: Config, filePath: string): Promise<Config> {
		const dir = path.dirname(filePath);
		return {
			...config,
			extends: await pathResolve(dir, config.extends),
			plugins: await pathResolve(dir, config.plugins, ['name']),
			parser: await pathResolve(dir, config.parser),
			specs: await pathResolve(dir, config.specs),
			excludeFiles: await pathResolve(dir, config.excludeFiles),
			overrides: await pathResolve(dir, config.overrides, undefined, true),
		};
	}

	private async _recursiveLoad(
		key: string,
		cache: boolean,
		depth = 1,
	): Promise<{ stack: Set<string>; errs: CircularReferenceError[] | null }> {
		const stack = new Set<string>();
		const errs: CircularReferenceError[] = [];

		const ancestorDepth = this.#recursiveLoadKeyAndDepth.get(key);
		if (ancestorDepth != null && ancestorDepth < depth) {
			return {
				stack,
				errs: [new CircularReferenceError(`Circular reference detected: ${key}`)],
			};
		}

		this.#recursiveLoadKeyAndDepth.set(key, depth);

		let config = this.#store.get(key) ?? null;
		if (!config) {
			config = await this._load(key, cache);
		}

		if (!config) {
			return { stack, errs: null };
		}

		const depKeys = config.extends !== null ? toNoEmptyStringArrayFromStringOrArray(config.extends) : null;
		if (depKeys) {
			for (const depKey of depKeys) {
				const keys = await this._recursiveLoad(depKey, cache, depth + 1);
				for (const key of keys.stack) {
					stack.add(key);
				}
				if (keys.errs) {
					errs.push(...keys.errs);
				}
			}
		}

		stack.add(key);
		return { stack, errs };
	}

	private _validateConfig(config: Config, filePath: string) {
		const errors: ConfigParserError[] = [];
		config.nodeRules?.forEach(rule => {
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
		});
		return errors;
	}
}

async function load(filePath: string, cache: boolean) {
	if (!fileExists(filePath) && (await moduleExists(filePath))) {
		const mod = await import(filePath);
		const config: Config | null = mod?.default ?? null;
		return config;
	}
	const res = await loadConfig<Config>(filePath, !cache);
	if (!res) {
		return null;
	}
	return res.config;
}

async function pathResolve<
	T extends string | readonly (string | Record<string, unknown>)[] | Readonly<Record<string, unknown>> | undefined,
>(dir: string, filePath?: T, resolveProps?: readonly string[], resolveKey = false): Promise<T> {
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
		return Promise.all(filePath.map(fp => pathResolve(dir, fp, resolveProps)));
	}
	const res: Record<string, unknown> = {};
	for (const [key, fp] of Object.entries(filePath)) {
		let _key = key;
		if (resolveKey) {
			_key = await resolve(dir, key);
		}
		if (typeof fp === 'string') {
			if (!resolveProps) {
				res[_key] = await resolve(dir, fp);
			} else if (resolveProps.includes(key)) {
				res[_key] = await resolve(dir, fp);
			} else {
				res[_key] = fp;
			}
		} else {
			res[_key] = fp;
		}
	}
	// @ts-ignore
	return res;
}

async function resolve(dir: string, pathOrModName: string) {
	if ((await moduleExists(pathOrModName)) || isPreset(pathOrModName) || isPlugin(pathOrModName)) {
		return pathOrModName;
	}
	const bangAndPath = /^(!)(.*)/.exec(pathOrModName) ?? [];
	const bang = bangAndPath[1] ?? '';
	const pathname = bangAndPath[2] ?? pathOrModName;
	const absPath = path.resolve(dir, pathname);
	return bang + absPath;
}

async function moduleExists(name: string) {
	try {
		await import(name);
	} catch (err) {
		if (err instanceof Error) {
			if (/^Parse failure/i.test(err.message)) {
				return true;
			}
		}

		try {
			require.resolve(name);
		} catch (err) {
			if (
				// @ts-ignore
				'code' in err &&
				// @ts-ignore
				err.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED'
			) {
				// Even if there are issues with the fields,
				// assume that the module exists and return true.
				return true;
			}

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
	}

	return true;
}

function isPreset(name: string) {
	return /^markuplint:/i.test(name);
}

function isPlugin(name: string) {
	return /^plugin:/i.test(name);
}

class CircularReferenceError extends ReferenceError {
	name = 'CircularReferenceError';
}
