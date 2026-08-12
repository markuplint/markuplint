import { describe, expect, test } from 'vitest';

import { checkHTTPEquivContentType } from './check-http-equiv-content-type.js';

const check = checkHTTPEquivContentType();

describe('valid per HTML LS §4.2.5.2 "Encoding declaration"', () => {
	test('canonical form with single space: "text/html; charset=utf-8"', () => {
		expect(check('text/html; charset=utf-8').matched).toBe(true);
	});

	test('no whitespace after semicolon: "text/html;charset=utf-8"', () => {
		// HTML LS: "text/html;", optionally followed by ASCII whitespace.
		expect(check('text/html;charset=utf-8').matched).toBe(true);
	});

	test('multiple spaces allowed: "text/html;   charset=utf-8"', () => {
		expect(check('text/html;   charset=utf-8').matched).toBe(true);
	});

	test('ASCII case-insensitive match for the literal prefix', () => {
		expect(check('TEXT/HTML; CHARSET=utf-8').matched).toBe(true);
		expect(check('Text/Html; Charset=UTF-8').matched).toBe(true);
	});

	test('tab and other ASCII whitespace separators', () => {
		expect(check('text/html;\tcharset=utf-8').matched).toBe(true);
	});
});

describe('invalid per HTML LS §4.2.5.2', () => {
	test('empty string', () => {
		expect(check('').matched).toBe(false);
	});

	test('non-MIME content: "not a mime"', () => {
		expect(check('not a mime').matched).toBe(false);
	});

	test('missing ";charset=..." tail', () => {
		expect(check('text/html').matched).toBe(false);
	});

	test('MIME other than text/html is rejected', () => {
		// The encoding declaration only permits `text/html` per HTML LS.
		expect(check('text/plain; charset=utf-8').matched).toBe(false);
		expect(check('application/xhtml+xml; charset=utf-8').matched).toBe(false);
	});

	test('empty charset label', () => {
		expect(check('text/html; charset=').matched).toBe(false);
	});

	test('missing "=" after charset', () => {
		expect(check('text/html; charset').matched).toBe(false);
	});

	test('trailing garbage after the charset label', () => {
		// The grammar ends with the label; anything after is non-conformant.
		expect(check('text/html; charset=utf-8; extra').matched).toBe(false);
		expect(check('text/html; charset=utf-8 garbage').matched).toBe(false);
	});

	test('charset label with forbidden characters', () => {
		expect(check('text/html; charset=utf 8').matched).toBe(false);
		expect(check('text/html; charset=utf@8').matched).toBe(false);
	});

	test('a valid Encoding LS label that is not "utf-8" is rejected', () => {
		// HTML LS requires the literal string "charset=utf-8", not any
		// Encoding-LS-shaped label.
		expect(check('text/html; charset=iso-8859-1').matched).toBe(false);
		expect(check('text/html; charset=windows-1252').matched).toBe(false);
	});
});
