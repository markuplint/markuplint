import { test, expect, describe } from 'vitest';

import { check } from '../check.js';

describe('NavigableTargetName', () => {
	test.each(['frame', 'a\tb', 'a\nb', 'a\rb', 'a<b', 'a b', 'a>b\t'])('valid: %j', name => {
		expect(check(name, 'NavigableTargetName').matched).toBe(true);
	});

	test.each(['', '_blank', '_x', 'a\t<b', 'a<\nb', '<\r', 'a\tb<'])('invalid: %j', name => {
		expect(check(name, 'NavigableTargetName').matched).toBe(false);
	});
});

describe('a name that is not a type (BrowsingContextName, BrowsingContextNameOrKeyword)', () => {
	test.each(['BrowsingContextName', 'BrowsingContextNameOrKeyword'])('%s matches any value', type => {
		expect(check('_blank', type as never).matched).toBe(true);
		expect(check('a\t<b', type as never).matched).toBe(true);
	});
});

describe('NavigableTargetNameOrKeyword', () => {
	const type = 'NavigableTargetNameOrKeyword';

	test(type, () => {
		expect(check('_blank', type).matched).toBe(true);
		expect(check('frame', type).matched).toBe(true);
		expect(check('a\tb', type).matched).toBe(true);
		expect(check('a\nb<', type).matched).toBe(false);
	});

	test(`${type}: a keyword is case-insensitive, and a value that is reported keeps its case`, () => {
		expect(check('_BLANK', type).matched).toBe(true);
		expect(check('_Self', type).matched).toBe(true);
		expect(check('_Unknown', type)).toMatchObject({ matched: false, raw: '_Unknown' });
		expect(check('Foo\tBar<', type)).toMatchObject({ matched: false, raw: 'Foo\tBar<' });
	});

	test('an empty value is reported as an empty token', () => {
		expect(check('', type)).toMatchObject({ matched: false, reason: 'empty-token' });
	});

	test('fallbackTo _blank only for a name with both a tab or newline and "<"', () => {
		expect(check('a\tb<', 'NavigableTargetNameOrKeyword')).toMatchObject({ matched: false, fallbackTo: '_blank' });
		expect(check('', 'NavigableTargetNameOrKeyword')).not.toHaveProperty('fallbackTo');
	});
});
