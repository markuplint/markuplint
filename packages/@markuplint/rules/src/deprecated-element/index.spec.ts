import rule from './';
import { verify } from '../helpers';

test('normal', async () => {
	const r = await verify(
		'<div></div><p><span></span></p>',
		{
			rules: {
				'deprecated-element': true,
			},
		},
		[rule],
		'en',
	);
	expect(r).toStrictEqual([]);
});

test('deprecated', async () => {
	const r = await verify(
		'<font></font><big><blink></blink></big>',
		{
			rules: {
				'deprecated-element': true,
			},
		},
		[rule],
		'en',
	);
	expect(r).toStrictEqual([
		{
			severity: 'error',
			message: 'Element is deprecated',
			line: 1,
			col: 1,
			raw: '<font>',
			ruleId: 'deprecated-element',
		},
		{
			severity: 'error',
			message: 'Element is deprecated',
			line: 1,
			col: 14,
			raw: '<big>',
			ruleId: 'deprecated-element',
		},
		{
			severity: 'error',
			message: 'Element is deprecated',
			line: 1,
			col: 19,
			raw: '<blink>',
			ruleId: 'deprecated-element',
		},
	]);
});

test('Foreign element', async () => {
	const r = await verify(
		'<svg><g><image width="100" height="100" xlink:href="path/to"/></g></svg>',
		{
			rules: {
				'deprecated-element': true,
			},
		},
		[rule],
		'en',
	);
	const r2 = await verify(
		'<div><span><image width="100" height="100" xlink:href="path/to"/></span></div>',
		{
			rules: {
				'deprecated-element': true,
			},
		},
		[rule],
		'en',
	);
	expect(r).toStrictEqual([]);
	expect(r2).toStrictEqual([
		{
			ruleId: 'deprecated-element',
			severity: 'error',
			line: 1,
			col: 12,
			raw: '<image width="100" height="100" xlink:href="path/to"/>',
			message: 'Element is deprecated',
		},
	]);
});
