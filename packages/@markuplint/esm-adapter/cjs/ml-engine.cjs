const path = require('node:path');
const { Worker } = require('node:worker_threads');

const { Emitter } = require('strict-event-emitter');

class MLEngine extends Emitter {
	/**
	 * @param {string} sourceCode
	 * @param {import("markuplint").FromCodeOptions} options
	 * @returns
	 */
	static async fromCode(sourceCode, options) {
		const engine = new MLEngine();
		await engine.#fromCodeInit(sourceCode, options);
		return engine;
	}

	#worker = new Worker(path.resolve(__dirname, '..', 'esm', 'index.mjs'), { type: 'module' });

	constructor() {
		super();
	}

	#fromCodeInit(sourceCode, options) {
		this.#worker.postMessage({ method: 'fromCode', data: [sourceCode, options] });
		return new Promise((resolve, reject) => {
			this.#worker.once('message', args => {
				if (args.method === 'fromCode:return') {
					resolve();
					return;
				}
				reject(`Unknown method: ${args.method}`);
			});
		});
	}

	exec() {
		return new Promise((resolve, reject) => {
			this.#worker.postMessage({ method: 'exec' });

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
		});
	}

	async dispose() {
		await this.#worker.terminate();
	}
}

module.exports = { MLEngine };
