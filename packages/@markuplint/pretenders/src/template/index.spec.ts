import path from 'node:path';

import { describe, test, expect } from 'vitest';

import { templateScanner } from './index.js';

const _ = (filePath: string) => filePath.split('/').join(path.sep);
const fixtureDir = path.resolve(import.meta.dirname, '..', '..', 'test', 'fixtures', 'template');
const resolve = (name: string) => path.resolve(fixtureDir, name);

describe('templateScanner', () => {
	describe('Vue', () => {
		test('scans SimpleButton.vue — root <button> with static attrs', async () => {
			const result = await templateScanner([resolve('SimpleButton.vue')]);
			expect(result).toStrictEqual([
				{
					selector: 'SimpleButton',
					as: {
						element: 'button',
						attrs: [
							{ name: 'type', value: 'button' },
							{ name: 'class', value: 'btn' },
						],
						slots: null,
					},
					filePath: _('packages/@markuplint/pretenders/test/fixtures/template/SimpleButton.vue:2:2'),
				},
			]);
		});

		test('scans WrappedComponent.vue — root is authored <BaseButton>', async () => {
			const result = await templateScanner([resolve('WrappedComponent.vue')]);
			expect(result).toStrictEqual([
				{
					selector: 'WrappedComponent',
					as: {
						element: 'BaseButton',
						attrs: [{ name: 'variant', value: 'primary' }],
						slots: null,
					},
					filePath: _('packages/@markuplint/pretenders/test/fixtures/template/WrappedComponent.vue:2:2'),
				},
			]);
		});

		test('scans FragmentOnly.vue — returns empty (no root element)', async () => {
			const result = await templateScanner([resolve('FragmentOnly.vue')]);
			expect(result).toStrictEqual([]);
		});

		test('scans WithSlot.vue — root <div> with slots detected', async () => {
			const result = await templateScanner([resolve('WithSlot.vue')]);
			expect(result).toStrictEqual([
				{
					selector: 'WithSlot',
					as: {
						element: 'div',
						attrs: [{ name: 'class', value: 'wrapper' }],
						slots: true,
					},
					filePath: _('packages/@markuplint/pretenders/test/fixtures/template/WithSlot.vue:2:2'),
				},
			]);
		});
	});

	describe('Svelte', () => {
		test('scans SimpleButton.svelte — root <button> with static attrs', async () => {
			const result = await templateScanner([resolve('SimpleButton.svelte')]);
			expect(result).toStrictEqual([
				{
					selector: 'SimpleButton',
					as: {
						element: 'button',
						attrs: [
							{ name: 'type', value: 'button' },
							{ name: 'class', value: 'btn' },
						],
						slots: null,
					},
					filePath: _('packages/@markuplint/pretenders/test/fixtures/template/SimpleButton.svelte:1:1'),
				},
			]);
		});

		test('scans WithSlot.svelte — Svelte 4 <slot> detected', async () => {
			const result = await templateScanner([resolve('WithSlot.svelte')]);
			expect(result).toStrictEqual([
				{
					selector: 'WithSlot',
					as: {
						element: 'div',
						attrs: [{ name: 'class', value: 'wrapper' }],
						slots: true,
					},
					filePath: _('packages/@markuplint/pretenders/test/fixtures/template/WithSlot.svelte:1:1'),
				},
			]);
		});

		test('scans WithSnippet.svelte — Svelte 5 {@render children()} detected', async () => {
			const result = await templateScanner([resolve('WithSnippet.svelte')]);
			expect(result).toStrictEqual([
				{
					selector: 'WithSnippet',
					as: {
						element: 'div',
						attrs: [{ name: 'class', value: 'wrapper' }],
						slots: true,
					},
					filePath: _('packages/@markuplint/pretenders/test/fixtures/template/WithSnippet.svelte:1:1'),
				},
			]);
		});
	});

	describe('Astro', () => {
		test('scans SimpleButton.astro — root <button> skipping frontmatter', async () => {
			const result = await templateScanner([resolve('SimpleButton.astro')]);
			expect(result).toStrictEqual([
				{
					selector: 'SimpleButton',
					as: {
						element: 'button',
						attrs: [
							{ name: 'type', value: 'button' },
							{ name: 'class', value: 'btn' },
						],
						slots: null,
					},
					filePath: _('packages/@markuplint/pretenders/test/fixtures/template/SimpleButton.astro:3:1'),
				},
			]);
		});

		test('scans WithSlot.astro — <slot /> detected', async () => {
			const result = await templateScanner([resolve('WithSlot.astro')]);
			expect(result).toStrictEqual([
				{
					selector: 'WithSlot',
					as: {
						element: 'div',
						attrs: [{ name: 'class', value: 'wrapper' }],
						slots: true,
					},
					filePath: _('packages/@markuplint/pretenders/test/fixtures/template/WithSlot.astro:3:1'),
				},
			]);
		});
	});

	describe('Options', () => {
		test('ignoreComponentNames filters out specified components', async () => {
			const result = await templateScanner([resolve('SimpleButton.vue')], {
				ignoreComponentNames: ['SimpleButton'],
			});
			expect(result).toStrictEqual([]);
		});

		test('multiple files scanned together and sorted by selector', async () => {
			const result = await templateScanner([resolve('SimpleButton.vue'), resolve('WithSlot.vue')]);
			expect(result).toHaveLength(2);
			expect(result[0]!.selector).toBe('SimpleButton');
			expect(result[1]!.selector).toBe('WithSlot');
		});
	});

	describe('Name collision', () => {
		test('same-name components from different directories are both registered', async () => {
			const result = await templateScanner([resolve('subA/Button.vue'), resolve('subB/Button.vue')]);
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

	describe('Name collision resolved via import (issue #3951)', () => {
		test('a wrapper component resolves its imported child to the file it actually imports, not a same-named sibling', async () => {
			// subB/Button.vue is scanned first (and subA/Button.vue only appears after
			// the wrapper) so that, absent import-based resolution, the plain name index
			// would register subB's `Button` (div) first and resolve the wrapper's
			// reference to it instead of the file it actually imports.
			const result = await templateScanner([
				resolve('subB/Button.vue'),
				resolve('collision/wrapper-uses-a.vue'),
				resolve('subA/Button.vue'),
			]);

			const wrapper = result.find(p => p.selector === 'WrapperUsesA');
			expect(wrapper).toMatchObject({
				as: expect.objectContaining({ element: 'button' }),
			});
		});
	});

	describe('Edge cases', () => {
		test('rejects relative file paths', () => {
			expect(() => templateScanner(['relative/path.vue'])).toThrow(ReferenceError);
		});

		test('unsupported file extension returns empty result', async () => {
			const result = await templateScanner([resolve('SimpleButton.vue').replace('.vue', '.html')]);
			expect(result).toStrictEqual([]);
		});
	});
});
