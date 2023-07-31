const path = require('node:path');
const { Worker } = require('node:worker_threads');

/**
 *
 * @returns {Promise<string>}
 */
function getVersion() {
	const worker = new Worker(path.resolve(__dirname, '..', 'esm', 'index.mjs'), { type: 'module' });
	return new Promise((resolve, reject) => {
		worker.once('message', args => {
			if (args.method !== 'getVersion:return') {
				reject(`Unknown method: ${args.method}`);
				return;
			}
			worker.terminate();
			resolve(args.data[0]);
		});
		worker.postMessage({ method: 'getVersion' });
	});
}

module.exports = {
	getVersion,
};
