import type { ConfigSet } from '@markuplint/file-resolver';
import type { Violation } from '@markuplint/ml-config';

import fs from 'node:fs/promises';
import path from 'node:path';

import { describe, it, expect } from 'vitest';

import { MLEngine } from './ml-engine.js';

describe('Event notification', () => {
	it('config', async () => {
		const file = await MLEngine.toMLFile('test/fixture/001.html');
		const engine = new MLEngine(file!);
		const configPromise = new Promise(resolve => {
			engine.on('config', (_, configSet) => {
				resolve([...configSet.files]);
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
			'markuplint:compat',
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
				resolve([...configSet.files]);
			});
		});
		// First evaluation
		const result1st = await engine.exec();
		// Get config file
		const files = await configPromise;
		engine.removeAllListeners();
		const targetFile = files.at(-1)!;
		const targetFileOriginData = await fs.readFile(targetFile, { encoding: 'utf8' });
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
		await fs.writeFile(targetFile, JSON.stringify(config2), { encoding: 'utf8' });
		// Second evaluation
		const result2nd = await result2ndPromise;
		// Revert the file
		await fs.writeFile(targetFile, targetFileOriginData, { encoding: 'utf8' });
		await engine.close();
		expect(result1st?.violations.length).toBe(6);
		expect(result2nd.length).toBe(5);
		return;
	});
});

