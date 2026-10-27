import type { ConfigSet } from '@markuplint/file-resolver';
import type { Violation } from '@markuplint/ml-config';

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, it, expect } from 'vitest';

import { MLEngine } from './ml-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
	// TODO: Importing the plugin as an ES module
	it('config', async () => {
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

describe('Disabling the configuration search (#4409)', () => {
	const fixture = path.resolve(__dirname, '..', '..', 'test', 'no-search-config', 'index.html');

	it('reports a malformed configuration file beside the target when the search is enabled', async () => {
		const file = await MLEngine.toMLFile(fixture);
		const engine = new MLEngine(file!);
		const errors: Error[] = [];
		engine.on('config-errors', (_, errs) => {
			errors.push(...errs);
		});

		await engine.exec();

		expect(errors).toHaveLength(1);
		expect(errors[0]).toMatchObject({
			name: 'ConfigParserError',
			filePath: path.resolve(path.dirname(fixture), '.markuplintrc'),
		});
	});

	it('does not read a malformed configuration file when noSearchConfig is set', async () => {
		const file = await MLEngine.toMLFile(fixture);
		const engine = new MLEngine(file!, { noSearchConfig: true });
		const errors: Error[] = [];
		engine.on('config-errors', (_, errs) => {
			errors.push(...errs);
		});

		const logs = new Map<string, string>();
		engine.on('log', (phase, message) => {
			logs.set(phase, message);
		});
		let files: readonly string[] = [];
		engine.once('config', (_, configSet) => {
			files = [...configSet.files];
		});

		const result = await engine.exec();

		expect(errors).toStrictEqual([]);
		expect(result).not.toBeNull();
		expect(files.some(file => file.endsWith('.markuplintrc'))).toBe(false);
		expect(logs.get('targetConfig')).toBe('skipped (noSearchConfig)');
	});

	it('logs the key of the config option, not the searched configuration, in "option.config"', async () => {
		const file = await MLEngine.toMLFile('test/fixture/001.html');
		const withConfig = new MLEngine(file!, { config: { rules: { __hoge: true } } });
		const withoutConfig = new MLEngine(file!);
		const logsWith = new Map<string, string>();
		const logsWithout = new Map<string, string>();
		withConfig.on('log', (phase, message) => {
			logsWith.set(phase, message);
		});
		withoutConfig.on('log', (phase, message) => {
			logsWithout.set(phase, message);
		});

		await withConfig.exec();
		await withoutConfig.exec();

		// The key of the searched configuration is its file path.
		expect(logsWith.get('configFilePathsFromTarget')).toBe(path.resolve('test/fixture/.markuplintrc'));
		expect(logsWith.get('option.config')).not.toBe('N/A');
		expect(logsWith.get('option.config')).not.toBe(logsWith.get('configFilePathsFromTarget'));
		expect(logsWithout.get('option.config')).toBe('N/A');
	});

	it('still applies defaultConfig when noSearchConfig is set', async () => {
		const file = await MLEngine.toMLFile(fixture);
		const engine = new MLEngine(file!, {
			noSearchConfig: true,
			defaultConfig: { rules: { __hoge: true } },
		});
		const errors: Error[] = [];
		engine.on('config-errors', (_, errs) => {
			errors.push(...errs);
		});
		const configSets: ConfigSet[] = [];
		engine.once('config', (_, configSet) => {
			configSets.push(configSet);
		});

		await engine.exec();

		expect(errors).toStrictEqual([]);
		expect(configSets[0]?.config.rules?.__hoge).toBe(true);
	});
});

describe('Re-resolving the configuration without the cache (#4415)', () => {
	const fixture = path.resolve(__dirname, '..', '..', 'test', 'no-search-config', 'index.html');

	it('does not lose the recommended preset when no configuration file applies', async () => {
		const file = await MLEngine.toMLFile(fixture);
		const engine = new MLEngine(file!, { noSearchConfig: true });

		const configSet = await engine.resolveConfig(false);

		expect(configSet.errs).toStrictEqual([]);
		expect(configSet.files.has('markuplint:recommended')).toBe(true);
		expect(configSet.config.rules?.['required-h1']).toBe(true);
	});

	it('does not lose the config option', async () => {
		const file = await MLEngine.toMLFile(fixture);
		const engine = new MLEngine(file!, { noSearchConfig: true, config: { rules: { __hoge: true } } });

		const configSet = await engine.resolveConfig(false);

		expect(configSet.errs).toStrictEqual([]);
		expect(configSet.config.rules?.__hoge).toBe(true);
	});

	it('does not lose defaultConfig', async () => {
		const file = await MLEngine.toMLFile(fixture);
		const engine = new MLEngine(file!, { noSearchConfig: true, defaultConfig: { rules: { __hoge: true } } });

		const configSet = await engine.resolveConfig(false);

		expect(configSet.errs).toStrictEqual([]);
		expect(configSet.config.rules?.__hoge).toBe(true);
	});

	it('works again on a second call', async () => {
		const file = await MLEngine.toMLFile(fixture);
		const engine = new MLEngine(file!, { noSearchConfig: true, config: { rules: { __hoge: true } } });

		const first = await engine.resolveConfig(false);
		const second = await engine.resolveConfig(false);

		expect(second.errs).toStrictEqual([]);
		expect(second.config.rules?.__hoge).toBe(true);
		expect(second.config).toStrictEqual(first.config);
	});

	it('does not add the recommended preset after the configFile', async () => {
		const noH1 = path.resolve(path.dirname(fixture), 'no-h1.html');
		const configFile = path.resolve(path.dirname(fixture), 'config.json');
		const file = await MLEngine.toMLFile(noH1);
		const engine = new MLEngine(file!, { noSearchConfig: true, configFile });

		const configSet = await engine.resolveConfig(false);
		const result = await engine.exec();

		// `config.json` turns `required-h1` off; the preset merged after it would turn it on again.
		expect([...configSet.files]).toStrictEqual([configFile]);
		expect(configSet.files.has('markuplint:recommended')).toBe(false);
		expect(configSet.config.rules?.['required-h1']).toBe(false);
		expect(result?.violations.some(v => v.ruleId === 'required-h1')).toBe(false);
	});

	it('does not add the recommended preset after the configFile when the search finds nothing', async () => {
		const configFile = path.resolve(path.dirname(fixture), 'config.json');
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'markuplint-4415-'));
		try {
			const target = path.join(dir, 'no-h1.html');
			await fs.copyFile(path.resolve(path.dirname(fixture), 'no-h1.html'), target);
			const file = await MLEngine.toMLFile(target);
			const engine = new MLEngine(file!, { configFile });

			const configSet = await engine.resolveConfig(false);

			expect([...configSet.files]).toStrictEqual([configFile]);
			expect(configSet.config.rules?.['required-h1']).toBe(false);
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});

	it('resolves overlapping calls on one engine', async () => {
		const file = await MLEngine.toMLFile(fixture);
		const engine = new MLEngine(file!, { noSearchConfig: true, config: { rules: { __hoge: true } } });

		const [first, second, third] = await Promise.all([
			engine.resolveConfig(false),
			engine.resolveConfig(false),
			engine.resolveConfig(true),
		]);

		for (const configSet of [first, second, third]) {
			expect(configSet.errs).toStrictEqual([]);
			expect(configSet.config.rules?.__hoge).toBe(true);
		}
	});

	it('resolves overlapping calls on one engine that searches for the configuration', async () => {
		const file = await MLEngine.toMLFile('test/fixture/001.html');
		const engine = new MLEngine(file!, { config: { rules: { __hoge: true } } });

		const configSets = await Promise.all([
			engine.resolveConfig(false),
			engine.resolveConfig(false),
			engine.resolveConfig(false),
		]);

		for (const configSet of configSets) {
			expect(configSet.errs).toStrictEqual([]);
			expect(configSet.config.rules?.__hoge).toBe(true);
			expect([...configSet.files]).toContain(path.resolve('test/fixture/.markuplintrc'));
		}
	});

	it('keeps the configuration found by the search', async () => {
		const file = await MLEngine.toMLFile('test/fixture/001.html');
		const engine = new MLEngine(file!);

		const configSet = await engine.resolveConfig(false);

		expect(configSet.errs).toStrictEqual([]);
		expect([...configSet.files].at(-1)).toBe(path.resolve('test/fixture/.markuplintrc'));
	});
});
