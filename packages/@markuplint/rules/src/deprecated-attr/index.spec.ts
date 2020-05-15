import * as markuplint from 'markuplint';
import rule from './';

test('deprecated attribute', async () => {
	const r = await markuplint.verify(
		'<img align="top">',
		{
			rules: {
				'deprecated-attr': true,
			},
		},
		[rule],
		'en',
	);
	expect(r).toStrictEqual([
		{
			ruleId: 'deprecated-attr',
			severity: 'error',
			line: 1,
			col: 6,
			raw: 'align',
			message: 'The align attribute is obsolete',
		},
	]);
});

test('deprecated global attribute', async () => {
	const r = await markuplint.verify(
		'<img xml:lang="en-US">',
		{
			rules: {
				'deprecated-attr': true,
			},
		},
		[rule],
		'en',
	);
	expect(r).toStrictEqual([
		{
			ruleId: 'deprecated-attr',
			severity: 'error',
			line: 1,
			col: 6,
			raw: 'xml:lang',
			message: 'The xml:lang attribute is deprecated',
		},
	]);
});
