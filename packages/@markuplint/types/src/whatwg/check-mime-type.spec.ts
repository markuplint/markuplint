import { test, expect } from 'vitest';

import { checkMIMEType } from './check-mime-type.js';

const check = checkMIMEType();
const checkNoParam = checkMIMEType({ withoutParameters: true });

test('valid', () => {
	expect(check('x/y').matched).toBe(true);
	expect(check('x/y;a=b;c=D;E="F"').matched).toBe(true);
});

test('unterminated quoted-string parameter (no closing DQUOTE)', () => {
	// Mirrors `tests/external/validator/tests/html/mime-types/008-novalid.html`.
	// `whatwg-mimetype` would parse this as `text/html; charset=utf-8` (silently
	// dropping the missing terminator), so the check must short-circuit.
	expect(check('text/html;charset="utf-8')).toStrictEqual({
		column: 19,
		expects: [{ type: 'format', value: 'MIME Type' }],
		length: 6,
		line: 1,
		matched: false,
		offset: 18,
		raw: '"utf-8',
		reason: 'syntax-error',
		ref: null,
	});
});

test('unterminated quoted-string parameter ending with backslash escape', () => {
	// Mirrors `tests/external/validator/tests/html/mime-types/009-novalid.html`.
	// The trailing `\` consumes the would-be terminator and leaves the value
	// unterminated; nu-validator reports "Unfinished quoted string."
	expect(check('text/html;charset="u\\')).toStrictEqual({
		column: 19,
		expects: [{ type: 'format', value: 'MIME Type' }],
		length: 3,
		line: 1,
		matched: false,
		offset: 18,
		raw: '"u\\',
		reason: 'syntax-error',
		ref: null,
	});
});

test('quoted-string parameter properly terminated stays valid', () => {
	expect(check('text/html;charset="utf-8"').matched).toBe(true);
	// Escaped DQUOTE inside a properly-terminated quoted string is fine.
	expect(check('text/html;charset="\\""').matched).toBe(true);
});

test('excrescence-token', () => {
	expect(check('xy;')).toStrictEqual({
		column: 1,
		expects: [{ type: 'format', value: 'MIME Type' }],
		length: 3,
		line: 1,
		matched: false,
		offset: 0,
		raw: 'xy;',
		reason: 'syntax-error',
		ref: null,
	});
	expect(check('x/y;')).toStrictEqual({
		candidate: 'x/y',
		column: 4,
		expects: [{ type: 'format', value: 'MIME Type' }],
		length: 1,
		line: 1,
		matched: false,
		offset: 3,
		raw: ';',
		reason: 'extra-token',
		ref: null,
	});
	expect(checkNoParam('x/y;')).toStrictEqual({
		candidate: 'x/y',
		column: 4,
		expects: [{ type: 'format', value: 'MIME Type with no parameters' }],
		length: 1,
		line: 1,
		matched: false,
		offset: 3,
		raw: ';',
		reason: 'extra-token',
		ref: null,
	});
	expect(checkNoParam('x/y;a=b;c=D;E="F"')).toStrictEqual({
		candidate: 'x/y',
		column: 4,
		expects: [{ type: 'format', value: 'MIME Type with no parameters' }],
		length: 14,
		line: 1,
		matched: false,
		offset: 3,
		raw: ';a=b;c=D;E="F"',
		reason: 'extra-token',
		ref: null,
	});
});
