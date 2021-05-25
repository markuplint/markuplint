import { Config, ConfigSet } from './';
import { optimizePath } from './optimize-path';
import { recursiveLoad } from './helper';

/**
 * Asynchronously get configuration file.
 *
 * @param filePath A path of configuration file.
 * @param config Configure data.
 * @param recursiveExtends Recursive load by extends options.
 * @param cacheClear Clear cache when loading.
 */
export async function getConfigFile(
	filePath: string,
	config: Config,
	recursiveExtends: boolean = true,
	cacheClear: boolean = false,
): Promise<ConfigSet | void> {
	let files: Set<string> = new Set([filePath]);
	const errs: Error[] = [];

	if (config.excludeFiles) {
		config.excludeFiles = config.excludeFiles.map(globPath => optimizePath(filePath, globPath));
	}

	if (recursiveExtends) {
		const extendsResult = await recursiveLoad(config, filePath, files, cacheClear);
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
