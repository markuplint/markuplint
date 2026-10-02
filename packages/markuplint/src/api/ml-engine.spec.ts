import type { ConfigSet } from '@markuplint/file-resolver';
import type { Config, Violation } from '@markuplint/ml-config';

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { ConfigProvider } from '@markuplint/file-resolver';
import { afterEach, beforeEach, describe, it, expect } from 'vitest';

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

describe('#4064 setCode re-resolves the pretenders that depend on the source', () => {
	// Each page renders a component directly inside <ul>, so permitted-contents
	// names the element the component resolves to — or the component itself
	// when it is unresolved. That name is what tells the states apart.
	const disallowedIn = (violations: readonly Violation[] | undefined, name: string) =>
		(violations ?? []).some(v => v.ruleId === 'permitted-contents' && v.message.includes(name));

	// Built the way the VS Code extension builds its engines: the file is a
	// code-based MLFile named relative to the workspace (a file-based one is
	// read-only and rejects setCode), and `exec()` is run before any setCode.
	const createEngine = async (tmpDir: string, sourceCode: string, pretenders: Config['pretenders']) => {
		const file = (await MLEngine.toMLFile({ sourceCode, name: 'page.tsx', workspace: tmpDir }))!;
		const engine = new MLEngine(file, {
			noSearchConfig: true,
			locale: 'en',
			config: {
				parser: { '\\.tsx$': '@markuplint/jsx-parser' },
				pretenders,
				rules: { 'permitted-contents': true },
			},
		});
		return { engine, file };
	};

	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ml-engine-setcode-pretenders-'));
	});

	afterEach(async () => {
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	it('follows an import added, then removed, by setCode when pretenders.auto is on', async () => {
		await fs.writeFile(path.join(tmpDir, 'Child.tsx'), 'export const Child = () => <button>x</button>;');
		const withoutImport = 'export const Page = () => <ul><Child>x</Child></ul>;';
		const withImport = `import { Child } from './Child';\n${withoutImport}`;

		const { engine } = await createEngine(tmpDir, withoutImport, { auto: true });

		const unresolved = await engine.exec();
		expect(disallowedIn(unresolved?.violations, 'Child')).toBe(true);
		expect(disallowedIn(unresolved?.violations, 'button')).toBe(false);

		await engine.setCode(withImport);
		const resolved = await engine.exec();
		expect(disallowedIn(resolved?.violations, 'button')).toBe(true);
		expect(disallowedIn(resolved?.violations, 'Child')).toBe(false);

		await engine.setCode(withoutImport);
		const unresolvedAgain = await engine.exec();
		expect(disallowedIn(unresolvedAgain?.violations, 'Child')).toBe(true);
		expect(disallowedIn(unresolvedAgain?.violations, 'button')).toBe(false);
	});

	it('re-disambiguates same-selector scan results against the imports of the new source', async () => {
		const aPath = path.join(tmpDir, 'a', 'Item.tsx');
		const bPath = path.join(tmpDir, 'b', 'Item.tsx');
		await fs.mkdir(path.dirname(aPath));
		await fs.mkdir(path.dirname(bPath));
		await fs.writeFile(aPath, 'export const Item = () => <button>x</button>;');
		await fs.writeFile(bPath, 'export const Item = () => <span>x</span>;');
		const importA = "import { Item } from './a/Item';\nexport const Page = () => <ul><Item>x</Item></ul>;";
		const importB = "import { Item } from './b/Item';\nexport const Page = () => <ul><Item>x</Item></ul>;";

		const { engine } = await createEngine(tmpDir, importA, { scan: [{ files: [aPath, bPath] }] });

		const fromA = await engine.exec();
		expect(disallowedIn(fromA?.violations, 'button')).toBe(true);
		expect(disallowedIn(fromA?.violations, 'span')).toBe(false);

		await engine.setCode(importB);
		const fromB = await engine.exec();
		expect(disallowedIn(fromB?.violations, 'span')).toBe(true);
		expect(disallowedIn(fromB?.violations, 'button')).toBe(false);
	});

	it('does not re-read the scanned files on setCode: what scan yields changes only with the config', async () => {
		const itemPath = path.join(tmpDir, 'Item.tsx');
		await fs.writeFile(itemPath, 'export const Item = () => <button>x</button>;');

		const { engine } = await createEngine(
			tmpDir,
			"import { Item } from './Item';\nexport const Page = () => <ul><Item>x</Item></ul>;",
			{ scan: [{ files: [itemPath] }] },
		);

		const first = await engine.exec();
		expect(disallowedIn(first?.violations, 'button')).toBe(true);

		// The scanned component changes on disk; the page is edited elsewhere.
		await fs.writeFile(itemPath, 'export const Item = () => <span>x</span>;');
		await engine.setCode("import { Item } from './Item';\nexport const Page = () => <ul><Item>y</Item></ul>;");
		const second = await engine.exec();
		expect(disallowedIn(second?.violations, 'button')).toBe(true);
		expect(disallowedIn(second?.violations, 'span')).toBe(false);
	});

	// `A` sits behind a chain of components, each in its own file, so that its
	// auto-resolution takes many more sequential file reads than `B`'s single
	// one: a setCode(useA) started first still finishes after a setCode(useB)
	// started right after it. That is the order the sequence guard exists for;
	// without it, the slower first call would overwrite the second one's result.
	const writeSlowAndFastComponents = async (dir: string) => {
		await fs.writeFile(path.join(dir, 'A.tsx'), "import { A1 } from './A1';\nexport const A = () => <A1>x</A1>;");
		for (let i = 1; i <= 5; i++) {
			await fs.writeFile(
				path.join(dir, `A${i}.tsx`),
				`import { A${i + 1} } from './A${i + 1}';\nexport const A${i} = () => <A${i + 1}>x</A${i + 1}>;`,
			);
		}
		await fs.writeFile(path.join(dir, 'A6.tsx'), 'export const A6 = () => <button>x</button>;');
		await fs.writeFile(path.join(dir, 'B.tsx'), 'export const B = () => <span>x</span>;');
	};
	const useA = "import { A } from './A';\nexport const Page = () => <ul><A>x</A></ul>;";
	const useB = "import { B } from './B';\nexport const Page = () => <ul><B>x</B></ul>;";

	it('applies only the latest of overlapping setCode calls, even when an earlier one finishes later', async () => {
		await writeSlowAndFastComponents(tmpDir);

		const { engine, file } = await createEngine(tmpDir, 'export const Page = () => <ul></ul>;', { auto: true });
		await engine.exec();

		const earlier = engine.setCode(useA);
		// Start the second call only once the first one has claimed the file —
		// i.e. while it is resolving its pretenders, not before it got going.
		// Started back to back, the first call would notice the second one as
		// soon as it got going and step aside without resolving anything,
		// which is the other, cheaper, way of being superseded.
		while ((await file.getCode()) !== useA) {
			await Promise.resolve();
		}
		const latest = engine.setCode(useB);

		await Promise.all([earlier, latest]);
		const result = await engine.exec();
		expect(result?.sourceCode).toBe(useB);
		expect(disallowedIn(result?.violations, 'span')).toBe(true);
		expect(disallowedIn(result?.violations, 'button')).toBe(false);
	});

	it('resolves a superseded setCode call only once the latest one has taken effect', async () => {
		await writeSlowAndFastComponents(tmpDir);

		const { engine } = await createEngine(tmpDir, 'export const Page = () => <ul></ul>;', { auto: true });
		await engine.exec();

		// The VS Code extension runs exec() right after awaiting its own setCode
		// call. If that call was superseded, the exec must still see the latest
		// code applied to the document — not the file at B with the document
		// still at the state before A.
		const superseded = engine.setCode(useA);
		const latest = engine.setCode(useB);
		await superseded;
		const result = await engine.exec();
		await latest;

		expect(result?.sourceCode).toBe(useB);
		expect(disallowedIn(result?.violations, 'span')).toBe(true);
		expect(disallowedIn(result?.violations, 'button')).toBe(false);
	});

	it('rejects a superseded setCode call with the failure of the latest one', async () => {
		// A file-based MLFile is read-only, so the latest call fails at the
		// file. The superseded call never touched the file itself (it stepped
		// aside as soon as it saw the newer call), yet it must not resolve: its
		// caller would take that as "the latest code is in place" and lint.
		const pagePath = path.join(tmpDir, 'page.tsx');
		await fs.writeFile(pagePath, 'export const Page = () => <ul></ul>;');
		const file = await MLEngine.toMLFile(pagePath);
		const engine = new MLEngine(file!, {
			noSearchConfig: true,
			locale: 'en',
			config: { parser: { '\\.tsx$': '@markuplint/jsx-parser' }, rules: { 'permitted-contents': true } },
		});
		await engine.exec();

		const superseded = engine.setCode(useA);
		const latest = engine.setCode(useB);

		await expect(latest).rejects.toThrow('This file object is readonly');
		await expect(superseded).rejects.toThrow('This file object is readonly');
	});

	it('resolves the pretenders for the new code when setCode runs before the first exec', async () => {
		await fs.writeFile(path.join(tmpDir, 'Child.tsx'), 'export const Child = () => <button>x</button>;');
		const withoutImport = 'export const Page = () => <ul><Child>x</Child></ul>;';
		const withImport = `import { Child } from './Child';\n${withoutImport}`;

		const { engine } = await createEngine(tmpDir, withoutImport, { auto: true });

		await engine.setCode(withImport);
		const result = await engine.exec();
		expect(disallowedIn(result?.violations, 'button')).toBe(true);
		expect(disallowedIn(result?.violations, 'Child')).toBe(false);
	});

	it('picks up a change on disk to a scanned file through the watcher (#4065), without a config change', async () => {
		const itemPath = path.join(tmpDir, 'Item.tsx');
		const configPath = path.join(tmpDir, '.markuplintrc');
		await fs.writeFile(itemPath, 'export const Item = () => <button>x</button>;');
		const config = {
			parser: { '\\.tsx$': '@markuplint/jsx-parser' },
			pretenders: { scan: [{ files: ['Item.tsx'] }] },
			rules: { 'permitted-contents': true },
		};
		await fs.writeFile(configPath, JSON.stringify(config));
		const code = "import { Item } from './Item';\nexport const Page = () => <ul><Item>x</Item></ul>;";

		const file = await MLEngine.toMLFile({ sourceCode: code, name: 'page.tsx', workspace: tmpDir });
		const engine = new MLEngine(file!, { watch: true, locale: 'en' });
		try {
			const first = await engine.exec();
			expect(disallowedIn(first?.violations, 'button')).toBe(true);

			const relint = new Promise<readonly Violation[]>(resolve => {
				engine.once('lint', (_, __, violations) => resolve(violations));
			});
			await fs.writeFile(itemPath, 'export const Item = () => <span>x</span>;');
			const afterEdit = await relint;

			expect(disallowedIn(afterEdit, 'span')).toBe(true);
			expect(disallowedIn(afterEdit, 'button')).toBe(false);
		} finally {
			await engine.close();
		}
	});
});

