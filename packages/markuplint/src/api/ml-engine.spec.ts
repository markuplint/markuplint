import type { ConfigSet } from '@markuplint/file-resolver';
import type { Violation } from '@markuplint/ml-config';

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, it, expect } from 'vitest';

import MLEngine from './ml-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Event notification', () => {
	it('config', async () => {
		const file = await MLEngine.toMLFile('test/fixture/001.html');
		const engine = new MLEngine(file!);
		const configPromise = new Promise(resolve => {
			engine.on('config', (_, configSet) => {
				resolve(Array.from(configSet.files));
			});
		});
		await engine.exec();
		const files = await configPromise;
		expect(files).toStrictEqual([
			'markuplint:code-styles',
			'markuplint:html-standard',
			'markuplint:a11y',
			'markuplint:performance',
			'markuplint:security',
			'markuplint:rdfa',
			'markuplint:recommended',
			path.resolve('test/fixture/.markuplintrc'),
		]);
	});
});

describe('Watcher', () => {
	it('updates config', async () => {
		const file = await MLEngine.toMLFile('test/fixture/002.html');
		const engine = new MLEngine(file!, {
			watch: true,
		});
		const configPromise = new Promise<string[]>(resolve => {
			engine.on('config', (_, configSet) => {
				resolve(Array.from(configSet.files));
			});
		});
		// First evaluation
		const result1st = await engine.exec();
		// Get config file
		const files = await configPromise;
		engine.removeAllListeners();
		const targetFile = files[files.length - 1]!;
		const targetFileOriginData = await fs.readFile(targetFile, { encoding: 'utf-8' });
		const config = JSON.parse(targetFileOriginData);
		const result2ndPromise = new Promise<ReadonlyArray<Violation>>(resolve => {
			engine.on('lint', (_, __, violations) => {
				resolve(violations);
			});
		});
		// Disable rules
		const config2 = {
			...config,
			rules: {},
		};
		await fs.writeFile(targetFile, JSON.stringify(config2), { encoding: 'utf-8' });
		// Second evaluation
		const result2nd = await result2ndPromise;
		// Revert the file
		await fs.writeFile(targetFile, targetFileOriginData, { encoding: 'utf-8' });
		await engine.close();
		expect(result1st?.violations.length).toBe(6);
		expect(result2nd.length).toBe(5);
		return Promise.resolve();
	});
});

describe('Resolving the plugin', () => {
	// TODO: Importing the plugin as an ES module
	it.skip('config', async () => {
		const file = await MLEngine.toMLFile('test/fixture/001.html');
		const engine = new MLEngine(file!, {
			// debug: true,
			config: {
				plugins: [
					{
						name: path.resolve(__dirname, '..', '..', 'test', 'plugin001.js'),
						settings: {
							foo: 'IT IS SUCCESS',
						},
					},
				],
				rules: {
					'foo/bar': true,
				},
			},
		});
		const result = await engine.exec();
		if (!result) {
			throw new Error('Test failed');
		}
		expect(result.violations).toStrictEqual([
			{
				ruleId: 'foo/bar',
				severity: 'error',
				line: 0,
				col: 0,
				message: "It's test: IT IS SUCCESS",
				raw: '',
			},
		]);
	});
});

describe('Config Priority', () => {
	it('config', async () => {
		const file = await MLEngine.toMLFile('test/fixture/001.html');
		const engine = new MLEngine(file!, {
			config: {
				rules: {
					__hoge: true,
				},
			},
		});

		let configSet: ConfigSet | null = null;
		engine.once('config', (_, _configSet) => {
			configSet = _configSet;
		});
		await engine.exec();

		// @ts-ignore
		expect(configSet?.config.rules?.__hoge).toBe(true);
		// @ts-ignore
		expect(configSet?.config.rules?.['wai-aria']).toBe(true);
	});

	it('defaultConfig', async () => {
		const file = await MLEngine.toMLFile('test/fixture/001.html');
		const engine = new MLEngine(file!, {
			defaultConfig: {
				rules: {
					__hoge: true,
				},
			},
		});

		let configSet: ConfigSet | null = null;
		engine.once('config', (_, _configSet) => {
			configSet = _configSet;
		});
		await engine.exec();

		// @ts-ignore
		expect(configSet?.config.rules?.__hoge).toBe(undefined);
		// @ts-ignore
		expect(configSet?.config.rules?.['wai-aria']).toBe(true);
	});

	it('defaultConfig + noSearchConfig', async () => {
		const file = await MLEngine.toMLFile('test/fixture/001.html');
		const engine = new MLEngine(file!, {
			defaultConfig: {
				rules: {
					__hoge: true,
				},
			},
			noSearchConfig: true,
		});

		let configSet: ConfigSet | null = null;
		engine.once('config', (_, _configSet) => {
			configSet = _configSet;
		});
		await engine.exec();

		// @ts-ignore
		expect(configSet?.config.rules?.__hoge).toBe(true);
		// @ts-ignore
		expect(configSet?.config.rules?.['wai-aria']).toBe(undefined);
	});
});

describe('Config Priority', () => {
	it('config', async () => {
		const file = await MLEngine.toMLFile('test/fixture/jsx/003.jsx');
		const engine = new MLEngine(file!, {
			locale: 'en',
			config: {
				parserOptions: {
					authoredElementName: ['authoredcomponent2', /^[A-Z]|\./],
				},
			},
		});

		const res = await engine.exec();

		expect(res?.violations).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 5,
				col: 5,
				message: 'The "authoredcomponent" element is not allowed in the "div" element in this context',
				raw: '<authoredcomponent>',
			},
		]);
	});
});
