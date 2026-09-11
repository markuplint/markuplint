import path from 'node:path';

import { describe, test, expect } from 'vitest';

import { parseComponent } from './parse-component.js';
import { extractRoot } from './extract-root.js';

const fixtureDir = path.resolve(import.meta.dirname, '..', '..', 'test', 'fixtures', 'template');

describe('extractRoot', () => {
	describe('Vue', () => {
		test('finds root <button> element at depth=0', async () => {
			const doc = await parseComponent(path.resolve(fixtureDir, 'SimpleButton.vue'));
			const root = extractRoot(doc!);
			expect(root).not.toBeNull();
			expect(root!.nodeName).toBe('button');
		});

		test('finds authored component <BaseButton> at depth=0', async () => {
			const doc = await parseComponent(path.resolve(fixtureDir, 'WrappedComponent.vue'));
			const root = extractRoot(doc!);
			expect(root).not.toBeNull();
			expect(root!.nodeName).toBe('BaseButton');
		});

		test('returns null when only text content exists (Fragment-like)', async () => {
			const doc = await parseComponent(path.resolve(fixtureDir, 'FragmentOnly.vue'));
			const root = extractRoot(doc!);
			expect(root).toBeNull();
		});

		test('finds root <div> even when component has slots', async () => {
			const doc = await parseComponent(path.resolve(fixtureDir, 'WithSlot.vue'));
			const root = extractRoot(doc!);
			expect(root).not.toBeNull();
			expect(root!.nodeName).toBe('div');
		});
	});

	describe('Svelte', () => {
		test('finds root <button> element at depth=0', async () => {
			const doc = await parseComponent(path.resolve(fixtureDir, 'SimpleButton.svelte'));
			const root = extractRoot(doc!);
			expect(root).not.toBeNull();
			expect(root!.nodeName).toBe('button');
		});

		test('finds root <div> with slot child', async () => {
			const doc = await parseComponent(path.resolve(fixtureDir, 'WithSlot.svelte'));
			const root = extractRoot(doc!);
			expect(root).not.toBeNull();
			expect(root!.nodeName).toBe('div');
		});
	});

	describe('Astro', () => {
		test('finds root <button> element skipping frontmatter', async () => {
			const doc = await parseComponent(path.resolve(fixtureDir, 'SimpleButton.astro'));
			const root = extractRoot(doc!);
			expect(root).not.toBeNull();
			expect(root!.nodeName).toBe('button');
		});

		test('finds root <div> with slot child', async () => {
			const doc = await parseComponent(path.resolve(fixtureDir, 'WithSlot.astro'));
			const root = extractRoot(doc!);
			expect(root).not.toBeNull();
			expect(root!.nodeName).toBe('div');
		});
	});
});