describe('#4065 watch mode follows the files that pretenders read', () => {
	const disallowedIn = (violations: readonly Violation[] | undefined, name: string) =>
		(violations ?? []).some(v => v.ruleId === 'permitted-contents' && v.message.includes(name));

	// A real path: the engine watches the paths TypeScript reports, which are real paths.
	let tmpDir: string;
	let engines: MLEngine[];

	// Built the way the VS Code extension builds its engines (see #4064's describe),
	// but watching, and with no config file: the files it watches are the pretenders'.
	const createEngine = async (name: string, sourceCode: string, pretenders: Config['pretenders']) => {
		const file = (await MLEngine.toMLFile({ sourceCode, name, workspace: tmpDir }))!;
		const engine = new MLEngine(file, {
			watch: true,
			noSearchConfig: true,
			locale: 'en',
			config: {
				parser: { '\\.tsx$': '@markuplint/jsx-parser' },
				pretenders,
				rules: { 'permitted-contents': true },
			},
		});
		engines.push(engine);
		return engine;
	};

	const nextLint = (engine: MLEngine) =>
		new Promise<readonly Violation[]>(resolve => {
			engine.once('lint', (_, __, violations) => resolve(violations));
		});

	const write = (name: string, content: string) => fs.writeFile(path.join(tmpDir, name), content);

	const component = (name: string, element: string) => `export const ${name} = () => <${element}>x</${element}>;`;

	// What an editor that saves through a temporary file does.
	const saveAtomically = async (name: string, content: string) => {
		const temporary = path.join(tmpDir, `${name}.${process.hrtime.bigint()}.new`);
		await fs.writeFile(temporary, content);
		await fs.rename(temporary, path.join(tmpDir, name));
	};

	// chokidar drops a `change` that follows another one of the same path within 50ms.
	const afterChangeThrottle = () => new Promise<void>(resolve => setTimeout(resolve, 75));

	beforeEach(async () => {
		tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'ml-engine-watch-pretenders-')));
		engines = [];
	});

	afterEach(async () => {
		await Promise.all(engines.map(engine => engine.close()));
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	it('re-lints when a file matched by pretenders.scan changes', async () => {
		await write('Item.tsx', 'export const Item = () => <button>x</button>;');
		const engine = await createEngine(
			'page.tsx',
			"import { Item } from './Item';\nexport const Page = () => <ul><Item>x</Item></ul>;",
			{ scan: [{ files: [path.join(tmpDir, 'Item.tsx')] }] },
		);
		expect(disallowedIn((await engine.exec())?.violations, 'button')).toBe(true);

		const relint = nextLint(engine);
		await write('Item.tsx', 'export const Item = () => <span>x</span>;');
		const violations = await relint;

		expect(disallowedIn(violations, 'span')).toBe(true);
		expect(disallowedIn(violations, 'button')).toBe(false);
	});

	it('re-lints when a file deep in the import graph that pretenders.auto walked changes', async () => {
		await write('Wrapper.tsx', "import { Leaf } from './Leaf';\nexport const Wrapper = () => <Leaf>x</Leaf>;");
		await write('Leaf.tsx', 'export const Leaf = () => <button>x</button>;');
		const engine = await createEngine(
			'page.tsx',
			"import { Wrapper } from './Wrapper';\nexport const Page = () => <ul><Wrapper>x</Wrapper></ul>;",
			{ auto: true },
		);
		expect(disallowedIn((await engine.exec())?.violations, 'button')).toBe(true);

		const relint = nextLint(engine);
		await write('Leaf.tsx', 'export const Leaf = () => <span>x</span>;');
		const violations = await relint;

		expect(disallowedIn(violations, 'span')).toBe(true);
		expect(disallowedIn(violations, 'button')).toBe(false);
	});

	it('follows an import that setCode added: the component it brought in is watched from then on', async () => {
		await write('Child.tsx', 'export const Child = () => <button>x</button>;');
		const withoutImport = 'export const Page = () => <ul><Child>x</Child></ul>;';
		const engine = await createEngine('page.tsx', withoutImport, { auto: true });
		await engine.exec();

		await engine.setCode(`import { Child } from './Child';\n${withoutImport}`);
		expect(disallowedIn((await engine.exec())?.violations, 'button')).toBe(true);

		const relint = nextLint(engine);
		await write('Child.tsx', 'export const Child = () => <span>x</span>;');
		const violations = await relint;

		expect(disallowedIn(violations, 'span')).toBe(true);
		expect(disallowedIn(violations, 'button')).toBe(false);
	});

	// chokidar re-attaches to a renamed file by inode on macOS and Linux only, and
	// Windows refuses to rename over a file that is being watched.
	it.skipIf(process.platform === 'win32')(
		'keeps telling two engines that share a component, across repeated atomic saves of it',
		async () => {
			// Two documents open on the same component: with a watcher per engine the
			// second atomic save is seen by neither (see the shared watcher's JSDoc).
			await write('Item.tsx', 'export const Item = () => <b>x</b>;');
			const pretenders = { scan: [{ files: [path.join(tmpDir, 'Item.tsx')] }] };
			const code = "import { Item } from './Item';\nexport const Page = () => <ul><Item>x</Item></ul>;";
			const first = await createEngine('first.tsx', code, pretenders);
			const second = await createEngine('second.tsx', code, pretenders);
			await first.exec();
			await second.exec();

			for (const element of ['mark', 'kbd', 'cite']) {
				const bothLinted = Promise.all([nextLint(first), nextLint(second)]);
				await saveAtomically('Item.tsx', `export const Item = () => <${element}>x</${element}>;`);
				const [firstViolations, secondViolations] = await bothLinted;

				expect(disallowedIn(firstViolations, element)).toBe(true);
				expect(disallowedIn(secondViolations, element)).toBe(true);
				await afterChangeThrottle();
			}
		},
	);

	it('does not stop watching a component when another engine that read it closes', async () => {
		await write('Item.tsx', 'export const Item = () => <b>x</b>;');
		const pretenders = { scan: [{ files: [path.join(tmpDir, 'Item.tsx')] }] };
		const code = "import { Item } from './Item';\nexport const Page = () => <ul><Item>x</Item></ul>;";
		const closing = await createEngine('closing.tsx', code, pretenders);
		const staying = await createEngine('staying.tsx', code, pretenders);
		await closing.exec();
		await staying.exec();

		await closing.close();
		const relint = nextLint(staying);
		await write('Item.tsx', 'export const Item = () => <mark>x</mark>;');

		expect(disallowedIn(await relint, 'mark')).toBe(true);
	});

	describe('several files changing at once', () => {
		const names = ['A', 'B', 'C', 'D'];
		const initial = ['button', 'span', 'section', 'article'];
		const next = ['mark', 'kbd', 'cite', 'abbr'];
		// One list each: permitted-contents reports the first element of a parent that is not allowed.
		const page = `${names.map(name => `import { ${name} } from './${name}';`).join('\n')}\nexport const Page = () => <div>${names.map(name => `<ul><${name}>x</${name}></ul>`).join('')}</div>;`;

		it('lints once more, with the latest state, and never runs two lints at the same time', async () => {
			for (const [index, name] of names.entries()) {
				await write(`${name}.tsx`, component(name, initial[index]!));
			}
			const engine = await createEngine('page.tsx', page, { auto: true });

			// A lint is under way from the moment the config is resolved until it is reported.
			let inFlight = 0;
			let maxInFlight = 0;
			let lints = 0;
			let latest: readonly Violation[] = [];
			const settled = new Promise<void>(resolve => {
				engine.on('config', () => {
					inFlight++;
					maxInFlight = Math.max(maxInFlight, inFlight);
				});
				engine.on('lint', (_, __, violations) => {
					inFlight--;
					lints++;
					latest = violations;
				});
				engine.on('log', phase => {
					if (phase === 'watch:idle' && next.every(element => disallowedIn(latest, element))) {
						resolve();
					}
				});
			});
			await engine.exec();
			lints = 0;

			await Promise.all(names.map((name, index) => write(`${name}.tsx`, component(name, next[index]!))));
			await settled;

			for (const element of initial) {
				expect(disallowedIn(latest, element)).toBe(false);
			}
			expect(maxInFlight).toBe(1);
			// Four files changed: more than two lints would mean the changes were not gathered.
			expect(lints).toBeLessThanOrEqual(2);
		});
	});

	it('ends up with the latest of both when a component changes while setCode is resolving', async () => {
		// `A` sits behind a chain, so setCode takes a while; `B` is watched (scan)
		// and changes meanwhile. The two must not overwrite each other: the result
		// has the new `A` chain and the new `B`.
		await write('A.tsx', "import { A1 } from './A1';\nexport const A = () => <A1>x</A1>;");
		await write('A1.tsx', "import { A2 } from './A2';\nexport const A1 = () => <A2>x</A2>;");
		await write('A2.tsx', 'export const A2 = () => <button>x</button>;');
		await write('B.tsx', 'export const B = () => <span>x</span>;');
		const useBoth =
			"import { A } from './A';\nimport { B } from './B';\nexport const Page = () => <div><ul><A>x</A></ul><ul><B>x</B></ul></div>;";
		const engine = await createEngine('page.tsx', 'export const Page = () => <ul></ul>;', {
			scan: [{ files: [path.join(tmpDir, 'B.tsx')] }],
			auto: true,
		});
		await engine.exec();

		let latest: readonly Violation[] = [];
		const settled = new Promise<void>(resolve => {
			engine.on('lint', (_, __, violations) => {
				latest = violations;
			});
			engine.on('log', phase => {
				if (phase === 'watch:idle' && disallowedIn(latest, 'kbd')) {
					resolve();
				}
			});
		});
		const applying = engine.setCode(useBoth);
		await write('B.tsx', component('B', 'kbd'));
		await applying;
		await engine.exec();
		await settled;

		expect(disallowedIn(latest, 'button')).toBe(true);
		expect(disallowedIn(latest, 'kbd')).toBe(true);
		expect(disallowedIn(latest, 'span')).toBe(false);
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

describe('resolveConfig(false) with inline config (#4015)', () => {
	it('does not throw for an inline `config` option', async () => {
		const file = await MLEngine.toMLFile({ sourceCode: '<p>a</p>', name: 'a.html' });
		const engine = new MLEngine(file!, { config: { rules: { 'no-duplicate-id': true } } });

		const configSet = await engine.resolveConfig(false);

		expect(configSet.config.rules).toStrictEqual({ 'no-duplicate-id': true });
	});

	it('does not throw for an inline `defaultConfig` option', async () => {
		const file = await MLEngine.toMLFile({ sourceCode: '<p>a</p>', name: 'a.html' });
		const engine = new MLEngine(file!, { defaultConfig: { rules: { 'no-duplicate-id': true } } });

		const configSet = await engine.resolveConfig(false);

		expect(configSet.config.rules).toStrictEqual({ 'no-duplicate-id': true });
	});

	it('re-resolving twice with cache: false still works (watch-mode-like repeated re-resolve)', async () => {
		const file = await MLEngine.toMLFile({ sourceCode: '<p>a</p>', name: 'a.html' });
		const engine = new MLEngine(file!, { config: { rules: { 'no-duplicate-id': true } } });

		const first = await engine.resolveConfig(false);
		const second = await engine.resolveConfig(false);

		expect(first.config.rules).toStrictEqual({ 'no-duplicate-id': true });
		expect(second.config.rules).toStrictEqual({ 'no-duplicate-id': true });
	});
});
