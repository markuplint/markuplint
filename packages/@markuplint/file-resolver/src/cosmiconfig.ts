import type { LoaderSync, Loader } from 'cosmiconfig';

import fs from 'node:fs/promises';
import path from 'node:path';

import { ConfigParserError } from '@markuplint/parser-utils';
import { cosmiconfig, defaultLoaders } from 'cosmiconfig';
import { jsonc } from 'jsonc';

import { ConfigLoadError, isFatalError } from '@markuplint/shared';
import { log } from './debug.js';

const searchLog = log.extend('search');

const jsoncLoader: Loader = (path, content) => {
	try {
		return jsonc.parse(content);
	} catch (error: unknown) {
		if (error instanceof Error && error.name === 'JSONError') {
			return defaultLoaders['noExt'](path, content);
		}
		throw error;
	}
};

const explorer = cosmiconfig('markuplint', {
	searchPlaces: [
		'package.json',
		'.markuplintrc',
		'.markuplintrc.json',
		'.markuplintrc.jsonc',
		'.markuplintrc.yaml',
		'.markuplintrc.yml',
		'.markuplintrc.js',
		'.markuplintrc.ts',
		'.markuplintrc.cjs',
		'.markuplintrc.mjs',
		'markuplint.config.js',
		'markuplint.config.ts',
		'markuplint.config.cjs',
		'markuplint.config.mjs',
		'markuplint.config.jsonc',
	],
	loaders: {
		noExt: jsoncLoader,
		'.jsonc': jsoncLoader,
	},
	// Not 'project', which stops at the first `package.json`; `search()` walks the ancestors itself.
	searchStrategy: 'none',
});

type CosmiConfig = ReturnType<LoaderSync>;

/**
 * Clears the shared `cosmiconfig` explorer's own internal search/load caches.
 * Distinct from this module's `cacheClear` parameters (which clear the same
 * caches but only as a side effect of one `search`/`load` call) — this lets a
 * caller (see `ConfigProvider#invalidate`) clear them up front, before any
 * `search`/`load` call, so a subsequent `search` reads the current file
 * content instead of the explorer's stale cache. See #4015.
 */
export function clearExplorerCache() {
	explorer.clearCaches();
}

/**
 * Spelled out because `search()` needs the ancestors one directory at a time; see there for why
 * none of cosmiconfig's own search strategies fits.
 *
 * @param dir - The directory to start from, which is yielded first
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
 * Whether `dir` does not exist: ENOENT, or ENOTDIR when one of its ancestors is a regular file
 * (POSIX; Windows reports that as ENOENT). Checked before cosmiconfig is asked, as its own
 * directory check takes only ENOENT for missing and throws on ENOTDIR, and as a directory it
 * never sees leaves no entry in its search cache: a configuration file created later together
 * with the directory is found without `clearExplorerCache()`.
 *
 * Any other `stat` failure (EACCES, for one) is reported like a configuration file that cannot be
 * loaded, as the walk cannot tell whether that directory holds the nearest configuration.
 *
 * @param dir - The directory to examine
 * @param filePath - The target file, named in the error report
 */
async function isMissingDir(dir: string, filePath: string) {
	try {
		await fs.stat(dir);
		return false;
	} catch (error) {
		if (isFatalError(error)) {
			throw error;
		}
		if (error instanceof Error && 'code' in error && (error.code === 'ENOENT' || error.code === 'ENOTDIR')) {
			return true;
		}
		return cacheConfigError(dir, filePath)(error);
	}
}

/**
 * Searches for a configuration file in the directory of `filePath` and in each ancestor
 * directory up to the file system root, nearest first.
 *
 * The walk is done here and not by cosmiconfig's `searchStrategy: 'project'`: that strategy
 * stops at the first directory that has a `package.json`, which hides a configuration file at a
 * monorepo root from every file inside a package, while the documented behavior is that the
 * search goes upward from the target file's directory (https://markuplint.dev/docs/configuration).
 * `searchStrategy: 'global'` is no substitute: it also searches the OS-level configuration
 * directory, and that cannot be turned off.
 *
 * A directory that has a `package.json` or `package.yaml` does not end the walk: a `package.json`
 * without a `markuplint` field is not a configuration file, and a `package.yaml` never is, as it
 * is not among the search places. A directory that does not exist, the target's own included,
 * is passed over (see {@link isMissingDir}). An empty configuration is treated like no result
 * and the walk continues. A configuration file that cannot be loaded, at any level, makes the
 * search throw instead of being skipped. There is no upper bound below the file system root, so a
 * configuration file in a directory outside the project applies when nothing nearer exists.
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
		if (await isMissingDir(dir, filePath)) {
			searchLog('Missing: %s', dir);
			continue;
		}
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
