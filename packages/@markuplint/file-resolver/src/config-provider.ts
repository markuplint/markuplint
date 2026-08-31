import type { MLFile } from './ml-file/index.js';
import type { ConfigSet } from './types.js';
import type { Config, OptimizedConfig } from '@markuplint/ml-config';
import type { Nullable } from '@markuplint/shared';

import path from 'node:path';

import { mergeConfig } from '@markuplint/ml-config';
import { ConfigParserError } from '@markuplint/parser-utils';
import { InvalidSelectorError, createSelector } from '@markuplint/selector';
import { nonNullableFilter, toNoEmptyStringArrayFromStringOrArray, ConfigLoadError } from '@markuplint/shared';

import { load as loadConfig, search, clearExplorerCache } from './cosmiconfig.js';
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

/**
 * Manages loading, caching, and resolving markuplint configuration files.
 *
 * Handles `extends` chains, plugins, presets, overrides, and circular reference detection.
 * Configuration files are searched via cosmiconfig and cached by file path.
 *
 * Designed to be shared across every target file in a run (see
 * `MLEngineOptions.configProvider` in `packages/markuplint/src/api/ml-engine.ts`):
 * {@link resolve}'s cache is keyed by the resolved config's `names`, not by
 * target file, so one instance reused across many files avoids redoing
 * merge/validate/plugin-resolution once per file that shares the same
 * config — see #3997.
 */
export class ConfigProvider {
	#cache = new Map<string, ConfigSet>();
	#held = new Set<string>();
	#recursiveLoadKeyAndDepth = new Map<string, number>();
	#store = new Map<string, Config | ConfigLoadError>();
	/**
	 * Stabilizes {@link set}'s auto-generated key for an inline config object
	 * across repeated calls with the *same* object reference (e.g. one caller
	 * sharing one `ConfigProvider` — and one `options.config`/`defaultConfig`
	 * object — across many target files). Without this, `set()` would mint a
	 * fresh UUID per call even for identical content, so `resolve()`'s cache
	 * (keyed on that UUID) would never hit for inline (non-file-path) config.
	 * Keyed on object identity, not content, so it costs nothing to check and
	 * needs no hashing of arbitrary config shapes.
	 */
	#autoKeys = new WeakMap<object, string>();

	/**
	 * Serializes {@link runExclusive} calls on this instance.
	 */
	#queue: Promise<void> = Promise.resolve();

	/**
	 * Clears every cached and stored config entry: the base-config cache
	 * (`#cache`), the loaded/registered config store (`#store`), `set()`'s
	 * identity→key stabilization (`#autoKeys`), `resolve-plugins.ts`'s own
	 * module-level plugin-resolution cache, and the shared `cosmiconfig`
	 * explorer's own search/load caches (so {@link search}, called right
	 * after this, re-reads the current file content instead of a stale
	 * cosmiconfig-level cache).
	 *
	 * The `cosmiconfig` explorer and the `resolve-plugins.ts` cache are
	 * module-level singletons shared by every `ConfigProvider` instance in
	 * the process — clearing them here affects other instances too, not just
	 * this one. Harmless (they just re-search/re-load), but worth knowing
	 * when reasoning about a cache-busting re-resolve's blast radius.
	 *
	 * Callers doing a cache-busting re-resolve (e.g. watch mode after a file
	 * change) must call this **before** registering any inline config via
	 * {@link set}, and before {@link search}, for that same resolve —
	 * `resolve()` itself no longer clears anything, so a `set()`/`search()`
	 * call made after `invalidate()` survives through to `resolve()`. Wrap
	 * the whole `invalidate()` → `set()`/`search()` → `resolve()` sequence in
	 * {@link runExclusive} so an overlapping call on the same instance can't
	 * interleave its own `invalidate()` in the middle of it. See #4015.
	 */
	invalidate() {
		this.#store.clear();
		this.#cache.clear();
		this.#autoKeys = new WeakMap();
		cacheClear();
		clearExplorerCache();
	}

