import type { PositionedNode } from '../suppressions/compute-scope.js';
import type { Config, Violation } from '@markuplint/ml-config';

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { MLEngine } from './ml-engine.js';

const nativeAddonIsBuilt = await import('@markuplint/core').then(
	mod => typeof mod.lintHtml === 'function' && typeof mod.nodeListHtml === 'function',
	() => false,
);

type Fixture = {
	readonly name: string;
	readonly fileName: string;
	readonly sourceCode: string;
	readonly config?: Config;
};

const fixtures: readonly Fixture[] = [
	{
		name: 'a fragment with attributes, a comment and text',
		fileName: 'a.html',
		sourceCode: '<div id="a" class="x y x"><p>t</p><!-- c --><span hidden role="note"></span></div>',
	},
	// The two HTML parsers do not put the white space between the tags of a document, nor an omitted
	// `<body>`, in the same place (the Rust one follows the specification), and the Rust engine
	// describes the document it linted. So these have none, but the elements that give them away.
	{
		name: 'a whole document with non-ASCII text',
		fileName: 'a.html',
		sourceCode:
			'<!DOCTYPE html><html lang="ja"><head><title>é日</title></head><body><p>é日</p>\n<p>b</p></body></html>',
	},
	{
		name: 'foreign elements and elements written in capitals',
		fileName: 'a.html',
		sourceCode:
			'<DIV CLASS=A>\n\t<svg viewBox="0 0 1 1"><foreignObject><X-Foo Data-X=1></X-Foo></foreignObject></svg>\n</DIV>',
	},
	{
		name: 'an element that a pretender stands for',
		fileName: 'a.html',
		sourceCode: '<MyButton class="c" aria-label="l">x</MyButton><p>y</p>',
		config: {
			pretenders: [{ selector: 'MyButton', as: { element: 'button', inheritAttrs: true } }],
		},
	},
];

const exec = async (fixture: Fixture, rust: boolean, debug = false) => {
	const file = await MLEngine.toMLFile({ sourceCode: fixture.sourceCode, name: fixture.fileName });
	const engine = new MLEngine(file!, {
		noSearchConfig: true,
		locale: 'en',
		experimentalRustCore: rust,
		debug,
		config: { rules: { 'no-duplicate-id': true }, ...fixture.config },
	});
	let debugMap: readonly string[] | null | undefined;
	engine.on('lint', (_filePath, _sourceCode, _violations, _fixedCode, dump) => {
		debugMap = dump;
	});
	await engine.exec();
	return { engine, debugMap };
};

/**
 * What the scope of a suppression reads of a node list, with the references between the nodes as
 * indexes, so that two lists of different objects can be compared.
 */
const describeNodes = (nodes: readonly PositionedNode[] | null) =>
	nodes?.map(node => {
		const isElement = node.nodeType === 1;
		// `parentElement` and `children` are typed as the `ScopedNode` that the list holds as `PositionedNode`.
		const indexOf = (other: unknown) => nodes.indexOf(other as PositionedNode);
		return {
			nodeType: node.nodeType,
			startLine: node.startLine,
			startCol: node.startCol,
			parentElement: node.parentElement ? indexOf(node.parentElement) : null,
			...(isElement
				? {
						localName: node.localName,
						id: node.id,
						classList: [...node.classList],
						attributes: [...node.attributes].map(attr => [attr.name, attr.value]),
						children: [...node.children].map(child => indexOf(child)),
					}
				: {}),
		};
	}) ?? null;

describe.skipIf(!nativeAddonIsBuilt)('experimentalRustCore describes the document it linted', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it.each(fixtures)('has the nodes that the TypeScript engine has for $name', async fixture => {
		const expected = await exec(fixture, false);
		const actual = await exec(fixture, true);

		expect(describeNodes(expected.engine.positionedNodes())).not.toBeNull();
		expect(describeNodes(actual.engine.positionedNodes())).toStrictEqual(
			describeNodes(expected.engine.positionedNodes()),
		);
	});

	it.each(fixtures)('has the debug payload that the TypeScript engine has for $name', async fixture => {
		const expected = await exec(fixture, false, true);
		const actual = await exec(fixture, true, true);

		expect(expected.debugMap).toBeInstanceOf(Array);
		expect(actual.debugMap).toStrictEqual(expected.debugMap);
	});

	it('builds the debug payload only when `debug` is on', async () => {
		const { debugMap } = await exec(fixtures[0]!, true);

		expect(debugMap).toBeNull();
	});

	it('has no TypeScript document, as no MLCore was built', async () => {
		const { engine } = await exec(fixtures[0]!, true);

		expect(engine.document).toBeNull();
	});

	it('describes the files of a framework parser as the TypeScript engine does', async () => {
		const sourceCode = '<template>\n\t<div id="a" class="b">\n\t\t<p v-if="x">t</p>\n\t</div>\n</template>';
		const run = async (rust: boolean) => {
			const file = await MLEngine.toMLFile({ sourceCode, name: 'a.vue' });
			const engine = new MLEngine(file!, {
				noSearchConfig: true,
				locale: 'en',
				experimentalRustCore: rust,
				debug: true,
				config: {
					parser: { '\\.vue$': '@markuplint/vue-parser' },
					specs: { '\\.vue$': '@markuplint/vue-spec' },
					rules: { 'no-duplicate-id': true },
				},
			});
			let debugMap: readonly string[] | null | undefined;
			engine.on('lint', (_filePath, _sourceCode, _violations, _fixedCode, dump) => {
				debugMap = dump;
			});
			await engine.exec();
			return { nodes: describeNodes(engine.positionedNodes()), debugMap };
		};

		const expected = await run(false);
		const actual = await run(true);

		expect(expected.nodes).not.toBeNull();
		expect(actual).toStrictEqual(expected);
	});

	it('shows the document before a fix, as the TypeScript engine does', async () => {
		const file = await MLEngine.toMLFile({ sourceCode: '<DIV></DIV>', name: 'a.html' });
		const engine = new MLEngine(file!, {
			noSearchConfig: true,
			locale: 'en',
			experimentalRustCore: true,
			fix: true,
			config: { rules: { 'case-sensitive-tag-name': true } },
		});

		const result = await engine.exec();

		expect(result?.fixedCode).toBe('<div></div>');
		expect(engine.positionedNodes()?.map(node => node.localName)).toStrictEqual(['div']);
	});
});

