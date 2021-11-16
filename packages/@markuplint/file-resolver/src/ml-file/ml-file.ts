import type { Target } from '../types';

import { promises as fs } from 'fs';
import path from 'path';

import minimatch from 'minimatch';

export class MLFile {
	#type: 'file-base' | 'code-base';
	#basename: string;
	#dirname: string;
	#code: string | null;

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
			this.#basename = target.name || '<AnonymousFile>';
			this.#dirname = target.workspace || process.cwd();
		}
		this.#code = target.sourceCode;
		this.#type = 'code-base';
	}

	get path() {
		return path.resolve(this.#dirname, this.#basename);
	}

	/**
	 * Normalized `MLFile.path`
	 */
	get nPath() {
		return pathNormalize(this.path);
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

	async isExist() {
		return await exist(this.path);
	}

	async dirExists() {
		return await exist(this.#dirname);
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

	setCode(code: string) {
		if (this.#type === 'file-base') {
			throw new Error(`This file object is readonly (File-base: ${this.path})`);
		}
		this.#code = code;
	}

	matches(globPath: string) {
		return minimatch(this.nPath, pathNormalize(globPath));
	}

	private async _fetch() {
		const code = await fs.readFile(this.path, { encoding: 'utf-8' });
		this.#code = code;
		return code;
	}
}

async function exist(filePath: string) {
	try {
		await fs.stat(filePath);
		return true;
	} catch (err) {
		if (
			// @ts-ignore
			'code' in err &&
			// @ts-ignore
			err.code === 'ENOENT'
		) {
			return false;
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
