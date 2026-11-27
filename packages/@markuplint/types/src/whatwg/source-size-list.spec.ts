import { describe, test, expect } from 'vitest';

import { findSourceSizeAuto, specifiesSourceSizeAuto, unescapeSourceSizeAuto } from './source-size-list.js';

describe('specifiesSourceSizeAuto', () => {
	test.each([
		['auto', true],
		['AUTO', true],
		['auto, 100vw', true],
		[' auto , 100vw', true],
		['auto\t', true],
		['/* c */auto', true],
		['auto/* c, d */, 100vw', true],
		// CSS escapes are decoded (CSS Syntax § consume an escaped code point).
		[String.raw`\61 uto`, true],
		[String.raw`a\75 to, 100vw`, true],
		[String.raw`\41 UTO`, true],
		[String.raw`au\to`, true],
		// `u` is not a hex digit, so the escape ends at `\61`.
		[String.raw`\61uto`, true],
		// Up to six hex digits are read: `\612` is U+0612.
		[String.raw`\612uto`, false],
		// U+0430 CYRILLIC SMALL LETTER A is not "a".
		['аuto', false],
		['/* unclosed, auto', false],
		['au/**/to', false],
		['auto 100vw', false],
		['auto(1)', false],
		['100vw, auto', false],
		['(min-width: 600px) 200px, 100vw', false],
		['', false],
	])('specifiesSourceSizeAuto(%j) is %s', (value, expected) => {
		expect(specifiesSourceSizeAuto(value)).toBe(expected);
	});
});

test('findSourceSizeAuto', () => {
	expect(findSourceSizeAuto(String.raw` /* c */ \61 uto , 100vw`)).toStrictEqual({ start: 9, end: 16 });
	expect(findSourceSizeAuto('100vw')).toBeNull();
});

test('unescapeSourceSizeAuto', () => {
	expect(unescapeSourceSizeAuto(String.raw`\61 uto, 100vw`)).toBe('auto   , 100vw');
	expect(unescapeSourceSizeAuto(String.raw`100vw, A\75 TO`)).toBe('100vw, auto   ');
	// Only an escaped `auto` is rewritten; the rest is left as written.
	expect(unescapeSourceSizeAuto(String.raw`AUTO, \6d in(1px, 2px)`)).toBe(String.raw`AUTO, \6d in(1px, 2px)`);
});
