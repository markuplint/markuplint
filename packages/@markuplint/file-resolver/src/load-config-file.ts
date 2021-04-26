import { Config, ConfigSet } from './';
import { load, loadSync, recursiveLoad, recursiveLoadSync } from './helper';
import path from 'path';

/**
 * Asynchronously get configuration file.
 *
 * @param filePath A path of configuration file. (ex. `"path/to/markuplintrc.json"`)
 * @param recursiveExtends Recursive load by extends options.
 * @param cacheClear Clear cache when loading.
 */
export async function loadConfigFile(
	filePath: string,
	recursiveExtends: boolean = true,
	cacheClear: boolean = false,
): Promise<ConfigSet | void> {
	const result = await load<Config>(path.resolve(filePath), cacheClear);
	if (!result) {
		return;
	}
	let files: Set<string> = new Set([result.filePath]);
	let config = result.config;
	const errs: Error[] = [];
	if (recursiveExtends) {
		const extendsResult = await recursiveLoad(config, result.filePath, files, cacheClear);
		files = extendsResult.files;
		config = extendsResult.config;
		errs.push(...extendsResult.errs);
	}
	return {
		files,
		config,
		errs,
	};
}

/**
 * Asynchronously get configuration file.
 *
 * @param filePath A path of configuration file. (ex. `"path/to/markuplintrc.json"`)
 * @param recursiveExtends Recursive load by extends options.
 * @param cacheClear Clear cache when loading.
 */
export function loadConfigFileSync(
	filePath: string,
	recursiveExtends: boolean = true,
	cacheClear: boolean = false,
): ConfigSet | void {
	const result = loadSync<Config>(path.resolve(filePath), cacheClear);
	if (!result) {
		return;
	}
	let files: Set<string> = new Set([result.filePath]);
	let config = result.config;
	const errs: Error[] = [];
	if (recursiveExtends) {
		const extendsResult = recursiveLoadSync(config, result.filePath, files, cacheClear);
		files = extendsResult.files;
		config = extendsResult.config;
		errs.push(...extendsResult.errs);
	}
	return {
		files,
		config,
		errs,
	};
}
