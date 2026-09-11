import { describe, expect, test } from 'vitest';

import { extractRawForParseError } from './parser.js';

describe('extractRawForParseError', () => {
	test('returns slice() result for non-empty spans', () => {
		expect(extractRawForParseError('<div class="x">', 5, 10)).toBe('class');
	});

	test('returns slice() result even when both offsets are 0 — empty span at start yields empty string', () => {
		expect(extractRawForParseError('<div>', 0, 0)).toBe('');
	});

	test('walks outward over token-shaped characters at a zero-width position (attribute name)', () => {
		// parse5's `duplicate-attribute` fires at the `=` between name and value.
		// Input: `<div abc=1 abc=2>`. The second `abc=` triggers the event at
		// offset 14 (right after `abc`). Walk back over `abc` token chars.
		const source = '<div abc=1 abc=2>';
		// Offset 14 is right after the second `abc` (= sign position).
		expect(extractRawForParseError(source, 14, 14)).toBe('abc');
	});

	test('walks outward across both directions when the zero-width position is mid-token', () => {
		// If parse5 ever reports an offset mid-identifier, the helper should
		// still surface the full token by walking both back and forward.
		const source = 'abcDEFghi xyz';
		expect(extractRawForParseError(source, 4, 4)).toBe('abcDEFghi');
	});

	test('stops walking at whitespace', () => {
		expect(extractRawForParseError('foo bar baz', 5, 5)).toBe('bar');
	});

	test('stops walking at HTML structural punctuation (angle brackets, quotes, slash, equals, ampersand)', () => {
		// `=` is one of the structural stop chars.
		expect(extractRawForParseError('attr=value', 5, 5)).toBe('value');
		// `<` stops walking.
		expect(extractRawForParseError('<tag>', 1, 1)).toBe('tag');
		// `"` (double-quote) stops walking.
		expect(extractRawForParseError('"foo" bar', 1, 1)).toBe('foo');
		// `&` stops walking (so character-reference errors don't span across the `&`).
		// `;` is not in the stop set, so forward walk captures `entity;`.
		expect(extractRawForParseError('&entity;', 1, 1)).toBe('entity;');
	});

	test('forward walk is capped at 32 chars from startOffset', () => {
		// 40 consecutive token chars — only the first 32 should be captured.
		const longToken = 'a'.repeat(40);
		expect(extractRawForParseError(longToken, 0, 0)).toBe('a'.repeat(32));
	});

	test('backward walk has no explicit cap but is bounded by the start of the source', () => {
		// 40 consecutive token chars from offset 40 (= end of source). Walking
		// back goes all the way to offset 0 because no stop char appears.
		const longToken = 'a'.repeat(40);
		expect(extractRawForParseError(longToken, 40, 40)).toBe('a'.repeat(40));
	});

	test('returns empty string when the position is surrounded by stop chars on both sides', () => {
		// `<>` — offset 1 sits between `<` and `>`; both are stop chars.
		expect(extractRawForParseError('<>', 1, 1)).toBe('');
	});

	test('handles position at end-of-source gracefully', () => {
		const source = 'abc';
		// Position 3 is at EOS; walk back captures `abc`.
		expect(extractRawForParseError(source, 3, 3)).toBe('abc');
	});

	test('handles position at start-of-source gracefully', () => {
		const source = 'abc';
		// Position 0 is at SOS; walk forward captures `abc`.
		expect(extractRawForParseError(source, 0, 0)).toBe('abc');
	});
});
