import { test, expect } from 'vitest';

import { toSlash, fromFileURL, toFileURL, normalizeForIgnore, normalizeForGlob } from './path-utils.js';

test('toSlash: converts backslashes to forward slashes', () => {
	expect(toSlash('C:\\Users\\foo\\file.html')).toBe('C:/Users/foo/file.html');
});

test('toSlash: preserves POSIX paths', () => {
	expect(toSlash('/unix/path')).toBe('/unix/path');
});

test('toSlash: handles mixed separators', () => {
	expect(toSlash('C:\\path/mixed\\file')).toBe('C:/path/mixed/file');
});

test('toSlash: handles empty string', () => {
	expect(toSlash('')).toBe('');
});

test('normalizeForIgnore: POSIX absolute path without relative', () => {
	expect(normalizeForIgnore('/Users/project/file.html')).toBe('/Users/project/file.html');
});

test('normalizeForIgnore: POSIX absolute path with relative', () => {
	expect(normalizeForIgnore('/Users/project/file.html', true)).toBe('Users/project/file.html');
});

test('normalizeForIgnore: preserves bang prefix', () => {
	expect(normalizeForIgnore('!dir/file')).toBe('!dir/file');
});

test('normalizeForIgnore: preserves bang prefix with relative', () => {
	expect(normalizeForIgnore('!/dir/file', true)).toBe('!dir/file');
});

test('normalizeForIgnore: preserves glob wildcard', () => {
	expect(normalizeForIgnore('*')).toBe('*');
});

test('normalizeForIgnore: Windows backslash path with relative', () => {
	expect(normalizeForIgnore('C:\\Users\\project\\file.html', true)).toBe('Users/project/file.html');
});

test('normalizeForIgnore: Windows backslash path without relative', () => {
	expect(normalizeForIgnore('C:\\Users\\project\\file.html')).toBe('/Users/project/file.html');
});

test('normalizeForIgnore: Windows P: drive path', () => {
	expect(normalizeForIgnore('P:\\project\\src\\file.html', true)).toBe('project/src/file.html');
});

test('normalizeForGlob: POSIX path unchanged', () => {
	expect(normalizeForGlob('src/**/*.html')).toBe('src/**/*.html');
});

test('normalizeForGlob: converts backslashes', () => {
	expect(normalizeForGlob('src\\**\\*.html')).toBe('src/**/*.html');
});

test('normalizeForIgnore: lowercase drive letter', () => {
	expect(normalizeForIgnore('c:\\Users\\file.html', true)).toBe('Users/file.html');
});

test('normalizeForIgnore: D: drive', () => {
	expect(normalizeForIgnore('D:\\Data\\file.html')).toBe('/Data/file.html');
});

test('normalizeForIgnore: forward-slash Windows path', () => {
	expect(normalizeForIgnore('C:/Users/project/file.html')).toBe('/Users/project/file.html');
});

test('normalizeForIgnore: does not strip non-drive-letter prefixes', () => {
	expect(normalizeForIgnore('npm:package')).toBe('npm:package');
});

test('normalizeForIgnore: empty string', () => {
	expect(normalizeForIgnore('')).toBe('');
});

test('normalizeForIgnore: POSIX root only', () => {
	expect(normalizeForIgnore('/')).toBe('/');
});

test('normalizeForIgnore: POSIX root with relative', () => {
	expect(normalizeForIgnore('/', true)).toBe('');
});

test('normalizeForIgnore: path with spaces', () => {
	expect(normalizeForIgnore('C:\\Program Files\\app\\file.html', true)).toBe('Program Files/app/file.html');
});

test('normalizeForIgnore: path with CJK characters', () => {
	expect(normalizeForIgnore('C:\\Users\\日本語\\file.html', true)).toBe('Users/日本語/file.html');
});

test('normalizeForIgnore: bang prefix with Windows drive', () => {
	expect(normalizeForIgnore('!C:\\Users\\file.html', true)).toBe('!Users/file.html');
});

test('normalizeForIgnore: UNC-style backslash path', () => {
	expect(normalizeForIgnore('\\\\server\\share\\file.html')).toBe('//server/share/file.html');
});

test('normalizeForIgnore: UNC-style backslash path with relative', () => {
	expect(normalizeForIgnore('\\\\server\\share\\file.html', true)).toBe('server/share/file.html');
});

test('normalizeForGlob: preserves drive letter', () => {
	expect(normalizeForGlob('C:\\Users\\**\\*.html')).toBe('C:/Users/**/*.html');
});

// fileURLToPath requires a drive letter on Windows (e.g. file:///C:/...),
// so POSIX-style file URLs are only valid on non-Windows platforms.
test.skipIf(process.platform === 'win32')('fromFileURL: POSIX file URL', () => {
	expect(fromFileURL('file:///home/user/file')).toBe('/home/user/file');
});