describe('Resolving the plugin', () => {
	// TODO: Importing the plugin as an ES module.
	// Node 22+ has stable ESM support via `import()`, but plugin loading
	// currently uses CommonJS `require()`. Migration requires changes to the plugin loader.
	it('config', async () => {
		const file = await MLEngine.toMLFile('test/fixture/001.html');
		const engine = new MLEngine(file!, {
			// debug: true,
			config: {
				plugins: [
					{
						name: path.resolve(import.meta.dirname, '..', '..', 'test', 'plugin001.js'),
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
		expect(result?.violations).toStrictEqual([
			{
				ruleId: 'foo/bar',
				severity: 'error',
				line: 0,
				col: 0,
				message: "It's test: IT IS SUCCESS",
				raw: '<!-- code -->',
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
		expect(configSet?.config.rules?.['a11y/wai-aria/non-existent-role']).toStrictEqual({
			specConformance: 'normative',
			rules: { 'wai-aria-non-existent-role': true },
		});
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
		expect(configSet?.config.rules?.['a11y/wai-aria/non-existent-role']).toStrictEqual({
			specConformance: 'normative',
			rules: { 'wai-aria-non-existent-role': true },
		});
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
				name: 'html-standard/permitted-contents',
				raw: '<authoredcomponent>',
				specConformance: 'normative',
			},
		]);
	});
});

describe('#1862 configFile skips default config search', () => {
	it('configFile only — default config file is not loaded', async () => {
		const filePath = path.resolve(import.meta.dirname, '../../test/issue1862/index.html');
		const configFilePath = path.resolve(import.meta.dirname, '../../test/issue1862/config.json');
		const file = await MLEngine.toMLFile(filePath);
		const engine = new MLEngine(file!, {
			configFile: configFilePath,
		});

		let configSet: ConfigSet | null = null;
		engine.once('config', (_, _configSet) => {
			configSet = _configSet;
		});
		await engine.exec();

		// configFile rule should be applied
		// @ts-ignore
		expect(configSet?.config.rules?.['__test-rule']).toBe(true);
		// Default .markuplintrc should NOT be loaded
		// @ts-ignore
		expect(configSet?.config.rules?.['wai-aria']).toBe(undefined);
	});

	it('configFile + noSearchConfig — consistent behavior', async () => {
		const filePath = path.resolve(import.meta.dirname, '../../test/issue1862/index.html');
		const configFilePath = path.resolve(import.meta.dirname, '../../test/issue1862/config.json');
		const file = await MLEngine.toMLFile(filePath);
		const engine = new MLEngine(file!, {
			configFile: configFilePath,
			noSearchConfig: true,
		});

		let configSet: ConfigSet | null = null;
		engine.once('config', (_, _configSet) => {
			configSet = _configSet;
		});
		await engine.exec();

		// configFile rule should be applied
		// @ts-ignore
		expect(configSet?.config.rules?.['__test-rule']).toBe(true);
		// Default .markuplintrc should NOT be loaded
		// @ts-ignore
		expect(configSet?.config.rules?.['wai-aria']).toBe(undefined);
	});
});

describe('#3900 config-error does not accumulate across setCode', () => {
	it('reports the same config-error count on every re-evaluation of one engine', async () => {
		const file = await MLEngine.toMLFile({ sourceCode: '<div id="a"></div>', name: 'a.html' });
		// `a11y/*: true` is an invalid namespace-wildcard usage → one mapping error.
		const engine = new MLEngine(file!, {
			noSearchConfig: true,
			config: {
				extends: ['markuplint:a11y'],
				nodeRules: [{ selector: 'div', rules: { 'a11y/*': true } }],
			},
		});

		const countWildcardErrors = (violations?: ReadonlyArray<Violation>) =>
			(violations ?? []).filter(v => v.ruleId === 'config-error' && v.message.includes('a11y/*')).length;

		// Each code has exactly one matching <div>, so the wildcard config-error
		// is reported once per evaluation. Before #3900 it was appended to the
		// instance-lifetime error list on every setCode, growing 1 → 2 → 3.
		const first = await engine.exec();
		expect(countWildcardErrors(first?.violations)).toBe(1);

		await engine.setCode('<div id="b"></div>');
		const second = await engine.exec();
		expect(countWildcardErrors(second?.violations)).toBe(1);

		await engine.setCode('<div id="c"></div>');
		const third = await engine.exec();
		expect(countWildcardErrors(third?.violations)).toBe(1);
	});

	it('keeps the count stable across fixing runs of one engine', async () => {
		// Fix mode runs the multi-pass loop, which re-creates the document
		// several times per evaluation. This guards that that path does not
		// reintroduce the accumulation: the config-error count must stay at 1
		// across repeated fix-enabled evaluations of the same engine.
		const file = await MLEngine.toMLFile({ sourceCode: "<div id='a'></div>", name: 'a.html' });
		const engine = new MLEngine(file!, {
			fix: true,
			noSearchConfig: true,
			config: {
				extends: ['markuplint:a11y'],
				// attr-value-quotes gives the fixer something to apply each run.
				rules: { 'attr-value-quotes': true },
				nodeRules: [{ selector: 'div', rules: { 'a11y/*': true } }],
			},
		});

		const countWildcardErrors = (violations?: ReadonlyArray<Violation>) =>
			(violations ?? []).filter(v => v.ruleId === 'config-error' && v.message.includes('a11y/*')).length;

		const first = await engine.exec();
		expect(countWildcardErrors(first?.violations)).toBe(1);

		await engine.setCode("<div id='b'></div>");
		const second = await engine.exec();
		expect(countWildcardErrors(second?.violations)).toBe(1);
	});
});

describe('Parse Error Severity', () => {
	it('from config', async () => {
		const file = await MLEngine.toMLFile({
			sourceCode: '#.(lang"en"\tspan=',
			name: 'test.pug',
		});

		const options = {
			config: {
				parser: {
					'.*': '@markuplint/pug-parser',
				},
			},
		};

		const defaults = await new MLEngine(file!, options).exec();
		expect(defaults?.violations?.[0]?.severity).toBe('error');

		const error = await new MLEngine(file!, {
			config: { ...options.config, severity: { parseError: 'error' } },
		}).exec();
		expect(error?.violations?.[0]?.severity).toBe('error');

		const warning = await new MLEngine(file!, {
			config: { ...options.config, severity: { parseError: 'warning' } },
		}).exec();
		expect(warning?.violations?.[0]?.severity).toBe('warning');

		const off = await new MLEngine(file!, {
			config: { ...options.config, severity: { parseError: 'off' } },
		}).exec();
		expect(off?.violations?.[0]?.severity).toBeUndefined();

		const boolTrue = await new MLEngine(file!, {
			config: { ...options.config, severity: { parseError: true } },
		}).exec();
		expect(boolTrue?.violations?.[0]?.severity).toBe('error');

		const boolFalse = await new MLEngine(file!, {
			config: { ...options.config, severity: { parseError: false } },
		}).exec();
		expect(boolFalse?.violations?.[0]?.severity).toBeUndefined();
	});

	it('from API option', async () => {
		const file = await MLEngine.toMLFile({
			sourceCode: '#.(lang"en"\tspan=',
			name: 'test.pug',
		});

		const options = {
			config: {
				parser: {
					'.*': '@markuplint/pug-parser',
				},
			},
		};

		const defaults = await new MLEngine(file!, options).exec();
		expect(defaults?.violations?.[0]?.severity).toBe('error');

		const error = await new MLEngine(file!, { config: options.config, severity: { parseError: 'error' } }).exec();
		expect(error?.violations?.[0]?.severity).toBe('error');

		const warning = await new MLEngine(file!, {
			config: options.config,
			severity: { parseError: 'warning' },
		}).exec();
		expect(warning?.violations?.[0]?.severity).toBe('warning');

		const off = await new MLEngine(file!, { config: options.config, severity: { parseError: 'off' } }).exec();
		expect(off?.violations?.[0]?.severity).toBeUndefined();

		const boolTrue = await new MLEngine(file!, { config: options.config, severity: { parseError: true } }).exec();
		expect(boolTrue?.violations?.[0]?.severity).toBe('error');

		const boolFalse = await new MLEngine(file!, { config: options.config, severity: { parseError: false } }).exec();
		expect(boolFalse?.violations?.[0]?.severity).toBeUndefined();
	});
});
