import fs from 'fs';
import path from 'path';
import util from 'util';

const stat = util.promisify(fs.stat);
const readFile = util.promisify(fs.readFile);
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
		const context = await readFile(this._filePath, { encoding: 'utf-8' });
		fileCaches.set(this, context);
		return context;
	}
}