test.skipIf(process.platform === 'win32')('fromFileURL: handles URL-encoded characters', () => {
	expect(fromFileURL('file:///home/user/my%20file')).toBe('/home/user/my file');
});

test.skipIf(process.platform !== 'win32')('fromFileURL: Windows file URL with drive letter', () => {
	expect(fromFileURL('file:///C:/Users/project/file.html')).toBe('C:\\Users\\project\\file.html');
});

test('fromFileURL: throws on non-file protocol', () => {
	expect(() => fromFileURL('http://example.com')).toThrow();
});

test('fromFileURL: throws on invalid URL', () => {
	expect(() => fromFileURL('not-a-url')).toThrow();
});

test('toFileURL: converts a Windows drive-letter absolute path to a file:// URL', () => {
	expect(toFileURL('C:\\Users\\a\\markuplint\\lib\\index.mjs')).toBe('file:///C:/Users/a/markuplint/lib/index.mjs');
});

test('toFileURL: converts a lowercase-drive Windows path to a file:// URL', () => {
	expect(toFileURL('c:\\Users\\name\\node_modules\\markuplint\\lib\\index.mjs')).toBe(
		'file:///c:/Users/name/node_modules/markuplint/lib/index.mjs',
	);
});

test('toFileURL: never leaves a bare drive-letter prefix as the import specifier', () => {
	const result = toFileURL('c:\\foo\\bar.mjs');
	expect(result.startsWith('file://')).toBe(true);
	expect(result).not.toMatch(/^c:/);
});

test('toFileURL: URL-encodes spaces in Windows paths (Program Files)', () => {
	expect(toFileURL('c:\\Program Files\\node_modules\\markuplint\\lib\\index.mjs')).toBe(
		'file:///c:/Program%20Files/node_modules/markuplint/lib/index.mjs',
	);
});

test('toFileURL: URL-encodes non-ASCII characters in Windows paths', () => {
	expect(toFileURL('c:\\Users\\太郎\\lib.mjs')).toBe('file:///c:/Users/%E5%A4%AA%E9%83%8E/lib.mjs');
});

test('toFileURL: URL-encodes reserved characters like # in Windows paths', () => {
	expect(toFileURL('c:\\Users\\foo#bar\\lib.mjs')).toBe('file:///c:/Users/foo%23bar/lib.mjs');
});

test('toFileURL: URL-encodes reserved characters like ? in Windows paths', () => {
	expect(toFileURL('c:\\Users\\foo?\\lib.mjs')).toBe('file:///c:/Users/foo%3F/lib.mjs');
});

test('toFileURL: converts a POSIX absolute path to a file:// URL', () => {
	expect(toFileURL('/tmp/markuplint/lib/index.mjs')).toBe('file:///tmp/markuplint/lib/index.mjs');
});

test('toFileURL: URL-encodes spaces in POSIX paths', () => {
	expect(toFileURL('/tmp/my project/lib.mjs')).toBe('file:///tmp/my%20project/lib.mjs');
});

test('toFileURL: URL-encodes non-ASCII characters in POSIX paths', () => {
	expect(toFileURL('/home/太郎/lib.mjs')).toBe('file:///home/%E5%A4%AA%E9%83%8E/lib.mjs');
});

test('toFileURL: URL-encodes reserved characters like # in POSIX paths', () => {
	expect(toFileURL('/home/foo#bar/lib.mjs')).toBe('file:///home/foo%23bar/lib.mjs');
});

test('toFileURL: URL-encodes reserved characters like ? in POSIX paths', () => {
	expect(toFileURL('/home/foo?/lib.mjs')).toBe('file:///home/foo%3F/lib.mjs');
});

test('toFileURL: does not convert bare module specifiers like "markuplint"', () => {
	expect(toFileURL('markuplint')).toBe('markuplint');
});

test('toFileURL: does not convert scoped bare specifiers like "@markuplint/pug-parser"', () => {
	expect(toFileURL('@markuplint/pug-parser')).toBe('@markuplint/pug-parser');
});

test('toFileURL: does not accidentally prefix ./ specifiers with file:///', () => {
	expect(toFileURL('./local.js')).toBe('./local.js');
});

test('toFileURL: does not convert ../ relative specifiers', () => {
	expect(toFileURL('../lib/index.js')).toBe('../lib/index.js');
});

test('toFileURL: does not convert empty strings', () => {
	expect(toFileURL('')).toBe('');
});

test('toFileURL: leaves UNC paths as-is for the caller to handle (known limitation)', () => {
	// UNC path handling is tracked as a follow-up (see PR description for #3795).
	// Assert the current behavior so any future change is explicit.
	expect(toFileURL('\\\\server\\share\\foo.mjs')).toBe('\\\\server\\share\\foo.mjs');
});
