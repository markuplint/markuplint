import * as markuplint from 'markuplint';
import rule from './';

test('warns if specified attribute is not appeared', async () => {
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
						'required-attr': {
							severity: 'error',
							value: 'alt',
						},
					},
				},
			],
		},
		[rule],
		'en',
	);

	expect(r).toStrictEqual([
		{
			col: 1,
			line: 1,
			message: "Required 'alt' on '<img>'",
			raw: '<img src="/path/to/image.png">',
			ruleId: 'required-attr',
			severity: 'error',
		},
	]);
});

test('multiple required attributes', async () => {
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
						'required-attr': {
							severity: 'error',
							value: ['width', 'height', 'alt'],
						},
					},
				},
			],
		},
		[rule],
		'en',
	);

	expect(r).toStrictEqual([
		{
			severity: 'error',
			message: "Required 'width' on '<img>'",
			line: 1,
			col: 1,
			raw: '<img src="/path/to/image.png">',
			ruleId: 'required-attr',
		},
		{
			severity: 'error',
			message: "Required 'height' on '<img>'",
			line: 1,
			col: 1,
			raw: '<img src="/path/to/image.png">',
			ruleId: 'required-attr',
		},
		{
			severity: 'error',
			message: "Required 'alt' on '<img>'",
			line: 1,
			col: 1,
			raw: '<img src="/path/to/image.png">',
			ruleId: 'required-attr',
		},
	]);
});
