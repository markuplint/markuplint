import { Config, ConfigSet } from './';
import { getConfigFile } from './get-config-file';
import { load } from './helper';
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
	return getConfigFile(result.filePath, result.config, recursiveExtends, cacheClear);
}
