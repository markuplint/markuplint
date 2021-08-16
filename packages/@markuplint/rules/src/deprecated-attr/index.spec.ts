import { mlTest } from 'markuplint';
import rule from './';

test('deprecated attribute', async () => {
	const { violations } = await mlTest(
		'<img align="top">',
		{
			rules: {
				'deprecated-attr': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations).toStrictEqual([
		{
			ruleId: 'deprecated-attr',
			severity: 'error',
			line: 1,
			col: 6,
			raw: 'align',
			message: 'The align attribute is deprecated',
		},
	]);
});

test('deprecated global attribute', async () => {
	const { violations } = await mlTest(
		'<img xml:lang="en-US">',
		{
			rules: {
				'deprecated-attr': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations).toStrictEqual([
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
