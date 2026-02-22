import type { Target } from '../types.js';
import type { Stats } from 'node:fs';

import { promises as fs } from 'node:fs';
import path from 'node:path';

import ignore from 'ignore';
import { minimatch } from 'minimatch';

import { normalizeForIgnore } from '../path-utils.js';

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
		return normalizeForIgnore(this.dirname);
	}

	/**
	 * Normalized `MLFile.path`
	 */
	get nPath() {
		return normalizeForIgnore(this.path);
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

	ignored(globPath: string | readonly string[]) {
		globPath = typeof globPath === 'string' ? [globPath] : globPath;
		const normalizedPaths = globPath.map(p => normalizeForIgnore(p, true));
		// @ts-ignore
		const ig = ignore().add(normalizedPaths);
		const ignored = ig.ignores(normalizeForIgnore(this.path, true));
		return ignored;
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
		return minimatch(normalizeForIgnore(this.path), normalizeForIgnore(globPath));
	}

	setCode(code: string) {
		if (this.#type === 'file-base') {
			throw new Error(`This file object is readonly (File-base: ${this.path})`);
		}
		this.#code = code;
	}

	private async _fetch() {
		const code = await fs.readFile(this.path, { encoding: 'utf8' });
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
	} catch (error) {
		if (
			// @ts-ignore
			'code' in error &&
			// @ts-ignore
			error.code === 'ENOENT'
		) {
			return null;
		}
		throw error;
	}
}
