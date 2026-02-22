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

test('fromFileURL: POSIX file URL', () => {
	expect(fromFileURL('file:///home/user/file')).toBe('/home/user/file');
});

test('fromFileURL: handles URL-encoded characters', () => {
	expect(fromFileURL('file:///home/user/my%20file')).toBe('/home/user/my file');
});
