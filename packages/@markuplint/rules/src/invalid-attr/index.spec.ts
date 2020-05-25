import * as markuplint from 'markuplint';
import { floatCheck, intCheck, nonZeroUintCheck, uintCheck } from './type-check';
import rule from './';

test('intCheck', () => {
	expect(intCheck('0')).toBe(true);
	expect(intCheck('1')).toBe(true);
	expect(intCheck('-0')).toBe(true);
	expect(intCheck('-1')).toBe(true);
	expect(intCheck('10')).toBe(true);
	expect(intCheck('100')).toBe(true);
	expect(intCheck('1.00')).toBe(false);
	expect(intCheck('.001')).toBe(false);
	expect(intCheck(' 1 ')).toBe(false);
	expect(intCheck('- 1')).toBe(false);
});

test('uintCheck', () => {
	expect(uintCheck('0')).toBe(true);
	expect(uintCheck('1')).toBe(true);
	expect(uintCheck('10')).toBe(true);
	expect(uintCheck('100')).toBe(true);
	expect(uintCheck('-0')).toBe(false);
	expect(uintCheck('-1')).toBe(false);
	expect(uintCheck('1.00')).toBe(false);
	expect(uintCheck('.001')).toBe(false);
	expect(uintCheck(' 1 ')).toBe(false);
	expect(uintCheck('- 1')).toBe(false);
});

test('floatCheck', () => {
	expect(floatCheck('0')).toBe(true);
	expect(floatCheck('1')).toBe(true);
	expect(floatCheck('10')).toBe(true);
	expect(floatCheck('100')).toBe(true);
	expect(floatCheck('-0')).toBe(true);
	expect(floatCheck('-1')).toBe(true);
	expect(floatCheck('1.00')).toBe(true);
	expect(floatCheck('.001')).toBe(true);
	expect(floatCheck(' 1 ')).toBe(false);
	expect(floatCheck('- 1')).toBe(false);
});

test('nonZeroUintCheck', () => {
	expect(nonZeroUintCheck('0')).toBe(false);
	expect(nonZeroUintCheck('1')).toBe(true);
	expect(nonZeroUintCheck('10')).toBe(true);
	expect(nonZeroUintCheck('100')).toBe(true);
	expect(nonZeroUintCheck('-0')).toBe(false);
	expect(nonZeroUintCheck('-1')).toBe(false);
	expect(nonZeroUintCheck('1.00')).toBe(false);
	expect(nonZeroUintCheck('.001')).toBe(false);
	expect(nonZeroUintCheck(' 1 ')).toBe(false);
	expect(nonZeroUintCheck('- 1')).toBe(false);
});

test('warns if specified attribute value is invalid', async () => {
	const r = await markuplint.verify(
		'<a invalid-attr referrerpolicy="invalid-value"><img src=":::::"></a>',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	expect(r).toStrictEqual([
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 4,
			message: 'The "invalid-attr" attribute is not allowed',
			raw: 'invalid-attr',
		},
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 33,
			message:
				'The "referrerpolicy" attribute expect either "", "no-referrer", "no-referrer-when-downgrade", "same-origin", "origin", "strict-origin", "origin-when-cross-origin", "strict-origin-when-cross-origin", "unsafe-url"',
			raw: 'invalid-value',
		},
		{
			severity: 'error',
			ruleId: 'invalid-attr',
			line: 1,
			col: 58,
			message: 'The "src" attribute expect valid-URL',
			raw: ':::::',
		},
	]);
});

test('disable', async () => {
	const r = await markuplint.verify(
		'<a invalid-attr referrerpolicy="invalid-value"><img src=":::::"></a>',
		{
			rules: {
				'invalid-attr': false,
			},
		},
		[rule],
		'en',
	);

	expect(r.length).toBe(0);
});

test('custom rule', async () => {
	const r = await markuplint.verify(
		'<x-el x-attr="123"></x-el><x-el x-attr="abc"></x-el>',
		{
			rules: {
				'invalid-attr': {
					option: {
						'x-attr': {
							pattern: '/[a-z]+/',
						},
					},
				},
			},
		},
		[rule],
		'en',
	);

	expect(r).toStrictEqual([
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 15,
			message: 'The "x-attr" attribute expect custom pattern "/[a-z]+/"',
			raw: '123',
		},
	]);
});

test('custom rule: type', async () => {
	const r = await markuplint.verify(
		'<x-el x-attr="123"></x-el><x-el x-attr="abc"></x-el>',
		{
			rules: {
				'invalid-attr': {
					option: {
						'x-attr': {
							type: 'Int',
						},
					},
				},
			},
		},
		[rule],
		'en',
	);

	expect(r).toStrictEqual([
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 41,
			message: 'The "x-attr" attribute expect integer',
			raw: 'abc',
		},
	]);
});
