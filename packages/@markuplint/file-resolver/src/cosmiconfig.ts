import type { LoaderSync, Loader } from 'cosmiconfig';

import path from 'node:path';

import { ConfigParserError } from '@markuplint/parser-utils';
import { cosmiconfig, defaultLoaders } from 'cosmiconfig';
import { jsonc } from 'jsonc';

import { ConfigLoadError } from '@markuplint/shared';
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
	searchStrategy: 'project',
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

export async function search<T = CosmiConfig>(filePath: string, cacheClear: boolean) {
	if (cacheClear) {
		explorer.clearCaches();
	}

	const dir = path.dirname(filePath);

	searchLog('Search dir: %s', dir);
	const result = await explorer.search(dir).catch(cacheConfigError(dir, filePath));

	searchLog('Search result: %O', result);

	if (!result || result.isEmpty) {
		return null;
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
