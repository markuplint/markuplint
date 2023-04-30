import type { LoaderSync, Loader } from 'cosmiconfig';

import path from 'path';

import { cosmiconfig, defaultLoaders } from 'cosmiconfig';
import { TypeScriptLoader } from 'cosmiconfig-typescript-loader';
import { jsonc } from 'jsonc';

const explorer = cosmiconfig('markuplint', {
	loaders: {
		'.ts': TypeScriptLoader(),
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
	const result = await explorer.search(dir);
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
	const result = await explorer.load(filePath);
	if (!result || result.isEmpty) {
		return null;
	}
	return {
		filePath: result.filepath,
		config: result.config as T,
	};
}