describe.skipIf(!nativeAddonIsBuilt)(
	'experimentalRustCore with setCode, a config that cannot be loaded and watch',
	() => {
		const missingPreset = { extends: ['markuplint:no-exists'] };

		it('lints the code that setCode gave, without building a TypeScript document', async () => {
			const file = await MLEngine.toMLFile({ sourceCode: '<div></div>', name: 'a.html' });
			const engine = new MLEngine(file!, {
				noSearchConfig: true,
				locale: 'en',
				experimentalRustCore: true,
				config: { rules: { 'case-sensitive-tag-name': true } },
			});

			const first = await engine.exec();
			await engine.setCode('<DIV></DIV>');
			const second = await engine.exec();

			expect(first?.violations).toStrictEqual([]);
			// The start tag and the end tag.
			expect(second?.violations.map(v => v.ruleId)).toStrictEqual([
				'case-sensitive-tag-name',
				'case-sensitive-tag-name',
			]);
			expect(engine.document).toBeNull();
			expect(engine.positionedNodes()?.map(node => node.localName)).toStrictEqual(['div']);
		});

		it('resolves the pretenders of the code that setCode gave', async () => {
			const file = await MLEngine.toMLFile({ sourceCode: '<p></p>', name: 'a.html' });
			const config: Config = {
				pretenders: [{ selector: 'MyButton', as: 'button' }],
				rules: { 'require-accessible-name': true },
			};
			const rust = new MLEngine(file!, {
				noSearchConfig: true,
				locale: 'en',
				experimentalRustCore: true,
				config,
			});
			const typescript = new MLEngine(file!, { noSearchConfig: true, locale: 'en', config });

			await rust.setCode('<MyButton></MyButton>');
			await typescript.setCode('<MyButton></MyButton>');

			const ruleIds = (result: Awaited<ReturnType<MLEngine['exec']>>) => result?.violations.map(v => v.ruleId);
			expect(ruleIds(await rust.exec())).toStrictEqual(ruleIds(await typescript.exec()));
			expect(ruleIds(await rust.exec())).toStrictEqual(['require-accessible-name']);
		});

		it('reports one error-severity config-error, as the TypeScript engine does', async () => {
			const run = async (rust: boolean) => {
				const file = await MLEngine.toMLFile({ sourceCode: '<dl><span>no</span></dl>', name: 'a.html' });
				const engine = new MLEngine(file!, {
					noSearchConfig: true,
					experimentalRustCore: rust,
					config: missingPreset,
				});
				const messages: string[] = [];
				engine.on('lint-error', (_filePath, _sourceCode, error) => {
					messages.push(error.message);
				});
				return { result: await engine.exec(), messages };
			};

			const expected = await run(false);
			const actual = await run(true);

			expect(expected.result?.violations.map(v => [v.ruleId, v.severity])).toStrictEqual([
				['config-error', 'error'],
			]);
			// The message ends with a counter of the process that differs between two runs.
			const withoutCounter = (value: unknown) =>
				JSON.stringify(value, null, 1).replaceAll(/is not found in \d+/g, 'is not found in N');
			expect(withoutCounter(actual)).toBe(withoutCounter(expected));
		});

		it('keeps reporting the failure after setCode while the config cannot be loaded', async () => {
			const file = await MLEngine.toMLFile({ sourceCode: '<p>a</p>', name: 'a.html' });
			const engine = new MLEngine(file!, {
				noSearchConfig: true,
				experimentalRustCore: true,
				config: missingPreset,
			});

			await engine.setCode('<p>b</p>');
			const result = await engine.exec();

			expect(result?.violations.map(v => [v.ruleId, v.severity])).toStrictEqual([['config-error', 'error']]);
		});

		it('lints again in watch mode when the config changes, without building a TypeScript document', async () => {
			const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ml-engine-rust-watch-'));
			let engine: MLEngine | undefined;
			try {
				const configFile = path.join(tmpDir, '.markuplintrc');
				const targetFile = path.join(tmpDir, 'a.html');
				await fs.writeFile(configFile, JSON.stringify({ rules: { 'case-sensitive-tag-name': false } }));
				await fs.writeFile(targetFile, '<DIV></DIV>');
				const file = await MLEngine.toMLFile(targetFile);
				const watched = new MLEngine(file!, { watch: true, experimentalRustCore: true });
				engine = watched;

				const relinted = new Promise<readonly Violation[]>(resolve => {
					watched.on('lint', (_, __, violations) => {
						if (violations.some(v => v.ruleId === 'case-sensitive-tag-name')) {
							resolve(violations);
						}
					});
				});

				const first = await watched.exec();
				expect(first?.violations).toStrictEqual([]);

				await fs.writeFile(configFile, JSON.stringify({ rules: { 'case-sensitive-tag-name': true } }));
				// The start tag and the end tag.
				expect((await relinted).map(v => v.ruleId)).toStrictEqual([
					'case-sensitive-tag-name',
					'case-sensitive-tag-name',
				]);
				expect(watched.document).toBeNull();
			} finally {
				await engine?.close();
				await fs.rm(tmpDir, { recursive: true, force: true });
			}
		});
	},
);
