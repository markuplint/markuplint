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

test('C1 control characters (U+0080–U+009F)', () => {
	expect(check('http://example.com/\u0080').matched).toBe(false);
	expect(check('http://example.com/\u009F').matched).toBe(false);
});

test('BMP Unicode noncharacters', () => {
	expect(check('http://example.com/\uFDD0').matched).toBe(false);
	expect(check('http://example.com/\uFDEF').matched).toBe(false);
	expect(check('http://example.com/\uFFFE').matched).toBe(false);
	expect(check('http://example.com/\uFFFF').matched).toBe(false);
});

test('supplementary plane noncharacters (U+XFFFE / U+XFFFF)', () => {
	expect(check('http://example.com/\u{1FFFE}').matched).toBe(false);
	expect(check('http://example.com/\u{1FFFF}').matched).toBe(false);
	expect(check('http://example.com/\u{10FFFE}').matched).toBe(false);
	expect(check('http://example.com/\u{10FFFF}').matched).toBe(false);
});

test('trailing vertical tab is not silently stripped', () => {
	// JavaScript's String.prototype.trim() treats U+000B as whitespace and
	// would silently remove it before the forbidden-code-point check runs.
	// HTML "strip leading and trailing ASCII whitespace" only strips
	// U+0009 / U+000A / U+000C / U+000D / U+0020 — so U+000B must still
	// trigger a forbidden code point error at the boundary.
	expect(check('http://example.com/path\u000B').matched).toBe(false);
	expect(check('http://example.com/\u000B').matched).toBe(false);
});

test('NBSP (U+00A0) is not a forbidden code point', () => {
	// NBSP is not in the HTML forbidden code point set.
	// (new URL() may still reject the overall URL; this test focuses on
	// NBSP not being classified as a forbidden code point itself.)
	expect(check('\u00A0').matched).toBe(true);
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
