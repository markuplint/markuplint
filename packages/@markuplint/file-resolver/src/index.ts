import deepAssgin from 'deep-assign';
import fs from 'fs';
import glob from 'glob';
import path from 'path';
import util from 'util';

import { Config } from '@markuplint/ml-config/';
import { load, search } from './helper';

const stat = util.promisify(fs.stat);
const readFile = util.promisify(fs.readFile);

export interface ConfigSet {
	config: Config;
	files: Set<string>;
	errs: Error[];
}

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
		const extendsResult = await _recursiveLoad(config, result.filePath, files, cacheClear);
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
	let files: Set<string> = new Set([result.filePath]);
	let config = result.config;
	const errs: Error[] = [];
	if (recursiveExtends) {
		const extendsResult = await _recursiveLoad(config, result.filePath, files, cacheClear);
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

async function _recursiveLoad(
	config: Config,
	filePath: string,
	files: Set<string>,
	cacheClear: boolean,
): Promise<ConfigSet> {
	const errs: Error[] = [];
	const baseDir = path.dirname(filePath);
	if (config.extends) {
		const extendFiles = Array.isArray(config.extends) ? config.extends : [config.extends];
		for (const _file of extendFiles) {
			if (/^\.+\//.test(_file)) {
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
			} else {
				try {
					const mod: Config = await import(_file);
					files.add(_file);
					config = deepAssgin(config, mod);
				} catch (err) {
					errs.push(err);
				}
			}
		}
	}
	delete config.extends;
	return {
		files,
		config,
		errs,
	};
}

export async function getFiles(filePathOrGlob: string) {
	const fileList = await new Promise<string[]>((resolve, reject) => {
		glob(filePathOrGlob, {}, (err, matches) => {
			if (err) {
				reject(err);
			}
			resolve(matches);
		});
	}).catch<string[]>(() => []);

	return fileList.map(fileName => getFile(fileName));
}

export function getFile(filePath: string) {
	const file = new MLFile(filePath);
	return file;
}

export function getAnonymousFile(context: string) {
	const file = new MLFile(context, true);
	return file;
}

const fileCaches = new WeakMap<MLFile, string>();

export class MLFile {
	public readonly anonymous: boolean;
	private _filePath: string;

	/**
	 *
	 * @param filePath A file path or context
	 * @param anonymous if 1st param is a context
	 */
	constructor(filePath: string, anonymous = false) {
		this.anonymous = anonymous;
		if (anonymous) {
			this._filePath = '<AnonymousFile>';
			// `filePath` is context
			fileCaches.set(this, filePath);
		} else {
			this._filePath = path.resolve(filePath);
		}
	}

	public get path() {
		return this._filePath;
	}

	public async isExist() {
		return !!(await stat(this._filePath));
	}

	public async getContext() {
		return fileCaches.get(this) || (await this._fetch());
	}

	private async _fetch() {
		const context = await readFile(this._filePath, { encoding: 'utf-8' }).catch(() => '');
		fileCaches.set(this, context);
		return context;
	}
}
