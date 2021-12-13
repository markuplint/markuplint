import type { LoaderSync } from 'cosmiconfig';

import path from 'path';

import { cosmiconfig } from 'cosmiconfig';

const explorer = cosmiconfig('markuplint');

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
