import { test, expect } from 'vitest';

import { toSlash, fromFileURL, normalizeForIgnore, normalizeForGlob } from './path-utils.js';

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
