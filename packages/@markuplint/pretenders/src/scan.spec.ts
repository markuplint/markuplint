import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, test, expect, beforeEach, afterEach } from 'vitest';

import { jsxScanner } from './jsx/index.js';
import { scan } from './scan.js';
import { templateScanner } from './template/index.js';

// Scanners always emit `/`-delimited filePath now (for stable, cross-platform
// JSON output), so this is a no-op — kept so call sites don't need touching.
const _ = (filePath: string) => filePath;
const fixtureDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures');
const jsxFixture = (name: string) => path.resolve(fixtureDir, name);
const templateFixture = (name: string) => path.resolve(fixtureDir, 'template', name);

describe('scan', () => {
	describe('dispatch by extension', () => {
		test('JSX-only input produces JSX pretenders', async () => {
			const result = await scan([jsxFixture('002.tsx')]);
			expect(result).toStrictEqual([
				{
					selector: 'FooBar',
					as: {
						element: 'div',
						slots: null,
					},
					filePath: _('packages/@markuplint/pretenders/test/fixtures/002.tsx:1:6'),
				},
			]);
		});

		test('template-only input produces template pretenders', async () => {
			const result = await scan([templateFixture('SimpleButton.vue')]);
			expect(result).toStrictEqual([expect.objectContaining({ selector: 'SimpleButton' })]);
		});

		test('mixed JSX + template input merges and sorts results', async () => {
			const result = await scan([
				jsxFixture('002.tsx'),
				templateFixture('SimpleButton.vue'),
				templateFixture('WithSlot.svelte'),
			]);
			const selectors = result.map(p => p.selector);
			expect(selectors).toStrictEqual(['FooBar', 'SimpleButton', 'WithSlot']);
		});
	});

	describe('sort order', () => {
		test('results are sorted case-insensitively by selector', async () => {
			const result = await scan([templateFixture('WithSlot.vue'), templateFixture('SimpleButton.vue')]);
			const selectors = result.map(p => p.selector);
			expect(selectors).toStrictEqual(['SimpleButton', 'WithSlot']);
		});
	});

	describe('ignoreComponentNames', () => {
		test('filters out JSX components', async () => {
			const result = await scan([jsxFixture('002.tsx')], {
				ignoreComponentNames: ['FooBar'],
			});
			expect(result).toStrictEqual([]);
		});

		test('filters out template components', async () => {
			const result = await scan([templateFixture('SimpleButton.vue')], {
				ignoreComponentNames: ['SimpleButton'],
			});
			expect(result).toStrictEqual([]);
		});

		test('filters across both scanners in mixed input', async () => {
			const result = await scan([jsxFixture('002.tsx'), templateFixture('SimpleButton.vue')], {
				ignoreComponentNames: ['FooBar', 'SimpleButton'],
			});
			expect(result).toStrictEqual([]);
		});
	});

	describe('slots flow', () => {
		test('JSX scanner produces correct slots values', async () => {
			const result = await scan([jsxFixture('005.tsx')]);
			const withChildren = result.find(p => p.selector === 'WithChildren');
			const voidComp = result.find(p => p.selector === 'VoidComponent');
			const staticComp = result.find(p => p.selector === 'StaticContent');

			expect(typeof withChildren!.as).toBe('object');
			expect((withChildren!.as as any).slots).toBe(true);

			expect(typeof voidComp!.as).toBe('object');
			expect((voidComp!.as as any).slots).toBe(null);

			expect(staticComp!.as).toStrictEqual({
				element: 'p',
				slots: null,
			});
		});

		test('template scanner produces correct slots values', async () => {
			const result = await scan([templateFixture('SimpleButton.vue'), templateFixture('WithSlot.vue')]);
			const noSlot = result.find(p => p.selector === 'SimpleButton');
			const withSlot = result.find(p => p.selector === 'WithSlot');

			expect((noSlot!.as as any).slots).toBe(null);
			expect((withSlot!.as as any).slots).toBe(true);
		});

		test('mixed input preserves slots from both scanners', async () => {
			const result = await scan([jsxFixture('005.tsx'), templateFixture('WithSlot.vue')]);
			const jsxSlot = result.find(p => p.selector === 'WithChildren');
			const templateSlot = result.find(p => p.selector === 'WithSlot');

			expect((jsxSlot!.as as any).slots).toBe(true);
			expect((templateSlot!.as as any).slots).toBe(true);
		});
	});

	describe('file extension dispatch for non-tsx extensions', () => {
		test('.js files are dispatched to the JSX scanner', async () => {
			const result = await scan([jsxFixture('006.js')]);
			expect(result).toStrictEqual([
				expect.objectContaining({ selector: 'JsButton', as: { element: 'button', slots: null } }),
			]);
		});

		test('.ts files are dispatched to the JSX scanner', async () => {
			// .ts files cannot contain JSX syntax, so the TS compiler finds
			// no components. Verify dispatch by checking that a relative .ts
			// path triggers ReferenceError (from createScanner validation),
			// proving the file reached jsxScanner rather than being silently ignored.
			await expect(scan(['relative/path.ts'])).rejects.toThrow(ReferenceError);
		});

		test('.ts files produce empty results (no JSX syntax)', async () => {
			const result = await scan([jsxFixture('007.ts')]);
			expect(result).toStrictEqual([]);
		});

		test('.jsx files are dispatched to the JSX scanner', async () => {
			const result = await scan([jsxFixture('008.jsx')]);
			expect(result).toStrictEqual([
				expect.objectContaining({ selector: 'JsxCard', as: { element: 'article', slots: null } }),
			]);
		});

		// A relative path makes `createScanner` throw, which proves the file reached
		// jsxScanner rather than being silently dropped by the dispatch filter.
		test.each(['.mjs', '.cjs', '.mts', '.cts'])('%s files are dispatched to the JSX scanner', async ext => {
			await expect(scan([`relative/path${ext}`])).rejects.toThrow(ReferenceError);
		});
	});

	describe('followImports', () => {
		let tmpDir: string;

		beforeEach(async () => {
			tmpDir = await mkdtemp(path.join(os.tmpdir(), 'scan-follow-imports-'));
			await writeFile(path.join(tmpDir, 'Child.tsx'), 'export const Child = () => <button>x</button>;');
			await writeFile(
				path.join(tmpDir, 'Parent.tsx'),
				"import { Child } from './Child';\nexport const Parent = () => <Child />;",
			);
		});

		afterEach(async () => {
			await rm(tmpDir, { recursive: true, force: true });
		});

		test('by default the scanner also reads the files the given file imports', async () => {
			const result = await scan([path.join(tmpDir, 'Parent.tsx')]);

			expect(result.map(p => p.selector)).toStrictEqual(['Child', 'Parent']);
		});

		test('`followImports: false` scans only the given files', async () => {
			const result = await scan([path.join(tmpDir, 'Parent.tsx')], { followImports: false });

			expect(result.map(p => p.selector)).toStrictEqual(['Parent']);
		});
	});

	describe('files as array (multiple file patterns)', () => {
		test('accepts multiple files and merges results', async () => {
			const result = await scan([jsxFixture('002.tsx'), jsxFixture('006.js')]);
			const selectors = result.map(p => p.selector);
			expect(selectors).toStrictEqual(['FooBar', 'JsButton']);
		});
	});

	describe('custom cwd option', () => {
		test('JSX scanner uses custom cwd for relative file paths in output', async () => {
			const customCwd = path.resolve(fixtureDir, '..');
			const result = await jsxScanner([jsxFixture('002.tsx')], { cwd: customCwd });
			const pretender = result[0];
			// filePath must start with "fixtures/" (relative to customCwd), not an absolute path
			expect(pretender.filePath).toMatch(/^fixtures[/\\]002\.tsx:/);
		});

		test('template scanner uses custom cwd for relative file paths in output', async () => {
			const customCwd = path.resolve(fixtureDir);
			const result = await templateScanner([templateFixture('SimpleButton.vue')], { cwd: customCwd });
			const pretender = result[0];
			// filePath must start with "template/" (relative to customCwd), not an absolute path
			expect(pretender.filePath).toMatch(/^template[/\\]SimpleButton\.vue:/);
		});
	});

	describe('name collision via scan()', () => {
		test('same-name template components from different directories are both output', async () => {
			const result = await scan([templateFixture('subA/Button.vue'), templateFixture('subB/Button.vue')]);
			expect(result).toHaveLength(2);
			expect(result).toStrictEqual([
				expect.objectContaining({
					selector: 'Button',
					as: expect.objectContaining({ element: 'button' }),
				}),
				expect.objectContaining({
					selector: 'Button',
					as: expect.objectContaining({ element: 'div' }),
				}),
			]);
		});
	});

	describe('edge cases', () => {
		test('empty file list returns empty result', async () => {
			const result = await scan([]);
			expect(result).toStrictEqual([]);
		});

		test('unsupported extensions are silently ignored', async () => {
			const result = await scan([
				path.resolve(fixtureDir, 'nonexistent.html'),
				templateFixture('SimpleButton.vue'),
			]);
			expect(result).toStrictEqual([expect.objectContaining({ selector: 'SimpleButton' })]);
		});

		test('rejects relative file paths via underlying scanners', async () => {
			await expect(scan(['relative/path.tsx'])).rejects.toThrow(ReferenceError);
		});
	});
});