	/**
	 * Runs `fn` exclusively with respect to every other `runExclusive` call on
	 * this instance: queued calls wait for earlier ones to settle before
	 * starting, so two overlapping cache-busting re-resolves (e.g. two
	 * watch-triggered `MLEngine#resolveConfig(false)` calls close together,
	 * whether from one engine's own provider or several engines sharing one)
	 * can't interleave — one call's {@link invalidate} can no longer wipe the
	 * `set()`/`search()` entries another call registered a moment earlier but
	 * hasn't yet consumed. See #4015.
	 */
	async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
		const previous = this.#queue;
		let release: () => void;
		this.#queue = new Promise(resolve => {
			release = resolve;
		});
		await previous;
		try {
			return await fn();
		} finally {
			release!();
		}
	}

	/**
	 * Recursively loads a configuration and all its `extends` dependencies.
	 *
	 * @param key - The config file path or module name to load
	 * @param cache - Whether to use cached results
	 * @param referrer - The file path of the config that referenced this key
	 * @param depth - Current recursion depth (for circular reference detection)
	 * @returns A set of loaded config keys and any errors encountered
	 */
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
			config = await this.#load(key, cache, referrer);
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

	/**
	 * Resolves the full configuration for a target file by merging all named configs,
	 * resolving plugins, and applying file-specific overrides.
	 *
	 * Split into a cacheable "base" phase (`#resolveBase`: merge/validate/plugin
	 * resolution/plugin-provided `extends`) and a per-call `overrides` phase, because
	 * `overrides` matching depends on `targetFile` while everything else in `names`
	 * resolution does not. Only the base result is cached (keyed on `names`, not on
	 * `targetFile`) — callers sharing one `ConfigProvider` across many target files
	 * (see #3997) get that work done once, while `overrides` are always re-evaluated
	 * per call so a `.vue`-only override never leaks into a `.html` file's result (or
	 * vice versa) just because they resolve the same `names`.
	 *
	 * Does NOT clear the provider's store/cache itself — call {@link invalidate}
	 * first if a fresh re-read is needed (e.g. a watch-triggered re-resolve).
	 * `cache` only controls whether an already-loaded `names` entry (this call's
	 * base-config cache, and — deeper still — cosmiconfig's own per-file cache in
	 * `#load`) is reused; it used to also wipe the store/cache up front, which
	 * discarded any `set()` call the caller had just made for this same resolve
	 * (e.g. `MLEngine#resolveConfig()` registering inline `config`/`defaultConfig`
	 * right before calling this) — see #4015.
	 *
	 * @param targetFile - The file being linted
	 * @param names - Config file paths or module names to merge
	 * @param cache - Whether to reuse already-loaded/cached entries
	 * @returns The fully resolved configuration set including plugins and errors
	 */
	async resolve(targetFile: Readonly<MLFile>, names: readonly Nullable<string>[], cache = true): Promise<ConfigSet> {
		const keys = names.filter(nonNullableFilter);
		const key = keys.join(KEY_SEPARATOR);

		let baseConfigSet = this.#cache.get(key);
		if (!baseConfigSet) {
			baseConfigSet = await this.#resolveBase(keys, cache, targetFile.path);
			this.#cache.set(key, baseConfigSet);
		}

		return this.#applyOverrides(baseConfigSet, targetFile);
	}

	/**
	 * The `names`-dependent, `targetFile`-independent part of {@link resolve}:
	 * merges all named configs, validates, resolves plugins, and expands
	 * plugin-provided `extends`. Safe to cache under a `names`-only key.
	 */
	async #resolveBase(keys: readonly string[], cache: boolean, referrer: string): Promise<ConfigSet> {
		let configSet = await this.#mergeConfigs(keys, cache, referrer);

		const filePath = [...configSet.files].toReversed()[0];
		if (!filePath) {
			throw new ConfigParserError('Config file not found', {
				filePath: referrer,
			});
		}
		const errors = this.#validateConfig(configSet.config, filePath);
		configSet.errs.push(...errors);

		const { plugins, errors: pluginErrors } = await resolvePlugins(configSet.config.plugins);
		configSet.errs.push(...pluginErrors);

		if (this.#held.size > 0) {
			const extendHelds = [...this.#held.values()];
			for (const held of extendHelds) {
				const [, prefix, namespace, name] = held.match(/^([a-z]+:)([^/]+)(?:\/(.+))?$/) ?? [];

				switch (prefix) {
					case 'plugin:': {
						const plugin = plugins.find(plugin => plugin.name === namespace);
						const config = plugin?.configs?.[name ?? ''];
						if (config) {
							this.set(mergeConfig(config), held);
						}
						break;
					}
				}
			}

			configSet = await this.#mergeConfigs([...keys, ...extendHelds], cache, referrer);

			this.#held.clear();
		}

		return {
			...configSet,
			plugins,
		};
	}

	/**
	 * The `targetFile`-dependent part of {@link resolve}: matches `config.overrides`
	 * globs against `targetFile` and applies whichever match, per `overrideMode`.
	 * Never mutates `baseConfigSet` — returns it unchanged (same reference) when no
	 * override matches, or a shallow copy with a freshly computed `config` otherwise,
	 * so the cached base entry stays valid for the next target file.
	 *
	 * Matches are applied in `Object.keys(overrides)` order (config-key insertion
	 * order), each round re-assigning `config` rather than accumulating — so under
	 * the default `overrideMode: 'reset'`, the last-matching glob's config entirely
	 * replaces every earlier match, not just the base config. `appliedOverrides`
	 * records that match order for `--show-config=details` to surface, since this
	 * "last match wins outright" behavior is easy to mistake for a bug (see #4023).
	 */
	#applyOverrides(baseConfigSet: ConfigSet, targetFile: Readonly<MLFile>): ConfigSet {
		let config = baseConfigSet.config;
		const appliedOverrides: string[] = [];
		if (config.overrides) {
			const overrides = config.overrides;
			for (const glob of Object.keys(overrides)) {
				const overrideConfig = overrides[glob];
				if (targetFile.matches(glob) && overrideConfig) {
					config = config.overrideMode === 'merge' ? mergeConfig(config, overrideConfig) : overrideConfig;
					appliedOverrides.push(glob);
				}
			}
			return config === baseConfigSet.config ? baseConfigSet : { ...baseConfigSet, config, appliedOverrides };
		}
		return baseConfigSet;
	}

	/**
	 * Searches for a markuplint configuration file starting from the target file's directory.
	 *
	 * @param targetFile - The file whose directory to search from
	 * @returns The file path of the found config, or `null` if none was found
	 */
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
		const pathResolvedConfig = await this.#pathResolve(config, filePath);
		this.#store.set(filePath, pathResolvedConfig);

		cpLog('Store key: %s', filePath);
		return filePath;
	}

	/**
	 * Stores a pre-built configuration in the provider's internal store.
	 *
	 * @param config - The optimized configuration to store
	 * @param key - An optional key to store the config under; auto-generated if omitted
	 * @param identity - Object identity to auto-key on when `key` is omitted (e.g. the
	 * caller's original, pre-merge config object). Repeated calls with the same
	 * `identity` reuse the same generated key instead of minting a fresh UUID each
	 * time, so `resolve()`'s base cache can hit for inline (non-file-path) config
	 * shared across multiple target files — see #3997. Falls back to `config` itself
	 * (which is rebuilt fresh by every caller today, so this is a no-op unless a
	 * caller passes a stable `identity`).
	 *
	 * **Invariant**: an `identity` must correspond to `config` content that is
	 * effectively immutable for as long as that identity is reused — a second
	 * call with the same `identity` but *different* `config` content returns
	 * the *first* call's key/content, silently discarding the new content. Not
	 * reachable via `MLEngine`'s call sites today (they hold `options.config`/
	 * `defaultConfig` as one unchanged reference per run); a future caller
	 * passing a reused identity for genuinely different content would hit this.
	 * @returns The key under which the config was stored
	 */
	set(config: OptimizedConfig, key?: string, identity?: object) {
		if (key != null) {
			this.#store.set(key, config);
			return key;
		}

		const identityKey = identity ?? config;
		const existingKey = this.#autoKeys.get(identityKey);
		if (existingKey != null) {
			return existingKey;
		}

		const newKey = uuid();
		this.#store.set(newKey, config);
		this.#autoKeys.set(identityKey, newKey);
		return newKey;
	}

	async #load(filePath: string, cache: boolean, referrer: string) {
		const entity = this.#store.get(filePath);
		if (entity) {
			return entity;
		}

		if (isPresetModuleName(filePath)) {
			const [, name] = filePath.match(/^markuplint:(.+)$/i) ?? [];
			const config = await getPreset(name ?? filePath);
			const pathResolvedConfig = await this.#pathResolve(config, filePath);

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

		const pathResolvedConfig = await this.#pathResolve(config, filePath);

		this.#store.set(filePath, pathResolvedConfig);
		return pathResolvedConfig;
	}

	async #mergeConfigs(keys: readonly string[], cache: boolean, referrer: string) {
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
		let resultConfig: OptimizedConfig = {};
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

	async #pathResolve(config: Config, filePath: string): Promise<OptimizedConfig> {
		const optimizedConfig = mergeConfig(config);
		const dir = path.dirname(filePath);
		return {
			...optimizedConfig,
			extends: await relPathToNameOrAbsPath(dir, optimizedConfig.extends),
			plugins: await relPathToNameOrAbsPath(dir, optimizedConfig.plugins, ['name']),
			parser: await relPathToNameOrAbsPath(dir, optimizedConfig.parser),
			specs: await relPathToNameOrAbsPath(dir, optimizedConfig.specs),
			excludeFiles: await relPathToNameOrAbsPath(dir, optimizedConfig.excludeFiles),
			pretenders: optimizedConfig.pretenders
				? {
						...optimizedConfig.pretenders,
						files: await relPathToNameOrAbsPath(dir, optimizedConfig.pretenders?.files),
						scan: optimizedConfig.pretenders?.scan?.map(entry => ({
							...entry,
							files:
								typeof entry.files === 'string'
									? path.resolve(dir, entry.files)
									: entry.files.map(f => path.resolve(dir, f)),
						})),
					}
				: undefined,
			overrides: await relPathToNameOrAbsPath(dir, optimizedConfig.overrides, undefined, true),
		};
	}

	#validateConfig(config: Config, filePath: string) {
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
