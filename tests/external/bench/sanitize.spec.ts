import { describe, expect, test } from 'vitest';

import { sanitizeMessage } from './sanitize.ts';

describe('sanitizeMessage', () => {
	test('keeps a single-line message untouched', () => {
		expect(sanitizeMessage('Element X not allowed')).toBe('Element X not allowed');
	});

	test('drops the stack trace that markuplint embeds after the first line', () => {
		const raw = [
			'Error: SVGStructurallyExternal is empty',
			'    at optCondition (file:///Users/hirao/.../matches-selector.js:220:28)',
			'    at matchesSelector (file:///Users/hirao/.../matches-selector.js:22:63)',
		].join('\n');
		expect(sanitizeMessage(raw)).toBe('Error: SVGStructurallyExternal is empty');
	});

	test('trims leading and trailing whitespace on the surviving line', () => {
		expect(sanitizeMessage('   padded   \n more below')).toBe('padded');
	});

	test('accepts messages without any newline', () => {
		expect(sanitizeMessage('no newline here')).toBe('no newline here');
	});

	test('accepts the empty string', () => {
		expect(sanitizeMessage('')).toBe('');
	});

	test('handles Windows-style line endings', () => {
		// split('\n') leaves a trailing \r on the first line; trim() strips it.
		expect(sanitizeMessage('first line\r\nsecond line')).toBe('first line');
	});
});
