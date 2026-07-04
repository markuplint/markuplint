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
	['(color: 1e2)', false], // scientific notation is <number>, not <integer>
	['(color: -1)', false], // MQL5 §4.4 — non-negative integer required
	['(monochrome: -2)', false],
	['(min-color-index: -1)', false],
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
	// MQL5 §4.5 — ratios must be positive
	['(aspect-ratio: -1/1)', false],
	['(aspect-ratio: 1/-1)', false],
	['(aspect-ratio: -1.5)', false],
	['(aspect-ratio: 0)', false], // zero <number> not positive
	['(aspect-ratio: 0/1)', false], // zero numerator
	['(aspect-ratio: 1/0)', false], // zero denominator
])('<ratio> feature value validation: %s -> matched %s', (value, expected) => {
	expect(check(value).matched).toBe(expected);
});

test.each([
	['(min-width: 400PX)', true],
	['(min-width: 400Px)', true],
	['(resolution: 96DPI)', true],
	['(min-color: 0)', true],
])('CSS unit/keyword case-insensitivity: %s', (value, expected) => {
	expect(check(value).matched).toBe(expected);
});

test.each([
	['(color)', true], // boolean form on integer feature
	['(resolution)', true], // boolean form on resolution feature
	['(aspect-ratio)', true], // boolean form on ratio feature
	['(min-width)', true], // boolean form on length feature
])('boolean form `%s` skips value-type validation', value => {
	expect(check(value).matched).toBe(true);
});

test.each(['(foo-bar: 42)', '(unknown-feat: 5px)', '(future-prop: 1em)'])(
	'unknown feature %s is passed through (forward-compat for new MQL features)',
	value => {
		// Stage-1 syntax-match may accept or reject the unknown feature;
		// the assertion only ensures *our* value-type matrix never invents
		// a rejection for a feature it doesn't model.
		const result = check(value);
		if (!result.matched) {
			expect(result.partName ?? '').not.toMatch(/required for "(foo-bar|unknown-feat|future-prop)"/);
		}
	},
);

test('css-tree parse failures surface as `syntax-error` violations (not Tier-1 throws)', () => {
	// Trailing whitespace inside a parenthesised media-condition trips
	// css-tree's tokenizer with a bare `SyntaxError`. Without the
	// css-tree-shape guard the catch block would re-throw it as Tier-1
	// fatal and crash the lint run mid-file.
	const result = check(' all ');
	expect(result.matched).toBe(false);
});

test('negative <ratio> is rejected by Stage A (CSS Values <number [0,∞]>)', () => {
	// css-tree's `<ratio>` grammar already excludes negatives, so the
	// rejection partName comes from Stage A — *not* the MQL5 §4.5 guard.
	// This test pins which stage owns the rejection so future refactors
	// don't accidentally turn the §4.5 path into dead code for negatives.
	const result = check('(aspect-ratio: -1/1)');
	expect(result.matched).toBe(false);
	if (result.matched) return;
	expect(result.partName).toMatch(/^<ratio> required for "aspect-ratio"/);
	expect(result.partName).not.toMatch(/MQL5 §4\.5/);
});

test('zero <ratio> is rejected by Stage B (MQL5 §4.5 — Stage A allows 0 in [0,∞])', () => {
	// Stage A's `<ratio>` accepts `0` because CSS Values §6.7 defines it
	// as `<number [0,∞]>` (zero is in range). Stage B narrows further
	// to `> 0` per Media Queries Level 5 §4.5.
	const result = check('(aspect-ratio: 0)');
	expect(result.matched).toBe(false);
	if (result.matched) return;
	expect(result.partName).toMatch(/MQL5 §4\.5/);
});

test('negative <integer> is rejected by Stage B (MQL5 §4.4 — Stage A allows negatives)', () => {
	// CSS Values §6.2 `<integer>` grammar accepts signed integers,
	// so Stage A passes `-1`. The non-negative constraint comes from
	// MQL5 §4.4 and is enforced by Stage B.
	const result = check('(color: -1)');
	expect(result.matched).toBe(false);
	if (result.matched) return;
	expect(result.partName).toMatch(/MQL5 §4\.4/);
});

test('Stage A error message surfaces the offending value detail to the user', () => {
	// `(min-width: 400uu)` should mention "uu" / dimension mismatch via
	// css-tree's `<length>` diagnostic — without it, the user only sees
	// "<length> required for min-width" and has to guess what was wrong.
	//
	// The exact wording of the diagnostic suffix is *not* contractual —
	// it is whatever css-tree's `LexerMatchResult.error.message` says on
	// its first line, and may evolve with css-tree releases. We only pin
	// (1) the base "<length> required for ..." prefix and (2) that
	// *something* trails in parentheses, so a future css-tree change
	// that empties the diagnostic still surfaces a regression.
	const result = check('(min-width: 400uu)');
	expect(result.matched).toBe(false);
	if (result.matched) return;
	expect(result.partName).toMatch(/<length> required for "min-width"/);
	expect(result.partName).toMatch(/\(/);
});

test.each([
	['(min-width:)', '(min-width:)'],
	['(123)', '(123)'],
	['screen and (min-width:)', '(min-width:)'],
])('<general-enclosed> match "%s" is rejected (MQ5 §3 forbids in author stylesheets)', (input, rawExpected) => {
	const result = check(input);
	expect(result.matched).toBe(false);
	if (result.matched) return;
	expect(result.reason).toBe('syntax-error');
	expect(result.raw).toBe(rawExpected);
	expect(result.partName).toMatch(/Media Queries Level 5 §3/);
	expect(result.partName).toMatch(/general-enclosed/);
});

test.each(['(foo-bar: 42)', '(-webkit-min-device-pixel-ratio: 2)', '(future-prop: 1em)'])(
	'unknown-but-well-formed feature %s stays out of <general-enclosed>',
	input => {
		const result = check(input);
		if (!result.matched) {
			expect(result.partName ?? '').not.toMatch(/general-enclosed/);
		}
	},
);
