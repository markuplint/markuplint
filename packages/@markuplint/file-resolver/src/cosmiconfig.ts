import type { LoaderSync, Loader } from 'cosmiconfig';

import path from 'node:path';

import { ConfigParserError } from '@markuplint/parser-utils';
import { cosmiconfig, defaultLoaders } from 'cosmiconfig';
import { jsonc } from 'jsonc';

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
});

type CosmiConfig = ReturnType<LoaderSync>;

export async function search<T = CosmiConfig>(dir: string, cacheClear: boolean) {
	if (cacheClear) {
		explorer.clearCaches();
	}
	dir = path.dirname(dir);

	searchLog('Search dir: %s', dir);
	const result = await explorer.search(dir).catch(cacheConfigError(dir));

	searchLog('Search result: %O', result);

	if (!result || result.isEmpty) {
		return null;
	}
	return {
		filePath: result.filepath,
		config: result.config as T,
	};
}

export async function load<T = CosmiConfig>(filePath: string, cacheClear: boolean) {
	if (cacheClear) {
		explorer.clearCaches();
	}
	const result = await explorer.load(filePath).catch(cacheConfigError(filePath));
	if (!result || result.isEmpty) {
		return null;
	}
	return {
		filePath: result.filepath,
		config: result.config as T,
	};
}

class ConfigLoadError extends Error {
	name = 'ConfigLoadError';
	constructor(message: string, filePath: string) {
		super(message + ` in ${filePath}`);
	}
}

function cacheConfigError(fileOrDirPath: string) {
	return (reason: unknown) => {
		if (reason instanceof Error) {
			switch (reason.name) {
				case 'YAMLException':
					throw new ConfigParserError(reason.message, {
						// @ts-ignore
						filePath: reason.filepath ?? fileOrDirPath,
					});
			}
			throw new ConfigLoadError(reason.message, fileOrDirPath);
		}
		throw reason;
	};
}
