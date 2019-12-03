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
	);
	expect(r).toStrictEqual([
		// {
		// 	severity: 'error',
		// 	message: '"body"要素はDOMツリー上に既に暗黙的に生成されています。',
		// 	line: 1,
		// 	col: 26,
		// 	raw: '<body>',
		// 	ruleId: 'parse-error',
		// },
		// {
		// 	severity: 'error',
		// 	message: 'パースできない不正なノードです。',
		// 	line: 1,
		// 	col: 36,
		// 	raw: '</body>',
		// 	ruleId: 'parse-error',
		// },
	]);
});
