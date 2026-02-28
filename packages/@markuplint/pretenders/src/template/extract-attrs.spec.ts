import path from 'node:path';

import { describe, test, expect } from 'vitest';

import { extractAttrs } from './extract-attrs.js';
import { extractRoot } from './extract-root.js';
import { parseComponent } from './parse-component.js';

const fixtureDir = path.resolve(import.meta.dirname, '..', '..', 'test', 'fixtures', 'template');

describe('extractAttrs', () => {
	test('extracts static attributes from Vue <button>', async () => {
		const doc = await parseComponent(path.resolve(fixtureDir, 'SimpleButton.vue'));
		const root = extractRoot(doc!);
		const attrs = extractAttrs(root!);
		expect(attrs).toStrictEqual([
			{ name: 'type', value: 'button' },
			{ name: 'class', value: 'btn' },
		]);
	});

	test('extracts static attributes from Svelte <button>', async () => {
		const doc = await parseComponent(path.resolve(fixtureDir, 'SimpleButton.svelte'));
		const root = extractRoot(doc!);
		const attrs = extractAttrs(root!);
		expect(attrs).toStrictEqual([
			{ name: 'type', value: 'button' },
			{ name: 'class', value: 'btn' },
		]);
	});

	test('extracts static attributes from Astro <button>', async () => {
		const doc = await parseComponent(path.resolve(fixtureDir, 'SimpleButton.astro'));
		const root = extractRoot(doc!);
		const attrs = extractAttrs(root!);
		expect(attrs).toStrictEqual([
			{ name: 'type', value: 'button' },
			{ name: 'class', value: 'btn' },
		]);
	});

	test('extracts class attribute from wrapper div', async () => {
		const doc = await parseComponent(path.resolve(fixtureDir, 'WithSlot.vue'));
		const root = extractRoot(doc!);
		const attrs = extractAttrs(root!);
		expect(attrs).toStrictEqual([{ name: 'class', value: 'wrapper' }]);
	});
});
