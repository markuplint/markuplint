import path from 'node:path';

import { describe, test, expect } from 'vitest';

import { detectSlots } from './detect-slots.js';
import { parseComponent } from './parse-component.js';

const fixtureDir = path.resolve(import.meta.dirname, '..', '..', 'test', 'fixtures', 'template');

describe('detectSlots', () => {
	describe('Vue', () => {
		test('returns true when <slot> element exists in nodeList', async () => {
			const doc = await parseComponent(path.resolve(fixtureDir, 'WithSlot.vue'));
			expect(detectSlots(doc!)).toBe(true);
		});

		test('returns false when no <slot> element exists', async () => {
			const doc = await parseComponent(path.resolve(fixtureDir, 'SimpleButton.vue'));
			expect(detectSlots(doc!)).toBe(false);
		});

		test('returns false for text-only templates', async () => {
			const doc = await parseComponent(path.resolve(fixtureDir, 'FragmentOnly.vue'));
			expect(detectSlots(doc!)).toBe(false);
		});
	});

	describe('Svelte', () => {
		test('returns true when <slot> element exists (Svelte 4 syntax)', async () => {
			const doc = await parseComponent(path.resolve(fixtureDir, 'WithSlot.svelte'));
			expect(detectSlots(doc!)).toBe(true);
		});

		test('returns true when {@render children()} exists (Svelte 5 syntax)', async () => {
			const doc = await parseComponent(path.resolve(fixtureDir, 'WithSnippet.svelte'));
			expect(detectSlots(doc!)).toBe(true);
		});

		test('returns false when no slot syntax exists', async () => {
			const doc = await parseComponent(path.resolve(fixtureDir, 'SimpleButton.svelte'));
			expect(detectSlots(doc!)).toBe(false);
		});
	});

	describe('Astro', () => {
		test('returns true when <slot /> element exists', async () => {
			const doc = await parseComponent(path.resolve(fixtureDir, 'WithSlot.astro'));
			expect(detectSlots(doc!)).toBe(true);
		});

		test('returns false when no slot exists', async () => {
			const doc = await parseComponent(path.resolve(fixtureDir, 'SimpleButton.astro'));
			expect(detectSlots(doc!)).toBe(false);
		});
	});
});
