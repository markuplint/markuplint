import { test, expect } from 'vitest';

import { checkURL } from './check-url.js';

const check = checkURL();

test('valid absolute URLs', () => {
	expect(check('https://example.com').matched).toBe(true);
	expect(check('http://example.com/path?q=1#hash').matched).toBe(true);
	expect(check('mailto:user@example.com').matched).toBe(true);
	expect(check('tel:+1234567890').matched).toBe(true);
});

test('valid relative URLs', () => {
	expect(check('/path/to/page').matched).toBe(true);
	expect(check('relative/path').matched).toBe(true);
	expect(check('../parent').matched).toBe(true);
	expect(check('#fragment').matched).toBe(true);
	expect(check('?query=1').matched).toBe(true);
});

test('empty URL is valid', () => {
	expect(check('').matched).toBe(true);
});

test('URL with surrounding spaces is valid', () => {
	expect(check('  https://example.com  ').matched).toBe(true);
});

test('illegal whitespace (tab)', () => {
	expect(check('http://exa\tmple.com').matched).toBe(false);
});

test('illegal whitespace (newline)', () => {
	expect(check('http://example.\ncom').matched).toBe(false);
});

test('illegal whitespace (CR)', () => {
	expect(check('http://example.\rcom').matched).toBe(false);
});

test('malformed percent-encoding', () => {
	expect(check('http://example.com/a%ZZ').matched).toBe(false);
	expect(check('http://example.com/%').matched).toBe(false);
	expect(check('http://example.com/%2').matched).toBe(false);
});

test('valid percent-encoding', () => {
	expect(check('http://example.com/%20path').matched).toBe(true);
	expect(check('/path/%E3%81%82').matched).toBe(true);
});

test('C0 control characters', () => {
	expect(check('http://example.com/\u0000').matched).toBe(false);
	expect(check('http://example.com/\u0008').matched).toBe(false);
	expect(check('http://example.com/\u007F').matched).toBe(false);
});

test('space in URL (unencoded)', () => {
	// Spaces in path cause new URL() to fail for absolute URLs
	// For relative URLs with dummy base, space is allowed by new URL()
	// but nu-validator rejects it. This is a known limitation.
	expect(check('http://example.com/path with space').matched).toBe(false);
});

test('backslash in path', () => {
	// new URL() normalizes backslash to forward slash (validation error in strict mode)
	// We don't catch this currently — known limitation
	expect(check('http://example.com\\path').matched).toBe(true);
});

test('javascript: scheme', () => {
	// javascript: URLs are syntactically valid
	expect(check('javascript:void(0)').matched).toBe(true);
});

test('data: scheme', () => {
	expect(check('data:text/html,<h1>Hello</h1>').matched).toBe(true);
});
