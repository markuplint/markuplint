import * as markuplint from 'markuplint';
import rule from './';

test('test', async () => {
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
