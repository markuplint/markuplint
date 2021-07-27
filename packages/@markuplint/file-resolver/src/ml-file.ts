import { promises as fs } from 'fs';
import minimatch from 'minimatch';
import path from 'path';

const fileCaches = new WeakMap<MLFile, string>();

export class MLFile {
	readonly anonymous: boolean;
	#filePath: string;

	/**
	 *
	 * @param filePathOrContext A file path or context
	 * @param anonymous if 1st param is a context
	 * @param workspace context of workspace if anonymous is true
	 * @param name context of name
	 */
	constructor(filePathOrContext: string, anonymous = false, workspace = process.cwd(), name = '<AnonymousFile>') {
		this.anonymous = anonymous;
		if (anonymous) {
			this.#filePath = path.resolve(workspace, name);
			// `filePath` is context
			fileCaches.set(this, filePathOrContext);
		} else {
			this.#filePath = path.resolve(filePathOrContext);
		}
	}

	get path() {
		return this.#filePath;
	}

	async isExist() {
		return !!(await fs.stat(this.#filePath));
	}

	async getContext() {
		return fileCaches.get(this) ?? (await this._fetch());
	}

	matches(globPath: string) {
		return minimatch(this.#filePath, globPath);
	}

	private async _fetch() {
		const context = await fs.readFile(this.#filePath, { encoding: 'utf-8' });
		fileCaches.set(this, context);
		return context;
	}
}
