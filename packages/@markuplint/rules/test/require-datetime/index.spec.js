const { mlRuleTest } = require('markuplint');

const rule = require('../../lib/require-datetime').default;

test('Valid', async () => {
	expect((await mlRuleTest(rule, '<time>2000-01-01</time>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<time datetime="2000-01-01">2000/01/01</time>')).violations).toStrictEqual([]);
});

test('Mutable', async () => {
	expect(
		(
			await mlRuleTest(rule, '<time>{foo}</time>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
			})
		).violations,
	).toStrictEqual([]);
});

test('Need', async () => {
	expect((await mlRuleTest(rule, '<time>Content</time>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			raw: '<time>',
			message: 'Need the "datetime" attribute',
		},
	]);
});

test('Candidates', async () => {
	expect((await mlRuleTest(rule, '<time>2000/01/01</time>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			raw: '<time>',
			message: 'Need datetime="2000-01-01"',
		},
	]);

	expect((await mlRuleTest(rule, '<time>令和5年1月3日</time>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			raw: '<time>',
			message: 'Need datetime="2023-01-03"',
		},
	]);
});
