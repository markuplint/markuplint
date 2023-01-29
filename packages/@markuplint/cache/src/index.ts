import minimatch from 'minimatch';

import { asyncGlob } from './utils';

type Process<T> = (fileList: Readonly<Set<string>>) => Promise<T>;

const globalCache = new Map<string, any>();

export class Cache<T> {
	#type: string;
	#glob: string;
	#process: Process<T>;

	#fileSet: Set<string> | null = null;

	constructor(type: string, glob: string, process: Process<T>) {
		this.#type = type;
		this.#glob = glob;
		this.#process = process;
	}

	get glob() {
		return this.#glob;
	}

	get key() {
		return `<${this.#type}>::${this.#glob}`;
	}

	async get() {
		const cachedData = globalCache.get(this.key);
		if (cachedData) {
			return cachedData as T;
		}
		const fileList = await asyncGlob(this.#glob);
		this.#fileSet = new Set(fileList.sort());
		return this._getData(this.#fileSet);
	}

	async update(file: string) {
		if (!this.#fileSet) {
			const fileList = await asyncGlob(this.#glob);
			this.#fileSet = new Set(fileList.sort());
		}

		if (this.#fileSet.has(file)) {
			// Re-getting data
			return this._getData(this.#fileSet);
		}

		if (!minimatch(file, this.#glob)) {
			// Out of file list
			return null;
		}

		// Re-search file list
		const fileList = await asyncGlob(this.#glob);
		this.#fileSet = new Set(fileList.sort());

		if (!this.#fileSet.has(file)) {
			// The file is not found
			return null;
		}

		// Return cache
		return this.get();
	}

	private async _getData(fileSet: Set<string>) {
		const data = await this.#process(Object.freeze(fileSet));
		globalCache.set(this.key, data);
		return data;
	}
}
