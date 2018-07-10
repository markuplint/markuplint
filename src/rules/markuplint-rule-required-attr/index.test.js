import test from 'ava';
import * as markuplint from '../../../lib/';
import rule from '../../../lib/rules/markuplint-rule-required-attr';

test('warns if specified attribute is not appeared', async (t) => {
	const r = await markuplint.verify(
		'<img src="/path/to/image.png">',
		{
			rules: {
				'required-attr': true,
			},
			nodeRules: [
				{
					tagName: 'img',
					rules: {
						'required-attr': ['error', 'alt'],
					},
				},
			],
		},
		[rule],
		'en',
	);

	t.deepEqual(r, [
		{
			col: 1,
			level: 'error',
			line: 1,
			message: 'Required \'alt\' on \'<img>\'',
			raw: '<img src="/path/to/image.png">',
			ruleId: 'required-attr',
			severity: 'error',
		},
	]);
});
