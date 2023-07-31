import { parentPort } from 'worker_threads';

import { MLEngine, version } from 'markuplint';

/**
 * @type {import('markuplint').MLEngine | null}
 */
let engine = null;

parentPort.on('message', async args => {
	switch (args.method) {
		case 'fromCode': {
			const sourceCode = args.data[0];
			const options = args.data[1] ?? {};
			engine = await MLEngine.fromCode(sourceCode, options);
			parentPort.postMessage({ method: 'fromCode:return' });
			break;
		}
		case 'exec': {
			if (!engine) {
				break;
			}
			engine.on('lint', (filePath, sourceCode, violations, fixedCode, debug, message) => {
				parentPort.postMessage({
					method: 'event:lint',
					data: [filePath, sourceCode, violations, fixedCode, debug, message],
				});
			});
			const result = await engine.exec();
			parentPort.postMessage({ method: 'exec:return', data: [result] });
			break;
		}
		case 'getVersion': {
			parentPort.postMessage({ method: 'getVersion:return', data: [version] });
		}
	}
});
