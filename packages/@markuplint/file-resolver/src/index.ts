import deepAssgin from 'deep-assign';
import fs from 'fs';
import path from 'path';
import util from 'util';

import { Config } from '@markuplint/ml-config/';
import { load, search } from './loader';

const stat = util.promisify(fs.stat);

namespace FileResolver {
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
	) {
		const result = await load<Config>(path.resolve(filePath), cacheClear);
		if (!result) {
			return null;
		}
		let files: Set<string> = new Set([result.filePath]);
		let config = result.config;
		if (recursiveExtends) {
			const extendsResult = await _recursiveLoad(config, result.filePath, files, cacheClear);
			files = extendsResult.files;
			config = extendsResult.config;
		}
		return {
			files,
			config,
		};
	}

	/**
	 * Asynchronously search configuration file from linting target file.
	 *
	 * @param baseDir A path of linting target file. To be base directory for searching. (ex. `"path/to/target.html"`)
	 * @param recursiveExtends Recursive load by extends options.
	 * @param cacheClear Clear cache when loading.
	 */
	export async function searchConfigFile(
		baseDir: string,
		recursiveExtends: boolean = true,
		cacheClear: boolean = false,
	) {
		const result = await search<Config>(baseDir, cacheClear);
		if (!result) {
			return null;
		}
		let files: Set<string> = new Set([result.filePath]);
		let config = result.config;
		if (recursiveExtends) {
			const extendsResult = await _recursiveLoad(config, result.filePath, files, cacheClear);
			files = extendsResult.files;
			config = extendsResult.config;
		}
		return {
			files,
			config,
		};
	}

	async function _recursiveLoad(config: Config, filePath: string, files: Set<string>, cacheClear: boolean) {
		const baseDir = path.dirname(filePath);
		if (config.extends) {
			const extendFiles = Array.isArray(config.extends) ? config.extends : [config.extends];
			for (const _file of extendFiles) {
				const file = path.resolve(path.join(baseDir, _file));
				if (files.has(file)) {
					continue;
				}
				const extendFileResult = await loadConfigFile(file, true, cacheClear);
				if (!extendFileResult) {
					continue;
				}
				files = new Set(files).add(file);
				config = deepAssgin(config, extendFileResult.config);
			}
		}
		delete config.extends;
		return {
			files,
			config,
		};
	}
}

export default FileResolver;
