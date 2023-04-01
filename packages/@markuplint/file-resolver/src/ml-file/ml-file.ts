import type { Target } from '../types';
import type { Stats } from 'fs';

import { promises as fs } from 'fs';
import path from 'path';

import minimatch from 'minimatch';

export class MLFile {
	#basename: string;
	#code: string | null;
	#dirname: string;
	/**
	 * - `Stats`: Exists
	 * - `null`: Not exists
	 * - `undefined`: Doesn't read yet
	 */
	#stat: Stats | null | undefined = undefined;
	#type: 'file-base' | 'code-base';

	constructor(target: Target) {
		if (typeof target === 'string') {
			this.#basename = path.basename(target);
			this.#dirname = path.dirname(target);
			this.#code = null;
			this.#type = 'file-base';
			return;
		}
		if (!target.workspace && target.name && path.isAbsolute(target.name)) {
			this.#basename = path.basename(target.name);
			this.#dirname = path.dirname(target.name);
		} else {
			this.#basename = target.name ?? '<AnonymousFile>';
			this.#dirname = target.workspace ?? process.cwd();
		}
		this.#code = target.sourceCode;
		this.#type = 'code-base';
	}

	get dirname() {
		return this.#dirname;
	}

	/**
	 * Normalized `MLFile.dirname`
	 */
	get nDirname() {
		return pathNormalize(this.dirname);
	}

	/**
	 * Normalized `MLFile.path`
	 */
	get nPath() {
		return pathNormalize(this.path);
	}

	get path() {
		return path.resolve(this.#dirname, this.#basename);
	}

	async dirExists() {
		return !!(await stat(this.#dirname));
	}

	async getCode() {
		if (this.#code != null) {
			return this.#code;
		}
		if (this.#type === 'file-base' && (await this.isExist())) {
			return await this._fetch();
		}
		return '';
	}

	async isExist() {
		if (this.#type === 'code-base') {
			return true;
		}
		const stat = await this._stat();
		return !!stat;
	}

	async isFile() {
		if (this.#type === 'code-base') {
			return true;
		}
		const stat = await this._stat();
		return !!stat && stat.isFile();
	}

	matches(globPath: string) {
		return minimatch(this.nPath, pathNormalize(globPath));
	}

	setCode(code: string) {
		if (this.#type === 'file-base') {
			throw new Error(`This file object is readonly (File-base: ${this.path})`);
		}
		this.#code = code;
	}

	private async _fetch() {
		const code = await fs.readFile(this.path, { encoding: 'utf-8' });
		this.#code = code;
		return code;
	}

	private async _stat() {
		if (this.#stat) {
			return this.#stat;
		}
		this.#stat = await stat(this.path);
		return this.#stat;
	}
}

async function stat(filePath: string) {
	try {
		return await fs.stat(filePath);
	} catch (err) {
		if (
			// @ts-ignore
			'code' in err &&
			// @ts-ignore
			err.code === 'ENOENT'
		) {
			return null;
		}
		throw err;
	}
}

function pathNormalize(filePath: string) {
	// Remove the local disk scheme of Windows OS
	if (path.isAbsolute(filePath)) {
		filePath = filePath.replace(/^[a-z]+:/i, '');
	}
	// Replace the separator of Windows OS
	filePath = filePath.split(path.sep).join('/');
	return filePath;
}
