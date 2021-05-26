import { Config, ConfigSet } from './';
import { getConfigFile } from './get-config-file';
import { search } from './helper';

/**
 * Asynchronously search configuration file from linting target file.
 *
 * @param baseDirOrTargetFilePath A path of linting target file. To be base directory for searching. (ex. `"path/to/target.html"`)
 * @param recursiveExtends Recursive load by extends options.
 * @param cacheClear Clear cache when loading.
 */
export async function searchConfigFile(
	baseDirOrTargetFilePath: string,
	recursiveExtends: boolean = true,
	cacheClear: boolean = false,
): Promise<ConfigSet | void> {
	const result = await search<Config>(baseDirOrTargetFilePath, cacheClear);
	if (!result) {
		return;
	}
	return getConfigFile(result.filePath, result.config, recursiveExtends, cacheClear);
}
