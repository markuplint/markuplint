import * as markuplint from 'markuplint';
import rule from './';

test('id-duplication', async () => {
	const r = await markuplint.verify(
		'<div id="a"><p id="a"></p></div>',
		{
			rules: {
				'id-duplication': true,
			},
		},
		[rule],
		'en',
	);
	expect(r).toStrictEqual([
		{
			severity: 'error',
			message: 'Duplicate attribute id value',
			line: 1,
			col: 16,
			raw: 'id="a"',
			ruleId: 'id-duplication',
		},
	]);
});

test('id-duplication', async () => {
	const r = await markuplint.verify(
		'<div id="a"></div>',
		{
			rules: {
				'id-duplication': true,
			},
		},
		[rule],
		'en',
	);
	expect(r.length).toBe(0);
});

test('id-duplication', async () => {
	const r = await markuplint.verify(
		'<div id="a"></div><div id="a"></div><div id="a"></div>',
		{
			rules: {
				'id-duplication': true,
			},
		},
		[rule],
		'en',
	);
	expect(r.length).toBe(2);
});

test('id-duplication', async () => {
	const r = await markuplint.verify(
		'<div id="a"></div><div id="b"></div><div id="c"></div>',
		{
			rules: {
				'id-duplication': true,
			},
		},
		[rule],
		'en',
	);
	expect(r.length).toBe(0);
});
