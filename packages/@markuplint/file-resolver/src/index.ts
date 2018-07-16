import deepAssgin from 'deep-assign';
import fs from 'fs';
import path from 'path';

import { Config } from '@markuplint/ml-config/src';

import { load, search } from './loader';

namespace FileResolver {
	/**
	 * Resolve configuration file.
	 *
	 * @param lintTargetFilePath A path of linting target file. To be base directory for searching. (ex. `"path/to/target.html"`)
	 * @param cacheClear Clear cache when loading.
	 */
	export async function resolveConfigFile(lintTargetFilePath: string, cacheClear: boolean = false) {
		const result = await searchConfigFile(lintTargetFilePath, cacheClear);
		if (!result) {
			return null;
		}
		return recursiveLoadConfig(result.file, cacheClear);
	}

	/**
	 * Asynchronously tests whether or not the given path exists by checking with the file system.
	 *
	 * @param filePath
	 */
	export async function fileExists(filePath: string) {
		return new Promise<boolean>(resolve => {
			fs.stat(filePath, (err, stats) => (err ? resolve(false) : resolve(true)));
		});
	}

	/**
	 * Asynchronously search configuration file from linting target file.
	 *
	 * @param lintTargetFilePath A path of linting target file. To be base directory for searching. (ex. `"path/to/target.html"`)
	 * @param cacheClear Clear cache when loading.
	 */
	export async function searchConfigFile(lintTargetFilePath: string, cacheClear: boolean = false) {
		const filePath = path.resolve(lintTargetFilePath);
		const targetExists = await fileExists(filePath);
		if (!targetExists) {
			return null;
		}
		const dir = path.dirname(filePath);
		const result = await search(dir, cacheClear);
		if (!result) {
			return null;
		}
		return {
			file: result.filePath,
			config: result.config as Config,
		};
	}

	/**
	 * Asynchronously get configuration file.
	 *
	 * @param filePath A path of configuration file. (ex. `"path/to/markuplintrc.json"`)
	 * @param cacheClear Clear cache when loading.
	 */
	export async function loadConfigFile(filePath: string, cacheClear: boolean = false) {
		const result = await load(path.resolve(filePath), cacheClear);
		if (!result) {
			return null;
		}
		return {
			file: result.filePath,
			config: result.config as Config,
		};
	}

	/**
	 *
	 * @param baseFilePath
	 * @param cacheClear
	 */
	async function recursiveLoadConfig(baseFilePath: string, cacheClear: boolean = false) {
		const result = await loadConfigFile(baseFilePath);
		if (!result) {
			return null;
		}
		const baseDir = path.dirname(result.file);
		const files: string[] = [result.file];
		let config = result.config;
		if (result.config.extends) {
			const extendFiles = Array.isArray(result.config.extends) ? result.config.extends : [result.config.extends];
			for (const _file of extendFiles) {
				const file = path.resolve(path.join(baseDir, _file));
				if (files.includes(file)) {
					continue;
				}
				files.push(file);
				const extendFileResult = await recursiveLoadConfig(file);
				if (!extendFileResult) {
					continue;
				}
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
