import path from 'node:path';

import { describe, test, expect } from 'vitest';

import { scan } from './scan.js';

const _ = (filePath: string) => filePath.split('/').join(path.sep);
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
					as: 'div',
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
