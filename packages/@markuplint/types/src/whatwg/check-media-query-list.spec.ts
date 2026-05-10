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

test.each([
	['(min-width: 400px)', true],
	['(min-width: 0)', true], // CSS Values §3.3 — zero length unitless permitted
	['(min-height: 50em)', true],
	['(width: 100vh)', true],
	['(min-width: 400)', false], // unitless non-zero rejected
	['(min-width: 400uu)', false], // unknown unit
	['(min-width: 400dpi)', false], // resolution unit on length feature
	['(min-width: 5deg)', false], // angle unit on length feature
])('<length> feature value validation: %s -> matched %s', (value, expected) => {
	expect(check(value).matched).toBe(expected);
});

test.each([
	['(color: 1)', true],
	['(monochrome: 0)', true],
	['(min-color-index: 256)', true],
	['(color: 1em)', false], // dimension rejected
	['(color: 1.5)', false], // fractional rejected
	['(color: 1px)', false],
])('<integer> feature value validation: %s -> matched %s', (value, expected) => {
	expect(check(value).matched).toBe(expected);
});

test.each([
	['(resolution: 96dpi)', true],
	['(min-resolution: 2dppx)', true],
	['(max-resolution: 1x)', true],
	['(resolution: 96)', false], // unitless rejected
	['(resolution: 96px)', false], // length unit rejected
])('<resolution> feature value validation: %s -> matched %s', (value, expected) => {
	expect(check(value).matched).toBe(expected);
});

test.each([
	['(aspect-ratio: 16/9)', true],
	['(aspect-ratio: 1.5)', true], // unitless number form
	['(min-aspect-ratio: 1/1)', true],
	['(aspect-ratio: 16em)', false], // dimension rejected
])('<ratio> feature value validation: %s -> matched %s', (value, expected) => {
	expect(check(value).matched).toBe(expected);
});

test('boolean form `(min-width)` skips value-type validation (MQL4 boolean syntax)', () => {
	expect(check('(min-width)').matched).toBe(true);
	expect(check('(grid)').matched).toBe(true);
});

test('unknown feature is passed through (forward-compat for new MQL features)', () => {
	// Hypothetical future feature; markuplint must not regress when MQL
	// extends the feature catalogue. css-tree's permissive parse accepts
	// it; only Stage 1 syntax-match would reject if grammar disagrees.
	const result = check('(foo-bar: 42)');
	if (!result.matched) {
		// If rejected, it must be by syntax-match, not by our partName.
		expect(result.partName).not.toMatch(/required for "foo-bar"/);
	}
});
