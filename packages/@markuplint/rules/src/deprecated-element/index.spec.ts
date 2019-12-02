import * as markuplint from 'markuplint';
import rule from './';

test('normal', async () => {
	const r = await markuplint.verify(
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
	const r = await markuplint.verify(
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
			col: 2,
			raw: 'font',
			ruleId: 'deprecated-element',
		},
		{
			severity: 'error',
			message: 'Element is deprecated',
			line: 1,
			col: 15,
			raw: 'big',
			ruleId: 'deprecated-element',
		},
		{
			severity: 'error',
			message: 'Element is deprecated',
			line: 1,
			col: 20,
			raw: 'blink',
			ruleId: 'deprecated-element',
		},
	]);
});

test('Foreign element', async () => {
	const r = await markuplint.verify(
		'<svg><g><image width="100" height="100" xlink:href="path/to"/></g></svg>',
		{
			rules: {
				'deprecated-element': true,
			},
		},
		[rule],
		'en',
	);
	const r2 = await markuplint.verify(
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
			col: 13,
			raw: 'image',
			message: 'Element is deprecated',
		},
	]);
});
