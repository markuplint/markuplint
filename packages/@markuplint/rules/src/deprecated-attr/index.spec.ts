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
			message: 'The "align" attribute is deprecated',
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
			message: 'The "xml:lang" attribute is deprecated',
		},
	]);
});

test('svg', async () => {
	const { violations } = await mlTest(
		`<svg viewBox="0 0 160 40" xmlns="http://www.w3.org/2000/svg">
          <a xlink:href="https://developer.mozilla.org/">
          <text x="10" y="25">MDN Web Docs</text></a>
        </svg>`,
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
			severity: 'error',
			ruleId: 'deprecated-attr',
			line: 2,
			col: 14,
			message: 'The "xlink:href" attribute is deprecated',
			raw: 'xlink:href',
		},
	]);
});
