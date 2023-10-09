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
			await engine.setModule(options.moduleName, options.dirname);
		}
		await engine.#fromCodeInit(sourceCode, options);
		return engine;
	}

	#worker = new Worker(path.resolve(__dirname, '..', 'esm', 'index.mjs'), { type: 'module' });
	#moduleName = 'default-markuplint';

	constructor() {
		super();
		this.#worker.on('message', args => {
			log('worker: %O', args);
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
	#fromCodeInit(sourceCode, options) {
		return new Promise((resolve, reject) => {
			this.#worker.once('message', args => {
				if (args.method !== 'fromCode:return') {
					reject(`Unknown method: ${args.method} (Catch: #fromCodeInit))`);
					return;
				}
				resolve();
			});
			this.#post('fromCode', sourceCode, options);
		});
	}

	/**
	 *
	 * @returns {Promise<import("markuplint").MLResultInfo | null>}
	 */
	exec() {
		return new Promise((resolve, reject) => {
			const messageHandler = args => {
				if (args.method === 'exec:return') {
					this.#worker.off('message', messageHandler);
					resolve(args.data);
					return;
				}

				if (args.method !== 'event:lint') {
					return;
				}

				this.emit('lint', ...args.data);
			};

			this.#worker.on('message', messageHandler);
			this.#post('exec');
		});
	}

	/**
	 *
	 * @param {number} line
	 * @param {number} col
	 * @param {import("@markuplint/ml-spec").ARIAVersion} ariaVersion
	 * @returns {Promise<{ node: string, aria: import("@markuplint/ml-core").AccessibilityProperties> | null }}
	 */
	getAccessibilityByLocation(line, col, ariaVersion) {
		return new Promise((resolve, reject) => {
			this.#worker.once('message', args => {
				if (args.method !== 'getAccessibilityByLocation:return') {
					reject(`Unknown method: ${args.method} (Catch: getAccessibilityByLocation)`);
					return;
				}
				resolve(args.data[0]);
			});
			this.#post('getAccessibilityByLocation', line, col, ariaVersion);
		});
	}

	/**
	 * @returns {Promise<string>}
	 */
	getVersion() {
		return new Promise((resolve, reject) => {
			this.#worker.once('message', args => {
				if (args.method !== 'getVersion:return') {
					reject(`Unknown method: ${args.method} (Catch: getVersion)`);
					return;
				}
				resolve(args.data[0]);
			});
			this.#post('getVersion');
		});
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
	setCode(sourceCode) {
		return new Promise((resolve, reject) => {
			this.#worker.once('message', args => {
				if (args.method !== 'setCode:return') {
					reject(`Unknown method: ${args.method} (Catch: setCode)`);
					return;
				}
				resolve();
			});
			this.#post('setCode', sourceCode);
		});
	}

	/**
	 *
	 * @param {string} moduleName
	 * @param {string} baseDir
	 * @returns {Promise<{ changed: boolean; version: string }>}
	 */
	setModule(moduleName, baseDir) {
		if (this.#moduleName === moduleName) {
			return Promise.resolve();
		}
		return new Promise((resolve, reject) => {
			this.#worker.once('message', args => {
				if (args.method !== 'setModule:return') {
					reject(`Unknown method: ${args.method} (Catch: setModule)`);
					return;
				}
				resolve(args?.data?.[0]);
			});
			this.#post('setModule', moduleName, baseDir);
		});
	}

	#post(method, ...data) {
		log('post: %O', { method, data });
		this.#worker.postMessage({ method, data });
	}
}

module.exports = { MLEngine };
