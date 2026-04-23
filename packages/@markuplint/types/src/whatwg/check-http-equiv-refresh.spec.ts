import { describe, expect, test } from 'vitest';

import { checkHTTPEquivRefresh } from './check-http-equiv-refresh.js';

const check = checkHTTPEquivRefresh();

describe('valid per HTML LS §4.2.5.3 "Refresh" conformance', () => {
	test('bare integer: "30"', () => {
		expect(check('30').matched).toBe(true);
	});

	test('zero: "0"', () => {
		expect(check('0').matched).toBe(true);
	});

	test('integer with leading whitespace: " 10"', () => {
		expect(check(' 10').matched).toBe(true);
	});

	test('integer with "; URL=<url>" (space after semicolon)', () => {
		expect(check('0; URL=https://example.com/').matched).toBe(true);
	});

	test('integer with ";url=<url>" (no space after semicolon — HTML LS 3.2 whitespace is optional)', () => {
		// nu-validator fixture `refresh-missing-space-novalid.html` rejects
		// this, but HTML LS §4.2.5.3 clause 3.2 makes the whitespace after
		// the separator optional. Recorded as nu over-detection in
		// `excluded-ids.json`.
		expect(check('5;url=http://example.com').matched).toBe(true);
	});

	test('integer with comma separator: "5,url=http://example.com"', () => {
		expect(check('5,url=http://example.com').matched).toBe(true);
	});

	test('integer with bare URL (no "URL=" keyword)', () => {
		expect(check('0; https://example.com/').matched).toBe(true);
	});

	test('"URL" keyword is ASCII case-insensitive: "0; url=..."', () => {
		expect(check('0; url=https://example.com/').matched).toBe(true);
	});

	test('"URL" keyword is ASCII case-insensitive: "0; Url=..."', () => {
		expect(check('0; Url=https://example.com/').matched).toBe(true);
	});

	test('non-"URL" keyword tail is accepted as a bare relative URL', () => {
		// nu-validator fixture `refresh-invalid-keyword-novalid.html` rejects
		// `5; href=http://example.com` on the basis that `href=` is not the
		// `URL=` keyword. HTML LS 3.3 allows the second alternative — a
		// bare "valid URL potentially surrounded by spaces" — and
		// `href=http://example.com` is itself a parseable relative URL
		// string, so the conformance text matches. Recorded as nu
		// over-detection in `excluded-ids.json`.
		expect(check('5; href=http://example.com').matched).toBe(true);
	});

	test('URL wrapped in single quotes parses as a relative URL', () => {
		// nu-validator fixture `refresh-quoted-url-novalid.html` rejects
		// single-quoted URLs, but `'` is a URL code point, so
		// `'http://example.com'` is a parseable relative URL string and
		// HTML LS 3.3 alt 2 permits it. Recorded as nu over-detection in
		// `excluded-ids.json`.
		expect(check("5; url='http://example.com'").matched).toBe(true);
	});
});

describe('invalid per HTML LS §4.2.5.3', () => {
	test('empty string — HTML LS requires a valid non-negative integer', () => {
		// Fixture: html/elements/meta/refresh-empty-novalid.html
		expect(check('').matched).toBe(false);
	});

	test('non-digit start: "garbage value"', () => {
		expect(check('garbage value').matched).toBe(false);
	});

	test('missing separator between digits and URL part', () => {
		// Fixture: html/elements/meta/refresh-missing-semicolon-novalid.html
		// HTML LS 3.1 requires either ";" or "," before the URL part.
		// A bare space after the digits does not satisfy that clause.
		expect(check('5 url=http://example.com').matched).toBe(false);
	});

	test('negative integer', () => {
		expect(check('-5').matched).toBe(false);
	});

	test('float with dot', () => {
		// The parser algorithm tolerates digits + "." but the conformance
		// text requires "a valid non-negative integer" — dots are not part
		// of that production.
		expect(check('5.5').matched).toBe(false);
	});

	test('separator with no URL payload', () => {
		// Clause 3 is optional, but if present it requires clause 3.3
		// (URL). A trailing `;` with nothing after breaks the grammar.
		expect(check('5;').matched).toBe(false);
	});

	test('URL part that contains whitespace inside the URL', () => {
		// "valid URL potentially surrounded by spaces" strips leading /
		// trailing whitespace only; internal whitespace invalidates the URL.
		expect(check('5; URL=http://example.com/ extra').matched).toBe(false);
	});
});
