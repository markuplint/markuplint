import { test, expect } from 'vitest';

import { checkMediaQueryList } from './check-media-query-list.js';

const check = checkMediaQueryList();

test('valid: bare active media types', () => {
	expect(check('all').matched).toBe(true);
	expect(check('screen').matched).toBe(true);
	expect(check('print').matched).toBe(true);
});

test('valid: media type with condition', () => {
	expect(check('screen and (min-width: 400px)').matched).toBe(true);
});

test('valid: condition-only query', () => {
	expect(check('(prefers-color-scheme: dark)').matched).toBe(true);
});

test('valid: multi-query list', () => {
	expect(check('screen, print').matched).toBe(true);
});

test('empty value reports empty-token', () => {
	expect(check('')).toStrictEqual({
		expects: [{ type: 'format', value: 'media query list' }],
		matched: false,
		ref: null,
		raw: '',
		offset: 0,
		length: 0,
		line: 1,
		column: 1,
		reason: 'empty-token',
	});
});

test('unknown media type "alla" suggests "all"', () => {
	expect(check('alla')).toStrictEqual({
		reason: 'doesnt-exist-in-enum',
		expects: [{ type: 'format', value: 'media query list' }],
		candidate: 'all',
		matched: false,
		ref: null,
		raw: 'alla',
		offset: 0,
		length: 4,
		line: 1,
		column: 1,
	});
});

test('unknown media type with no near-match (no candidate)', () => {
	// `nearestMediaType` returns undefined when neither prefix-match
	// direction succeeds. The result still carries an explicit
	// `candidate: undefined` field, hence the property is asserted.
	expect(check('foo')).toStrictEqual({
		reason: 'doesnt-exist-in-enum',
		expects: [{ type: 'format', value: 'media query list' }],
		candidate: undefined,
		matched: false,
		ref: null,
		raw: 'foo',
		offset: 0,
		length: 3,
		line: 1,
		column: 1,
	});
});

test.each(['tv', 'projection', 'aural', 'handheld', 'braille', 'embossed', 'tty', 'speech'])(
	'deprecated media type "%s" is rejected (Media Queries Level 5 §2.3)',
	mediaType => {
		const result = check(mediaType);
		expect(result.matched).toBe(false);
		if (result.matched) return;
		expect(result.reason).toBe('doesnt-exist-in-enum');
		expect(result.partName).toBe(`deprecated media type "${mediaType}"`);
		expect(result.raw).toBe(mediaType);
	},
);

test.each([
	'device-width',
	'min-device-width',
	'max-device-width',
	'device-height',
	'min-device-height',
	'max-device-height',
	'device-aspect-ratio',
	'min-device-aspect-ratio',
	'max-device-aspect-ratio',
])('deprecated media feature "%s" is rejected (deprecated since Media Queries Level 4)', feature => {
	const result = check(`(${feature}: 400px)`);
	expect(result.matched).toBe(false);
	if (result.matched) return;
	expect(result.reason).toBe('doesnt-exist-in-enum');
	expect(result.partName).toBe(`deprecated media feature "${feature}"`);
	expect(result.raw).toBe(feature);
});

test('stray semicolon inside parens is rejected (Media Queries grammar has no statement separator)', () => {
	expect(check('screen and (min-width: 400px;)')).toStrictEqual({
		reason: 'unexpected-token',
		expects: [{ type: 'format', value: 'media query list' }],
		partName: 'a stray semicolon inside the media condition',
		matched: false,
		ref: null,
		raw: ';',
		offset: 28,
		length: 1,
		line: 1,
		column: 29,
	});
});

test('semicolon outside parens does NOT trigger the inside-parens guard', () => {
	// Top-level `;` is not part of a media query and would surface as a
	// css-tree parse error instead. Documents that the guard's scope is
	// narrowed to balanced `(...)` regions.
	const result = check('screen; print');
	expect(result.matched).toBe(false);
	if (result.matched) return;
	// Reason here is whatever css-tree's parser raises — we only assert
	// it is NOT the inside-parens guard's reason.
	expect(result.partName).not.toBe('a stray semicolon inside the media condition');
});

test('case-insensitive media type matching ("SCREEN" is valid)', () => {
	expect(check('SCREEN').matched).toBe(true);
});

test('case-insensitive deprecated detection ("PROJECTION" still flagged)', () => {
	const result = check('PROJECTION');
	expect(result.matched).toBe(false);
	if (result.matched) return;
	expect(result.reason).toBe('doesnt-exist-in-enum');
	expect(result.partName).toBe('deprecated media type "PROJECTION"');
});
