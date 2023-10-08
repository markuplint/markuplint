import { parentPort } from 'worker_threads';

import { MLEngine as DefaultMLEngine, version as defaultVersion } from 'default-markuplint';

import { resolveModule } from './resolve-module.mjs';

/**
 * @type {string}
 */

let currentModule = 'default-markuplint';

/**
 * @type {typeof import('markuplint').MLEngine}
 */
let MLEngine = DefaultMLEngine;

/**
 * @type {typeof import('markuplint').version}
 */
let version = defaultVersion;

/**
 * @type {import('markuplint').MLEngine | null}
 */
let engine = null;

parentPort.on('message', async args => {
	switch (args.method) {
		case 'setModule': {
			const oldModule = currentModule;
			const oldModuleURL = resolveModule(oldModule);
			currentModule = args.data[0];
			const mod = await import(currentModule);
			const newModuleURL = resolveModule(currentModule);
			const { MLEngine: _MLEngine, version: _version } = mod;

			const oldVersion = version;
			const changed = MLEngine !== _MLEngine || version !== _version;

			MLEngine = _MLEngine;
			version = _version;

			parentPort.postMessage({
				method: 'setModule:return',
				data: [
					{
						changed,
						oldModule,
						oldModuleURL,
						oldVersion,
						newModule: currentModule,
						newModuleURL,
						version,
					},
				],
			});
			break;
		}
		case 'fromCode': {
			const sourceCode = args.data[0];
			const options = args.data[1] ?? {};
			engine = await MLEngine.fromCode(sourceCode, options);
			parentPort.postMessage({ method: 'fromCode:return' });
			break;
		}
		case 'exec': {
			if (!engine) {
				parentPort.postMessage({ method: 'exec:return', data: [] });
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
		case 'setCode': {
			if (!engine) {
				parentPort.postMessage({ method: 'setCode:return' });
				break;
			}
			const sourceCode = args.data[0];
			await engine.setCode(sourceCode);
			parentPort.postMessage({ method: 'setCode:return' });
			break;
		}
		case 'getAccessibilityByLocation': {
			// TODO Refactor `MLEngine::setup()` so that `engine.document` becomes active without having to run `engine.exec()`
			await engine?.exec();

			if (!engine || !engine.document) {
				parentPort.postMessage({ method: 'getAccessibilityByLocation:return', data: [null] });
				break;
			}
			const line = args.data[0];
			const col = args.data[1];
			const ariaVersion = args.data[2] ?? '1.2';

			const aria = getAccessibilityByLocation(line, col, ariaVersion);

			parentPort.postMessage({ method: 'getAccessibilityByLocation:return', data: [aria] });
			break;
		}
		case 'getVersion': {
			parentPort.postMessage({ method: 'getVersion:return', data: [version] });
			break;
		}
	}
});

parentPort.on('error', err => {
	parentPort.postMessage({ method: 'error', data: ['' + err] });
});

/**
 *
 * @param {number} line
 * @param {number} col
 * @param {import("@markuplint/ml-spec").ARIAVersion} ariaVersion
 * @returns
 */
function getAccessibilityByLocation(line, col, ariaVersion) {
	if (!engine || !engine.document) {
		return null;
	}

	const node = engine.document.searchNodeByLocation(line, col);

	if (!node || !node.is(node.ELEMENT_NODE)) {
		return null;
	}

	const aria = engine.document.getAccessibilityProp(node, ariaVersion);

	return {
		node: node.localName,
		aria,
	};
}
