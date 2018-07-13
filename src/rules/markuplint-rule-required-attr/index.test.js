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

test('multiple required attributes', async (t) => {
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
						'required-attr': [
							'error',
							['width', 'height', 'alt'],
						],
					},
				},
			],
		},
		[rule],
		'en',
	);

	t.deepEqual(r, [
		{
			severity: 'error',
			level: 'error',
			message: 'Required \'width\' on \'<img>\'',
			line: 1,
			col: 1,
			raw: '<img src="/path/to/image.png">',
			ruleId: 'required-attr',
		},
		{
			severity: 'error',
			level: 'error',
			message: 'Required \'height\' on \'<img>\'',
			line: 1,
			col: 1,
			raw: '<img src="/path/to/image.png">',
			ruleId: 'required-attr',
		},
		{
			severity: 'error',
			level: 'error',
			message: 'Required \'alt\' on \'<img>\'',
			line: 1,
			col: 1,
			raw: '<img src="/path/to/image.png">',
			ruleId: 'required-attr',
		},
	]);
});
