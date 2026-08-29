import type { ConfigSet } from '@markuplint/file-resolver';
import type { Violation } from '@markuplint/ml-config';

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { ConfigProvider } from '@markuplint/file-resolver';
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

	it('re-resolving config also invalidates pretenders resolution caches (issue #3951 follow-up)', async () => {
		// Without invalidating @markuplint/pretenders' own module-level caches on
		// every cache-busting re-resolve, a renamed export a wrapper component
		// depends on would keep resolving as it did before the rename for the
		// rest of the process's lifetime — this exercises that wiring end to end.
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ml-engine-pretenders-cache-'));
		try {
			const targetFile = path.join(tmpDir, 'target.tsx');
			const importerFile = path.join(tmpDir, 'importer.tsx');
			const pageFile = path.join(tmpDir, 'page.tsx');
			const configFile = path.join(tmpDir, '.markuplintrc');

			await fs.writeFile(targetFile, 'export default function Item() { return <button>x</button>; }');
			await fs.writeFile(
				importerFile,
				"import Item from './target';\nexport const Wrapper = () => <Item>x</Item>;",
			);
			await fs.writeFile(
				pageFile,
				"import { Wrapper } from './importer';\nexport const Page = () => <ul><Wrapper>content</Wrapper></ul>;",
			);
			const config = {
				parser: { '\\.tsx$': '@markuplint/jsx-parser' },
				pretenders: { scan: [{ files: ['target.tsx', 'importer.tsx'] }] },
				rules: { 'permitted-contents': true },
			};
			await fs.writeFile(configFile, JSON.stringify(config));

			const file = await MLEngine.toMLFile(pageFile);
			const engine = new MLEngine(file!, { watch: true });

			// `Wrapper` resolves through `Item` to <button>, which isn't allowed
			// directly inside <ul> — this must report a permitted-contents violation
			// naming "button" as the disallowed element.
			const result1st = await engine.exec();
			expect(
				result1st?.violations.some(v => v.ruleId === 'permitted-contents' && v.message.includes('button')),
			).toBe(true);

			// Rename the default export the wrapper depends on (element unchanged).
			await fs.writeFile(targetFile, 'export default function Widget() { return <button>x</button>; }');

			const lintPromise = new Promise<readonly Violation[]>(resolve => {
				engine.on('lint', (_, __, violations) => resolve(violations));
			});
			// Touch the config file (no semantic change) to trigger the watcher's
			// cache-busting re-resolve, which must also invalidate the pretenders caches.
			await fs.writeFile(configFile, JSON.stringify(config));
			const violations2nd = await lintPromise;

			await engine.close();

			// If the pretenders caches were NOT invalidated, `Wrapper` would still
			// resolve `Item`'s stale export-table entry, fail to find the renamed
			// declaration, and stay unresolved — reported as a disallowed "Item"
			// element instead of "button". Asserting on the element name (not just
			// the rule ID) is what actually distinguishes the fixed behavior from
			// the regression.
			expect(violations2nd.some(v => v.ruleId === 'permitted-contents' && v.message.includes('button'))).toBe(
				true,
			);
			expect(violations2nd.some(v => v.message.includes('Item'))).toBe(false);
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true });
		}
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
			rules: { 'no-unknown-role': true },
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
			rules: { 'no-unknown-role': true },
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

describe('configProvider option (#3997)', () => {
	it('shares config resolution across engines given the same configProvider', async () => {
		const configProvider = new ConfigProvider();
		const config = { rules: { 'no-duplicate-id': true } };

		const fileA = await MLEngine.toMLFile({ sourceCode: '<p>a</p>', name: 'a.html' });
		const fileB = await MLEngine.toMLFile({ sourceCode: '<p>b</p>', name: 'b.html' });

		const configSetA = await new MLEngine(fileA!, { config, configProvider }).resolveConfig(true);
		const configSetB = await new MLEngine(fileB!, { config, configProvider }).resolveConfig(true);

		// Same inline `config` object, same shared provider — the base config
		// resolution (files/plugins) must be reused, not redone per engine.
		expect(configSetB.files).toBe(configSetA.files);
		expect(configSetB.plugins).toBe(configSetA.plugins);
	});

	it('does not share config resolution across engines without an explicit configProvider', async () => {
		const config = { rules: { 'no-duplicate-id': true } };

		const fileA = await MLEngine.toMLFile({ sourceCode: '<p>a</p>', name: 'a.html' });
		const fileB = await MLEngine.toMLFile({ sourceCode: '<p>b</p>', name: 'b.html' });

		const configSetA = await new MLEngine(fileA!, { config }).resolveConfig(true);
		const configSetB = await new MLEngine(fileB!, { config }).resolveConfig(true);

		// No shared provider (today's default): each engine resolves its own
		// config independently, so the underlying objects are NOT the same
		// reference, even though their content is equal.
		expect(configSetB.files).not.toBe(configSetA.files);
		expect(configSetB.config).toStrictEqual(configSetA.config);
	});
});
