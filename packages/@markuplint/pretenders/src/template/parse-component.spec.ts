import path from 'node:path';

import { describe, test, expect } from 'vitest';

import { getFrameworkType, isModuleNotFoundError, parseComponent } from './parse-component.js';

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

describe('isModuleNotFoundError', () => {
	test('returns true for ERR_MODULE_NOT_FOUND error', () => {
		const err = new Error("Cannot find module '@markuplint/vue-parser'");
		(err as NodeJS.ErrnoException).code = 'ERR_MODULE_NOT_FOUND';
		expect(isModuleNotFoundError(err)).toBe(true);
	});

	test('returns false for TypeError', () => {
		expect(isModuleNotFoundError(new TypeError('Parser initialization failed'))).toBe(false);
	});

	test('returns false for Error without code property', () => {
		expect(isModuleNotFoundError(new Error('Something went wrong'))).toBe(false);
	});

	test('returns false for Error with different code', () => {
		const err = new Error('Permission denied');
		(err as NodeJS.ErrnoException).code = 'EACCES';
		expect(isModuleNotFoundError(err)).toBe(false);
	});

	test('returns false for non-Error values', () => {
		expect(isModuleNotFoundError(null)).toBe(false);
		expect(isModuleNotFoundError()).toBe(false);
		expect(isModuleNotFoundError('ERR_MODULE_NOT_FOUND')).toBe(false);
		expect(isModuleNotFoundError({ code: 'ERR_MODULE_NOT_FOUND' })).toBe(false);
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
		const result = await parseComponent('/nonexistent/path/Component.vue');
		expect(result).toBeNull();
	});

	test('returns null when file contains syntax errors (parser.parse throws)', async () => {
		const result = await parseComponent(path.resolve(fixtureDir, 'Malformed.vue'));
		expect(result).toBeNull();
	});
});
