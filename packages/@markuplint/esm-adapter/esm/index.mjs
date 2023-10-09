import { parentPort } from 'worker_threads';

import { MLEngine as DefaultMLEngine, version as defaultVersion } from 'default-markuplint';

import { getAccessibilityByLocation } from './get-accessibility-by-location.mjs';
import { importLocalModule } from './import-local-module.mjs';
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
			const baseDir = args.data[1];
			const oldModule = currentModule;
			const oldModuleURL = resolveModule(oldModule);
			currentModule = args.data[0];
			const localMod = await importLocalModule(currentModule, baseDir);
			let mod = localMod?.module;
			let newModuleURL = localMod?.modPath;
			let isLocal = true;
			if (!mod) {
				mod = await import(currentModule);
				newModuleURL = resolveModule(currentModule);
				isLocal = false;
			}
			const { MLEngine: _MLEngine, version: _version } = mod;

			const oldVersion = version;
			const changed = oldModuleURL !== newModuleURL;

			MLEngine = _MLEngine;
			version = _version;

			parentPort.postMessage({
				method: 'setModule:return',
				data: [
					{
						changed,
						baseDir,
						oldModule,
						oldModuleURL,
						oldVersion,
						newModule: currentModule,
						newModuleURL,
						isLocal,
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

			engine.on('code', (...params) => {
				parentPort.postMessage({ method: 'log:code', data: params });
			});

			engine.on('config', (...params) => {
				parentPort.postMessage({ method: 'log:config', data: params });
			});

			engine.on('config-errors', (...params) => {
				parentPort.postMessage({ method: 'log:config-errors', data: params });
			});

			engine.on('exclude', (...params) => {
				parentPort.postMessage({ method: 'log:exclude', data: params });
			});

			engine.on('i18n', (...params) => {
				parentPort.postMessage({ method: 'log:i18n', data: params });
			});

			engine.on('lint', (...params) => {
				parentPort.postMessage({ method: 'log:lint', data: params });
			});

			engine.on('lint-error', (...params) => {
				parentPort.postMessage({ method: 'log:lint-error', data: params });
			});

			engine.on('log', (...params) => {
				parentPort.postMessage({ method: 'log:log', data: params });
			});

			engine.on('parser', (...params) => {
				parentPort.postMessage({ method: 'log:parser', data: params });
			});

			engine.on('rules', (...params) => {
				parentPort.postMessage({ method: 'log:rules', data: params });
			});

			engine.on('ruleset', (...params) => {
				parentPort.postMessage({ method: 'log:ruleset', data: params });
			});

			engine.on('schemas', (...params) => {
				parentPort.postMessage({ method: 'log:schemas', data: params });
			});

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

			const aria = getAccessibilityByLocation(engine, line, col, ariaVersion);

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
