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

test('vertical tab at any boundary is not silently stripped', () => {
	// JavaScript's String.prototype.trim() treats U+000B as whitespace and
	// would silently remove it before the forbidden-code-point check runs.
	// HTML "strip leading and trailing ASCII whitespace" only strips
	// U+0009 / U+000A / U+000C / U+000D / U+0020 — so U+000B must still
	// trigger a forbidden code point error at any position.
	expect(check('\u000Bhttp://example.com/').matched).toBe(false);
	expect(check('http://example.com/\u000B').matched).toBe(false);
	expect(check('\u000Bhttp://example.com/\u000B').matched).toBe(false);
	expect(check('http://example.com/path\u000B').matched).toBe(false);
});

test('HTML ASCII whitespace at URL boundaries is stripped', () => {
	// Per HTML "strip leading and trailing ASCII whitespace":
	// TAB (U+0009), LF (U+000A), FF (U+000C), CR (U+000D), SPACE (U+0020).
	// Mid-URL TAB / LF / CR are caught by ILLEGAL_WHITESPACE; these cases
	// only exercise the boundary-strip behaviour of stripAsciiWhitespace.
	expect(check('\thttps://example.com').matched).toBe(true);
	expect(check('\nhttps://example.com').matched).toBe(true);
	expect(check('\fhttps://example.com').matched).toBe(true);
	expect(check('\rhttps://example.com').matched).toBe(true);
	expect(check('https://example.com\t\n\f\r ').matched).toBe(true);
	expect(check('\t\n\f\r https://example.com\t\n\f\r ').matched).toBe(true);
});

test('NBSP embedded in URL is not classified as a forbidden code point', () => {
	// NBSP (U+00A0) is not in HTML LS "forbidden code points" and must pass
	// the FORBIDDEN_CODE_POINT check. new URL() percent-encodes it in the
	// path, so the full validation accepts it.
	expect(check('http://example.com/\u00A0').matched).toBe(true);
});

test('non-ASCII code points outside the forbidden set are valid', () => {
	// Guard against accidental regex range expansion: PUA and emoji must
	// not be misclassified as forbidden.
	expect(check('http://example.com/\u{E000}').matched).toBe(true); // BMP PUA start
	expect(check('http://example.com/\u{F8FF}').matched).toBe(true); // BMP PUA end
	expect(check('http://example.com/\u{F0000}').matched).toBe(true); // Supp-A PUA
	expect(check('http://example.com/\u{100000}').matched).toBe(true); // Supp-B PUA
	expect(check('http://example.com/\u{1F4A9}').matched).toBe(true); // emoji
});

test('code points adjacent to forbidden ranges are valid', () => {
	// Boundary guards for the FORBIDDEN_CODE_POINT regex.
	expect(check('http://example.com/\u007E').matched).toBe(true); // just before DEL
	expect(check('http://example.com/\u00A0').matched).toBe(true); // just after C1
	expect(check('http://example.com/\uFDCF').matched).toBe(true); // just before FDD0
	expect(check('http://example.com/\uFDF0').matched).toBe(true); // just after FDEF
	expect(check('http://example.com/\uFFFD').matched).toBe(true); // just before FFFE
	expect(check('http://example.com/\u{1FFFD}').matched).toBe(true); // before 1FFFE
	expect(check('http://example.com/\u{10FFFD}').matched).toBe(true); // before 10FFFE
});

test('multiple consecutive forbidden code points are detected', () => {
	// `test()` short-circuits at the first match, but the regex has to be
	// general enough that the first match can be ANY of the forbidden code
	// points. A regression that accidentally anchors the regex would fail
	// one of these cases.
	expect(check('http://example.com/\u0080\u0081').matched).toBe(false);
	expect(check('http://example.com/\uFDD0\uFFFE').matched).toBe(false);
	expect(check('http://example.com/\u{1FFFE}\u{2FFFE}').matched).toBe(false);
	expect(check('http://example.com/ab\u{10FFFF}c').matched).toBe(false);
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
