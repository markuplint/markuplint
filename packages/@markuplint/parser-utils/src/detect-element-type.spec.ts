import { describe, expect, test } from 'vitest';

import { detectElementType } from './detect-element-type.js';

describe('detectElementType', () => {
	test.each([
		['div', 'html'],
		['Foo', 'html'],
		['x-foo', 'web-component'],
	])('<%s> is %s without a pattern', (name, expected) => {
		expect(detectElementType(name)).toBe(expected);
	});

	describe('a string of a pattern is a name', () => {
		test.each([
			['component', 'component', 'authored'],
			['my-component', 'component', 'web-component'],
			['components', 'component', 'html'],
			['slot', 'slot', 'authored'],
			['x-slot', 'slot', 'web-component'],
			['Component', 'component', 'html'],
		])('<%s> to %j is %s', (name, pattern, expected) => {
			expect(detectElementType(name, pattern)).toBe(expected);
		});

		test('a character of a regular expression is the character', () => {
			expect(detectElementType('a.b', 'a.b')).toBe('authored');
			expect(detectElementType('axb', 'a.b')).toBe('html');
			expect(detectElementType('a+', 'a+')).toBe('authored');
			expect(detectElementType('aa', 'a+')).toBe('html');
		});

		test('a pattern of the option replaces the default pattern', () => {
			expect(detectElementType('custom', ['custom'], ['default'])).toBe('authored');
			expect(detectElementType('default', ['custom'], ['default'])).toBe('html');
			expect(detectElementType('default', undefined, ['default'])).toBe('authored');
		});
	});

	describe('a string in the form of a regular expression is a regular expression', () => {
		test.each([
			['Foo', '/^[A-Z]/', 'authored'],
			['foo', '/^[A-Z]/', 'html'],
			['foo', '/^[A-Z]/i', 'authored'],
			['MyFoo', '/foo$/i', 'authored'],
		])('<%s> to %j is %s', (name, pattern, expected) => {
			expect(detectElementType(name, pattern)).toBe(expected);
		});
	});

	test.each([
		['Foo', /^[A-Z]/, 'authored'],
		['foo', /^[A-Z]/, 'html'],
		['foo', (name: string) => name === 'foo', 'authored'],
		['bar', (name: string) => name === 'foo', 'html'],
	])('<%s> to a regular expression or a function is %s', (name, pattern, expected) => {
		expect(detectElementType(name, pattern)).toBe(expected);
	});
});
