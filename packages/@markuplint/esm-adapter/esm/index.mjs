import { parentPort } from 'node:worker_threads';

import { MLEngine as DefaultMLEngine, version as defaultVersion } from 'default-markuplint';

import { log } from './debug.mjs';
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
 * @type {string}
 */
let modulePath = resolveModule('default-markuplint');

/**
 * @type {boolean}
 */
let isLocalModule = false;

/**
 * @type {Map<number, import('markuplint').MLEngine>}
 */
const engines = new Map();

parentPort.on('message', async args => {
	/**
	 * @type {number}
	 */
	const uid = args.uid;

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
			modulePath = newModuleURL;
			isLocalModule = isLocal;

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
			log('fromCode: [ID:%s] %O', uid, args.data);

			const sourceCode = args.data[0];
			const options = args.data[1] ?? {};
			const engine = await MLEngine.fromCode(sourceCode, options);

			engine.on('code', (...params) => {
				parentPort.postMessage({
					uid,
					method: 'log:code',
					data: params,
				});
			});

			engine.on('config', (...params) => {
				parentPort.postMessage({
					uid,
					method: 'log:config',
					data: params,
				});
			});

			engine.on('config-errors', (...params) => {
				parentPort.postMessage({
					uid,
					method: 'log:config-errors',
					data: params,
				});
			});

			engine.on('exclude', (...params) => {
				parentPort.postMessage({
					uid,
					method: 'log:exclude',
					data: params,
				});
			});

			engine.on('i18n', (...params) => {
				parentPort.postMessage({
					uid,
					method: 'log:i18n',
					data: params,
				});
			});

			engine.on('lint', (...params) => {
				parentPort.postMessage({
					uid,
					method: 'log:lint',
					data: params,
				});
			});

			engine.on('lint-error', (...params) => {
				parentPort.postMessage({
					uid,
					method: 'log:lint-error',
					data: params,
				});
			});

			engine.on('log', (...params) => {
				parentPort.postMessage({
					uid,
					method: 'log:log',
					data: params,
				});
			});

			engine.on('parser', (...params) => {
				parentPort.postMessage({
					uid,
					method: 'log:parser',
					data: params,
				});
			});

			engine.on('rules', (...params) => {
				parentPort.postMessage({
					uid,
					method: 'log:rules',
					data: params,
				});
			});

			engine.on('ruleset', (...params) => {
				parentPort.postMessage({
					uid,
					method: 'log:ruleset',
					data: params,
				});
			});

			engine.on('schemas', (...params) => {
				parentPort.postMessage({
					uid,
					method: 'log:schemas',
					data: params,
				});
			});

			engines.set(uid, engine);

			parentPort.postMessage({ method: 'fromCode:return' });
			break;
		}
		case 'exec': {
			const engine = engines.get(uid);
			const result = await engine.exec();
			parentPort.postMessage({ method: 'exec:return', data: [result] });
			break;
		}
		case 'setCode': {
			const engine = engines.get(uid);
			const sourceCode = args.data[0];
			await engine.setCode(sourceCode);
			parentPort.postMessage({ method: 'setCode:return' });
			break;
		}
		case 'getAccessibilityByLocation': {
			const engine = engines.get(uid);

			if (!engine?.document) {
				await engine.exec();
			}

			if (!engine?.document) {
				parentPort.postMessage({ method: 'getAccessibilityByLocation:return', data: [null] });
				break;
			}

			const line = args.data[0];
			const col = args.data[1];
			const ariaVersion = args.data[2] ?? '1.2';

			const aria = getAccessibilityByLocation(engine.document, line, col, ariaVersion);

			parentPort.postMessage({ method: 'getAccessibilityByLocation:return', data: [aria] });
			break;
		}
		case 'getCurrentModuleInfo': {
			parentPort.postMessage({
				method: 'getCurrentModuleInfo:return',
				data: [
					{
						modulePath,
						version,
						isLocalModule,
					},
				],
			});
			break;
		}
	}
});

parentPort.on('error', err => {
	parentPort.postMessage({ method: 'error', data: ['' + err] });
});
