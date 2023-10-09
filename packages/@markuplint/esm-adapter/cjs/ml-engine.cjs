const path = require('node:path');
const { Worker } = require('node:worker_threads');

const { Emitter } = require('strict-event-emitter');

const { log } = require('./debug.cjs');

class MLEngine extends Emitter {
	/**
	 * @param {string} sourceCode
	 * @param {import("markuplint").FromCodeOptions & { moduleName?: string }} options
	 * @returns {Promise<MLEngine>}
	 */
	static async fromCode(sourceCode, options) {
		const engine = new MLEngine();
		if (options?.moduleName) {
			const { isLocal } = await engine.setModule(options.moduleName, options.dirname);
			engine.isLocalModule = isLocal;
		}
		await engine.#fromCodeInit(sourceCode, options);
		return engine;
	}

	#worker = new Worker(path.resolve(__dirname, '..', 'esm', 'index.mjs'), { type: 'module' });
	#moduleName = 'default-markuplint';

	isLocalModule = false;

	constructor() {
		super();
		this.#worker.on('message', args => {
			log('worker: %O', args);

			const logType = args.method?.replace(/^log:/, '');
			if (logType) {
				this.emit(logType, ...(args?.data ?? []));
			}
		});

		this.#worker.on('error', args => {
			throw args;
		});
	}

	/**
	 *
	 * @param {string} sourceCode
	 * @param {import("markuplint").FromCodeOptions} options
	 * @returns {Promise<void>}
	 */
	async #fromCodeInit(sourceCode, options) {
		await this.#add('fromCode', true, sourceCode, options);
	}

	/**
	 *
	 * @returns {Promise<import("markuplint").MLResultInfo | null>}
	 */
	async exec() {
		const result = await this.#add('exec', true);
		return result;
	}

	/**
	 *
	 * @param {number} line
	 * @param {number} col
	 * @param {import("@markuplint/ml-spec").ARIAVersion} ariaVersion
	 * @returns {Promise<{ node: string, aria: import("@markuplint/ml-core").AccessibilityProperties> | null }}
	 */
	async getAccessibilityByLocation(line, col, ariaVersion) {
		const [result] = await this.#add('getAccessibilityByLocation', true, line, col, ariaVersion);
		return result;
	}

	/**
	 * @returns {Promise<string>}
	 */
	async getVersion() {
		const [version] = await this.#add('getVersion', true);
		return version;
	}

	/**
	 * @returns {Promise<void>}
	 */
	async dispose() {
		await this.#worker.terminate();
	}

	/**
	 *
	 * @param {string} sourceCode
	 * @returns {Promise<void>}
	 */
	async setCode(sourceCode) {
		await this.#add('setCode', true, sourceCode);
	}

	/**
	 *
	 * @param {string} moduleName
	 * @param {string} baseDir
	 * @returns {Promise<{ changed: boolean; version: string, isLocal: boolean; }>}
	 */
	async setModule(moduleName, baseDir) {
		if (this.#moduleName === moduleName) {
			return Promise.resolve();
		}

		const [result] = await this.#add('setModule', true, moduleName, baseDir);
		return result;
	}

	/**
	 *
	 * @param {string} method
	 * @param {boolean} once
	 * @param  {...any} data
	 * @returns
	 */
	#add(method, once, ...data) {
		return new Promise((resolve, reject) => {
			const receiver = args => {
				if (args.method === `${method}:return`) {
					log('%s: %O', args.method, { method, data, args });
					if (once) {
						this.#worker.off('message', receiver);
					}
					resolve(args?.data ?? []);
					return;
				}
			};

			this.#worker.on('message', receiver);
			this.#post(method, ...data);
		});
	}

	#post(method, ...data) {
		log('post: %O', { method, data });
		this.#worker.postMessage({ method, data });
	}
}

module.exports = { MLEngine };
