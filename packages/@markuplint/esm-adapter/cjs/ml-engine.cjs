const path = require('node:path');
const { Worker } = require('node:worker_threads');

const { Emitter } = require('strict-event-emitter');

const { log } = require('./debug.cjs');

class MLEngine extends Emitter {
	static #globalIncrementalUID = 0;
	static #worker = new Worker(path.resolve(__dirname, '..', 'esm', 'index.mjs'), { type: 'module' });
	static #moduleName = 'default-markuplint';

	static {
		this.#worker.setMaxListeners(Number.POSITIVE_INFINITY);
	}

	/**
	 * @param {string} sourceCode
	 * @param {import("markuplint").FromCodeOptions & { moduleName?: string }} options
	 * @returns {Promise<MLEngine>}
	 */
	static async fromCode(sourceCode, options) {
		const engine = new MLEngine();
		if (options?.moduleName) {
			const { isLocal, newModuleURL } = await engine.setModule(options.moduleName, options.dirname);
			engine.isLocalModule = isLocal;
			engine.modulePath = newModuleURL;
		}
		await engine.#fromCodeInit(sourceCode, options);
		return engine;
	}

	/**
	 * @returns {Promise<{ modulePath: string, isLocalModule: boolean, version: string }>}
	 */
	static async getCurrentModuleInfo() {
		const [result] = await this.#add('getCurrentModuleInfo', null, true);
		return result;
	}

	/**
	 *
	 * @param {string} moduleName
	 * @param {string} baseDir
	 * @returns {Promise<{ changed: boolean; version: string, isLocal: boolean; }>}
	 */
	static async setModule(moduleName, baseDir) {
		if (this.#moduleName === moduleName) {
			return;
		}

		const [result] = await MLEngine.#add('setModule', null, true, moduleName, baseDir);
		return result;
	}

	/**
	 *
	 * @param {string} method
	 * @param {number} uid
	 * @param {boolean} once
	 * @param  {...any} data
	 * @returns
	 */
	static #add(method, uid, once, ...data) {
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
			this.#post(method, uid, ...data);
		});
	}

	static #post(method, uid, ...data) {
		log('post: %O', { method, data });
		this.#worker.postMessage({ method, uid, data });
	}

	#uid = -1;

	isLocalModule = false;
	modulePath = null;

	constructor() {
		super();

		this.#uid = MLEngine.#globalIncrementalUID++;

		MLEngine.#worker.on('message', args => {
			log('worker: %O', args);

			if (args.method?.startsWith('log:') && args.uid !== this.#uid) {
				return;
			}

			const logType = args.method?.replace(/^log:/, '');
			if (logType) {
				this.emit(logType, ...(args?.data ?? []));
			}
		});

		MLEngine.#worker.on('error', args => {
			throw args;
		});
	}

	getWorkerListenerCount() {
		return MLEngine.#worker.listenerCount('message');
	}

	/**
	 *
	 * @param {string} sourceCode
	 * @param {import("markuplint").FromCodeOptions} options
	 * @returns {Promise<void>}
	 */
	async #fromCodeInit(sourceCode, options) {
		await MLEngine.#add('fromCode', this.#uid, true, sourceCode, options);
	}

	/**
	 *
	 * @returns {Promise<import("markuplint").MLResultInfo | null>}
	 */
	async exec() {
		const result = await MLEngine.#add('exec', this.#uid, true);
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
		const [result] = await MLEngine.#add('getAccessibilityByLocation', this.#uid, true, line, col, ariaVersion);
		return result;
	}

	/**
	 *
	 * @param {string} sourceCode
	 * @returns {Promise<void>}
	 */
	async setCode(sourceCode) {
		await MLEngine.#add('setCode', this.#uid, true, sourceCode);
	}
}

module.exports = { MLEngine };
