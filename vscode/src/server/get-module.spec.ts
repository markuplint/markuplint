import { describe, test, expect } from 'vitest';

import { toImportSpecifier } from './get-module.js';

describe('toImportSpecifier', () => {
	test('converts a Windows drive-letter absolute path to a file:// URL', () => {
		expect(toImportSpecifier('C:\\Users\\a\\markuplint\\lib\\index.mjs')).toBe(
			'file:///C:/Users/a/markuplint/lib/index.mjs',
		);
	});

	test('converts a lowercase-drive Windows path to a file:// URL', () => {
		expect(toImportSpecifier('c:\\Users\\name\\node_modules\\markuplint\\lib\\index.mjs')).toBe(
			'file:///c:/Users/name/node_modules/markuplint/lib/index.mjs',
		);
	});

	test('never leaves a bare drive-letter prefix as the import specifier', () => {
		const result = toImportSpecifier('c:\\foo\\bar.mjs');
		expect(result.startsWith('file://')).toBe(true);
		expect(result).not.toMatch(/^c:/);
	});

	test('URL-encodes spaces in Windows paths (Program Files)', () => {
		expect(toImportSpecifier('c:\\Program Files\\node_modules\\markuplint\\lib\\index.mjs')).toBe(
			'file:///c:/Program%20Files/node_modules/markuplint/lib/index.mjs',
		);
	});

	test('URL-encodes non-ASCII characters in Windows paths', () => {
		expect(toImportSpecifier('c:\\Users\\太郎\\lib.mjs')).toBe('file:///c:/Users/%E5%A4%AA%E9%83%8E/lib.mjs');
	});

	test('URL-encodes reserved characters like # in Windows paths', () => {
		expect(toImportSpecifier('c:\\Users\\foo#bar\\lib.mjs')).toBe('file:///c:/Users/foo%23bar/lib.mjs');
	});

	test('URL-encodes reserved characters like ? in Windows paths', () => {
		expect(toImportSpecifier('c:\\Users\\foo?bar\\lib.mjs')).toBe('file:///c:/Users/foo%3Fbar/lib.mjs');
	});

	test('converts a POSIX absolute path to a file:// URL', () => {
		expect(toImportSpecifier('/tmp/markuplint/lib/index.mjs')).toBe('file:///tmp/markuplint/lib/index.mjs');
	});

	test('URL-encodes spaces in POSIX paths', () => {
		expect(toImportSpecifier('/tmp/my project/lib.mjs')).toBe('file:///tmp/my%20project/lib.mjs');
	});

	test('URL-encodes non-ASCII characters in POSIX paths', () => {
		expect(toImportSpecifier('/home/太郎/lib.mjs')).toBe('file:///home/%E5%A4%AA%E9%83%8E/lib.mjs');
	});

	test('URL-encodes reserved characters like # in POSIX paths', () => {
		expect(toImportSpecifier('/home/foo#bar/lib.mjs')).toBe('file:///home/foo%23bar/lib.mjs');
	});

	test('URL-encodes reserved characters like ? in POSIX paths', () => {
		expect(toImportSpecifier('/home/foo?bar/lib.mjs')).toBe('file:///home/foo%3Fbar/lib.mjs');
	});

	test('does not convert bare module specifiers like "markuplint"', () => {
		expect(toImportSpecifier('markuplint')).toBe('markuplint');
	});

	test('does not convert scoped bare specifiers like "@markuplint/pug-parser"', () => {
		expect(toImportSpecifier('@markuplint/pug-parser')).toBe('@markuplint/pug-parser');
	});

	test('does not accidentally prefix ./ specifiers with file:///', () => {
		expect(toImportSpecifier('./local.js')).toBe('./local.js');
	});

	test('does not convert ../ relative specifiers', () => {
		expect(toImportSpecifier('../lib/index.js')).toBe('../lib/index.js');
	});

	test('does not convert empty strings', () => {
		expect(toImportSpecifier('')).toBe('');
	});

	test('leaves UNC paths as-is for the caller to handle (known limitation)', () => {
		// UNC path handling is tracked as a follow-up (see PR description for #3795).
		// Assert the current behavior so any future change is explicit.
		expect(toImportSpecifier('\\\\server\\share\\foo.mjs')).toBe('\\\\server\\share\\foo.mjs');
	});
});
