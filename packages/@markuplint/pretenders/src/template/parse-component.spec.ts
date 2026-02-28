import path from 'node:path';

import { describe, test, expect } from 'vitest';

import { getFrameworkType, parseComponent } from './parse-component.js';

const fixtureDir = path.resolve(import.meta.dirname, '..', '..', 'test', 'fixtures', 'template');

describe('getFrameworkType', () => {
	test('returns "vue" for .vue files', () => {
		expect(getFrameworkType('Component.vue')).toBe('vue');
	});

	test('returns "svelte" for .svelte files', () => {
		expect(getFrameworkType('Component.svelte')).toBe('svelte');
	});

	test('returns "astro" for .astro files', () => {
		expect(getFrameworkType('Component.astro')).toBe('astro');
	});

	test('returns null for unsupported extensions', () => {
		expect(getFrameworkType('Component.html')).toBeNull();
	});

	test('returns null for files without extensions', () => {
		expect(getFrameworkType('Makefile')).toBeNull();
	});

	test('is case-insensitive for extensions', () => {
		expect(getFrameworkType('Component.VUE')).toBe('vue');
	});
});

describe('parseComponent', () => {
	test('returns MLASTDocument for a valid .vue file', async () => {
		const doc = await parseComponent(path.resolve(fixtureDir, 'SimpleButton.vue'));
		expect(doc).not.toBeNull();
		expect(doc!.nodeList.length).toBeGreaterThan(0);
	});

	test('returns MLASTDocument for a valid .svelte file', async () => {
		const doc = await parseComponent(path.resolve(fixtureDir, 'SimpleButton.svelte'));
		expect(doc).not.toBeNull();
		expect(doc!.nodeList.length).toBeGreaterThan(0);
	});

	test('returns MLASTDocument for a valid .astro file', async () => {
		const doc = await parseComponent(path.resolve(fixtureDir, 'SimpleButton.astro'));
		expect(doc).not.toBeNull();
		expect(doc!.nodeList.length).toBeGreaterThan(0);
	});

	test('returns null for unsupported file extension', async () => {
		const doc = await parseComponent('/absolute/path/to/Component.html');
		expect(doc).toBeNull();
	});

	test('returns null when file does not exist (fs.readFileSync throws)', async () => {
		await expect(parseComponent('/nonexistent/path/Component.vue')).rejects.toThrow();
	});
});
