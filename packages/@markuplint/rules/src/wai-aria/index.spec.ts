import * as markuplint from 'markuplint';
import rule from './';

test('Not exist', async () => {
	const r = await markuplint.verify(
		'<div role="hoge"></div>',
		{
			rules: {
				'wai-aria': true,
			},
		},
		[rule],
		'en',
	);

	expect(r).toStrictEqual([
		{
			ruleId: 'wai-aria',
			severity: 'error',
			line: 1,
			col: 6,
			message: 'This "roletype" role is the abstract role.',
			raw: 'role="roletype"',
		},
	]);
});
