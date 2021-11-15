import type { Config, Violation } from '@markuplint/ml-config';

import { promises as fs } from 'fs';
import path from 'path';

import MLEngine from './ml-engine';

jest.useFakeTimers();

describe('Event notification', () => {
	it('config', async () => {
		const file = await MLEngine.toMLFile('test/fixture/001.html');
		const engine = new MLEngine(file);
		const configPromise = new Promise<string[]>(resolve => {
			engine.on('config', (_, configSet) => {
				resolve(Array.from(configSet.files));
			});
		});
		await engine.exec();
		const files = await configPromise;
		expect(files).toStrictEqual([path.resolve('test/fixture/.markuplintrc')]);
	});
});

describe('Watcher', () => {
	it('updates config', async () => {
		const file = await MLEngine.toMLFile('test/fixture/002.html');
		const engine = new MLEngine(file, {
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
		const targetFile = files[0];
		const targetFileOriginData = await fs.readFile(targetFile, { encoding: 'utf-8' });
		const config: Config = JSON.parse(targetFileOriginData);
		const result2ndPromise = new Promise<Violation[]>(resolve => {
			engine.on('lint', (_, __, violations) => {
				resolve(violations);
			});
		});
		// Disable rules
		const config2: Config = {
			...config,
			rules: {},
		};
		await fs.writeFile(targetFile, JSON.stringify(config2), { encoding: 'utf-8' });
		// Second evaluation
		const result2nd = await result2ndPromise;
		// Revert the file
		await fs.writeFile(targetFile, targetFileOriginData, { encoding: 'utf-8' });
		await engine.close();
		expect(result1st?.violations.length).toBe(7);
		expect(result2nd.length).toBe(0);
		return Promise.resolve();
	});
});

describe('Resolving the plugin', () => {
	it('config', async () => {
		const file = await MLEngine.toMLFile('test/fixture/001.html');
		const engine = new MLEngine(file, {
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
