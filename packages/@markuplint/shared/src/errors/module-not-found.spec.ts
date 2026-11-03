import { describe, expect, test } from 'vitest';

import { isModuleNotFoundError, missingPackageOf } from './module-not-found.js';

function notFound(message: string) {
	return Object.assign(new Error(message), { code: 'ERR_MODULE_NOT_FOUND' });
}

describe('isModuleNotFoundError', () => {
	test('is true for an Error whose code is ERR_MODULE_NOT_FOUND', () => {
		expect(isModuleNotFoundError(notFound("Cannot find package 'x' imported from /a.js"))).toBe(true);
	});

	test('is false for an Error with another code, or none', () => {
		expect(isModuleNotFoundError(Object.assign(new Error('x'), { code: 'EACCES' }))).toBe(false);
		expect(isModuleNotFoundError(new Error('x'))).toBe(false);
	});

	test('is false for an Error of another kind, a TypeError of a parser that fails to initialize included', () => {
		expect(isModuleNotFoundError(new TypeError('Parser initialization failed'))).toBe(false);
		expect(isModuleNotFoundError(new Error('Something went wrong'))).toBe(false);
	});

	test('is false for a value that is not an Error', () => {
		const nothing: unknown = undefined;
		expect(isModuleNotFoundError(nothing)).toBe(false);
		expect(isModuleNotFoundError(null)).toBe(false);
		expect(isModuleNotFoundError('ERR_MODULE_NOT_FOUND')).toBe(false);
		expect(isModuleNotFoundError({ code: 'ERR_MODULE_NOT_FOUND' })).toBe(false);
	});
});

describe('missingPackageOf', () => {
	test('names the package that Node reports as not found', () => {
		const error = notFound("Cannot find package '@markuplint/vue-parser' imported from /p/node_modules/x/lib/a.js");
		expect(missingPackageOf(error)).toBe('@markuplint/vue-parser');
	});

	test('names the package, not the module, when a dependency of an installed package is missing', () => {
		const error = notFound(
			"Cannot find package 'svelte' imported from /p/node_modules/@markuplint/svelte-parser/lib/a.js",
		);
		expect(missingPackageOf(error)).toBe('svelte');
	});

	test('is undefined for a message that names no package (a missing file of a package)', () => {
		const error = notFound("Cannot find module '/p/node_modules/x/lib/missing.js' imported from /p/a.js");
		expect(missingPackageOf(error)).toBeUndefined();
	});

	test('is undefined for an error that is not ERR_MODULE_NOT_FOUND', () => {
		expect(missingPackageOf(new Error("Cannot find package 'x' imported from /a.js"))).toBeUndefined();
		expect(missingPackageOf(null)).toBeUndefined();
	});
});
