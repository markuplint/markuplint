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

describe('BrowsingContextName (deprecated alias)', () => {
	test.each(['frame', 'a\tb', 'a<b'])('valid: %j', name => {
		expect(check(name, 'BrowsingContextName').matched).toBe(true);
	});

	test.each(['', '_blank', 'a\t<b', 'a<\nb'])('invalid: %j', name => {
		expect(check(name, 'BrowsingContextName').matched).toBe(false);
	});
});

describe('NavigableTargetNameOrKeyword and BrowsingContextNameOrKeyword', () => {
	test.each(['NavigableTargetNameOrKeyword', 'BrowsingContextNameOrKeyword'] as const)('%s', type => {
		expect(check('_blank', type).matched).toBe(true);
		expect(check('frame', type).matched).toBe(true);
		expect(check('a\tb', type).matched).toBe(true);
		expect(check('a\nb<', type).matched).toBe(false);
	});

	test.each(['NavigableTargetNameOrKeyword', 'BrowsingContextNameOrKeyword'] as const)(
		'%s: a keyword is case-insensitive, and a value that is reported keeps its case',
		type => {
			expect(check('_BLANK', type).matched).toBe(true);
			expect(check('_Self', type).matched).toBe(true);
			expect(check('_Unknown', type)).toMatchObject({ matched: false, raw: '_Unknown' });
			expect(check('Foo\tBar<', type)).toMatchObject({ matched: false, raw: 'Foo\tBar<' });
		},
	);

	test('fallbackTo _blank only for a name with both a tab or newline and "<"', () => {
		expect(check('a\tb<', 'NavigableTargetNameOrKeyword')).toMatchObject({ matched: false, fallbackTo: '_blank' });
		expect(check('', 'NavigableTargetNameOrKeyword')).not.toHaveProperty('fallbackTo');
	});
});
