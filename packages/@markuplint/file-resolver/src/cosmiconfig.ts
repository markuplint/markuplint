import type { LoaderSync, Loader } from 'cosmiconfig';

import path from 'node:path';

import { ConfigParserError } from '@markuplint/parser-utils';
import { cosmiconfig, defaultLoaders } from 'cosmiconfig';
import { jsonc } from 'jsonc';

import { ConfigLoadError } from './config-load-error.js';
import { log } from './debug.js';

const searchLog = log.extend('search');

const explorer = cosmiconfig('markuplint', {
	loaders: {
		noExt: ((path, content) => {
			try {
				return jsonc.parse(content);
			} catch (error: unknown) {
				if (error instanceof Error && error.name === 'JSONError') {
					return defaultLoaders['noExt'](path, content);
				}
				throw error;
			}
		}) as Loader,
	},
	// Checks only the directory it is given; see `search()` for the ancestor walk.
	searchStrategy: 'none',
});

type CosmiConfig = ReturnType<LoaderSync>;

/**
 * Yields `dir` and then each of its ancestors, ending with the file system root.
 *
 * @param dir - The directory to start from
 */
function* ancestorDirs(dir: string) {
	let current = path.resolve(dir);
	while (true) {
		yield current;
		const parent = path.dirname(current);
		if (parent === current) {
			return;
		}
		current = parent;
	}
}

/**
 * Searches for a configuration file in the directory of `filePath` and then in each ancestor
 * directory up to the file system root, and returns the nearest one.
 *
 * This walk is done here instead of by cosmiconfig's `searchStrategy: 'project'`, because that
 * strategy stops at the first directory that has a `package.json`, which hides a configuration
 * file at a monorepo root from every file inside a package (#4405). The documented behavior is
 * that the search goes upward from the target file's directory
 * (https://markuplint.dev/docs/configuration). `searchStrategy: 'global'` is not a fit either: it
 * also searches the OS-level configuration directory, and that cannot be turned off.
 *
 * A `package.json` that has no `markuplint` key is not a configuration file, so the walk
 * continues past it. There is no upper bound below the file system root, so a configuration file
 * in a directory outside the project applies when nothing nearer exists.
 *
 * @template T - The type of the configuration object
 * @param filePath - The path of the target file; the search starts from its directory
 * @param cacheClear - Whether to clear the explorer's caches before searching
 * @returns The path and content of the nearest configuration file, or `null` if none was found
 */
export async function search<T = CosmiConfig>(filePath: string, cacheClear: boolean) {
	if (cacheClear) {
		explorer.clearCaches();
	}

	for (const dir of ancestorDirs(path.dirname(filePath))) {
		searchLog('Search dir: %s', dir);
		const result = await explorer.search(dir).catch(cacheConfigError(dir, filePath));

		searchLog('Search result: %O', result);

		if (!result || result.isEmpty) {
			continue;
		}
		const config = result.config as T;
		return {
			filePath: result.filepath,
			config:
				config && typeof config === 'object' && 'default' in config && typeof config.default === 'object'
					? (config.default as T)
					: config,
		};
	}

	return null;
}

export async function load<T = CosmiConfig>(filePath: string, cacheClear: boolean, referrer: string) {
	if (cacheClear) {
		explorer.clearCaches();
	}
	const result = await explorer.load(filePath).catch(cacheConfigError(filePath, referrer));
	if (!result || result.isEmpty) {
		return new ConfigLoadError('Config file is empty', filePath, referrer);
	}
	const config = result.config as T;
	return {
		filePath: result.filepath,
		config:
			config && typeof config === 'object' && 'default' in config && typeof config.default === 'object'
				? (config.default as T)
				: config,
	};
}

function cacheConfigError(fileOrDirPath: string, referrer: string) {
	return (reason: unknown) => {
		if (reason instanceof Error) {
			switch (reason.name) {
				case 'YAMLException': {
					throw new ConfigParserError(reason.message, {
						// @ts-ignore
						filePath: reason.filepath ?? fileOrDirPath,
					});
				}
			}
			throw new ConfigLoadError(reason.message, fileOrDirPath, referrer);
		}
		throw reason;
	};
}
